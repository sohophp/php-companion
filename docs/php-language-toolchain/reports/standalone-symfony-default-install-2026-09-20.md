# 独立 Symfony 扩展默认安装证据

日期：2026-09-20

功能提交：`f7204a45671c3166fac343e115d528c17117f595`

## 交付边界

- Open Source Pack 与 Recommended Pack 的实际 `extensionPack` 均显式包含 `sohophp.php-companion-symfony`；清单单元测试和打包后 VSIX 反向检查共同阻止后续遗漏。
- 第三方 `symfony.language-tools` 继续不属于受支持组合；Twig 语言能力继续由 twig-plus 独占。
- 直接安装核心扩展时，只有 Composer `require` 或 `require-dev` 明确包含 `symfony/framework-bundle` 或 `symfony/symfony`，且独立 Symfony 扩展缺失，才显示一次安装提示。单独使用 `symfony/console` 等组件不会误提示。
- 核心 VSIX 不再构建、依赖或打包 `winstar-route-provider.js`；该运行时能力只由独立 Symfony VSIX 提供。VSIX 门禁同时断言核心中禁止出现该文件、Symfony 中必须出现该文件。
- Language Server 内的静态 Symfony 兼容分析仍暂时保留，下一阶段单独移除，避免把发布接线和大范围语义重构混为一个不可审查变更。

## 自动验证

- 全仓 TypeScript 与 ESLint 通过；FrameworkBundle 检测和 Pack manifest 共 9 项定向测试通过。
- 24 个核心组件共 729 项、独立 Symfony 扩展 3 项、根扩展 44 项通过，总计 776 项。
- 四份 VSIX 内容门禁通过：核心只有扩展入口、Language Server 与两份 WASM；Symfony VSIX 包含扩展入口、服务、事件、静态路由、Winstar 路由、Controller 上下文 Provider 与两份 WASM；两套 Pack 的打包 manifest 均包含核心和独立 Symfony 扩展。
- VS Code 1.138.0 隔离 Profile 同时加载最终核心与 Symfony VSIX，插件生命周期、完整索引、诊断、进程崩溃恢复、导航、References、Rename、Safe Move 和 Undo/Redo 回归通过，Extension Host 退出码为 0。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-f7204a45/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `af0dd1269a64e7c641fee2b1e968d04c7bde3f7f948c533025aee6adec72e8fb` |
| `php-companion-symfony-0.4.5.vsix` | `5064e430e74d051c3387c6aef2b29f50c42300be2c9294f5b84aabb2541db248` |
| `php-companion-open-source-pack-0.4.5.vsix` | `89bacead44a492b06d5f008f1148477d5226c2797fa88dc081414a146195798f` |
| `php-companion-recommended-pack-0.4.5.vsix` | `c4ba7876ebf4f649eec2175b913363625e0e0268f5627b84c4900ad12a9ddd75` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性预检均通过且没有失败项。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建和安装目录中的核心扩展入口、Language Server、两份 WASM，以及 Symfony 扩展入口、五个 Provider、两份 WASM 摘要逐项一致；安装后的核心目录确认不存在 `winstar-route-provider.js`。

| 已安装入口 | SHA-256 |
| --- | --- |
| 核心 `dist/extension.js` | `70879781df6b8a2bfaf3f1c9e2d28a904a4a46de35762d28da43e7655ff62929` |
| Symfony `dist/extension.js` | `6a58964fce80b6bb4d7c5df338231643dc9bc4f10ef535e10ec4ca878c641edc` |

## 人工边界

当前 Alpha Profile 需要执行 Reload Window 才会加载刚覆盖安装的候选。Winstar 与 CoreRepo 各两小时的人工编辑验收、Marketplace 公开发布及真实 Marketplace Pack 依赖下载尚未执行。
