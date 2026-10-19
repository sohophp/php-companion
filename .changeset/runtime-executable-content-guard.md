---
"php-companion": patch
---

重构预览现在以流式内容摘要复核已选 PHP 程序，拒绝等长改写且恢复修改时间的程序变更；同时保留文件替换、不可用输入与跨平台文件身份检查。

Verify the selected PHP executable's contents while reviewing refactor previews, including equal-length edits with restored timestamps, while preserving replacement checks and bounded-memory reads.
