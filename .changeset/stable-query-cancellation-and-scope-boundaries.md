---
'@php-companion/index': patch
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Keep completion, hover and definition queries fresh while watched files and semantic providers refresh, and allow cancelled queries to stop waiting without cancelling shared provider work.

Correct undefined-variable checks at closure and arrow-function scope boundaries. Reduce existing diagnostic costs with bounded parent-node reuse, ordered cursor syntax lookup and readonly argument prefiltering while preserving traversal limits, supported rules and result freshness.

Preserve recursive Composer source discovery on Node 20.0 and on Node 20 runtimes that expose Dirent.path instead of Dirent.parentPath, retaining source ordering, exclusions, cancellation and index budgets.
