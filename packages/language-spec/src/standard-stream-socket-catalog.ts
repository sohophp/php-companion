// Names and constant values checked against JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, standard/standard_6.php and standard/standard_defines.php.
// PHP 7.2/8.5 exports checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const STANDARD_STREAM_SOCKET_FUNCTIONS = [
  "stream_socket_client",
  "stream_socket_server",
  "stream_socket_accept",
  "stream_socket_get_name",
  "stream_socket_recvfrom",
  "stream_socket_sendto",
  "stream_socket_enable_crypto",
  "stream_socket_shutdown",
  "stream_socket_pair"
] as const;
export const STANDARD_STREAM_SOCKET_CONSTANTS = {
  "STREAM_CLIENT_PERSISTENT": 1,
  "STREAM_CLIENT_ASYNC_CONNECT": 2,
  "STREAM_CLIENT_CONNECT": 4,
  "STREAM_SERVER_BIND": 4,
  "STREAM_SERVER_LISTEN": 8,
  "STREAM_SHUT_RD": 0,
  "STREAM_SHUT_WR": 1,
  "STREAM_SHUT_RDWR": 2,
  "STREAM_PEEK": 2,
  "STREAM_OOB": 1,
  "STREAM_PF_INET": 2,
  "STREAM_SOCK_STREAM": 1,
  "STREAM_IPPROTO_TCP": 6
} as const;
