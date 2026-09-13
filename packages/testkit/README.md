# @php-companion/testkit

Shared, editor-independent verification helpers for PHP Companion components.

```ts
import { markedSource, summarizeDurations, assertPerformanceBudget } from '@php-companion/testkit';

const fixture = markedSource('<?php $service->/*@completion*/run();');
const report = summarizeDurations([4, 5, 7, 9]);
assertPerformanceBudget('hotQueryMs', report.p95);
```

Markers are removed before analysis and expose UTF-16 offsets. The package also
exports an incremental LSP message decoder, frozen R1 performance budgets and
representative PHP 7.2–8.5 syntax fixtures. It has no product runtime dependency.

`generatePhpComposerProject()` creates the deterministic Composer corpus used by
the repository's cold-index benchmark. Run `pnpm benchmark:index -- 1000 5` at
the repository root to emit a machine-readable report and enforce a frozen R1
budget for the 1k, 10k, or 50k scale.
