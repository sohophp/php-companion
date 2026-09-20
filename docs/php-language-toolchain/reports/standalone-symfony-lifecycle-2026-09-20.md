# 独立 Symfony 扩展生命周期门禁证据

日期：2026-09-20

功能提交：`9339f353b769bf03ccdd5f9e76f98d9096be7dfc`

## 生命周期契约

- plugin API v1 registration 新增可选 `update()`，因此不破坏已经发布的 v1 消费者。核心先完整校验并快照新贡献，再原子替换活动 Provider 集；更新期间不会先撤销已经证明有效的 Symfony 能力。
- 更新必须保持大小写不敏感的 integration identity。身份变化、无效 Provider 描述符及其他校验失败会拒绝新贡献并保留上一个有效快照。
- `dispose()` 可重复调用；释放后再调用 `update()` 会被明确拒绝，避免已停用扩展重新注入 Provider。
- Symfony 扩展检测到支持 `update()` 的核心时使用原子更新；旧 plugin API v1 核心仍使用撤销后重新注册的兼容路径，并在重新注册前清除旧 registration 状态。
- plugin API 版本不兼容在注册任何部分能力前被拒绝。

## 自动验证

- 全仓 TypeScript、ESLint、`git diff --check` 和完整 `pnpm test` 通过。
- 24 个核心组件共 729 项测试、独立 Symfony 扩展 3 项、根扩展 44 项通过，总计 776 项。
- registry 单元回归覆盖原子更新、无效更新保留上次快照、identity 变化拒绝、重复释放和释放后更新拒绝；Symfony 单元回归同时覆盖新核心原子路径、旧 v1 兼容路径及 API 版本不兼容。
- VS Code 1.138.0 隔离 Profile 加载打包后的核心与 Symfony VSIX，在真实 Extension Host 中直接执行 registration update、拒绝 identity 变化、重复 dispose 和 dispose 后拒绝 update；随后完整索引、诊断、进程崩溃恢复、导航、References、Rename、Safe Move 和 Undo/Redo 回归全部通过，Extension Host 退出码为 0。
- 24 个组件 tarball 在仓库外空白消费者中完成安装、导入和 smoke；四份 VSIX 内容门禁通过。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-9339f353/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `871b01fe67a7b803ad43024642f2821ab4e37e1f9c90e19ba802beddc5c5da57` |
| `php-companion-symfony-0.4.5.vsix` | `38ddf13e82a9df00c5e73f0d956d7e21beda8ad7309d4337123452af75015327` |
| `php-companion-open-source-pack-0.4.5.vsix` | `57ca64542fe9d901fcc768c51c7e66be7486d7b89a4224827ed68e43a3b7b275` |
| `php-companion-recommended-pack-0.4.5.vsix` | `366fc14e2a52eeedde779d575b463bc131112fecd062e2df95f5a53d6a1d67be` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性预检均通过且没有失败项。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建和安装目录中的核心扩展入口、Language Server、Winstar route Provider、两份 WASM，以及 Symfony 扩展入口、五个 Provider、两份 WASM 摘要逐项一致。

已安装入口摘要：

| 入口 | SHA-256 |
| --- | --- |
| 核心 `dist/extension.js` | `b8b2891d904f58f9c42ba01093b161f993fdd4ef65b7cc33bffb32b0787e5e2e` |
| Symfony `dist/extension.js` | `6a58964fce80b6bb4d7c5df338231643dc9bc4f10ef535e10ec4ca878c641edc` |

## 人工边界

真实 Marketplace 升级或卸载会要求 VS Code 执行 Reload Window。自动门禁在真实打包 Extension Host 内验证了同一 registration 更新、拒绝和释放契约，但没有伪装成已经完成 Marketplace UI 事务。当前 Alpha Profile 仍需 Reload Window，并完成 Winstar 与 CoreRepo 各两小时的人工编辑验收。

下一阶段移除核心内置 Symfony 兼容扫描，并在独立 Symfony 扩展缺失或不兼容时提供清晰的产品提示。
