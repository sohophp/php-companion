- Report PHP 8.3 dynamic class constant fetches as unavailable on earlier target versions with the dynamic-name range.
- Add the complete PHP 8.4–8.5 modern `Dom\` namespace with audited HTML5/XML document factories, selectors, XPath, collections, namespace values, SimpleXML imports, and PHP 8.5 element/document additions.
- Add the complete PHP 7.2–8.5 classic DOM catalog with audited global constants, classes, interfaces, virtual properties, methods, XPath collection returns, and version boundaries through the PHP 8.4 DOM additions.
- Add audited PHP 7.2–8.5 libxml, SimpleXML, XML Parser, XMLReader, and XMLWriter functions, constants, error properties, class members, iteration contracts, and version boundaries.
- Add the complete PHP 7.2–8.5 mbstring callable catalog with structured returns and versioned constants, aliases, signatures, and additions through PHP 8.4.
- Add the audited PHP 7.2–8.5 Reflection core, including generic `ReflectionClass<T>` instance factories, callable/class/property/parameter/type APIs, class constants, attributes, enum reflection, versioned modifier values, tentative returns, lazy objects, property hooks, and mangled names.
# Changelog

- Add versioned directory, filesystem, recursive directory, and glob iterators with audited flag values and iteration contracts.
- Add generic advanced SPL traversal, caching, regex, and tree iterators with transformation-safe values and audited PHP 7.2–8.5 signatures.
- Add generic `IteratorIterator`, filter, recursive, limit, rewind, infinite, append, and empty iterator declarations with audited PHP 7.2–8.5 signatures and returns.
- Add generic `MultipleIterator` declarations with PHP 7/8 parameter names and types, PHP 7/8.0 failure returns, PHP 8.1 tentative returns, and PHP 8.4 typed constants.
- Add complete `SplObserver` and `SplSubject` interfaces with PHP 7.2 legacy arginfo names, PHP 7.4 parameter names, and PHP 8.1 tentative `void` returns.
- Complete generic `SplHeap`, `SplMinHeap`, `SplMaxHeap`, and `SplPriorityQueue` declarations with safe extract-mode unions, versioned compare signatures, typed constants, and PHP 8.5 serialization.
- Complete generic `SplDoublyLinkedList`, `SplQueue`, and `SplStack` declarations with PHP 7 insertion returns, PHP 7.4 serialization, PHP 8 signatures, and PHP 8.4 typed constants.
- Complete generic `SplObjectStorage` and `SplFixedArray` declarations with their PHP 7.2–8.5 interface, serialization, iterator, parameter, deprecation, and return boundaries.
- Complete `ArrayObject` and `ArrayIterator` with generic key/value propagation, the full public member catalog, and PHP 7.2–8.5 magic-method, parameter, sort-return, and typed-constant boundaries.
- Add audited `SplFileInfo`, `SplFileObject`, and `SplTempFileObject` declarations with filesystem failure unions, CSV shapes, iterator contracts, and PHP 7.2–8.5 signature gates.
- Preserve mode-correlated `count_chars` and `str_word_count` returns on PHP 8 instead of exposing their broad native unions.
- Complete the 15-function SPL catalog with class-string maps, autoload callback collections, and PHP 7.2–8.5 parameter and return boundaries.
- Complete the PHP Strings callable catalog across PHP 7.2–8.5 with stable constants, structured and mode-correlated returns, and versioned availability, deprecation, parameter, and return boundaries.
- Complete the versioned Filesystem callable catalog with stream state, CSV/INI, locking, seek/stat, sync, process-file and temporary-stream contracts, plus stable constants and PHP 7.2–8.5 boundaries.
- Add 33 audited Filesystem metadata, permission, upload, and link functions with complete stat and realpath-cache shapes, failure returns, and PHP 7/8 parameter boundaries.
- Add the complete Program Execution catalog with command output and status references, process/pipe resources, descriptor and status shapes, PHP 7.4 array commands, PHP 8 parameter names, the PHP 8.2 passthru return, and PHP 8.3 cached exit status.
- Add the complete Directory function, constant, and class catalog with resource/failure results, list returns, PHP 7/8 parameter and method boundaries, PHP 8.1 readonly properties, and the PHP 8.5 final class boundary.
- Add the complete PHP Network function catalog and stable DNS constants, preserving result shapes, overloads, PHP 7.3/8.2/8.4/8.5 availability and return boundaries, cookie options, and the PHP 8.5 stream alias deprecation.
- Add the complete versioned Session catalog with status literals, cookie shapes, callable/object save-handler overloads, and the four built-in handler contracts.
- Complete the PHP Function Handling catalog around the existing introspection functions, preserving dynamic-call `mixed`, argument-list shapes, PHP 7/8 parameter boundaries, the PHP 8.0–8.2 shutdown return transition, and `create_function` deprecation/removal.
- Add the complete PHP Output Control catalog with conditional buffer-status shapes, failure returns, nullable handler callback metadata, PHP 7/8 parameter boundaries, and the PHP 8.4 processed-status flag.
- Add the complete PHP Error Handling function and constant catalog, preserving backtrace and last-error shapes, handler callable contracts, PHP 8.2/8.4 literal-true returns, PHP 8.4 `E_ALL`/`E_STRICT` changes, and PHP 8.5 current-handler availability.
- Add the remaining audited PHP Options/Info catalog with environment, include, resource/process, GC, CLI title, output, version-comparison, and deprecated compatibility APIs; preserve conditional returns, PHP 7.3/8.3 GC shapes, PHP 8.2 literal-true output contracts, Assertion constant boundaries, and compile-time omission of `zend_thread_id`.
- Add audited PHP configuration and runtime information functions, precise `ini_get_all` result shapes, stable `PHP_INI_*` constants, and PHP 7.4/8.0/8.1/8.2 availability and signature boundaries.
- Add audited PHP 7.2–8.5 runtime symbol and extension introspection stubs with exact collection shapes, conditional categorized constants, failure returns, PHP 7/8 parameter contracts, and the PHP 8.1 object-valued `define` boundary.

- Add the documented `key_exists()` alias with the same PHP 7.2–8.5 array/object parameter boundary as `array_key_exists()`.

This package uses Changesets for versioning.

## Unreleased

- Add the complete callable Variable Handling catalog around the existing predicates and serialization APIs, with conditional `print_r`/`var_export` returns, PHP 8.0 debug/resource functions, and the PHP 8.4 literal-true `print_r` boundary.
- Add the complete core Math function and stable constant catalog, generic `min`/`max`, precise `abs` overloads, PHP 8.0 `fdiv`, and PHP 8.4 `fpow`/`RoundingMode` boundaries.
- Add the complete PCRE function catalog and stable `PREG_*` constants, with subject-correlated replacement returns, key/value-preserving `preg_grep`, PHP 7 failure returns, PHP 7.4 callback flags, and PHP 8.0 `preg_last_error_msg` availability.
- Add audited Filter functions and constants with filter-specific return overloads and PHP 8.0, 8.2, and 8.5 constant boundaries.
- Add audited Password Hashing, Hash, and cryptographically secure random APIs, preserving PHP 7 failure returns, PHP 7.4 algorithm identity changes, PHP 8.1 Hash options, and the PHP 8.4 bcrypt default-cost boundary.
- Add audited PDO, PDOStatement, and PDOException contracts with failure returns, by-reference bindings, stable constants, PHP 8 signatures, and PHP 8.4 `PDO::connect()`/literal-true boundaries.
- Add audited serialization, Base64, hexadecimal, URL parsing, query-string, and response-header functions with precise failure returns, URL constants, and PHP 8 `get_headers()` parameter changes.
- Add audited filesystem and path functions with resource metadata, failure returns, aliases, constants, and PHP 8 nullable `file_get_contents()`/`fwrite()` length boundaries.
- Add audited JSON functions and constants, including PHP 7.3 `JSON_THROW_ON_ERROR`, PHP 8.1 `JSON_ERROR_NON_BACKED_ENUM`, PHP 8 native signatures, and PHP 8.3 `json_validate()` availability.
- Add audited variable type predicates and aliases with PHP 7.3 `is_countable`, PHP 8.0 native signatures, and the PHP 8.0 removal of `is_real`.
- Add audited class/object inspection functions with PHP 8.0 native and failure-return boundaries, PHP 8.1 `enum_exists` availability, structured list/map returns, and `get_class(T): class-string<T>` metadata.
- Add audited `is_iterable`, `iterator_to_array`, and `iterator_count` signatures, including the PHP 8.2 `Traversable|array` widening and a conditional key-preserving generic return.
- Add audited high-frequency array functions with PHP 7.2–8.5 availability and failure boundaries plus generic key/value and callback return metadata, including PHP 7.3 `array_key_first`/`array_key_last`, PHP 8.4 `array_find`/`array_find_key`/`array_any`/`array_all`, PHP 8.5 `array_first`/`array_last`, precise destructive results, and typed callbacks.
- Add audited high-frequency string functions with PHP 8.0 availability, parameter and failure-return boundaries, the PHP 8.1 HTML escaping flag default, and correlated overloads for `implode`, `join`, and `strtr`.
- Add audited PHP 7.2–8.5 Date/Time interfaces, classes, factories, exception boundaries, microsecond APIs, and all three `DatePeriod` constructor signatures.
- Add audited iterable, collection, serialization, Closure, Generator, weak-reference, Stringable, and Enum contracts with version gates and generic PHPDoc metadata.
- Add the audited core, SPL, JSON, Fiber, and request-body exception hierarchy with inherited members, constructor signatures, visibility/finality, and PHP 7.2–8.5 availability boundaries.
- Add audited syntax boundaries for PHP 8.0 `mixed` and `static` return types and PHP 8.2 `true`, standalone `false`/`null`, `false|null`, and `?false` types.

## 0.1.0-alpha.1

- Add audited, version-aware signatures for `sort`, `array_pop`, `array_shift`, `array_push`, `array_unshift`, `array_splice`, `shuffle`, `usort`, `preg_match`, `preg_match_all`, and `parse_str`, preserving their by-reference parameter metadata and PHP 7.2/7.3/8.0/8.2 signature changes.
- Initial independently consumable alpha API extracted from the PHP Companion monorepo.
