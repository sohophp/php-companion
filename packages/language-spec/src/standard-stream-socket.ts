import { STANDARD_STREAM_SOCKET_CONSTANTS, STANDARD_STREAM_SOCKET_FUNCTIONS } from './standard-stream-socket-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardStreamSocketStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const declarations: Record<(typeof STANDARD_STREAM_SOCKET_FUNCTIONS)[number], string> = {
    stream_socket_client: php80
      ? `/** @param resource|null $context
 * @return resource|false */ function stream_socket_client(string $address, &$error_code = null, &$error_message = null, ?float $timeout = null, int $flags = STREAM_CLIENT_CONNECT, $context = null) {}`
      : `/** @param string $remoteaddress
 * @param resource|null $context
 * @return resource|false */ function stream_socket_client($remoteaddress, &$errcode = null, &$errstring = null, $timeout = null, $flags = STREAM_CLIENT_CONNECT, $context = null) {}`,
    stream_socket_server: php80
      ? `/** @param resource|null $context
 * @return resource|false */ function stream_socket_server(string $address, &$error_code = null, &$error_message = null, int $flags = STREAM_SERVER_BIND|STREAM_SERVER_LISTEN, $context = null) {}`
      : `/** @param string $localaddress
 * @param resource|null $context
 * @return resource|false */ function stream_socket_server($localaddress, &$errcode = null, &$errstring = null, $flags = STREAM_SERVER_BIND|STREAM_SERVER_LISTEN, $context = null) {}`,
    stream_socket_accept: php80
      ? `/** @param resource $socket
 * @return resource|false */ function stream_socket_accept($socket, ?float $timeout = null, &$peer_name = null) {}`
      : `/** @param resource $serverstream
 * @return resource|false */ function stream_socket_accept($serverstream, $timeout = null, &$peername = null) {}`,
    stream_socket_get_name: php80
      ? '/** @param resource $socket */ function stream_socket_get_name($socket, bool $remote): string|false {}'
      : `/** @param resource $stream
 * @param bool $want_peer
 * @return string|false */ function stream_socket_get_name($stream, $want_peer) {}`,
    stream_socket_recvfrom: php80
      ? '/** @param resource $socket */ function stream_socket_recvfrom($socket, int $length, int $flags = 0, &$address = null): string|false {}'
      : `/** @param resource $stream
 * @param int $amount
 * @return string|false */ function stream_socket_recvfrom($stream, $amount, $flags = 0, &$remote_addr = null) {}`,
    stream_socket_sendto: php80
      ? `/** @param resource $socket */ function stream_socket_sendto($socket, string $data, int $flags = 0, string $address = ''): int|false {}`
      : `/** @param resource $stream
 * @param string $data
 * @return int|false */ function stream_socket_sendto($stream, $data, $flags = 0, $target_addr = '') {}`,
    stream_socket_enable_crypto: php80
      ? `/** @param resource $stream
 * @param resource|null $session_stream */ function stream_socket_enable_crypto($stream, bool $enable, ?int $crypto_method = null, $session_stream = null): int|bool {}`
      : `/** @param resource $stream
 * @param bool $enable
 * @return int|bool */ function stream_socket_enable_crypto($stream, $enable, $cryptokind = null, $sessionstream = null) {}`,
    stream_socket_shutdown: php80
      ? '/** @param resource $stream */ function stream_socket_shutdown($stream, int $mode): bool {}'
      : `/** @param resource $stream
 * @param int $how
 * @return bool */ function stream_socket_shutdown($stream, $how) {}`,
    stream_socket_pair: php80
      ? '/** @return array{resource, resource}|false */ function stream_socket_pair(int $domain, int $type, int $protocol): array|false {}'
      : `/** @param int $domain
 * @param int $type
 * @param int $protocol
 * @return array{resource, resource}|false */ function stream_socket_pair($domain, $type, $protocol) {}`,
  };
  const constants = Object.entries(STANDARD_STREAM_SOCKET_CONSTANTS)
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  return `${constants}\n${STANDARD_STREAM_SOCKET_FUNCTIONS.map((name) => declarations[name]).join('\n')}\n`;
}
