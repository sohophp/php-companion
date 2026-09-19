# 独立 Symfony 静态路由迁移证据

日期：2026-09-20  
功能提交：`e4f3ff1c664f038d9b24987ec0e4c0e7269588b9`

## 交付边界

- 新增可独立发布的 `@php-companion/provider-symfony-routes`，由 `sohophp.php-companion-symfony` VSIX 打包为 `dist/static-route-provider.js`。
- Provider 静态读取 YAML、PHP `RoutingConfigurator`、Route Attribute、Kernel 导入、Bundle 注册、Composer PSR-4、环境条件、本地化 path/prefix、glob 与 exclude；不启动项目 PHP。
- route-provider schema 1 请求新增有界 PHP/YAML 打开文档快照：最多 128 份、单份 1,000,000 字符、合计 8 Mi 字符预算。未保存内容覆盖磁盘。
- `replacesStaticRoutes` 建立单一所有权：权威 Provider 成功时 Language Server 不执行核心兼容扫描；进程失败、超时、协议错误或打开文档越界时回退核心扫描。
- Winstar 运行时 Provider 保持增量来源，只补充静态配置无法证明的项目动态路由。

## 自动验证

- 全仓 TypeScript、ESLint 与 `git diff --check` 通过。
- 21 个组件共 717 项测试通过；其中 framework-symfony 42 项、静态 Symfony Provider 2 项、Language Server 189 项。独立 Symfony 扩展 2 项、根扩展 44 项通过。
- route-provider 测试验证所有权标志和打开文档边界；进程宿主测试证明 YAML 快照实际传入子进程。
- Language Server stdio 回归证明权威 Provider 成功时核心静态路由不重复出现，Provider 读取失败时恢复核心静态结果。
- 21 个组件 tarball 在仓库外消费者中安装和调用成功。
- 四份 VSIX 内容门禁通过；Symfony VSIX 含扩展入口、静态/运行时 Provider 和两份 Tree-sitter WASM，bundle 无残留 workspace 运行时 import。
- VS Code 1.138.0 隔离 Profile 同时加载核心和 Symfony VSIX，扩展 API 报告静态 Provider 已注册，并从真实打包进程返回 `profile_user` 路由补全；Extension Host 退出码为 0。

## 真实项目与候选

打包 Provider 对 `/var/www/php/8.5/winstar2024` 的 `dev` 环境返回 17 条静态 Symfony 路由及精确来源；此前独立 Winstar Provider 的 362 条运行时模块路由保持不变。安装后的 WSL Symfony 扩展再次返回同一 17 条静态路由。

候选目录：`artifacts/php-companion-alpha-0.4.5-e4f3ff1c/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `afc7fefc5b7d40d071ab3947e43d33bf9375040c863fe7aa768c3957fff42561` |
| `php-companion-symfony-0.4.5.vsix` | `848ba92e884ecd9750ec1ce207185acd757e6f8be5fe610d856b936ebe167213` |
| `php-companion-open-source-pack-0.4.5.vsix` | `6b94180cad07c9728b98fcdd7a4ea4dfa49e28759d5afbe3ac36371d86e6c920` |
| `php-companion-recommended-pack-0.4.5.vsix` | `ecda18d4ab2a47a0053977798b267dfb3d8ba29801462a6a579dfddd41346e33` |

四份 `sha256sum -c`、Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检均通过。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8；构建和安装的核心入口、Language Server、Symfony 入口、静态 Provider 与 WASM 摘要逐项一致。

## 剩余边界

需要在实际 Alpha Profile 执行 Reload Window。服务容器/依赖注入、事件关系和 Controller render 上下文仍由核心组装，后续按同一“独立事实协议、单一运行所有者、失败回退”模式迁移。Marketplace 发布和两小时人工编辑验收仍未执行。
