// Names and STREAM_IS_URL checked against JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, standard/standard_6.php, standard_9.php, and standard_defines.php.
// PHP 7.2/8.5 availability checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const STANDARD_STREAM_WRAPPER_FUNCTIONS = [
  "stream_wrapper_register",
  "stream_register_wrapper",
  "stream_wrapper_unregister",
  "stream_wrapper_restore",
  "stream_bucket_make_writeable",
  "stream_bucket_prepend",
  "stream_bucket_append",
  "stream_bucket_new"
] as const;
export const STREAM_IS_URL = 1 as const;
