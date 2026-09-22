<?php
declare(strict_types=1);

// Measurement prototype. This identifies type declarations; it does not
// extract the method, property, import, or PHPDoc facts used by References.
$root = $argv[1] ?? '';
if ($root === '' || !is_dir($root)) {
    fwrite(STDERR, "Usage: php experimental-reference-type-catalog.php <project-root>\n");
    exit(2);
}

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
$result = [];
foreach ($files as $file) {
    $path = $file->getPathname();
    if (!$file->isFile() || strtolower($file->getExtension()) !== 'php' || str_contains($path, '/vendor/')) {
        continue;
    }
    $source = file_get_contents($path);
    if ($source === false) {
        $result[$path] = ['complete' => false, 'types' => []];
        continue;
    }
    try {
        $tokens = token_get_all($source, TOKEN_PARSE);
    } catch (ParseError) {
        $result[$path] = ['complete' => false, 'types' => []];
        continue;
    }
    $namespace = '';
    $types = [];
    $length = count($tokens);
    for ($i = 0; $i < $length; $i++) {
        $token = $tokens[$i];
        if (!is_array($token)) {
            continue;
        }
        if ($token[0] === T_NAMESPACE) {
            $parts = [];
            for ($j = $i + 1; $j < $length; $j++) {
                $next = $tokens[$j];
                if ($next === ';' || $next === '{') {
                    break;
                }
                if (is_array($next) && in_array($next[0], [T_STRING, T_NAME_QUALIFIED, T_NS_SEPARATOR], true)) {
                    $parts[] = $next[1];
                }
            }
            $namespace = implode('', $parts);
            continue;
        }
        if (!in_array($token[0], [T_CLASS, T_INTERFACE, T_TRAIT, T_ENUM], true)) {
            continue;
        }
        for ($j = $i + 1; $j < $length; $j++) {
            $next = $tokens[$j];
            if (is_array($next) && in_array($next[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }
            if (is_array($next) && $next[0] === T_STRING) {
                $types[] = ($namespace !== '' ? $namespace . '\\' : '') . $next[1];
            }
            break;
        }
    }
    $result[$path] = ['complete' => true, 'types' => $types];
}
ksort($result);
echo json_encode($result, JSON_THROW_ON_ERROR), "\n";
