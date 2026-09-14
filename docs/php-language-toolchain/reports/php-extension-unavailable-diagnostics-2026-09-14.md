# PHP 扩展不可用诊断验收

日期：2026-09-14

## 目标

扩展能力选择已经能从内建文档移除明确禁用的符号。本轮补齐用户可见的失败原因：代码使用属于已审计扩展、且该扩展被 workspace 设置或 Composer platform 明确禁用的符号时，发布稳定诊断 `php.extension.unavailable`。

## 组件契约

- `@php-companion/language-spec` 导出 `builtinPhpExtensionStub(version, extension)`；单扩展目录与完整内建文档共用生成器，不维护第二份类型、函数或常量清单。
- `@php-companion/semantic` 导出带 FQCN 和来源 URI 的全局类型、函数、常量目录。未解析函数/常量查询的默认白名单为空，继续抑制无法证明的未限定全局符号。
- Language Server 只在某个 Composer 根确有禁用扩展时延迟构建当前 PHP 版本的所有权目录，并按版本缓存。符号由多个扩展共同提供时，只有全部提供者均被禁用才可报告不可用。

## 已实现行为

首批覆盖 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 与 XMLWriter：

- 类型、函数和全局常量使用均可报告；
- `use` 导入后的类型、函数和常量别名解析到原始符号身份；
- 诊断 data 记录符号种类、FQCN、扩展名，以及禁用是否来自 `phpCompanion.disabledExtensions`、Composer platform 或两者；
- 同一使用点不会同时得到普通 unresolved 与 extension unavailable 诊断；
- workspace 设置通知会立即重发已打开文档的诊断；`composer.json` / `composer.lock` 变化在重新索引后刷新；
- 项目源码或 polyfill 已声明同一全局身份时，以项目声明为准，不报告扩展不可用。

## 精准边界

- 扩展未明确禁用时不报告，即使当前机器的 PHP 没有加载它。
- 只认识八组已经拆分并审计的目录；未知扩展和未审计符号保持静默。
- 未限定的未知全局函数和常量仍不进入普通 unresolved 诊断；扩展所有权目录只是严格白名单。
- 索引未完成或文档存在语法错误时不发布该语义诊断。
- 本轮不自动修改 workspace 设置、Composer 文件或运行时环境。

## 本地验证

- `@php-companion/language-spec`：51 项通过，验证每个单扩展 stub 与选择契约。
- `@php-companion/semantic`：251 项通过，新增全局目录、白名单穿透及项目/polyfill 合法反例。
- `@php-companion/language-server`：160 项通过；真实 stdio 覆盖直接名称、三类 `use` 别名、设置与 Composer 双来源、设置刷新、Composer 文件刷新，以及普通 unresolved 去重。
- `pnpm test`：十五个组件共 611 项、根扩展 33 项全部通过。
- `pnpm lint`、`pnpm typecheck` 通过。
- `pnpm verify:packages` 在仓库外隔离 consumer 中验证十五个组件 tarball。
- `pnpm package:all` 与 `pnpm verify:vsix` 验证主扩展、Open Source Pack 和 Recommended Pack 三份 VSIX。
- `pnpm test:extension:packaged` 在 VS Code 1.137.0 Linux x64 隔离 Profile 中退出码为 0。

产物 SHA-256：

- `php-companion-0.4.5.vsix`：`2b713d8763e51cd25d01a1af69949df96853d9cddd66bfa25cb355c7857b9d3d`
- `php-companion-open-source-pack-0.4.5.vsix`：`ead473f54da2e535abf8d95cbc8956e4862959dbba2896c591214cba67113ca9`
- `php-companion-recommended-pack-0.4.5.vsix`：`92cff908e8ed0acd54d14a1c4144288458506f70d9ae7da4814cce001beff255`

## 后续范围

运行时扩展探测、可切换环境配置、其余扩展目录、扩展版本约束和 P6 剩余诊断继续保持开放。本报告关闭首批已审计扩展的明确不可用诊断，不代表 P3、P6 或 R4 总体验收完成。
