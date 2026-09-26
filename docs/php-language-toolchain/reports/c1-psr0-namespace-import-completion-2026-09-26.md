# C1 PSR-0 命名空间导入补全

日期：2026-09-26。仅修改 SoPHP 语言服务器和独立测试夹具；未修改业务项目，未重新打包 VSIX。

在 Composer `psr-0` 的命名空间映射下，普通类导入 `use Acm` 现在可建议 `Acme\`；继续输入 `use Acme\Bil`，会按 PSR-0 的完整命名空间目录 `legacy/Acme/Billing` 建议 `Billing\`。输入 `use Acme\Billing\` 后，现有类补全链仍可找到尚未打开的 `Invoice` 声明。以 `_` 结尾的旧式 PSR-0 类名前缀不被误报为 PHP 命名空间。

实现继续沿用一层目录读取、取消/失效检查、最多 64 个候选和 incomplete 标记。TypeScript 构建、ESLint、差异检查通过；真实 stdio 定向回归 3/3，涵盖 PSR-4 原有链、PSR-0 类路径及新增 PSR-0 命名空间链。

classmap/files 的命名空间不能按目录推断，因为声明可能与路径完全不同。它们仍需基于已验证声明建立独立的有界候选索引。真实 VS Code WSL Remote 和已安装候选中的操作尚未验证；本次源码增量不在冻结候选 `15a5254` 中。
