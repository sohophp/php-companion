# SoPHP 0.4.12 稳定性收口与发布门禁

日期：2026-09-27。Core、Symfony、Open Source Pack 同版交付；Pack 保持 10 个直接成员。未修改业务项目。

## 变更范围

- 完成同类及混合分组 `use function`、`use const` 导入补全，覆盖 Composer `autoload.files` 的未打开声明。
- 完成分组类导入中的子命名空间成员补全，保留已有前缀和闭合大括号，不重复插入导入。
- 在导入别名输入阶段抑制普通表达式的函数和常量建议。

## 本机发布前证据

| 门禁 | 结果 |
| --- | --- |
| `pnpm check` | 类型、lint、完整源码测试、三份 VSIX 与内容校验通过；Semantic 442/442，Language Server 398 通过、1 跳过 |
| `pnpm verify:packages` | 24 个组件 tarball 在隔离消费者环境通过；semantic 和 language-server patch changeset 已列入 |
| VS Code 1.139.1 Linux x64 打包宿主 | 使用 0.4.12 Core 与 Symfony VSIX，退出码 0 |
| 0.4.12 Pack | 三包版本一致，固定成员清单未变化；VSIX 内容校验通过 |
| 本机编辑韧性 | 1000 次、预热 100 次；热补全 p95 1.60 ms，诊断更新 p95 29.60 ms，陈旧补全、Hover 和定义结果均为 0 |

本机构建摘要仅用于发布前追溯。正式发布以标签工作流重新构建的产物及其摘要为准。

```text
443ec1ed1123b282ffa7779e6c737c40fdd16e0bb0ec29ba6f824588b8b2a3c0  php-companion-0.4.12.vsix
bc1df76bd15fec6ccfa8b595d19e9b5ea996ea4d445291700b02a18e074092e7  php-companion-symfony-0.4.12.vsix
b3d34033a830bb520319f48f140bd4978c106406ea0411c73c508fc4eaa8a2e6  php-companion-open-source-pack-0.4.12.vsix
```

## 发布结果

| 发布门禁 | 结果 |
| --- | --- |
| [主线跨平台 CI](https://github.com/sohophp/php-companion/actions/runs/36320687854) | 18/18 任务通过；Windows、macOS、Linux 质量与扩展宿主、三平台 Open Source Profile、PHP 7.2–8.5 集成 |
| [标签发布工作流](https://github.com/sohophp/php-companion/actions/runs/36321575808) | 标签源码、组件包、三份 VSIX、打包宿主、固定成员 Profile、Core → Symfony → Pack Marketplace 发布全部通过 |
| [GitHub Release](https://github.com/sohophp/php-companion/releases/tag/v0.4.12) | 三份标签构建 VSIX 与 `SHA256SUMS` 已公开；重新下载后 3/3 摘要通过 |
| Marketplace 公开查询 | Core、Symfony、Open Source Pack 的最新版本均为 0.4.12 |

标签构建的公开文件摘要：

```text
c73a369149cbe4f3f3a411995d3a821e74f25d62e9f1dac14fbe79d1f2470ddd  php-companion-0.4.12.vsix
c6d6c5ae23bfa7bb228e3ffa7f7c15ba794a9ffea993456e6f4a508b6c4e93f3  php-companion-symfony-0.4.12.vsix
63e6cabe27a4258fcb27d03d82f51081f3aadecb66c54399e0b0d0588e8f08a4  php-companion-open-source-pack-0.4.12.vsix
```

Marketplace 首次公开查询仍显示 0.4.11，随后 Pack、Core、Symfony 依次同步至 0.4.12。隔离宿主与自动化不能代替真实 WSL Remote 人工编辑验收；C4 与 R4 继续推进。已知 `createFile` 最终回退路径的一次 Undo 后 Redo 限制未改变。
