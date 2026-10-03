// Names and constants checked against JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, standard/standard_0.php, standard_4.php, standard_6.php, standard_7.php, standard_8.php, and standard_defines.php.
// Version availability and values checked against PHP 7.2/7.4/8.1/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const STANDARD_UTILITY_FUNCTIONS = [
  "highlight_file",
  "show_source",
  "php_strip_whitespace",
  "highlight_string",
  "connection_aborted",
  "connection_status",
  "ignore_user_abort",
  "get_browser",
  "get_meta_tags",
  "image_type_to_mime_type",
  "image_type_to_extension",
  "getimagesize",
  "getimagesizefromstring",
  "iptcembed",
  "iptcparse",
  "mail",
  "pack",
  "unpack",
  "ezmlm_hash"
] as const;
export const STANDARD_UTILITY_CONSTANTS = {
  "CONNECTION_NORMAL": 0,
  "CONNECTION_ABORTED": 1,
  "CONNECTION_TIMEOUT": 2,
  "IMAGETYPE_GIF": 1,
  "IMAGETYPE_JPEG": 2,
  "IMAGETYPE_PNG": 3,
  "IMAGETYPE_BMP": 6,
  "IMAGETYPE_WEBP": 18,
  "IMAGETYPE_AVIF": 19,
  "IMAGETYPE_HEIF": 20
} as const;
