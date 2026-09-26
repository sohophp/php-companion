# C1 按需发现 Composer classmap 与 files 类型

日期：2026-09-26。范围仅为 SoPHP Core 与独立 Composer 夹具；没有修改业务项目或重新打包 VSIX。

## 问题与处理

默认 `onDemand` 模式下，未打开的类如果位于 Composer `classmap` 目录或 `files` 映射文件，而且类名不同于文件名，PSR-4 文件名前缀搜索无法发现。真实 stdio 红灯用例中，`Legacy\\OddName` 声明在 `legacy/Bundle.php`，`Bootstrap\\LoadedType` 声明在 `boot/aliases.php`；输入 `new Odd` 返回空建议。

现在仅在 Composer 明确列出的项目与依赖 `classmap/files` 路径中按前缀搜索 PHP 源码，最多加载 64 个匹配文件，再按 PHP 解析出的真实声明生成建议和 `use` 编辑。搜索不完整时返回 LSP `isIncomplete: true`。完整路径结果按根目录和前缀限量缓存；Composer 或 PHP 文件事件清除缓存，搜索代次防止旧请求恢复后写回过期结果。无 `rg` 的环境使用既有的有界工作线程搜索，超过预算时明确保持结果不完整。

## 验证

- 修复后，`OddName` 与 `LoadedType` 从未打开的不同名文件出现，并带正确 `use` 编辑；注释中的 `GhostType` 和被 `exclude-from-classmap` 排除的 `ExcludedType` 不出现。新增 classmap 文件事件后，重新请求能看到 `OddExtra`。70 个匹配文件返回有界 `isIncomplete`，继续输入 `CMap69` 找到目标声明。
- [可重复基准脚本](../../../scripts/benchmark-ondemand-type-completion.mjs)以 `classmap` 模式生成约 1k、10k、50k 个 PHP 文件，每规模启动三个独立语言服务器进程。首次 `new Requ` 请求分别为 `55/49/51`、`58/61/65`、`110/106/108` ms，中位数 51、61、108 ms；同进程重复请求分别为 `8/7/4`、`4/4/5`、`5/5/4` ms。每次都返回文件名为 `Payload.php` 中的 `Domain\\Target\\RequestTarget`。缓存前约 50k 文件的重复请求中位数为 66 ms。这些是本机 Linux 合成夹具的 LSP 响应时间，不代表实际弹窗可见时间。
- 两项定向 stdio 回归与语言服务器 TypeScript 构建通过。VS Code 1.139.1 Linux x64 的独立 Core 源码宿主，在临时嵌套 Composer classmap 项目中取得不同名文件声明的补全和正确 `use` 编辑；整个 C1 六项编辑查询链退出码 0。旧冻结候选跳过这一项新源码门禁。完整 Open Source Pack、无 `rg` 平台、真实弹窗及 WSL Remote 对新 classmap 路径仍需单独验收。

## 边界

搜索只覆盖 Composer 静态声明的 `classmap/files` 路径，按源码前缀选取最多 64 个文件；大量注释或字符串命中可能先占预算，继续缩小前缀可重新搜索。动态 `class_alias()`、运行时生成的类型、PSR-0 自动映射、没有文件监视事件的外部改动及超预算的便携搜索未由本轮证明。
