# 剩余编号协议绑定：原CI执行证据核对

2026-10-20，独立审计实际退出0。没有重跑真实PHP服务测试。

原bf9613d5的macOS质量作业118423267415已实际成功，Run pnpm test步骤通过。已保存原始完整作业日志、GitHub作业元数据及各自摘要；原检出的Git SHA与bf一致。四个受选文件的Git内容和当前44dbe源码逐字相同，实际用例发现记录与原CI逐文件全过数量精确对齐：analysis.test.ts为48、reference-progress-lifecycle-stdio.test.ts为2、generation-body-boundary-stdio.test.ts为2、generator-return-control-flow-stdio.test.ts为4；四文件均无跳过、only或平台/环境过滤注册。

此前13条未证明的历史绑定展开为15条链接、9个去重实际测试，涉及7个编号；通配模板逐个映射实际版本/模式测试名，不以用例发现本身算作执行。Generator的四个实际测试名也直接出现在原stdout。原13绑定现均有执行证据，剩余0。

与先前语义绑定合并，46个编号含部分执行证据，221个去重实际断言；原33个历史编号的所列声明绑定均有执行证明。这里只关闭这些绑定的证据缺口，26个原阶段大项、F01–F14整体、真人/平台完整资格及六项最终检查保持开放。该证据限原macOS作业和未变源码；原bf工作流尚未取得完整终态，不将单作业成功写成整条CI通过。

原始材料与独立程序位于`.vscode-test/cold-cache-remote-ci-2026-10-20/`：bf-macos-quality.log、bf-macos-quality-job.json、remaining-protocol-collection.json、audit-remaining-protocol.py和remaining-protocol-execution-audit.json。

随后bf整条CI20作业及三系统各26个Vitest阶段的终态独立核对已通过，见[独立终态报告](cold-cache-remote-ci-terminal-2026-10-20.md)。上述绑定证明仍保留首次取得时的快照。

后续三系统核对实际通过：从bf原logs.zip的三份顶层完整质量日志逐一核对相同四文件，三系统均48/2/2/4全过且四文件跳过为0。结合相同源码与确定性注册，9个目标测试在三系统共27次执行均有证明；去重后的46编号/221断言数量不重复累加。具体摘要和行号见cross-platform-protocol-binding-audit.json；整家族/真人资格保持开放。
