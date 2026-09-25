# C3 类型生成目标的文件系统类型判定

日期：2026-09-25。生成入口先前用目标路径是否有扩展名来区分文件和目录；名字带点的目录会被误判为文件，目标因此落到上一级。现在对已存在的目标读取 VS Code 文件系统类型，目录保持原位，文件使用其父目录；不存在的目标保留旧的路径回退。未修改业务项目。

独立 Composer 夹具把 `src/Service.With.Dot/` 映射为 `App\Dotted\`，C3 宿主从该目录生成类型，检查实际文件位于映射根且声明 `namespace App\Dotted;`。同一宿主从已存在的 PHP 文件生成同目录类型，检查实际位置和 `App\Service` 命名空间。`pnpm build`、测试 TypeScript 编译和 VS Code 1.139.0 Linux x64 独立 C3 源码宿主均通过；宿主日志 `/tmp/sophp-c3-dotted-generation-retry-20260925.log`。

继续检查发现，映射根目录**之下**的 `src/Invalid.Dir/` 会被拼入命名空间，原逻辑可能生成无效 PHP。现在校验 PSR-4 前缀和目录后缀的每个名称段；无效时在预览前给出明确错误，不创建文件。带点目录若自身是映射根，仍使用 Composer 指定的合法前缀。独立 C3 宿主再次通过，日志 `/tmp/sophp-c3-invalid-namespace-20260925.log`；源代码与测试 TypeScript 编译、ESLint 均通过。

PHP 7.2 CLI 对临时语法样本确认：`namespace App\Invalid.Dir` 解析失败，中文命名空间和类名可解析。因此名称校验也改为接受非 ASCII Unicode，并在 `src/中文/` 生成 `测试类.php` 验证实际文件与命名空间。独立 C3 宿主退出码 0，日志 `/tmp/sophp-c3-unicode-namespace-20260925.log`；TypeScript 与 ESLint 再次通过。

这项修复只覆盖目标定位。生成文件的一次 Undo 已通过，一次 Redo 仍未恢复，继续按[独立探针](c3-type-generation-undo-redo-probe-2026-09-24.md)保持 C3 未完成。
