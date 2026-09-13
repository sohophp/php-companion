<?php

namespace App\Controller;

function formatDate(\DateTimeImmutable $date): string
{
    return $date->format('c');
}

function describeFailure(\RuntimeException $error): string
{
    return $error->getMessage();
}

function invalidFailure(): \InvalidArgumentException
{
    return new \InvalidArgumentException(message: 'invalid', code: 2);
}

function resumeGenerator(\Generator $generator): void
{
    $generator->next();
}

function countValues(\Countable $values): int
{
    return $values->count();
}

function dateOccurrences(\DatePeriod $period): void
{
    foreach ($period as $occurrence) {
        $occurrence->format('c');
    }
}

function recurringPeriod(\DateTimeInterface $start, \DateInterval $interval): \DatePeriod
{
    return new \DatePeriod($start, $interval, 2);
}

function joinedLabels(): string
{
    return implode('-', ['first', 'second']);
}

function translatedLabel(): string
{
    return strtr('abc', ['a' => 'x']);
}

/** @param resource $stream */
function exerciseCompleteStrings($stream): void
{
    addcslashes('fixture', 'a..z');
    addslashes("fixture's");
    chop("fixture\n");
    chr(65);
    chunk_split('fixture', 2, '-');
    convert_uudecode(convert_uuencode('fixture'));
    count_chars('abca', 1);
    count_chars('abca', 3);
    crc32('fixture');
    crypt('fixture', '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG');
    fprintf($stream, '%s', 'fixture');
    get_html_translation_table(HTML_ENTITIES, ENT_QUOTES | ENT_HTML5);
    hebrev('fixture');
    levenshtein('fixture', 'feature');
    localeconv();
    md5('fixture');
    md5_file('/tmp/data');
    metaphone('fixture');
    nl_langinfo(0);
    number_format(1234.5, 2, '.', ',');
    ord('A');
    printf('%s', 'fixture');
    quoted_printable_decode('fixture');
    quoted_printable_encode('fixture');
    quotemeta('fixture');
    setlocale(0, 'C');
    sha1('fixture');
    sha1_file('/tmp/data');
    similar_text('fixture', 'feature', $percent);
    soundex('fixture');
    sscanf('42', '%d', $number);
    str_decrement('BA');
    str_getcsv('a,b');
    str_increment('AZ');
    str_repeat('x', 2);
    str_rot13('fixture');
    str_shuffle('fixture');
    str_word_count('one two', 0);
    str_word_count('one two', 1);
    str_word_count('one two', 2);
    strchr('fixture', 'x');
    strcoll('fixture', 'feature');
    strcspn('fixture', 'xyz');
    strip_tags('<p>fixture</p>');
    stripcslashes('fixture');
    stripslashes('fixture');
    stristr('fixture', 'X');
    strpbrk('fixture', 'xyz');
    strrchr('fixture', 'x', true);
    strspn('fixture', 'a..z');
    strstr('fixture', 'x');
    strtok('a,b', ',');
    strtok(',');
    substr_compare('fixture', 'fix', 0);
    substr_count('fixture', 't');
    substr_replace('fixture', 'x', 1);
    substr_replace(['fixture'], 'x', 1);
    utf8_decode('fixture');
    utf8_encode('fixture');
    vfprintf($stream, '%s', ['fixture']);
    vprintf('%s', ['fixture']);
    STR_PAD_LEFT;
}

function encodePayload(array $payload): string|false
{
    return json_encode($payload, JSON_THROW_ON_ERROR);
}

function decodePayload(string $json): mixed
{
    return json_decode($json, associative: true);
}

function validatePayload(string $json): bool
{
    return json_validate($json);
}

function readPayloadFile(string $path): string|false
{
    return file_get_contents($path);
}

function writePayloadFile(string $path, string $payload): int|false
{
    return file_put_contents($path, $payload, FILE_APPEND | LOCK_EX);
}

function inspectPayloadPath(string $path): array|string
{
    return pathinfo($path);
}

function exerciseDirectoryHandling(): void
{
    chdir('.');
    chroot('/');
    getcwd();
    $directory = dir('.');
    if ($directory !== false) {
        $directory->path;
        $directory->handle;
        $directory->read();
        $directory->rewind();
        $directory->close();
    }
    $handle = opendir('.');
    if ($handle !== false) {
        readdir($handle);
        rewinddir($handle);
        closedir($handle);
    }
    scandir('.', SCANDIR_SORT_ASCENDING);
    SCANDIR_SORT_DESCENDING;
    SCANDIR_SORT_NONE;
}

function exerciseProgramExecution(): void
{
    escapeshellarg('fixture');
    escapeshellcmd('echo fixture');
    exec('echo fixture', $output, $resultCode);
    passthru('echo fixture', $passthruCode);
    $process = proc_open(['php', '-v'], [1 => ['pipe', 'w']], $pipes);
    if ($process !== false) {
        proc_get_status($process);
        proc_terminate($process);
        proc_close($process);
    }
    proc_nice(1);
    shell_exec('echo fixture');
    system('echo fixture', $systemCode);
}

