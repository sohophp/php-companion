param([Parameter(Mandatory=$true)][string]$RequestPath)
$ErrorActionPreference = 'Stop'
$spec = Get-Content -LiteralPath $RequestPath -Raw -Encoding UTF8 | ConvertFrom-Json
try {
    # No job handle is inheritable. The target is suspended until assignment.
    # https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class OwnedWindowsJob {
    [StructLayout(LayoutKind.Sequential)] struct BasicLimits {
        public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }
    [StructLayout(LayoutKind.Sequential)] struct IoCounters {
        public ulong ReadOperations, WriteOperations, OtherOperations, ReadBytes, WriteBytes, OtherBytes;
    }
    [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits {
        public BasicLimits BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
    }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct StartupInfo {
        public uint cb;
        public string reserved, desktop, title;
        public uint x, y, xSize, ySize, xCountChars, yCountChars, fillAttribute, flags;
        public ushort showWindow, reserved2Size;
        public IntPtr reserved2, stdin, stdout, stderr;
    }
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {
        public IntPtr process, thread;
        public uint pid, tid;
    }
    public sealed class Receipt {
        public string ownership = "kernel-job";
        public uint pid, actualExitCode;
        public long naturalDrainMs;
        public bool timedOut, cleanupNeeded, ownedProcessesGoneAfterCleanup;
        public bool supervisorOutsideOwnedJob, rootAssignedToOwnedJob;
        public ulong[] jobMemberPidsObservedAfterExit = new ulong[0];
        public ulong[] jobMemberPidsAtRootExit = new ulong[0];
        public string[] jobMemberNamesObservedAfterExit = new string[0];
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref ExtendedLimits info, uint size);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool belongs);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool CreateProcessW(string app, StringBuilder commandLine, IntPtr processAttributes,
        IntPtr threadAttributes, bool inheritHandles, uint flags, IntPtr environment, string cwd,
        ref StartupInfo startup, out ProcessInfo info);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle, uint timeout);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job, uint code);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool QueryInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint size, IntPtr returnLength);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr GetStdHandle(int kind);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool DuplicateHandle(IntPtr sourceProcess, IntPtr source, IntPtr targetProcess,
        out IntPtr target, uint access, bool inherit, uint options);

    static void Check(bool ok) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    static IntPtr InheritableStandardHandle(int kind) {
        IntPtr copy;
        Check(DuplicateHandle(GetCurrentProcess(), GetStdHandle(kind), GetCurrentProcess(), out copy, 0, true, 2));
        return copy;
    }
    // CommandLineToArgv/CRT quoting: preserve spaces, quotes and trailing slashes.
    static string Quote(string value) {
        StringBuilder text = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { text.Append('\\', slashes * 2 + 1); text.Append(c); }
            else { text.Append('\\', slashes); text.Append(c); }
            slashes = 0;
        }
        text.Append('\\', slashes * 2); text.Append('"');
        return text.ToString();
    }
    static ulong[] Members(IntPtr job) {
        for (int capacity = 16; capacity <= 65536; capacity *= 2) {
            int bytes = 8 + capacity * IntPtr.Size;
            IntPtr buffer = Marshal.AllocHGlobal(bytes);
            try {
                if (!QueryInformationJobObject(job, 3, buffer, (uint)bytes, IntPtr.Zero)) {
                    int error = Marshal.GetLastWin32Error();
                    if (error == 234) continue;
                    throw new Win32Exception(error);
                }
                int assigned = Marshal.ReadInt32(buffer), listed = Marshal.ReadInt32(buffer, 4);
                if (assigned > listed) continue;
                ulong[] pids = new ulong[listed];
                for (int i = 0; i < listed; i++)
                    pids[i] = unchecked((ulong)Marshal.ReadIntPtr(buffer, 8 + i * IntPtr.Size).ToInt64());
                return pids;
            } finally { Marshal.FreeHGlobal(buffer); }
        }
        throw new InvalidOperationException("Job process list exceeded bounded capacity");
    }
    static void Empty(IntPtr job) {
        if (Members(job).Length == 0) return;
        Check(TerminateJobObject(job, 1));
        Stopwatch wait = Stopwatch.StartNew();
        while (Members(job).Length != 0) {
            if (wait.ElapsedMilliseconds >= 5000) throw new TimeoutException("Owned job did not become empty");
            Thread.Sleep(10);
        }
    }
    public static Receipt Run(string command, string[] args, string cwd, uint timeout) {
        IntPtr job = IntPtr.Zero, input = IntPtr.Zero, output = IntPtr.Zero, error = IntPtr.Zero;
        ProcessInfo child = new ProcessInfo();
        bool assigned = false;
        try {
            // Anonymous object: there is no existing job to reopen or collide with.
            job = CreateJobObjectW(IntPtr.Zero, null);
            if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
            ExtendedLimits limits = new ExtendedLimits();
            limits.BasicLimitInformation.LimitFlags = 0x2000; // KILL_ON_JOB_CLOSE, no breakaway.
            Check(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(ExtendedLimits))));
            input = InheritableStandardHandle(-10);
            output = InheritableStandardHandle(-11);
            error = InheritableStandardHandle(-12);
            StartupInfo startup = new StartupInfo();
            startup.cb = (uint)Marshal.SizeOf(typeof(StartupInfo));
            startup.flags = 0x100; // STARTF_USESTDHANDLES
            startup.stdin = input; startup.stdout = output; startup.stderr = error;
            StringBuilder line = new StringBuilder(Quote(command));
            foreach (string arg in args) { line.Append(' '); line.Append(Quote(arg)); }
            Check(CreateProcessW(command, line, IntPtr.Zero, IntPtr.Zero, true, 0x08000004,
                IntPtr.Zero, cwd, ref startup, out child)); // CREATE_SUSPENDED | CREATE_NO_WINDOW
            Check(AssignProcessToJobObject(job, child.process));
            assigned = true;
            bool rootMember, supervisorMember;
            Check(IsProcessInJob(child.process, job, out rootMember));
            Check(IsProcessInJob(GetCurrentProcess(), job, out supervisorMember));
            if (!rootMember || supervisorMember) throw new InvalidOperationException("Invalid kernel Job ownership");
            if (ResumeThread(child.thread) == uint.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error());
            uint waited = WaitForSingleObject(child.process, timeout);
            if (waited != 0 && waited != 258) throw new Win32Exception(Marshal.GetLastWin32Error());
            Receipt receipt = new Receipt();
            receipt.rootAssignedToOwnedJob = rootMember;
            receipt.supervisorOutsideOwnedJob = !supervisorMember;
            receipt.pid = child.pid; receipt.timedOut = waited == 258;
            if (receipt.timedOut) {
                receipt.cleanupNeeded = true;
                Empty(job);
            } else {
                ulong[] members = Members(job);
                receipt.jobMemberPidsAtRootExit = Array.FindAll(members, pid => pid != child.pid);
                // A signalled root and the kernel's job membership update are not
                // one atomic event. Let already-exiting children leave naturally;
                // never declare success after forcibly terminating a leftover.
                Stopwatch drain = Stopwatch.StartNew();
                while (Array.Exists(members, pid => pid != child.pid) && drain.ElapsedMilliseconds < 250) {
                    Thread.Sleep(10);
                    members = Members(job);
                }
                receipt.naturalDrainMs = drain.ElapsedMilliseconds;
                receipt.jobMemberPidsObservedAfterExit = Array.FindAll(members, pid => pid != child.pid);
                // Names aid diagnosis only. Cleanup always uses the Job handle.
                receipt.jobMemberNamesObservedAfterExit = Array.ConvertAll(receipt.jobMemberPidsObservedAfterExit,
                    pid => { try { using (Process p = Process.GetProcessById((int)pid)) return p.ProcessName; }
                        catch (Exception e) { return "unavailable:" + e.GetType().Name; } });
                receipt.cleanupNeeded = receipt.jobMemberPidsObservedAfterExit.Length != 0;
                Empty(job);
            }
            Check(GetExitCodeProcess(child.process, out receipt.actualExitCode));
            receipt.ownedProcessesGoneAfterCleanup = Members(job).Length == 0;
            return receipt;
        } finally {
            // If assignment failed, only our still-suspended process handle is terminated.
            // Otherwise closing our sole Job handle kills the entire owned scope.
            if (child.process != IntPtr.Zero && !assigned) TerminateProcess(child.process, 1);
            if (job != IntPtr.Zero) CloseHandle(job);
            if (child.process != IntPtr.Zero) { WaitForSingleObject(child.process, 5000); CloseHandle(child.process); }
            if (child.thread != IntPtr.Zero) CloseHandle(child.thread);
            if (input != IntPtr.Zero) CloseHandle(input);
            if (output != IntPtr.Zero) CloseHandle(output);
            if (error != IntPtr.Zero) CloseHandle(error);
        }
    }
}
'@
    $env:TMP = $spec.temporaryDirectory
    $env:TEMP = $spec.temporaryDirectory
    $env:TMPDIR = $spec.temporaryDirectory
    $receipt = [OwnedWindowsJob]::Run($spec.command, [string[]]$spec.args, $spec.cwd, [uint32]$spec.timeoutMs)
} catch {
    $exception = $_.Exception
    while ($exception.InnerException) { $exception = $exception.InnerException }
    $receipt = @{ error = $exception.ToString(); nativeError = $exception.NativeErrorCode }
}
$json = ConvertTo-Json -InputObject $receipt -Depth 8 -Compress
[IO.File]::WriteAllText($spec.receipt, $json, (New-Object Text.UTF8Encoding($false)))
