# F04 文件顶层赋值后的成员导航

日期：2026-09-23。独立 PHP 输入显示 `$printer = new Printer(); $printer->render();` 在文件顶层时，parser 原先没有记录赋值和变量引用的 scope，语义工作区无法确定接收者，导致从方法声明发起的 References 返回空。

parser 现在为文件顶层可执行语句建立 `@global` scope；函数、方法、闭包等仍使用更小的词法 scope，类型声明中的属性等变量不进入顶层 scope。F04-REF-04 同时覆盖顶层 `Printer` 赋值、后续改赋为 `Other` 和闭包中另一个 `Other` 形参，检查 References 只返回第一处调用。真实 Language Server stdio 还验证该调用的 Definition 指向 `Printer::render`。语义快照升至 schema 82，旧 schema 81 被拒绝；新快照恢复后仍保留顶层导航结果。

验证：parser 全套 76 项、语义包全套 314 项、真实 stdio 定向用例，以及语言服务器全套 17 个文件、295 项通过、1 项跳过。三个受影响包的类型检查、相关 ESLint 和 `git diff --check` 通过。此项未打包 VSIX，也未完成 F04 的完整编辑器矩阵。

在 Linux x64、Node v22.14.0、Intel Xeon E5-2696 v3 上，schema 82 源码的 1k 合成文件冷索引跑 5 次，P95 1868.08 ms、峰值 RSS 127.9 MiB，分别低于冻结的 8000 ms/384 MiB。1k 持久缓存基准冷解析 1000/1000、热恢复 1000/1000 且热解析 0，缓存 5.33 MiB，低于 64 MiB 上限；派生事实失效及单条损坏恢复检查通过。这些结果只覆盖 1k Linux x64，10k/50k 与其他平台仍需对 schema 82 复测。
