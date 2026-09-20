# Symfony 服务容器仅由独立 Provider 提供

日期：2026-09-20

功能提交：`b741af92766e731c8e0f0fbf7b898ac2b022c1e0`

## 所有权边界

- 核心 Language Server 不再导入或执行 Symfony YAML/XML/PHP Configurator、Bundle 服务资源和 DebugContainer 分析器。
- 删除核心专用 `SymfonyFactCache` 及其缓存回归；服务容器源码与缓存只由可独立发布的 `@php-companion/provider-symfony-services` 管理。
- 核心保留框架中立的 Provider 宿主、PHP 类型身份验证、自动装配解析、Hover/Definition/References 合并和配置变化触发器。
- 恰好一个完整的 `replacesContainerServices` Provider 才能提交服务目录。Provider 缺失、重复、失败、输入越界或返回不完整时，核心清空服务目录、容器字面量返回和编译方法/属性参数，不回退扫描项目配置，也不保留陈旧结果。
- Open Source Pack 与 Recommended Pack 均已安装独立 Symfony 扩展；直接安装核心到 FrameworkBundle 项目时仍会提示安装该扩展。

## 自动验证

- `pnpm check` 通过：TypeScript、ESLint、24 个核心组件 728 项测试、Symfony 扩展 3 项、根扩展 44 项以及四份 VSIX 内容门禁全部通过。
- Language Server 190 项真实 stdio 测试通过。覆盖独立 Provider 服务注册 References、配置变化刷新，以及撤销 Provider 后清空事实且不扫描 `services.yaml`。
- 24 个组件 tarball 在仓库外隔离消费者中安装和调用成功。
- VS Code 1.138.0 隔离 Profile 同时加载打包后的核心和 Symfony VSIX，Extension Host 退出码为 0。
- 核心 VSIX 只包含核心扩展与通用 Language Server；Symfony VSIX 单独包含 `service-provider.js`、事件/Controller/路由 Provider 和解析器 WASM。

## 真实 Winstar 审计

按产品默认上限读取 9,999 个文件，项目源码集合完整并建立 10,036 个类型。源码构建的独立服务 Provider 用时 773.618 ms，返回：

| 事实 | 数量 |
| --- | ---: |
| 服务 | 844 |
| 显式服务 | 520 |
| resource 服务 | 324 |
| 字面量方法返回 | 4 |
| 配置 URI | 25 |
| 编译方法参数 | 0 |
| 编译属性参数 | 0 |

当前 Winstar 的 DebugContainer 比源码、配置或 Composer 元数据旧，因此 Provider 按约定拒绝编译参数。覆盖安装后的 `service-provider.js` 再次返回相同事实，用时 1,156.782 ms。

## 候选、预检与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-b741af92/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `6c38025ed6bd400258bfc949e7f742c01f9533fc063f433236881625bedeb03f` |
| `php-companion-symfony-0.4.5.vsix` | `a3a2b794fde386bda48c4977c7e99bc220835f31c39ca64d2199b0736f5ed924` |
| `php-companion-open-source-pack-0.4.5.vsix` | `71d534efadffb6139ed59127a389797de272be8fbd16d8675bfade6e3c8e80e3` |
| `php-companion-recommended-pack-0.4.5.vsix` | `06f2e77206e4caa10eb24760283907bc3f31a25e26c514c03e6e5dab50c82fb5` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的候选摘要、Composer 根、运行时版本和 WSL 确定性预检均通过。核心与 Symfony VSIX 已覆盖安装到 WSL RockyLinux8；构建和安装目录中核心扩展、Language Server、Symfony 扩展及服务 Provider 摘要一致。

严格编辑器预检从自动化 shell 运行时按约定拒绝“非 VS Code WSL 集成终端”，同时记录外部 `xdebug.php-debug` 已从冻结的 1.40.1 更新为 1.40.2；产品扩展、Open Source Pack 和其他冻结扩展匹配，未发现竞争 PHP Provider。

## 剩余边界

Alpha Profile 需要执行 Reload Window 才会加载新安装产物。事件关系与静态路由仍有核心兼容扫描，下一阶段继续移除。Winstar 与 CoreRepo 各两小时人工编辑验收及 Marketplace 发布尚未执行。
