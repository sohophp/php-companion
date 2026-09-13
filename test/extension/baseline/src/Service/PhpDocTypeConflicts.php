<?php

namespace App\Service;

class DocumentedParent
{
}

class DocumentedChild extends DocumentedParent
{
}

class PhpDocTypeConflicts
{
    /** @param DocumentedParent $value */
    public function conflict(DocumentedChild $value): void
    {
    }

    /** @param DocumentedChild $value */
    public function legal(DocumentedParent $value): void
    {
    }
}
