# 独立 Symfony 服务容器迁移证据

日期：2026-09-20

功能提交：`004fbcf35da6bd5397eedd8821b99d187c901d23`

## 交付边界

- 新增可独立发布的 `@php-companion/provider-symfony-services`，由 `sohophp.php-companion-symfony` VSIX 打包为 `dist/service-provider.js` 并通过核心 plugin API 注册。
- Provider 静态读取 YAML、XML、PHP Configurator、确定性导入、已注册 Bundle 资源和新鲜的 `var/cache/dev/*DebugContainer.xml`；不启动 Kernel、不执行项目 PHP，也不加载项目 autoloader。
- 框架中立 semantic-provider schema 1 新增有界项目类型目录及 PHP/YAML/XML 打开文档快照。快照最多 128 份、单份最多 1,000,000 字符、合计最多 8 Mi 字符；未保存内容覆盖磁盘。
- Provider 返回完整服务、别名、自动装配/绑定、方法调用、属性注入、事件标签、编译容器参数和配置来源事实。项目类型最多 100,000 项，身份与路径文本合计最多 16 MiB。
- `replacesContainerServices` 建立单一所有权：内置集成只能在权威 Provider 失败、超时、协议无效、输入越界或快照不完整时回退；用户配置的外部命令不能取得权威容器所有权。
- PHP 文件变化以 250 ms 合并刷新；YAML/XML 使用专用有界快照通知，但其语法、Schema、补全和格式化继续由 Red Hat YAML/XML 等成熟扩展负责。

## 自动验证

- 全仓 TypeScript、ESLint、`git diff --check` 和完整 `pnpm test` 通过。
- 22 个组件共 723 项测试通过；其中 semantic 269 项、Language Server 190 项、`provider-symfony-services` 2 项、framework-symfony 42 项。独立 Symfony 扩展 2 项、根扩展 44 项通过。
- Language Server 集成回归证明 Provider 收到项目类型及未保存 YAML 快照，PHP 类 References 能返回服务注册位置；补全会等待权威事实协调完成，避免首次请求竞态。
- 22 个组件 tarball 在仓库外消费者中安装和调用成功，安装后的 Language Server 可启动并回答真实 PHP 查询。
- 四份 VSIX 内容门禁通过；Symfony VSIX 含扩展入口、服务 Provider、静态/运行时路由 Provider 和两份 Tree-sitter WASM，bundle 无残留 workspace 运行时 import。
- VS Code 1.138.0 隔离 Profile 同时加载打包后的核心与 Symfony VSIX，全部真实编辑器工作流通过，Extension Host 退出码为 0。

## 真实 Winstar 审计

源码审计完成 9,999 个索引文件，项目源码集合完整，并建立 10,036 个项目类型。打包后的 Provider 在约 674 ms 内返回：

| 事实 | 数量 |
| --- | ---: |
| 服务 | 844 |
| 其中显式服务 | 520 |
| 其中 resource 服务 | 324 |
| 字面量方法返回 | 4 |
| 配置 URI | 25 |
| 编译方法参数 | 0 |
| 编译属性参数 | 0 |

当前 Winstar 的 DebugContainer XML 比相关源码、配置或 Composer 元数据旧，Provider 按约定拒绝采用它，因此编译参数为 0；新鲜/陈旧编译容器两条路径均有自动测试。覆盖安装到 WSL 后，实际安装的 Provider 再次对同一项目返回 844 个服务、4 个字面量返回和 25 个配置 URI。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-004fbcf3/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `510c379791025bfb99c67f0006535a33163f5548c8de8b6966c37965e082ad65` |
| `php-companion-symfony-0.4.5.vsix` | `79f344d8955c84e8cc1893106ee9032391212ba484e3c64d3ec21137e1f99929` |
| `php-companion-open-source-pack-0.4.5.vsix` | `f7c6df1d76e88987333b9ea14b7034e3c64cecf28f01f6046f4d96f2420791e5` |
| `php-companion-recommended-pack-0.4.5.vsix` | `9b6a8508df7614ffcca9bc3395676273e7cb5727724262a205a3b8c6b44347c8` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性预检均通过且没有失败项。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8；构建和安装目录中的核心入口、Language Server、Symfony 入口、三个 Provider 与两份 WASM 摘要逐项一致。

## 剩余边界

实际 Alpha Profile 仍需执行 Reload Window。事件订阅/监听/派发关系和 Controller render 上下文尚待迁入独立 Symfony 扩展；迁移完成前，核心内现有服务扫描仅作为失败回退保留。Marketplace 发布与 Winstar/CoreRepo 各两小时人工编辑验收尚未执行。
