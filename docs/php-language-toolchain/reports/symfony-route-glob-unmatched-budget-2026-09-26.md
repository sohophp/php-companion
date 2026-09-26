# Symfony 路由通配扫描不再消耗无关普通文件预算

日期：2026-09-26。独立 Composer 项目使用 `config/routes.yaml` 的 `../src/Controller/**/*.php` 导入；目录中先放 12 个 `.txt` 普通文件，再放带 Route Attribute 的 `ZRoute.php`。在明确的五项扫描预算下，旧 Provider 因 `.txt` 文件先耗尽额度，把路由图标为不完整并漏掉 `ready`。

目录遍历现在先用已知的普通文件类型与路由 glob 判断能否匹配：确定不能匹配的文件不进入递归扫描，也不扣路由预算。目录、符号链接及可能匹配的文件继续使用原有预算、真实路径包含性和不完整标记。目录 watcher 仍记录父目录，后续新建 PHP 文件可触发刷新。

定向反例先失败后通过；Symfony 静态路由 Provider 全部 12 项测试、TypeScript 构建、相关 ESLint 通过。重建语言服务器后，真实 stdio 的路由补全和“不完整快照后重试”两项回归通过。`git diff --check` 通过。未修改业务项目，未打包 VSIX；大规模项目的扫描等待和安装候选仍待单独验收。
