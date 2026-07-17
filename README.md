# PHP Companion

PHP Companion 在 Intelephense 等 PHP 语言核心之上提供轻量、按需的 PhpStorm 式项目工作流。它不提供第二套补全、格式化、调试、测试或 Twig Language Server。

## 稳定功能

- 按 Composer `autoload.psr-4` / `autoload-dev.psr-4` 和 PHP 7.2–8.5 约束理解项目。
- 从资源管理器创建 Class、Abstract Class、Interface、Trait、Enum 和 PHPUnit Test。
- 复制当前文件的 FQN、namespace、`::class` 引用和工作区相对路径。
- 检查打开文件的 namespace、PSR-4 路径以及主类型名/文件名，并提供 namespace Quick Fix。
- 检测到 Intelephense 时提供统一的 Definition、Implementation 和 References 入口。
- 在 class、interface、trait、enum 声明名称上使用 F2，安全更新项目语义引用、PHPDoc 和匹配的 PSR-4 文件名。
- 从未解析类型的 Quick Fix 或命令导入 Composer PSR-4 类；多候选始终由用户选择。
- 粘贴代码时按需补充确定性 import，并可预览清理、去重和排序当前文件的 imports。

## Import 工作流

`Import Class` 只处理光标下的未解析类型。`Optimize Imports` 对 class/function/const 和 group use 做保守分析；语法错误、动态或无法证明未使用的 import 会被保留。

```json
{
  "phpCompanion.imports.onPaste": "prompt",
  "phpCompanion.imports.optimize.preview": true,
  "phpCompanion.imports.sort": "grouped"
}
```

候选发现和优化只在命令调用时索引当前 Composer 项目。将 `indexing.mode` 设为 `off` 会同时禁用这些项目级能力，普通粘贴不受影响。

## F2 Rename

PHP Companion 默认接管类型声明上的标准 Rename Symbol。文件名严格匹配类型名时会随类型同步重命名，并支持 VS Code 标准重构预览；普通字符串、配置文件、方法、属性、变量和相关测试文件不会被修改。

在 VS Code 的 Rename 输入框中按 `Enter` 会直接应用；按 `Shift+Enter` 或点击 Preview 会打开重构列表，再通过 Apply 提交。文件重命名是声明文本编辑的必需依赖，预览中不要单独取消它。

```json
{
  "phpCompanion.rename.enabled": true,
  "phpCompanion.rename.file": "preview",
  "phpCompanion.rename.phpDoc": true
}
```

使用 Intelephense Premium Rename 时，可将 `phpCompanion.rename.enabled` 设为 `false`，避免两个 Provider 竞争。

## 性能模型

扩展激活只注册命令和 Provider，不扫描工作区、不启动 PHP 进程，也不初始化 Tree-sitter。Composer/PHP 检测仅在打开 PHP 文档或执行相关命令后发生。完整符号索引仅供实验功能按需加载，并受文件数、单文件大小和总读取量限制。

如果项目不应建立任何索引：

```json
{
  "phpCompanion.indexing.mode": "off"
}
```

实验性跨项目重构默认关闭：

```json
{
  "phpCompanion.experimental.refactoring": true,
  "phpCompanion.indexing.mode": "onDemand"
}
```

资源管理器中的 Safe Move 默认开启，在移动 PSR-4 PHP 文件时同步 namespace 与语义引用。Safe Move 采用全有或全无策略：目标 FQCN 冲突、语法错误、未保存的相关文档、索引缺失或非规范 PSR-4 路径都会取消该次资源管理器移动并显示原因。若需关闭，可设置 `phpCompanion.move.enabled: false`。

也可以在资源管理器右键 PHP 文件，使用 `PHP Companion: Safe Move PHP File` 选择目标目录；该命令会以一个原子编辑完成文件移动与代码更新。

使用 `PHP Companion: Show Diagnostics Report` 和 `Show Performance Log` 查看加载与索引情况。日志不会记录源码。

## 推荐职责边界

- Intelephense：补全、诊断、符号导航。
- PHP Debug：Xdebug 调试。
- PHP CS Fixer：格式化。
- PHPUnit/Pest Test Explorer：测试。
- TwigPlus：Twig 编辑体验。
- PHP Companion：Composer/PSR-4、文件生成、项目工作流和安全重构。

PHP Companion 不强制依赖 Intelephense，稳定项目工作流可以独立使用。
