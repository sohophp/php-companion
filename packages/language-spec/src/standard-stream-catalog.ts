// Names checked against JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, standard/standard_6.php and standard/standard_9.php.
// Constant values and PHP 7.2/8.5 availability checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const STANDARD_STREAM_FUNCTIONS = [
  "stream_context_create",
  "stream_context_set_params",
  "stream_context_get_params",
  "stream_context_set_option",
  "stream_context_set_options",
  "stream_context_get_options",
  "stream_context_get_default",
  "stream_context_set_default",
  "stream_filter_prepend",
  "stream_filter_append",
  "stream_filter_remove",
  "stream_get_filters",
  "stream_filter_register"
] as const;
export const STANDARD_STREAM_CONSTANTS = {
  "STREAM_FILTER_READ": 1,
  "STREAM_FILTER_WRITE": 2,
  "STREAM_FILTER_ALL": 3
} as const;
