from pathlib import Path
import argparse
import datetime
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser()
parser.add_argument('--evidence', required=True)
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ['--'] else args.command
assert command
evidence = Path(args.evidence)
assert not evidence.exists()
evidence.mkdir(parents=True)
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
xvfb = Path(shutil.which('Xvfb')).resolve()
xset = Path(shutil.which('xset')).resolve()
number = next(n for n in range(200, 5000)
              if not Path(f'/tmp/.X11-unix/X{n}').exists() and not Path(f'/tmp/.X{n}-lock').exists())
authority_directory = Path(tempfile.mkdtemp(prefix='sophp-owned-display-'))
authority = authority_directory / 'authority'
authority.touch(mode=0o600)
server_command = [str(xvfb), f':{number}', '-screen', '0', '1280x1024x24',
                  '-nolisten', 'tcp', '-auth', str(authority)]
record = dict(status='starting-owned-display',
              startedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              display=f':{number}', command=command, cwd=os.getcwd(),
              serverBinary=str(xvfb), serverSha256=sha(xvfb),
              healthBinary=str(xset), healthBinarySha256=sha(xset),
              usesDedicatedAuthority=True, authorityDirectory=str(authority_directory),
              serverArgv=server_command, exitCode=1)
record_path = evidence / 'display-run.json'
save = lambda: record_path.write_text(json.dumps(record, indent=2) + '\n')
save()
server = None
child = None

def start_ticks(pid):
    return Path('/proc', str(pid), 'stat').read_text().rpartition(')')[2].split()[19]

def identity(pid):
    proc = Path('/proc', str(pid))
    raw = (proc / 'cmdline').read_bytes()
    if not raw:
        return None
    return dict(argv=[os.fsdecode(value) for value in raw.split(b'\0')[:-1]],
                executable=os.readlink(proc / 'exe'), startTicks=start_ticks(pid),
                commandSha256=hashlib.sha256(raw).hexdigest())

def matches(value):
    return bool(value and value['argv'] == server_command and value['executable'] == str(xvfb)
                and value['startTicks'] == record['serverStartTicks'])

try:
    # Keep the cookie off command lines and out of evidence.
    setup = subprocess.run(['xauth', '-f', str(authority), 'source', '-'],
                           input=f'add :{number} MIT-MAGIC-COOKIE-1 {secrets.token_hex(16)}\n',
                           text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert setup.returncode == 0, 'Could not prepare dedicated display authority'
    environment = {**os.environ, 'DISPLAY': f':{number}', 'XAUTHORITY': str(authority)}
    with (evidence / 'xserver.log').open('x') as log:
        server = subprocess.Popen(server_command, stdout=log, stderr=subprocess.STDOUT, env=environment)
    record.update(serverPid=server.pid, serverStartTicks=start_ticks(server.pid))
    save()
    deadline = time.monotonic() + 5
    observed = None
    attempts = 0
    while time.monotonic() < deadline and server.poll() is None:
        attempts += 1
        try:
            observed = identity(server.pid)
        except (FileNotFoundError, ProcessLookupError):
            observed = None
        if matches(observed):
            break
        time.sleep(0.01)
    assert matches(observed), 'Owned X server did not establish its exact post-exec identity'
    record.update(serverCommandIdentity=observed['commandSha256'],
                  serverExecutable=observed['executable'], identityCapturedAfterExec=True,
                  serverIdentityAttempts=attempts)
    save()
    healthy = False
    while time.monotonic() < deadline and server.poll() is None:
        health = subprocess.run([str(xset), '-display', f':{number}', 'q'], env=environment,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if health.returncode == 0:
            healthy = True
            break
        time.sleep(0.05)
    assert healthy, 'Owned X server did not pass authenticated xset query'
    record.update(status='running', authenticatedDisplayHealthPassed=True,
                  displayHealthSha256=hashlib.sha256(health.stdout).hexdigest())
    save()
    print(json.dumps({key: record[key] for key in
                     ['status', 'display', 'serverPid', 'authenticatedDisplayHealthPassed']}), flush=True)
    child = subprocess.Popen(command, env=environment)
    record['childPid'] = child.pid
    save()
    record.update(status='child-exited', exitCode=child.wait())
except Exception as error:
    record.update(exitCode=1, error=repr(error))
finally:
    if child is not None and child.poll() is None:
        record.update(status='error-with-live-child', exitCode=1,
                      cleanupError='Preserve live child, owned display and authority.')
    elif server is not None and server.poll() is None:
        try:
            current = identity(server.pid)
            assert matches(current), 'Owned server identity changed before cleanup'
            if 'serverCommandIdentity' in record:
                assert current['commandSha256'] == record['serverCommandIdentity']
            record['identityVerifiedBeforeTermination'] = True
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                assert matches(identity(server.pid)), 'Owned server identity changed before kill'
                server.kill()
                server.wait()
        except Exception as error:
            record.update(exitCode=1, cleanupError=repr(error))
    if server is not None:
        record['serverExitCode'] = server.poll()
    live_server = server is not None and server.poll() is None
    live_child = child is not None and child.poll() is None
    if live_server or live_child:
        record['status'] = 'error-with-live-child' if live_child else 'error-with-live-server'
        record['authorityDirectoryRemoved'] = False
    else:
        shutil.rmtree(authority_directory)
        record.update(status='exited', authorityDirectoryRemoved=True)
    record['finishedAtUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save()
raise SystemExit(record['exitCode'])
