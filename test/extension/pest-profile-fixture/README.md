# Isolated Pest Profile fixture

Use a disposable copy under `/tmp`; the Extension Host test renames `tests/PestProfileTest.php` and writes `pest-source.txt`.

```bash
cp -R test/extension/pest-profile-fixture /tmp/sophp-pest-eval
cd /tmp/sophp-pest-eval
php85 /usr/local/bin/composer install --no-interaction --prefer-dist
php85 vendor/bin/pest tests/PestProfileTest.php --colors=never
```

After compiling `test/extension/tsconfig.json`, run `dist-test/runPestProfile.js` with `PHP_COMPANION_TEST_PEST_PROJECT`, `PHP_COMPANION_TEST_EXTENSIONS_DIR`, and `PHP_COMPANION_PHP_EXECUTABLE` set to the disposable project, isolated VS Code extension directory, and PHP 8.3+ executable. The extension directory must contain the PHPUnit/Pest candidate and the other Open Source Pack members. The runner rejects projects outside the system temporary directory or without this fixture's Composer identity.
