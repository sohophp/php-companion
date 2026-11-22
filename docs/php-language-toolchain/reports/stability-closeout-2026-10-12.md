# 先精再扩：稳定性收口执行记录

日期：2026-10-12。范围仅包含已有服务刷新、取消、XML 等待/清理和索引测试稳定性，不新增产品功能或扩大支持域。

## 已执行的独立 Windows 反例

使用正式 0.4.13 的 Core `5c231542`、实际打包 Symfony service provider `300281d4`、Windows Node 24.16.0 和 PHP 8.5/onDemand 目标。独立 NTFS 测试项目包含真实 XML → PHP 服务配置导入和已知 `app.mailer` 服务；修改前的 `send` 补全正确。配置删除后的实际 Provider 被受控阻塞时，普通补全提前返回，原“刷新完成前不得返回”的断言失败，退出码 1。取消请求本身 7.28 ms 返回。该反例确认 Windows 产品路径也存在本轮修复针对的竞态。

失败后实际服务器按 shutdown/exit 正常关闭，服务器退出码 0；测试项目和外层复制目录已删除。它不证明 Windows CI 历史 EBUSY 的根因或全平台资格。

原始记录：`.vscode-test/plan-stability-closeout-2026-10-12/native-windows-baseline-state.json`、`native-windows-baseline-results.json` 和 `native-windows-baseline.log`。

## 已完成的收口顺序

1. 保留实际运行中的原型完整 LSP 和冻结输入，完成终态及原案例数量审计。
2. 撤回没有稳定性能收益证据的类型证明复用原型，仅保留稳定性修复；不更改测试场景、断言或原期限。
3. 验证精简候选的完整 semantic、根单元、类型/质量门禁和原完整 LSP。
4. 验证当前 Linux 原完整 C1、C2、C3/onDemand、C3/progressive 四流程，核对输入和显示进程清理。
5. 在同一精简 Core 与真实 Symfony provider 上执行 Windows onDemand/progressive 的服务删除、等待、取消及清理协议检查。

串行收口任务已完成精简候选完整回归。原编排在准备编辑器阶段因 `editor-compile.log` 已存在而以 `FileExistsError` 停止；原失败状态与日志保留，没有产品测试失败。续跑使用独立日志名，从索引和编辑器阶段继续，未重复完整 LSP；状态记录为 `.vscode-test/plan-stability-closeout-2026-10-12/resume-state.json`，原记录为同目录 `closeout-state.json`。

上游原型完整回归已终态：141 文件、1,646 项通过、1 个既有条件跳过，2,085 输入无变化，实际所属进程组已清空。类型证明复用改动现已撤回，semantic 源码与原 HEAD 逐字一致。精简候选完整回归、四条 Linux 编辑器流程和两种 Windows 协议检查均已执行并通过，续跑任务正常退出。原型通过结果不迁移到精简候选。Controller 性能、Windows CI、全部平台/Remote/多小时和真人验收继续开放；26 个长期工程项与最终目标未完成。没有提交、推送、生成 VSIX 或更新日常 Profile。

## 精简候选验证结果

| 验证项 | 结果 | 范围 |
| --- | --- | --- |
| 正常构建、类型、Lint、合同及组件边界 | 已执行并通过 | Semantic/LSP/生产构建、根类型检查、四个改动代码文件 Lint、43项公开合同、24组件边界 |
| 完整 Semantic | 已执行并通过 | 190文件、24,133项 |
| 根测试及完整索引包 | 已执行并通过 | 根21文件/113项；索引4文件/69项，千文件规模及原断言、期限保持 |
| 完整 LSP | 已执行并通过 | 141文件、1,646项通过、1个既有条件跳过；2,085冻结输入无变化，约34分钟 |
| Linux 原完整编辑器流程 | 已执行并通过 | C1/onDemand 98.43秒、C2/onDemand 134.47秒、C3/onDemand 265.93秒、C3/progressive 239.88秒；两C3各40生成边界 |
| Native Windows 服务刷新 | 已执行并通过 | 同一正常打包Core/真实Symfony provider，Node24.16.0、PHP8.5目标、onDemand/progressive |
| Windows CI 历史超时/EBUSY、完整平台及真人 WSL | 未执行 | 本批证据未证明历史CI根因或全部环境资格 |

Windows 的取消分别为4.19毫秒和2.95毫秒，均满足原100毫秒预算。真实配置删除期间被阻塞的Provider完成前，普通补全保持等待；释放后未返回旧 `send`。两服务器均正常退出0、标准错误为空，测试目录和外层复制目录删除成功。Linux四流程的产品/测试输入未变化，独立显示进程与授权临时目录清理通过。

精简候选唯一跳过项为原有的跨进程引用条件用例；没有新增跳过项，服务刷新并发文件28项通过。最后审计再次核对2,085输入未变化、LSP进程组已清空、四显示进程已退出和Windows临时目录清理，见同目录 `final-audit.json`。自动化编辑器证据不代替真人WSL持续使用验收。

## 已核对的范围边界

精简后生产改动仅有 `packages/language-server/src/server.ts` 的文件变更等待/取消与查询一致性处理；`packages/semantic/src/index.ts`、Core/Symfony/Pack manifest 及插件 API 与原 HEAD 逐字一致。新增命令、设置、组件接口和 PHP 语义支持域均为零。索引和 XML 测试改动保持原数据规模、断言与期限。范围审计记录为 `.vscode-test/plan-stability-closeout-2026-10-12/scope-audit.json`。

当前精简候选构建为 `4506941926dd157b2786e03b343f1cf49ec67ad4190001fd4f4572cc5eada366`；Windows真实Symfony provider为 `300281d41474f041ceb9b3dd8ceea6c1658b7bd04ff6114d6c497f8422372ecf`。本批只收口已有服务刷新修复的本地验证，复杂Controller诊断约2秒的问题继续开放；后续优先处理已有工作流的稳定性和有新成本证据的性能问题，功能扩展暂缓。
