import type { SupportedPhpVersion } from './index.js';

export interface SysvMsgRuntimeConstants { MSG_EAGAIN?: number; MSG_ENOMSG?: number }

export function normalizeSysvMsgRuntimeConstants(value: unknown): SysvMsgRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const names = ['MSG_EAGAIN', 'MSG_ENOMSG'] as const;
  if (!Object.keys(input).length || Object.keys(input).some((name) => !names.includes(name as typeof names[number]))) return undefined;
  if (Object.values(input).some((item) => typeof item !== 'number' || !Number.isSafeInteger(item) || item < 0 || item > 2_147_483_647)) return undefined;
  return Object.fromEntries(names.filter((name) => input[name] !== undefined).map((name) => [name, input[name]]));
}

// Names come from the pinned phpstorm-stubs sysvmsg, sysvsem and sysvshm catalogs.
// PHP 8 signatures are audited against local PHP 8.1 and 8.5 reflection.
export function auditedSysvIpcStub(version: SupportedPhpVersion, extension: 'sysvmsg' | 'sysvsem' | 'sysvshm', runtime?: SysvMsgRuntimeConstants): string {
  const major = Number(version.split('.')[0]);
  const php80 = major >= 8;
  if (extension === 'sysvmsg') {
    const queue = php80 ? 'SysvMessageQueue ' : '';
    const constants = normalizeSysvMsgRuntimeConstants(runtime);
    return `${php80 ? 'final class SysvMessageQueue { private function __construct() {} }\n' : ''}
${Object.entries(constants ?? {}).map(([name, value]) => `const ${name} = ${value};`).join('\n')}
const MSG_IPC_NOWAIT = 1;
const MSG_NOERROR = 2;
const MSG_EXCEPT = 4;
/** @return ${php80 ? 'SysvMessageQueue|false' : 'resource|false'} */ function msg_get_queue(int $key, int $permissions = 0666)${php80 ? ': SysvMessageQueue|false' : ''} {}
/** @param ${php80 ? 'SysvMessageQueue' : 'resource'} $queue */ function msg_send(${queue}$queue, int $message_type, $message, bool $serialize = true, bool $blocking = true, &$error_code = null): bool {}
/** @param ${php80 ? 'SysvMessageQueue' : 'resource'} $queue */ function msg_receive(${queue}$queue, int $desired_message_type, &$received_message_type, int $max_message_size, ${php80 ? 'mixed ' : ''}&$message, bool $unserialize = true, int $flags = 0, &$error_code = null): bool {}
/** @param ${php80 ? 'SysvMessageQueue' : 'resource'} $queue */ function msg_remove_queue(${queue}$queue): bool {}
/** @param ${php80 ? 'SysvMessageQueue' : 'resource'} $queue
 * @return array|false */ function msg_stat_queue(${queue}$queue)${php80 ? ': array|false' : ''} {}
/** @param ${php80 ? 'SysvMessageQueue' : 'resource'} $queue */ function msg_set_queue(${queue}$queue, array $data): bool {}
function msg_queue_exists(int $key): bool {}
`;
  }
  if (extension === 'sysvsem') {
    const semaphore = php80 ? 'SysvSemaphore ' : '';
    return `${php80 ? 'final class SysvSemaphore { private function __construct() {} }\n' : ''}
/** @return ${php80 ? 'SysvSemaphore|false' : 'resource|false'} */ function sem_get(int $key, int $max_acquire = 1, int $permissions = 0666, bool $auto_release = true)${php80 ? ': SysvSemaphore|false' : ''} {}
/** @param ${php80 ? 'SysvSemaphore' : 'resource'} $semaphore */ function sem_acquire(${semaphore}$semaphore, bool $non_blocking = false): bool {}
/** @param ${php80 ? 'SysvSemaphore' : 'resource'} $semaphore */ function sem_release(${semaphore}$semaphore): bool {}
/** @param ${php80 ? 'SysvSemaphore' : 'resource'} $semaphore */ function sem_remove(${semaphore}$semaphore): bool {}
`;
  }
  const shm = php80 ? 'SysvSharedMemory ' : '';
  return `${php80 ? 'final class SysvSharedMemory { private function __construct() {} }\n' : ''}
/** @return ${php80 ? 'SysvSharedMemory|false' : 'resource|false'} */ function shm_attach(int $key, ?int $size = null, int $permissions = 0666)${php80 ? ': SysvSharedMemory|false' : ''} {}
/** @param ${php80 ? 'SysvSharedMemory' : 'resource'} $shm */ function shm_detach(${shm}$shm)${php80 ? `: ${Number(version.replace('.', '')) >= 85 ? 'true' : 'bool'}` : ': bool'} {}
/** @param ${php80 ? 'SysvSharedMemory' : 'resource'} $shm */ function shm_has_var(${shm}$shm, int $key): bool {}
/** @param ${php80 ? 'SysvSharedMemory' : 'resource'} $shm */ function shm_remove(${shm}$shm): bool {}
/** @param ${php80 ? 'SysvSharedMemory' : 'resource'} $shm */ function shm_put_var(${shm}$shm, int $key, ${php80 ? 'mixed ' : ''}$value): bool {}
/** @param ${php80 ? 'SysvSharedMemory' : 'resource'} $shm */ function shm_get_var(${shm}$shm, int $key)${php80 ? ': mixed' : ''} {}
/** @param ${php80 ? 'SysvSharedMemory' : 'resource'} $shm */ function shm_remove_var(${shm}$shm, int $key): bool {}
`;
}