function exerciseFilesystemMetadata(string $path): void
{
    stat($path);
    lstat($path);
    fileatime($path);
    filectime($path);
    filegroup($path);
    fileinode($path);
    filemtime($path);
    fileowner($path);
    fileperms($path);
    filetype($path);
    is_executable($path);
    is_link($path);
    is_uploaded_file($path);
    chown($path, 1000);
    chgrp($path, 1000);
    lchown($path, 1000);
    lchgrp($path, 1000);
    chmod($path, 0644);
    touch($path);
    clearstatcache(true, $path);
    disk_total_space($path);
    disk_free_space($path);
    diskfreespace($path);
    realpath_cache_get();
    realpath_cache_size();
    rmdir($path);
    readlink($path);
    linkinfo($path);
    symlink($path, $path . '.link');
    link($path, $path . '.hard');
    tempnam($path, 'php');
    umask();
    move_uploaded_file($path, $path . '.moved');
}

/** @param resource $stream */
function exerciseFilesystemStreams($stream): void
{
    feof($stream);
    fflush($stream);
    fgetc($stream);
    fgets($stream);
    fgetcsv($stream);
    fputcsv($stream, ['first', 'second']);
    file('/tmp/data', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    flock($stream, LOCK_SH | LOCK_NB, $wouldBlock);
    fnmatch('*.php', 'index.php');
    fpassthru($stream);
    fscanf($stream, '%d', $number);
    fseek($stream, 0, SEEK_SET);
    fstat($stream);
    ftell($stream);
    ftruncate($stream, 0);
    fsync($stream);
    fdatasync($stream);
    parse_ini_file('/tmp/config.ini', scanner_mode: INI_SCANNER_TYPED);
    parse_ini_string('ready=true', scanner_mode: INI_SCANNER_RAW);
    $process = popen('php -v', 'r');
    if ($process !== false) {
        pclose($process);
    }
    readfile('/tmp/data');
    rewind($stream);
    set_file_buffer($stream, 0);
    tmpfile();
}

function encodeStoredState(array $state): string
{
    return base64_encode(serialize($state));
}

function decodeStoredState(string $encoded): mixed
{
    $serialized = base64_decode($encoded, true);
    if ($serialized === false) {
        return null;
    }

    return unserialize($serialized);
}

function parseEndpoint(string $url): array|false
{
    return parse_url($url);
}

function endpointQuery(array $parameters): string
{
    return http_build_query($parameters, encoding_type: PHP_QUERY_RFC3986);
}

function loadPdoRow(\PDO $pdo): object|false
{
    $statement = $pdo->prepare('SELECT id FROM users WHERE active = :active');
    if ($statement === false) {
        return false;
    }

    $statement->bindValue(':active', true, \PDO::PARAM_BOOL);
    $statement->execute();

    return $statement->fetchObject();
}

function pdoQueryText(\PDOStatement $statement): string
{
    return $statement->queryString;
}

function connectPdo(): \PDO
{
    return \PDO::connect('sqlite::memory:');
}

function inspectReflection(): string
{
    $class = new \ReflectionClass(\DateTimeImmutable::class);
    $instance = $class->newInstance('now');
    $formatted = $instance->format('Y-m-d');
    $method = $class->getMethod('format');
    foreach ($method->getParameters() as $parameter) {
        $parameter->getType();
    }
    $property = new \ReflectionProperty(\DateTimeImmutable::class, 'date');
    \ReflectionMethod::createFromMethodName(\DateTimeImmutable::class . '::format');
    $class->newLazyGhost(static fn (): \DateTimeImmutable => new \DateTimeImmutable());

    return $formatted . $property->getMangledName();
}

function reflectionConstantName(\ReflectionClassConstant $constant): string
{
    return $constant->getName();
}

/** @return list<\ReflectionEnumUnitCase> */
function reflectionEnumCases(\ReflectionEnum $enum): array
{
    return $enum->getCases();
}

/** @return list<string> */
function multibyteParts(string $value): array
{
    $parts = mb_str_split(mb_trim($value), 1, 'UTF-8');
    mb_strlen($value, 'UTF-8');
    mb_ereg_search_pos('^[[:alpha:]]+', 'm');

    return $parts;
}

function inspectSimpleXml(string $source): string
{
    $xml = simplexml_load_string($source);
    if ($xml === false) {
        return '';
    }
    foreach ($xml as $child) {
        $child->getName();
    }
    $errors = libxml_get_errors();
    foreach ($errors as $error) {
        $error->message;
    }
    libxml_set_external_entity_loader(null);
    $parser = xml_parser_create();
    xml_parser_set_option($parser, XML_OPTION_PARSE_HUGE, true);
    xml_set_element_handler($parser, null, null);
    $values = [];
    $index = [];
    xml_parse_into_struct($parser, $source, $values, $index);
    $option = xml_parser_get_option($parser, XML_OPTION_CASE_FOLDING);
    $error = xml_error_string(xml_get_error_code($parser));
    xml_parser_free($parser);

    return $xml->getName() . (string) LIBXML_RECOVER . (string) $option . (string) $error;
}

function roundTripXml(string $source): string
{
    $reader = \XMLReader::fromString($source);
    $reader->read();
    $name = $reader->localName;
    $reader->getAttribute('id');
    $reader->close();
    $writer = \XMLWriter::toMemory();
    $writer->startDocument();
    $writer->writeElement('root', $name);
    $objectOutput = $writer->outputMemory();
    $procedural = xmlwriter_open_memory();
    if ($procedural === false) {
        return $objectOutput;
    }
    xmlwriter_set_indent($procedural, true);
    xmlwriter_write_element($procedural, 'root', $name);

    return $objectOutput . xmlwriter_output_memory($procedural) . (string) \XMLReader::ELEMENT;
}

function inspectClassicDom(string $source, \SimpleXMLElement $simple): string
{
    $document = new \DOMDocument();
    $document->loadXML($source);
    $root = $document->documentElement;
    if ($root === null) {
        return '';
    }
    $element = $document->createElement('item');
    if ($element === false) {
        return '';
    }
    $element->setAttribute('id', 'one');
    $root->appendChild($element);
    $nodes = $document->getElementsByTagName('item');
    $nodes->item(0);
    $xpath = new \DOMXPath($document);
    $xpath->query('//item');
    dom_import_simplexml($simple);
    $reader = \XMLReader::fromString($source);
    $reader->read();
    $expanded = $reader->expand();
    if ($expanded !== false) {
        $expanded->getRootNode();
    }
    $element->getAttributeNames();
    $element->className;
    $element->compareDocumentPosition($root);
    \DOMNode::DOCUMENT_POSITION_FOLLOWING;
    \DOMXPath::quote('item');

    return $document->saveXML() ?: '';
}

function inspectModernDom(string $source, \SimpleXMLElement $simple): string
{
    $document = \Dom\HTMLDocument::createFromString($source);
    $root = $document->documentElement;
    if ($root === null) {
        return '';
    }
    $root->querySelector('main');
    $nodes = $root->querySelectorAll('.item');
    $nodes->item(0);
    $classes = $root->classList;
    $classes->add('ready');
    $xpath = new \Dom\XPath($document);
    $xpath->evaluate('//main');
    \Dom\import_simplexml($simple);
    $root->getElementsByClassName('item');
    $root->insertAdjacentHTML(\Dom\AdjacentPosition::BeforeEnd, '<span></span>');
    $root->outerHTML;
    \Dom\Node::DOCUMENT_POSITION_FOLLOWING;

    return $document->saveHtml();
}

final class PipeInput
{
}

final class PipeMiddle
{
}

final class PipeOutput
{
    public function pipeOutput(): void
    {
    }
}

function pipeToMiddle(PipeInput $value): PipeMiddle
{
    return new PipeMiddle();
}

function pipeToOutput(PipeMiddle $value): PipeOutput
{
    return new PipeOutput();
}

function pipeWrong(string $value): PipeOutput
{
    return new PipeOutput();
}

function inspectPipe(PipeInput $input): void
{
    $result = $input |> pipeToMiddle(...) |> pipeToOutput(...);
    $result->pipeOutput();
    $invalid = $input |> pipeWrong(...);
    $invalid->pipeOutput();
}

final class CloneInput
{
    public string $name;

    public function cloneInput(): void
    {
    }
}

function inspectCloneWith(CloneInput $input, CloneInput|null $nullable): void
{
    $copy = clone($input, ['name' => 'copy']);
    $copy->cloneInput();
    $unknown = clone($nullable, []);
    $unknown->cloneInput();
}

function passwordDigest(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

function passwordMatches(string $password, string $digest): bool
{
    return password_verify($password, $digest)
        && !password_needs_rehash($digest, PASSWORD_DEFAULT);
}

/** @return array{algo:string|null, algoName:string, options:array<string, mixed>} */
function passwordDetails(string $digest): array
{
    return password_get_info($digest);
}

function payloadDigest(string $payload): string
{
    return hash('sha256', $payload, false, []);
}

function payloadFileDigest(string $path): string|false
{
    return hash_file('sha256', $path, false, []);
}

function secureToken(): string
{
    return bin2hex(random_bytes(32));
}

function secureNumber(): int
{
    return random_int(1, PASSWORD_BCRYPT_DEFAULT_COST);
}

function validatedIdentifier(mixed $value): int|false
{
    return filter_var($value, FILTER_VALIDATE_INT);
}

function validatedEmail(mixed $value): string|false
{
    return filter_var($value, FILTER_VALIDATE_EMAIL);
}

function externalIdentifier(): int|false|null
{
    return filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
}

function filteredRequest(array $request): array|false|null
{
    return filter_var_array($request);
}

function globalAddressFlags(): int
{
    return FILTER_VALIDATE_IP | FILTER_FLAG_GLOBAL_RANGE | FILTER_THROW_ON_FAILURE;
}

/** @param array<string, string> $subjects */
function exercisePcre(string $subject, array $subjects): array
{
    preg_match('/x/', $subject, $matches);
    preg_match_all('/x/', $subject, $allMatches, PREG_UNMATCHED_AS_NULL);
    preg_filter('/x/', 'y', $subjects);
    preg_grep('/x/', $subjects, PREG_GREP_INVERT);
    preg_replace('/x/', 'y', $subject);
    preg_replace_callback('/x/', static fn (array $match): string => $match[0] ?? '', $subject);
    preg_replace_callback_array(['/x/' => static fn (array $match): string => $match[0] ?? ''], $subject);
    preg_split('/x/', $subject, -1, PREG_SPLIT_NO_EMPTY);
    preg_quote($subject, '/');
    preg_last_error();
    preg_last_error_msg();

    return $matches;
}

/** @param array<int, int> $values */
function exerciseMath(array $values): void
{
    abs(4);
    acos(0.5);
    acosh(1.0);
    asin(0.5);
    asinh(1.0);
    atan(1.0);
    atan2(1.0, 2.0);
    atanh(0.5);
    base_convert('ff', 16, 10);
    bindec('1010');
    ceil(1.1);
    cos(1.0);
    cosh(1.0);
    decbin(10);
    dechex(255);
    decoct(8);
    deg2rad(180.0);
    exp(1.0);
    expm1(0.1);
    fdiv(1.0, 0.0);
    floor(1.9);
    fmod(5.0, 2.0);
    fpow(2.0, 3.0);
    hexdec('ff');
    hypot(3.0, 4.0);
    intdiv(5, 2);
    is_finite(1.0);
    is_infinite(INF);
    is_nan(NAN);
    log(10.0);
    log10(10.0);
    log1p(0.1);
    max($values);
    min(2, 1);
    octdec('10');
    pi();
    pow(2, 3);
    rad2deg(M_PI);
    round(2.5, 0, \RoundingMode::HalfEven);
    sin(1.0);
    sinh(1.0);
    sqrt(4.0);
    tan(1.0);
    tanh(1.0);
    PHP_ROUND_HALF_ODD;
}

/** @param resource $resource */
function exerciseVariableHandling($resource, mixed $value): void
{
    boolval($value);
    debug_zval_dump($value);
    doubleval($value);
    floatval($value);
    get_debug_type($value);
    get_defined_vars();
    get_resource_id($resource);
    get_resource_type($resource);
    gettype($value);
    intval($value, 10);
    print_r($value, true);
    settype($value, 'string');
    strval($value);
    var_dump($value);
    var_export($value, true);
}

function exerciseRuntimeIntrospection(): void
{
    define('APP_RUNTIME_INTROSPECTION', true);
    defined('APP_RUNTIME_INTROSPECTION');
    constant('PHP_VERSION');
    function_exists('strlen');
    get_defined_functions();
    get_defined_constants(true);
    get_loaded_extensions();
    extension_loaded('json');
    get_extension_funcs('core');
}

function exerciseRuntimeConfiguration(): void
{
    get_cfg_var('memory_limit');
    ini_get('memory_limit');
    ini_get_all(null, false);
    ini_set('memory_limit', '128M');
    ini_alter('memory_limit', '128M');
    ini_restore('memory_limit');
    get_include_path();
    set_include_path('/tmp');
    phpversion();
    php_sapi_name();
    php_uname();
    php_ini_scanned_files();
    php_ini_loaded_file();
    memory_get_usage(true);
    memory_get_peak_usage();
    memory_reset_peak_usage();
    ini_parse_quantity('128M');
    PHP_INI_USER;
    PHP_INI_PERDIR;
    PHP_INI_SYSTEM;
    PHP_INI_ALL;
}

function exerciseRuntimeEnvironment(): void
{
    assert(true, 'runtime environment fixture');
    assert_options(ASSERT_ACTIVE);
    cli_get_process_title();
    cli_set_process_title('php-companion-fixture');
    dl('fixture-extension');
    gc_collect_cycles();
    gc_disable();
    gc_enable();
    gc_enabled();
    gc_mem_caches();
    gc_status();
    get_current_user();
    get_included_files();
    get_required_files();
    get_resources();
    getenv();
    getenv('PATH');
    getlastmod();
    getmygid();
    getmyinode();
    getmypid();
    getmyuid();
    getopt('a::', ['all::']);
    getrusage();
    phpcredits(CREDITS_GENERAL);
    phpinfo(INFO_GENERAL);
    putenv('PHP_COMPANION_FIXTURE=1');
    set_time_limit(30);
    sys_get_temp_dir();
    version_compare(PHP_VERSION, '8.5');
    version_compare(PHP_VERSION, '8.5', '>=');
    zend_version();
    INFO_CREDITS;
    INFO_CONFIGURATION;
    INFO_MODULES;
    INFO_ENVIRONMENT;
    INFO_VARIABLES;
    INFO_LICENSE;
    INFO_ALL;
    CREDITS_GROUP;
    CREDITS_SAPI;
    CREDITS_MODULES;
    CREDITS_DOCS;
    CREDITS_FULLPAGE;
    CREDITS_QA;
    CREDITS_ALL;
    ASSERT_CALLBACK;
    ASSERT_BAIL;
    ASSERT_WARNING;
    ASSERT_EXCEPTION;
}

function exerciseErrorHandling(): void
{
    debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
    debug_print_backtrace(DEBUG_BACKTRACE_PROVIDE_OBJECT);
    error_clear_last();
    error_get_last();
    error_log('php-companion fixture');
    error_reporting(E_ALL);
    get_error_handler();
    get_exception_handler();
    restore_error_handler();
    restore_exception_handler();
    set_error_handler(null);
    set_exception_handler(null);
    trigger_error('php-companion fixture', E_USER_NOTICE);
    user_error('php-companion fixture', E_USER_WARNING);
    E_ERROR;
    E_WARNING;
    E_PARSE;
    E_NOTICE;
    E_CORE_ERROR;
    E_CORE_WARNING;
    E_COMPILE_ERROR;
    E_COMPILE_WARNING;
    E_USER_ERROR;
    E_STRICT;
    E_RECOVERABLE_ERROR;
    E_DEPRECATED;
    E_USER_DEPRECATED;
}

function exerciseOutputControl(): void
{
    flush();
    ob_clean();
    ob_end_clean();
    ob_end_flush();
    ob_flush();
    ob_get_clean();
    ob_get_contents();
    ob_get_flush();
    ob_get_length();
    ob_get_level();
    ob_get_status();
    ob_get_status(true);
    ob_implicit_flush();
    ob_list_handlers();
    ob_start();
    output_add_rewrite_var('token', 'value');
    output_reset_rewrite_vars();
    PHP_OUTPUT_HANDLER_START;
    PHP_OUTPUT_HANDLER_WRITE;
    PHP_OUTPUT_HANDLER_FLUSH;
    PHP_OUTPUT_HANDLER_CLEAN;
    PHP_OUTPUT_HANDLER_FINAL;
    PHP_OUTPUT_HANDLER_CONT;
    PHP_OUTPUT_HANDLER_END;
    PHP_OUTPUT_HANDLER_CLEANABLE;
    PHP_OUTPUT_HANDLER_FLUSHABLE;
    PHP_OUTPUT_HANDLER_REMOVABLE;
    PHP_OUTPUT_HANDLER_STDFLAGS;
    PHP_OUTPUT_HANDLER_STARTED;
    PHP_OUTPUT_HANDLER_DISABLED;
    PHP_OUTPUT_HANDLER_PROCESSED;
}

function exerciseFunctionHandling(): void
{
    call_user_func('strlen', 'value');
    call_user_func_array('strlen', ['value']);
    forward_static_call('self::exerciseFunctionHandling');
    forward_static_call_array('self::exerciseFunctionHandling', []);
    func_get_arg(0);
    func_get_args();
    func_num_args();
    register_shutdown_function('strlen');
    register_tick_function('strlen');
    unregister_tick_function('strlen');
}

function exerciseSessionHandling(): void
{
    session_abort();
    session_cache_expire();
    session_cache_limiter();
    session_commit();
    session_create_id();
    session_decode('fixture');
    session_destroy();
    session_encode();
    session_gc();
    session_get_cookie_params();
    session_id();
    session_module_name();
    session_name();
    session_regenerate_id();
    session_register_shutdown();
    session_reset();
    session_save_path();
    session_set_cookie_params(['lifetime' => 3600, 'partitioned' => true, 'samesite' => 'Lax']);
    $handler = new \SessionHandler();
    session_set_save_handler($handler);
    $handler->create_sid();
    session_start(['read_and_close' => true]);
    session_status();
    session_unset();
    session_write_close();
    PHP_SESSION_DISABLED;
    PHP_SESSION_NONE;
    PHP_SESSION_ACTIVE;
}

function exerciseNetworkHandling(): void
{
    checkdnsrr('example.com');
    closelog();
    dns_check_record('example.com');
    dns_get_mx('example.com', $mailHosts, $mailWeights);
    dns_get_record('example.com', DNS_ANY, $authoritativeServers, $additionalRecords);
    fsockopen('example.com', 80, $socketError, $socketMessage);
    gethostbyaddr('127.0.0.1');
    gethostbynamel('example.com');
    gethostbyname('example.com');
    gethostname();
    getmxrr('example.com', $mxHosts, $mxWeights);
    getprotobyname('tcp');
    getprotobynumber(6);
    getservbyname('http', 'tcp');
    getservbyport(80, 'tcp');
    header('X-PHP-Companion: fixture');
    header_register_callback(static function (): void {});
    header_remove('X-PHP-Companion');
    headers_list();
    headers_sent($headerFile, $headerLine);
    http_clear_last_response_headers();
    http_get_last_response_headers();
    http_response_code();
    http_response_code(204);
    $packedAddress = inet_pton('127.0.0.1');
    if ($packedAddress !== false) {
        inet_ntop($packedAddress);
    }
    ip2long('127.0.0.1');
    long2ip(2130706433);
    net_get_interfaces();
    openlog('php-companion', 0, 0);
    pfsockopen('example.com', 80, $persistentError, $persistentMessage);
    request_parse_body();
    setcookie('fixture', 'value', ['samesite' => 'Lax', 'partitioned' => true]);
    setrawcookie('raw-fixture', 'value', ['samesite' => 'Strict', 'partitioned' => true]);
    $stream = fopen('php://memory', 'r+');
    socket_get_status($stream);
    socket_set_blocking($stream, true);
    socket_set_timeout($stream, 1);
    syslog(0, 'php-companion fixture');
    DNS_A;
    DNS_NS;
    DNS_CNAME;
    DNS_SOA;
    DNS_PTR;
    DNS_HINFO;
    DNS_CAA;
    DNS_MX;
    DNS_TXT;
    DNS_SRV;
    DNS_NAPTR;
    DNS_AAAA;
    DNS_A6;
    DNS_ANY;
    DNS_ALL;
}

final class ArrayBuiltinItem
{
    public function arrayLabel(): string
    {
        return 'array';
    }
}

final class PriorityBuiltinItem
{
    public function priorityLabel(): string
    {
        return 'priority';
    }
}

/** @param array<string, ArrayBuiltinItem> $items */
function consumeAuditedArrays(array $items): bool
{
    $values = array_values($items);
    foreach ($values as $value) {
        $value->arrayLabel();
    }

    $mapped = array_map(fn (ArrayBuiltinItem $item): ArrayBuiltinItem => $item, $items);
    foreach ($mapped as $mappedValue) {
        $mappedValue->arrayLabel();
    }

    $foundItem = array_find($items, fn (ArrayBuiltinItem $item, string $key): bool => $key !== '');
    $foundItem?->arrayLabel();

    $firstItem = array_first($items);
    $firstItem?->arrayLabel();

    $found = array_search(new ArrayBuiltinItem(), $items, true);
    if ($found !== false) {
        strlen($found);
    }

    $popped = array_pop($items);
    $popped?->arrayLabel();

    $removed = array_splice($items, 0, 1);
        foreach ($removed as $removedItem) {
            $removedItem->arrayLabel();
        }
        foreach ($items as $staleItem) {
            $staleItem->arrayLabel();
        }

    return array_is_list($values);
}

/** @param \IteratorAggregate<string, ArrayBuiltinItem> $items */
function consumeAuditedIterator(\IteratorAggregate $items): int
{
    $preserved = iterator_to_array($items);
    foreach ($preserved as $iteratorItem) {
        $iteratorItem->arrayLabel();
    }

    $reindexed = iterator_to_array($items, false);
    foreach ($reindexed as $reindexedIteratorItem) {
        $reindexedIteratorItem->arrayLabel();
    }

    return iterator_count($items);
}

function exerciseSplFunctions(): void
{
    class_implements(\ArrayIterator::class);
    class_parents(\ArrayIterator::class);
    class_uses(\ArrayIterator::class);
    iterator_apply(new \ArrayIterator([]), static fn (): bool => true);
    iterator_count(new \ArrayIterator([]));
    iterator_to_array(new \ArrayIterator([]));
    spl_autoload('MissingClass');
    spl_autoload_call('MissingClass');
    spl_autoload_extensions();
    spl_autoload_functions();
    spl_autoload_register();
    spl_autoload_unregister('spl_autoload');
    spl_classes();
    spl_object_hash(new \stdClass());
    spl_object_id(new \stdClass());
}

function exerciseSplFiles(\SplFileInfo $info, \SplFileObject $file, \SplTempFileObject $temp): void
{
    new \SplFileInfo(__FILE__);
    $opened = $info->openFile('r');
    $opened->rewind();
    $file->fgets();
    $file->fgetcsv();
    $file->getCsvControl();
    $file->fputcsv(['one', 'two']);
    $file->fwrite('payload');
    $file->getFilename();
    $temp->rewind();
}

/**
 * @param \ArrayObject<string, ArrayBuiltinItem> $object
 * @param \ArrayIterator<string, ArrayBuiltinItem> $iterator
 */
function exerciseSplArrayCollections(\ArrayObject $object, \ArrayIterator $iterator): void
{
    $copy = $object->getArrayCopy();
    foreach ($copy as $copyItem) {
        $copyItem->arrayLabel();
    }

    $created = $object->getIterator();
    foreach ($created as $createdItem) {
        $createdItem->arrayLabel();
    }

    $offset = $object->offsetGet('primary');
    $offset->arrayLabel();
    $current = $iterator->current();
    $current->arrayLabel();
    $object->append(new ArrayBuiltinItem());
    $object->offsetSet('secondary', new ArrayBuiltinItem());
    $object->uasort(static fn (ArrayBuiltinItem $left, ArrayBuiltinItem $right): int => 0);
    $iterator->uksort(static fn (string $left, string $right): int => 0);
    $object->exchangeArray([]);
    $iterator->seek(0);
    $object->__serialize();
}

/**
 * @param \SplObjectStorage<ArrayBuiltinItem, ArrayBuiltinItem> $storage
 * @param \SplFixedArray<ArrayBuiltinItem> $fixed
 */
function exerciseSplObjectCollections(\SplObjectStorage $storage, \SplFixedArray $fixed): void
{
    $stored = $storage->current();
    $stored->arrayLabel();
    $info = $storage->getInfo();
    $info?->arrayLabel();
    $storage->offsetSet(new ArrayBuiltinItem(), new ArrayBuiltinItem());
    $storage->seek(0);

    $fixedItem = $fixed->offsetGet(0);
    $fixedItem?->arrayLabel();
    $created = \SplFixedArray::fromArray([new ArrayBuiltinItem()]);
    foreach ($created as $createdItem) {
        $createdItem?->arrayLabel();
    }
    $fixed->getIterator();
    $fixed->jsonSerialize();
    $fixed->__serialize();
    $fixed->setSize(4);
}

/**
 * @param \SplDoublyLinkedList<ArrayBuiltinItem> $list
 * @param \SplQueue<ArrayBuiltinItem> $queue
 * @param \SplStack<ArrayBuiltinItem> $stack
 */
function exerciseSplLinearCollections(\SplDoublyLinkedList $list, \SplQueue $queue, \SplStack $stack): void
{
    $current = $list->current();
    $current->arrayLabel();
    $offset = $list->offsetGet(0);
    $offset->arrayLabel();
    foreach ($list as $item) {
        $item->arrayLabel();
    }
    $dequeued = $queue->dequeue();
    $dequeued->arrayLabel();
    $queued = $queue->current();
    $queued->arrayLabel();
    $stacked = $stack->top();
    $stacked->arrayLabel();
    $list->add(0, new ArrayBuiltinItem());
    $list->push(new ArrayBuiltinItem());
    $list->offsetSet(null, new ArrayBuiltinItem());
    $list->setIteratorMode(\SplDoublyLinkedList::IT_MODE_FIFO);
    $queue->enqueue(new ArrayBuiltinItem());
    $list->__serialize();
}

/**
 * @param \SplMinHeap<ArrayBuiltinItem> $min
 * @param \SplMaxHeap<ArrayBuiltinItem> $max
 * @param \SplPriorityQueue<ArrayBuiltinItem, PriorityBuiltinItem> $priority
 */
function exerciseSplHeaps(\SplMinHeap $min, \SplMaxHeap $max, \SplPriorityQueue $priority): void
{
    $minimum = $min->extract();
    $minimum->arrayLabel();
    $maximum = $max->current();
    $maximum->arrayLabel();
    foreach ($max as $heapItem) {
        $heapItem->arrayLabel();
    }
    $min->insert(new ArrayBuiltinItem());
    $min->recoverFromCorruption();
    $priority->insert(new ArrayBuiltinItem(), new PriorityBuiltinItem());
    $priority->setExtractFlags(\SplPriorityQueue::EXTR_BOTH);
    $priority->current();
    $priority->top();
    $priority->extract();
    $priority->__debugInfo();
    $priority->__serialize();
}

function exerciseSplObserver(\SplSubject $subject, \SplObserver $observer): void
{
    $subject->attach($observer);
    $subject->detach($observer);
    $subject->notify();
    $observer->update($subject);
}

/**
 * @param \MultipleIterator<string, ArrayBuiltinItem> $multiple
 * @param \Iterator<string, ArrayBuiltinItem> $iterator
 */
function exerciseMultipleIterator(\MultipleIterator $multiple, \Iterator $iterator): void
{
    $multiple->attachIterator($iterator, 'left');
    $multiple->setFlags(\MultipleIterator::MIT_NEED_ANY | \MultipleIterator::MIT_KEYS_ASSOC);
    $current = $multiple->current();
    $item = $current['left'];
    if ($item !== null) {
        $item->arrayLabel();
    }
    foreach ($multiple as $keys => $values) {
        $iterated = $values['left'];
        if ($iterated !== null) {
            $iterated->arrayLabel();
        }
    }
    $multiple->key();
    $multiple->containsIterator($iterator);
    $multiple->countIterators();
    $multiple->__debugInfo();
}

/**
 * @param \Iterator<string, ArrayBuiltinItem> $inner
 * @param \IteratorIterator<string, ArrayBuiltinItem> $wrapped
 * @param \LimitIterator<string, ArrayBuiltinItem> $limited
 * @param \CallbackFilterIterator<string, ArrayBuiltinItem> $filtered
 * @param \AppendIterator<string, ArrayBuiltinItem> $appended
 * @param \ParentIterator<string, ArrayBuiltinItem> $parents
 * @param \RecursiveCallbackFilterIterator<string, ArrayBuiltinItem> $recursive
 */
function exerciseIteratorAdapters(
    \Iterator $inner,
    \IteratorIterator $wrapped,
    \LimitIterator $limited,
    \CallbackFilterIterator $filtered,
    \AppendIterator $appended,
    \ParentIterator $parents,
    \RecursiveCallbackFilterIterator $recursive,
    \EmptyIterator $empty
): void {
    new \IteratorIterator($inner, class: null);
    new \LimitIterator($inner, offset: 1, limit: 2);
    new \CallbackFilterIterator($inner, callback: static fn ($value, $key, $iterator): bool => true);
    $wrappedItem = $wrapped->current();
    $wrappedItem->arrayLabel();
    foreach ($limited as $limitedItem) {
        $limitedItem->arrayLabel();
    }
    foreach ($filtered as $filteredItem) {
        $filteredItem->arrayLabel();
    }
    $appendedItem = $appended->current();
    $appendedItem->arrayLabel();
    $innerList = $appended->getArrayIterator();
    $nested = $innerList->current();
    $nestedItem = $nested->current();
    $nestedItem->arrayLabel();
    $parentChild = $parents->getChildren();
    if ($parentChild !== null) {
        $parentItem = $parentChild->current();
        $parentItem->arrayLabel();
    }
    $recursiveChild = $recursive->getChildren();
    $recursiveItem = $recursiveChild->current();
    $recursiveItem->arrayLabel();
    $limited->seek(1);
    $limited->getPosition();
    $appended->getIteratorIndex();
    $empty->current();
    $empty->valid();
}

/**
 * @param \RecursiveIterator<string, ArrayBuiltinItem> $inner
 * @param \RecursiveIteratorIterator<string, ArrayBuiltinItem> $recursive
 * @param \CachingIterator<string, ArrayBuiltinItem> $cached
 * @param \RecursiveCachingIterator<string, ArrayBuiltinItem> $recursiveCache
 * @param \RegexIterator<string, ArrayBuiltinItem> $regex
 * @param \RecursiveRegexIterator<string, ArrayBuiltinItem> $recursiveRegex
 * @param \RecursiveTreeIterator<string, ArrayBuiltinItem> $tree
 */
function exerciseAdvancedIterators(
    \RecursiveIterator $inner,
    \RecursiveIteratorIterator $recursive,
    \CachingIterator $cached,
    \RecursiveCachingIterator $recursiveCache,
    \RegexIterator $regex,
    \RecursiveRegexIterator $recursiveRegex,
    \RecursiveTreeIterator $tree
): void {
    new \RecursiveIteratorIterator($inner, mode: \RecursiveIteratorIterator::SELF_FIRST, flags: 0);
    new \CachingIterator($inner, flags: \CachingIterator::FULL_CACHE);
    new \RegexIterator($inner, pattern: '/item/', mode: \RegexIterator::GET_MATCH, flags: 0, pregFlags: 0);
    new \RecursiveTreeIterator(
        $inner,
        flags: \RecursiveTreeIterator::BYPASS_CURRENT,
        cachingIteratorFlags: \CachingIterator::CATCH_GET_CHILD,
        mode: \RecursiveTreeIterator::SELF_FIRST
    );
    $recursiveItem = $recursive->current();
    $recursiveItem->arrayLabel();
    $sub = $recursive->getSubIterator();
    if ($sub !== null) {
        $subItem = $sub->current();
        $subItem->arrayLabel();
    }
    $cachedItem = $cached->current();
    $cachedItem->arrayLabel();
    $cachedLookup = $cached->offsetGet('item');
    if ($cachedLookup !== null) {
        $cachedLookup->arrayLabel();
    }
    $cache = $cached->getCache();
    $cacheItem = $cache['item'];
    $cacheItem->arrayLabel();
    $cacheChild = $recursiveCache->getChildren();
    if ($cacheChild !== null) {
        $childItem = $cacheChild->current();
        $childItem->arrayLabel();
    }
    $regex->current();
    $regex->getRegex();
    $regex->setMode(\RegexIterator::REPLACE);
    $regexChild = $recursiveRegex->getChildren();
    $regexChild->current();
    $tree->key();
    $tree->current();
    $tree->getPrefix();
    $tree->setPostfix('!');
}

function exerciseDirectoryIterators(
    \DirectoryIterator $directory,
    \FilesystemIterator $filesystem,
    \RecursiveDirectoryIterator $recursive,
    \GlobIterator $glob
): void {
    new \DirectoryIterator('/tmp');
    new \FilesystemIterator('/tmp', flags: \FilesystemIterator::SKIP_DOTS);
    new \RecursiveDirectoryIterator('/tmp', flags: \FilesystemIterator::FOLLOW_SYMLINKS);
    new \GlobIterator('/tmp/*.php', flags: \FilesystemIterator::CURRENT_AS_FILEINFO);
    $entry = $directory->current();
    $entry->getPathname();
    foreach ($directory as $iterated) {
        $iterated->isDir();
    }
    $directory->seek(0);
    $filesystem->current();
    $filesystem->key();
    $filesystem->setFlags(0);
    $recursive->current();
    $recursive->hasChildren();
    $child = $recursive->getChildren();
    $child->getSubPathname();
    $glob->count();
}

/** @param class-string<ArrayBuiltinItem> $expected */
function inspectAuditedObject(ArrayBuiltinItem $item, string $expected): bool
{
    $class = get_class($item);
    $methods = get_class_methods($class);

    return class_exists($class)
        && is_a($item, $expected)
        && method_exists($item, 'arrayLabel')
        && property_exists($item, 'missing') === false
        && count($methods) > 0;
}

final class GeneratedItem
{
    public function label(): string
    {
        return 'generated';
    }
}

function inferredItems(): \Generator
{
    yield new GeneratedItem();
}

function consumeInferredItems(): void
{
    $items = inferredItems();
    foreach ($items as $item) {
        $item->label();
    }
}
