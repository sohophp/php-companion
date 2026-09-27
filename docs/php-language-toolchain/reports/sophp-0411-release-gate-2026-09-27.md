# SoPHP 0.4.11 稳定性收口与发布

日期：2026-09-27。标签 `v0.4.11` 指向 `c10c578`，Core、Symfony、Open Source Pack 同版发布；Pack 保持 10 个直接成员。没有修改业务项目。

## 本次改动

- Safe Move 按 namespace 和导入别名分别协调类导入，避免多个 namespace 块或不同别名之间互相删除。
- 普通 PHP 表达式可同时收到同前缀的函数与常量建议。
- 顶层 `use function` / `use const` 可补全已索引声明和 Composer `autoload.files` 中的符号，不重复插入导入。
- 分组函数、常量导入尚未纳入新增补全范围。

## 门禁与产物

| 门禁 | 结果 |
| --- | --- |
| 本机 `pnpm check` | 类型、lint、完整测试和三份 VSIX 校验通过；Semantic 441/441，Language Server 398 通过、1 跳过 |
| 组件 tarball | 24 个组件在隔离消费者环境通过；补齐本次 semantic 和 language-server changeset |
| 本机 VS Code 1.139.1 打包宿主 | 使用已生成的 0.4.11 Core、Symfony VSIX，退出码 0 |
| [主线跨平台 CI](https://github.com/sohophp/php-companion/actions/runs/36314847979) | 18/18 任务成功；Windows、macOS、Linux 质量与宿主、三平台 Open Source Profile、PHP 7.2–8.5 集成 |
| [标签发布工作流](https://github.com/sohophp/php-companion/actions/runs/36315448753) | 标签构建、组件包、VSIX、打包宿主、固定成员 Profile 和 Core → Symfony → Pack Marketplace 发布步骤均成功 |
| [GitHub Release](https://github.com/sohophp/php-companion/releases/tag/v0.4.11) | 同次标签构建的三份 VSIX 与 `SHA256SUMS` 已公开；重新下载后 `sha256sum --check` 三份均通过 |
| Marketplace 公开查询 | `vsce show` 分别返回 Core、Symfony、Open Source Pack 的最新版本 `0.4.11` |

标签构建的 SHA-256：

```text
b631b9fa15199259efe2f5eb9a5df88021f178b49559e8e5f7dc7f5f624c56a4  php-companion-0.4.11.vsix
0d1806fe937e430bac28edf6a786ebf2f48f7f667698812a6a282f3aeeeb6936  php-companion-symfony-0.4.11.vsix
c462d91600c37abd8929731fb1fe68e339cf0a210bf7bf5f9bb6126178241ce4  php-companion-open-source-pack-0.4.11.vsix
```

Marketplace 发布后的首次公开查询仍显示 `0.4.10`；索引同步后，三份 `vsce show` 均显示 `0.4.11`。隔离宿主和自动化不等于真实 WSL Remote 人工编辑或长期使用验收；C4 与 R4 仍继续推进。0.4.10 记录的 VS Code `createFile` 回退 Undo/Redo 限制造成的剩余风险未改变。
