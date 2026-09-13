# 首发候选收口验证（Linux / WSL）

初次封板：2026-09-09；最新增量封板：2026-09-10。环境：Linux x64 / WSL，VS Code 1.137.0。目标项目运行时使用 Winstar `bin/php-runtime`；本报告不外推到 Windows 原生或 macOS。

## 结论

- `pnpm check` 通过：TypeScript、ESLint、十五个组件测试、根仓库测试、三个 VSIX 打包及包内容检查均成功。
- 十五个组件共 489 项测试通过，根仓库 33 项测试通过，总计 522 项。
- `pnpm verify:packages` 从真实 tarball 在仓库外消费者中安装并运行十五个组件，未残留 `workspace:` 依赖。
- 主扩展打包后同时包含 VS Code adapter、独立 Language Server、Tree-sitter PHP WASM 和 Tree-sitter runtime WASM；两个组合包均通过实际 VSIX manifest 检查。
- Open Source Profile 的打包 Extension Host 回归通过。最新隔离扩展目录同时启用 TwigPlus 1.3.7、Symfony Language Tools 0.20.0、Red Hat YAML 1.24.0、PHP Debug 1.40.1、PHPUnit 3.9.40、PHP CS Fixer 0.3.21 和 EditorConfig 0.18.2；没有 Intelephense 或其他通用 PHP Language Server。
- 最终全量构建产生下列哈希后，直接对现有主 VSIX 依次运行纯净与 Open Source Profile 宿主，中间没有重新打包；两次均验证同一字节产物并以退出码 0 完成。
- 默认静态 Symfony 模式下，自研服务器负责可证明的路由名称补全，Symfony Language Tools 继续负责其源码导航。组合测试覆盖 YAML 声明、Attribute 声明、目录和 glob 导入、exclude、映射 namespace、具名参数、字符串转义、未保存 YAML，以及启用外部运行时路由提供者时的所有权切换。
- 独立安装的 manifest 默认启用自研服务器；纯策略测试证明无竞争 Provider 时启动、无显式选择且存在 Intelephense 时保留旧工作流、显式 true/false 始终优先。纯净及开源组合的打包测试均删除 fixture 显式开关，再验证默认值和完整编辑能力。
- 类型 Rename 已迁入统一 semantic/Language Server：标准 LSP `documentChanges` 原子携带文本编辑与 Composer PSR-4 文件改名，精确覆盖 import、原生类型、PHPDoc、Attribute 和 FQCN，保留显式 alias，忽略非规范陈旧重复声明，并拒绝目标声明或可见 import 冲突。纯净及 Open Source Profile 的真实打包 Extension Host 均完成 Apply/Undo/Redo。旧类型 Provider 只用于自研服务器关闭时的兼容模式。
- 默认路径的 Import Class、Paste/Resolve Imports 与 Optimize Imports 已改由 Language Server 提供身份、候选和编辑：Composer 规范声明选择、复制类型身份、结构化未解析类型、批量 import、alias 冲突、未使用项删除、重复 import 去重和 grouped/FQCN 排序均有 semantic/stdio 证据；Import、Resolve 与 Optimize 另有真实打包 Extension Host Apply/Undo/Redo 证据。旧路径仅用于关闭服务器的兼容模式。
- 默认 Safe Move 命令、资源管理器移动前预检与移动后协调已迁入 semantic/Language Server。连续 Service→Contact→Service 移动会刷新当前声明身份，并按移动前冻结的受影响文件集合收敛 namespace、引用及重复 import；真实打包 Extension Host 覆盖双向移动和命令 Apply/Undo/Redo。主类型/文件名诊断及 Rename File Quick Fix 同样由 LSP 提供。
- 唯一解析调用的 PHPDoc callable 契约可为无原生类型的 closure/arrow 参数提供上下文对象类型；模板可从同一调用的其他已证明数组/集合实参唯一专门化，覆盖 `array_map` 的 callable/null 内建重载筛选；可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使映射结果元素继续进入补全、多目标 Definition 与参数诊断。semantic、stdio LSP、纯净打包宿主和 Open Source Profile 均验证输入与结果传播；用户重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 和参数数量不符保持 unknown。顶层 arrow function 的局部值分析具有语法根终止保护，不再无限循环。

## 产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

## 可复现命令

```bash
pnpm check
pnpm verify:packages
pnpm test:extension:packaged

PHP_COMPANION_TEST_EXTENSIONS_DIR=/path/to/isolated/extensions \
PHP_COMPANION_PHP_EXECUTABLE=/path/to/winstar/bin/php-runtime \
PHP_COMPANION_PHP_CS_FIXER=/path/to/winstar/vendor/bin/php-cs-fixer \
PHP_COMPANION_PHPUNIT_EXECUTABLE=/path/to/winstar/vendor/bin/phpunit \
pnpm test:extension:open-source-profile
```

## 已知边界

- Open Source Profile 的一次运行中 Red Hat YAML formatter 未在固定 5 秒冷启动窗口内返回；未修改预算或测试代码，使用相同配置重试后完整通过。该单次波动不能作为跨机器稳定性证据。
- Symfony Language Tools 0.20.0 在宿主关闭期间仍可能记录 `EPIPE` / `ERR_STREAM_DESTROYED`；本轮功能断言和 Extension Host 均以退出码 0 完成。该外部插件行为不能记为已修复。
- Symfony 环境条件、本地化路由以及运行时生成的路由仍由 Symfony Language Tools 的显式运行时模式负责；自研静态补全不会猜测这些有效路由。
- 本轮只证明 Linux x64 / WSL。Windows 原生与 macOS 的平台门禁仍缺少执行证据。
- 公开 npm/Marketplace 发布未获授权，也没有执行。
