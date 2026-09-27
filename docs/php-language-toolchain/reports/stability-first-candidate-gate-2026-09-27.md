# 首个稳定版候选：当前门禁与剩余条件

日期：2026-09-27。候选源码 `c8f4bb8e04c9d77a207a0d5642a4ea26cce7969a`，目录 `artifacts/php-companion-alpha-0.4.12-c8f4bb8e/`。它包含公开 0.4.12 之后的三项分组导入修复，仍是本地候选，不能与已发布的 0.4.12 混称。

## 已通过

| 门禁 | 结果与范围 |
| --- | --- |
| 源码质量 | `pnpm check` 退出码 0；类型检查、Lint、源码测试及三份 VSIX 校验通过。Semantic 442/442；Language Server 398 通过、1 跳过。详见[首轮基线](stability-first-baseline-2026-09-27.md)。 |
| 10 项 Pack 打包宿主 | 冻结外部扩展版本，并以项目 PHP、fixer、PHPUnit CLI 跑完整 Pack 打包宿主；退出码 0，日志 `/tmp/sophp-stable-full-pack-host-20260927.log`。这是隔离宿主，不是当前 WSL 编辑器窗口。 |
| C3 打包宿主 | 同一完整 Pack 的 C3 专项退出码 0，涵盖已支持的 Import、Rename、Safe Move、Extract、Inline 与类型生成路径，以及相应预览、取消、应用和 Undo/Redo；日志 `/tmp/sophp-stable-c3-full-pack-host-retry-20260927.log`。最终 `WorkspaceEdit.createFile` 兜底 Redo 仍是已知失败路径，未宣称通过。 |
| 组件包 | `pnpm verify:packages` 退出码 0，24 个组件 tarball 均通过隔离消费验证；日志 `/tmp/sophp-stable-verify-packages-20260927.log`。 |
| WSL 安装文件 | 三份候选 VSIX 摘要通过；WSL 已安装的三个 0.4.12 产品逐文件核对一致；八个外部成员版本与冻结组合相符。详见[WSL 安装记录](stability-first-wsl-install-2026-09-27.md)。 |

## 离稳定版还差什么

1. 在真实 VS Code WSL 集成终端重跑严格 `alpha:preflight --check-editor`，并在 Reload Window 后确认运行中的扩展宿主、唯一 PHP Provider 和项目 PHP/fixer/debug/测试工具路径。普通 shell 的严格预检目前只因终端位置条件而失败，不能计为通过。
2. 在独立 Composer 项目记录人工连续编辑与完整操作链。自动化宿主不能替代人工验收；实际遇到支持范围内的阻断回归时，按[限次处理规则](../stability-first-delivery.md)修复或缩小支持范围。
3. 将候选推入新分支的 Windows、Linux、macOS CI，确认源码、组件、VSIX 和组合门禁均绿。当前本地增量尚无对应的跨平台 CI 结果。
4. 通过上述门槛后再确定新版本号、构建同版本三份 VSIX、核对安装与回退说明，并走正式发布门禁。当前 0.4.12 同版本私有构建不能当作新的公开稳定版。

本批不扩展 Pack 成员，不新增通用 PHP Language Server，也不重试已无新线索的 `createFile` 兜底 Redo。下一批开发只处理真实验收发现的最多三个高影响回归；其余进入“好用”或“功能全”阶段。
