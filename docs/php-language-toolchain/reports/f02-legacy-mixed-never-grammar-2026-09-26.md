# F02：PHP 7 旧版类名 `mixed` / `never` 的解析边界

日期：2026-09-26。只使用本机独立临时 PHP 文件和 SoPHP 解析器；未修改业务项目，未生成 VSIX。

## CLI 对照

将现有 F02 的 23 个代表性版本语法夹具分别交给已安装的 PHP 7.2、7.4、8.1、8.2、8.4、8.5 执行 `php -l`，共 138 次。仅有四次与 SoPHP 当前“最低版本”标签的字面解析预期不同：PHP 7.2/7.4 都接受 `mixed` 参数类型和 `never` 返回类型。进一步用反射确认，在这两个旧版本中，它们的 `ReflectionNamedType::isBuiltin()` 为 `false`，即按类名解释；PHP 8.1、8.2、8.4、8.5 把它们当作内建类型。CLI 接受这些源码不证明旧版支持新类型的语义。

更明确的合法反例：同文件声明 `class mixed {}`、`class never {}`，再把两者用于参数与返回类型。PHP 7.2/7.4 的 `php -l` 均通过；PHP 8.1/8.5 拒绝已成为保留类型名的类声明。

## SoPHP 修复与验证

原 Tree-sitter PHP 语法将 PHP 7 合法的 `class mixed` / `class never` 解析为 `ERROR`，`ParsedPhpDocument.declarations` 为空，因而会产生语法诊断、版本诊断，并缺失类导航。先尝试只按同文件声明过滤版本诊断的定向回归，因解析器未提供声明事实而失败；该局部尝试已撤回。

当前源码在解析树明确出现这两种类声明错误时，以等长占位名重新解析，并从原始源码恢复声明名与位置；其它语法错误仍保留。恢复过的树不再作为下次增量解析的旧树，以免旧占位文本污染后续编辑。语言服务器仅当旧版同 namespace 的类声明或显式类 import 可证明时，抑制相应“需要新原生类型”的版本诊断；PHP 8.0+ 的 `class mixed` 与 PHP 8.1+ 的 `class never` 仍在声明名处报语法错误。没有类声明或导入证据的裸 `mixed` / `never` 类型用法保持原有兼容提示。

Parser 全部 84 项、Semantic 全部 399 项、Language Server 全部 371 项通过（另有 1 项原有跳过）；后补的跨文件导航与 PHP 8.0 `never`、旧版显式 import 断言也通过定向复测。根 `pnpm typecheck`、相关 ESLint 与测试入口 TypeScript 通过。定向语义测试覆盖同文件参数/返回类型与跨文件类导航。VS Code 1.139.0 的独立 C1 源码宿主以 PHP 7.2、7.4 目标分别通过 Definition Provider 与 Problems 检查，且各自原六项编辑、vendor、多根链继续通过；日志 `/tmp/sophp-c1-legacy-native-names-php72-20260926.log`、`/tmp/sophp-c1-legacy-native-names-php74-20260926.log`，退出码均为 0。

**边界：**修复在当前源码，未重新打包，因此冻结候选 `15a5254` 仍有旧行为。`parseTree` 和 `parseDocument` 均会恢复匹配的旧类声明，且保持原始源码的位置；恢复后的树节点文本含有等长占位名，直接使用语法树的调用者须按节点范围读取原始源码。其它复杂旧语法以及真实 WSL Remote 仍须单独审计。完整 F02 语法/语义矩阵仍开放。

后续补充了未保存编辑链：在 PHP 7.2 与 7.4 的独立 C1 源码宿主中，先把 `class mixed` 改为 `class LegacyMixed`，保留旧类型引用，确认版本诊断出现；再把类型引用改为 `LegacyMixed`，确认诊断撤销且 Definition 跳到新声明。两次宿主均继续完成原六项编辑查询及 vendor、多根链并以 0 退出。日志 `/tmp/sophp-c1-legacy-unsaved-php72-20260926.log`、`/tmp/sophp-c1-legacy-unsaved-php74-20260926.log`。这验证本次恢复在连续未保存编辑后的可见结果，仍不等于真实 WSL Remote 或已安装候选验收。

随后将恢复入口移至 `parseTree`，使直接语法树调用者得到相同的结构；新增解析器断言检查无错误树与原始范围。Parser 84 项、Semantic 399 项仍通过，Parser 与根 TypeScript 类型检查通过。重新构建源码后，PHP 7.2、7.4 的 C1 宿主再次通过旧类名和连续未保存编辑链，日志 `/tmp/sophp-c1-legacy-unsaved-parse-tree-php72-20260926.log`、`/tmp/sophp-c1-legacy-unsaved-parse-tree-php74-20260926.log`，均以 0 退出。`git diff --check` 通过。这一步未重新打包候选。

## 注释分隔类声明

PHP 7.2/7.4 CLI 均接受 `class /* legacy */ mixed {}` 与 `final /* legacy */ class never {}`。原解析恢复只识别空白分隔，因而对带注释声明报错，并让从类型引用发起的 Rename 缺少声明事实。恢复规则现只在语法错误节点中识别 PHP 空白或注释分隔的上述两个类名，保留原始位置；注释和字符串中的同形文本仍不触发恢复。

Parser 全量 85 项、Semantic 全量 345 项通过；定向语言服务器诊断与根 TypeScript 检查通过。重建源码后，PHP 7.2、7.4 的 C1 独立宿主均验证带注释声明的 Definition 与 Problems，并继续通过原有旧类名未保存编辑链、六项查询、vendor 和多根检查。日志 `/tmp/sophp-f02-commented-legacy-c1-php72-20260926.log`、`/tmp/sophp-f02-commented-legacy-c1-php74-20260926.log`，两次退出码均为 0。此修复仍未进入冻结候选，也不证明其它 PHP 7 旧语法或真实 WSL Remote 已验收。

追加 CLI 对照：PHP 7.2 接受 `class // legacy` 换行后声明 `mixed`，PHP 7.4 接受 `final # legacy` 换行后声明 `class never`；PHP 8.1 拒绝块注释分隔的两个保留类名。Parser 85 项和定向语言服务器诊断再次通过：旧目标无误报，8.1 的诊断只覆盖 `mixed` / `never` 声明名。此项是额外语法边界证据，未扩大已安装候选或 Remote 验收范围。

此前[九目标版本候选宿主门禁](f02-alpha-nine-target-host-2026-09-26.md)只覆盖有限的 C1 编辑链和版本语法夹具，不包含旧版以 `mixed` / `never` 为用户类名的场景；不能用该候选结果验收本次源码修复。
