# Symfony 事件关系 watcher 失效

日期：2026-09-20

功能提交：`47277266cf2a36da07e9f483041c0d17217aab5a`

## 问题

独立 Symfony 事件 Provider 的快照以项目类型、服务目录和打开文档为输入。关闭状态的 PHP 文件只修改方法体时，类型声明范围和服务目录可能完全不变；watcher 虽然更新了通用 PHP 工作区，但下一次 References 查询仍可能把旧事件快照判断为可复用，继续返回已经删除或改名的 `dispatch()` 关系。

## 修复边界

- watcher 读取新磁盘源码并确认 `SemanticWorkspace.update()` 产生实现或声明变化后，删除该 Composer 根的权威事件快照。
- 文件确实删除时同样失效事件快照。
- 只改变 mtime、源码语义结果为 `none` 时保留快照，避免无效 Provider 执行。
- 下一次类或 listener 方法 References 查询按既有完整性门禁重新运行独立事件 Provider；核心仍只验证通用 PHP 方法身份和 EventDispatcher 接收者。
- 打开的未保存文档继续通过版本化文档快照参与输入签名，本次不改变其权威性。

## 精准回归

stdio 回归把事件声明、subscriber 和 listener 方法保留在打开文件中，把 `dispatch(new ReadyEvent())` 放在关闭文件中。首次 References 返回 listener 声明与 dispatch 位置；随后把关闭文件改为同长度的 `dispatch(new OtherEvent())`，使类型声明数量、范围和文件长度保持不变。watcher delta 完成后再次查询，旧 dispatch 位置不再出现，证明结果来自失效后的新 Provider 快照，而不是声明元数据偶然变化。

## 验证

- 专项 stdio 回归通过，Language Server 5 个测试文件共 192 项通过。
- Language Server TypeScript 与相关 ESLint 通过。
- 24 个 monorepo 组件从真实 tarball 在仓库外安装运行通过。
- 四份 VSIX 内容门禁通过；VS Code 1.138.0 打包 Extension Host 同时加载核心与 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；对应 JSON 报告随本次证据提交保存。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-47277266/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `f824e3203de8a0f1b2a906919695cfdb8448106d89add137ce93df2adb2859db` |
| `php-companion-symfony-0.4.5.vsix` | `b07f242c516b7c38469b15ac0db76c5ae2d580d4096e47a51e76679bd52131fd` |
| `php-companion-open-source-pack-0.4.5.vsix` | `dfa43665c239804363946f56aed301e93b06029d6c8c819fd199a15b820088d5` |
| `php-companion-recommended-pack-0.4.5.vsix` | `096c10837f50494231d0fc1300d4b406d38634ca7754d1a14e847a0dc91f7202` |

核心和 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `1ffeb4c971f3fe3eed814ae6a3cb0dc9cb4b45bc72c084ef32d7671fed14df3b`；只重启语言服务器后，当前 Extension Host 已自动启动新进程。

本次关闭事件关系的 watcher 陈旧缓存缺陷，不代表动态事件名、条件回调或全部 Symfony Runtime 行为已经实现。
