<?php

namespace App\Service;

function inspectUnresolvedSymbols(): void
{
    echo $definitelyMissing;

    MissingVendor\missingFunction();
    possiblyExtensionFunction();

    echo MissingVendor\MISSING_CONSTANT;
    echo POSSIBLY_EXTENSION_CONSTANT;
}
