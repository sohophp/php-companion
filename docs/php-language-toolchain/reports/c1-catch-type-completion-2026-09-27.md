# C1：catch 异常类型补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树与测试夹具；没有修改 Winstar，也没有打包 VSIX。

`catch` 和多重 `catch` 原先使用普通类型候选，因此同前缀的普通类与接口也会出现。Core 现在根据已加载的声明层级筛选：保留 `Throwable` 及能证明实现它的异常类，排除能证明不属于该层级的普通类和接口。父类尚未加载完整时保留候选，避免误删未打开 Composer 文件里的异常类。参数等其他类型位置仍使用原有候选。PHP 的异常捕获类型依据 [官方异常文档](https://www.php.net/manual/en/language.exceptions.php)。

验证：语义包 436/436 项通过，覆盖直接捕获、多重捕获、限定名称、`Exception`/`Error` 子类、普通类与未知父类；语义包与扩展测试 TypeScript 编译通过。语言服务器定向 stdio 测试通过。完整 10 项 Open Source Pack 的隔离 VS Code 1.139.1 Linux x64 源码宿主通过，同前缀项目异常类出现、普通类不出现，日志 `/tmp/sophp-c1-catch-pack10-20260927.log`。

此项是源码增量，尚未进入冻结的 0.4.8 VSIX；真实 WSL Remote 与安装后的人工交互仍待 C4 验收。下一步继续检查普通 PHP 的 C1/C2 高频编辑反馈，再处理 C3 的创建文件 Redo 与 C4 安装验收。
