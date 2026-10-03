// Audited against JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, ftp/.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive upstream text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const FTP_FUNCTIONS = [
  'ftp_connect', 'ftp_ssl_connect', 'ftp_login', 'ftp_pwd', 'ftp_cdup', 'ftp_chdir',
  'ftp_exec', 'ftp_raw', 'ftp_mkdir', 'ftp_rmdir', 'ftp_chmod', 'ftp_alloc',
  'ftp_nlist', 'ftp_rawlist', 'ftp_mlsd', 'ftp_systype', 'ftp_pasv', 'ftp_get',
  'ftp_fget', 'ftp_put', 'ftp_append', 'ftp_fput', 'ftp_size', 'ftp_mdtm',
  'ftp_rename', 'ftp_delete', 'ftp_site', 'ftp_close', 'ftp_set_option',
  'ftp_get_option', 'ftp_nb_fget', 'ftp_nb_get', 'ftp_nb_continue',
  'ftp_nb_put', 'ftp_nb_fput', 'ftp_quit',
] as const;

const constants = `
const FTP_ASCII = 1;
const FTP_TEXT = 1;
const FTP_BINARY = 2;
const FTP_IMAGE = 2;
const FTP_AUTORESUME = -1;
const FTP_TIMEOUT_SEC = 0;
const FTP_AUTOSEEK = 1;
const FTP_USEPASVADDRESS = 2;
const FTP_FAILED = 0;
const FTP_FINISHED = 1;
const FTP_MOREDATA = 2;
`;

function php7Functions(modeOptional: boolean): string {
  const mode = modeOptional ? ' = FTP_BINARY' : '';
  return `
/** @return resource|false */ function ftp_connect($host, $port = 21, $timeout = 90) {}
/** @return resource|false */ function ftp_ssl_connect($host, $port = 21, $timeout = 90) {}
/** @return bool */ function ftp_login($ftp, $username, $password) {}
/** @return string|false */ function ftp_pwd($ftp) {}
/** @return bool */ function ftp_cdup($ftp) {}
/** @return bool */ function ftp_chdir($ftp, $directory) {}
/** @return bool */ function ftp_exec($ftp, $command) {}
/** @return array|null */ function ftp_raw($ftp, $command) {}
/** @return string|false */ function ftp_mkdir($ftp, $directory) {}
/** @return bool */ function ftp_rmdir($ftp, $directory) {}
/** @return int|false */ function ftp_chmod($ftp, $mode, $filename) {}
/** @return bool */ function ftp_alloc($ftp, $size, &$response = null) {}
/** @return array|false */ function ftp_nlist($ftp, $directory) {}
/** @return array|false */ function ftp_rawlist($ftp, $directory, $recursive = false) {}
/** @return array|false */ function ftp_mlsd($ftp, $directory) {}
/** @return string|false */ function ftp_systype($ftp) {}
/** @return bool */ function ftp_pasv($ftp, $pasv) {}
/** @return bool */ function ftp_get($ftp, $local_file, $remote_file, $mode${mode}, $resume_pos = 0) {}
/** @return bool */ function ftp_fget($ftp, $fp, $remote_file, $mode${mode}, $resumepos = 0) {}
/** @return bool */ function ftp_put($ftp, $remote_file, $local_file, $mode${mode}, $startpos = 0) {}
/** @return bool */ function ftp_append($ftp, $remote_file, $local_file, $mode${mode}) {}
/** @return bool */ function ftp_fput($ftp, $remote_file, $fp, $mode${mode}, $startpos = 0) {}
/** @return int */ function ftp_size($ftp, $filename) {}
/** @return int */ function ftp_mdtm($ftp, $filename) {}
/** @return bool */ function ftp_rename($ftp, $src, $dest) {}
/** @return bool */ function ftp_delete($ftp, $file) {}
/** @return bool */ function ftp_site($ftp, $cmd) {}
/** @return bool */ function ftp_close($ftp) {}
/** @return bool */ function ftp_set_option($ftp, $option, $value) {}
/** @return int|bool */ function ftp_get_option($ftp, $option) {}
/** @return int */ function ftp_nb_fget($ftp, $fp, $remote_file, $mode${mode}, $resumepos = 0) {}
/** @return int|false */ function ftp_nb_get($ftp, $local_file, $remote_file, $mode${mode}, $resume_pos = 0) {}
/** @return int */ function ftp_nb_continue($ftp) {}
/** @return int|false */ function ftp_nb_put($ftp, $remote_file, $local_file, $mode${mode}, $startpos = 0) {}
/** @return int */ function ftp_nb_fput($ftp, $remote_file, $fp, $mode${mode}, $startpos = 0) {}
/** @return bool */ function ftp_quit($ftp) {}
`;
}

