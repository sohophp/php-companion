from pathlib import Path
import argparse
import hashlib
import json
import runpy
import shutil
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--script', default=str(Path(__file__).with_name('owned-display.py')))
parser.add_argument('--evidence', required=True)
parser.add_argument('--expect', choices=['new-pass', 'cleanup-rejected'], required=True)
options = parser.parse_args()
evidence = Path(options.evidence).resolve()
assert not evidence.exists()
real_read = Path.read_bytes
real_popen = subprocess.Popen
owned = []
state = dict(emptyReadsInjected=0, cleanupMismatchInjected=0)

def capture_popen(*args, **kwargs):
    process = real_popen(*args, **kwargs)
    owned.append(process)
    return process

def injected_read(path):
    servers = [p for p in owned if isinstance(p.args, list) and Path(p.args[0]).name == 'Xvfb']
    if servers and path == Path('/proc', str(servers[0].pid), 'cmdline'):
        if not state['emptyReadsInjected']:
            state['emptyReadsInjected'] = 1
            return b''
        workers = [p for p in owned if isinstance(p.args, list) and p.args[:2] == [sys.executable, '-c']]
        if options.expect == 'cleanup-rejected' and workers and workers[0].poll() is not None and not state['cleanupMismatchInjected']:
            state['cleanupMismatchInjected'] = 1
            return b'unexpected-process\0'
    return real_read(path)

subprocess.Popen = capture_popen
Path.read_bytes = injected_read
sys.argv = [options.script, '--evidence', str(evidence), '--', sys.executable, '-c', 'pass']
result = dict(script=str(Path(options.script).resolve()),
              scriptSha256=hashlib.sha256(real_read(Path(options.script))).hexdigest(),
              expected=options.expect)
try:
    runpy.run_path(options.script, run_name='__main__')
except BaseException as error:
    result['exceptionType'] = type(error).__name__
    result['exception'] = str(error)
    result['exitCode'] = error.code if isinstance(error, SystemExit) else 1
finally:
    Path.read_bytes = real_read
    subprocess.Popen = real_popen
    result.update(state)
    result['displayRecord'] = json.loads((evidence / 'display-run.json').read_text())
    result['liveServerBeforeHarnessCleanup'] = any(p.poll() is None for p in owned
                                                  if isinstance(p.args, list) and Path(p.args[0]).name == 'Xvfb')
    result['retainedAuthorityBeforeHarnessCleanup'] = Path(result['displayRecord'].get('authorityDirectory', '/missing')).exists()
    for process in owned:
        if process.poll() is None:
            # Retain the actual Popen child handle; never select an unrelated PID.
            assert isinstance(process.args, list) and Path(process.args[0]).name == 'Xvfb'
            current = Path('/proc', str(process.pid))
            assert current.joinpath('exe').resolve() == Path(process.args[0]).resolve()
            actual = real_read(current / 'cmdline').split(b'\0')[:-1]
            assert actual == [str(value).encode() for value in process.args]
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    authority = result['displayRecord'].get('authorityDirectory')
    if authority and Path(authority).exists():
        servers = [p for p in owned if isinstance(p.args, list) and Path(p.args[0]).name == 'Xvfb']
        assert servers and Path(servers[0].args[-1]).parent == Path(authority)
        assert Path(authority).name.startswith('sophp-owned-display-')
        shutil.rmtree(authority)
    result['ownedProcessIds'] = [p.pid for p in owned]
    result['actualOwnedProcessesGone'] = all(not Path('/proc', str(p.pid)).exists() for p in owned)
    assert result['actualOwnedProcessesGone'] and result['emptyReadsInjected'] == 1
    record = result['displayRecord']
    if options.expect == 'new-pass':
        assert result['exceptionType'] == 'SystemExit' and result['exitCode'] == 0
        assert record['serverCommandIdentity'] != hashlib.sha256(b'').hexdigest()
        assert record['identityCapturedAfterExec'] and record['identityVerifiedBeforeTermination']
        assert record['authorityDirectoryRemoved'] and record['serverStartTicks']
    else:
        assert result['exceptionType'] == 'SystemExit' and result['exitCode'] == 1
        assert result['cleanupMismatchInjected'] == 1 and record['cleanupError']
        assert record['status'] == 'error-with-live-server'
        assert result['liveServerBeforeHarnessCleanup'] and result['retainedAuthorityBeforeHarnessCleanup']
    result['controlPassed'] = True
    (evidence / 'control-result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(expected=options.expect, controlPassed=True,
                     actualOwnedProcessesGone=result['actualOwnedProcessesGone'])))