function php8Functions(version: number): string {
  const ftp = version >= 81 ? '\\FTP\\Connection ' : '';
  const connection = version >= 81 ? '\\FTP\\Connection|false' : 'resource|false';
  const nativeConnection = version >= 81 ? `: ${connection}` : '';
  const connectionDoc = version >= 81 ? '' : '/** @return resource|false */ ';
  return `
${connectionDoc}function ftp_connect(string $hostname, int $port = 21, int $timeout = 90)${nativeConnection} {}
${connectionDoc}function ftp_ssl_connect(string $hostname, int $port = 21, int $timeout = 90)${nativeConnection} {}
function ftp_login(${ftp}$ftp, string $username, string $password): bool {}
function ftp_pwd(${ftp}$ftp): string|false {}
function ftp_cdup(${ftp}$ftp): bool {}
function ftp_chdir(${ftp}$ftp, string $directory): bool {}
function ftp_exec(${ftp}$ftp, string $command): bool {}
function ftp_raw(${ftp}$ftp, string $command): ?array {}
function ftp_mkdir(${ftp}$ftp, string $directory): string|false {}
function ftp_rmdir(${ftp}$ftp, string $directory): bool {}
function ftp_chmod(${ftp}$ftp, int $permissions, string $filename): int|false {}
function ftp_alloc(${ftp}$ftp, int $size, &$response = null): bool {}
function ftp_nlist(${ftp}$ftp, string $directory): array|false {}
function ftp_rawlist(${ftp}$ftp, string $directory, bool $recursive = false): array|false {}
function ftp_mlsd(${ftp}$ftp, string $directory): array|false {}
function ftp_systype(${ftp}$ftp): string|false {}
function ftp_pasv(${ftp}$ftp, bool $enable): bool {}
function ftp_get(${ftp}$ftp, string $local_filename, string $remote_filename, int $mode = FTP_BINARY, int $offset = 0): bool {}
/** @param resource $stream */ function ftp_fget(${ftp}$ftp, $stream, string $remote_filename, int $mode = FTP_BINARY, int $offset = 0): bool {}
function ftp_put(${ftp}$ftp, string $remote_filename, string $local_filename, int $mode = FTP_BINARY, int $offset = 0): bool {}
function ftp_append(${ftp}$ftp, string $remote_filename, string $local_filename, int $mode = FTP_BINARY): bool {}
/** @param resource $stream */ function ftp_fput(${ftp}$ftp, string $remote_filename, $stream, int $mode = FTP_BINARY, int $offset = 0): bool {}
function ftp_size(${ftp}$ftp, string $filename): int {}
function ftp_mdtm(${ftp}$ftp, string $filename): int {}
function ftp_rename(${ftp}$ftp, string $from, string $to): bool {}
function ftp_delete(${ftp}$ftp, string $filename): bool {}
function ftp_site(${ftp}$ftp, string $command): bool {}
function ftp_close(${ftp}$ftp): bool {}
function ftp_set_option(${ftp}$ftp, int $option, $value): ${version >= 85 ? 'true' : 'bool'} {}
function ftp_get_option(${ftp}$ftp, int $option): int|bool {}
/** @param resource $stream */ function ftp_nb_fget(${ftp}$ftp, $stream, string $remote_filename, int $mode = FTP_BINARY, int $offset = 0): int {}
function ftp_nb_get(${ftp}$ftp, string $local_filename, string $remote_filename, int $mode = FTP_BINARY, int $offset = 0): int|false {}
function ftp_nb_continue(${ftp}$ftp): int {}
function ftp_nb_put(${ftp}$ftp, string $remote_filename, string $local_filename, int $mode = FTP_BINARY, int $offset = 0): int|false {}
/** @param resource $stream */ function ftp_nb_fput(${ftp}$ftp, string $remote_filename, $stream, int $mode = FTP_BINARY, int $offset = 0): int {}
function ftp_quit(${ftp}$ftp): bool {}
`;
}

export function auditedFtpStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  return constants + (target < 80 ? php7Functions(target >= 73) : php8Functions(target))
    + (target >= 81 ? '\nnamespace FTP { final class Connection {} }\n' : '');
}
