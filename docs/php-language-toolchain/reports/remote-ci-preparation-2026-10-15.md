# 当前候选的远程 CI 准备记录

日期：2026-10-15。**本地准备已通过，远程 CI 尚未触发，不能据此认定远程验收完成。**

## 候选与修改范围

验证分支为 `ci/stability-20261015`，基于 `a919d53f997ac462d2758a1968a3e4bc9c0ce959`，独立工作目录为 `/var/www/node/php-companion-ci-20261015`。本批从原工作区复制225个修改或新增文件，包含已有查询刷新/取消、作用域诊断、诊断遍历优化、索引运行时兼容、基准清理、对应回归和验收文档；其中192个文件为历史调查报告。原分支 `work/sophp-next`、225个文件的内容和原暂存状态保持不变。另新增本准备记录。

从独立源码构建出的六个 JavaScript 文件和两个 WASM 文件，与原工作区候选逐字一致。Core SHA256 为 `8219f6c6f816422e36ac0f4543aaefb2ee04cdb8337bbcdb37c8bc5aa3d14bea`。

## 本轮已执行并通过

| 检查 | 实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile --offline` | 退出0，锁文件保持；安装时提示尚未生成的工作区 CLI 文件，随后类型检查已完成各包构建 |
| `pnpm typecheck` | 退出0，含组件边界、公共接口、包构建和扩展类型检查 |
| `pnpm lint` | 退出0 |
| `node esbuild.mjs --production` | 退出0，8项运行资产与原候选逐字一致 |
| 语义作用域回归 | `packages/semantic/test/undefined-variable-scope-boundary.test.ts`，12项通过，零失败或跳过，命令退出0 |
| 实际协议作用域回归 | `packages/language-server/test/undefined-variable-scope-boundary-stdio.test.ts`，4项通过，零失败或跳过，命令退出0 |
| `node --test scripts/test/index-runtime-compatibility.test.mjs` | 当前Node22.14.0下5项通过，零失败或跳过，退出0；不是本轮Node20实测 |
| `pnpm test:benchmark-cleanup` | 两项Linux实际暂停服务器/超时清理回归通过，零失败或跳过，退出0 |
| `git diff --cached --check` | 通过 |

上述定向测试合计23项。本轮没有重跑完整 `pnpm test`，没有新增生产代码改动，也不将以前的本地矩阵结果标成远程执行。独立目录的原始日志和JSON/TAP结果保存在 `.vscode-test/ci-preflight/`；原工作区输入清单保存在原目录 `.vscode-test/ci-preparation-2026-10-15/original.json`。

## 远程执行及剩余验收

已只读确认GitHub身份和仓库可访问，现有CI运行对应旧提交，未覆盖当前候选。当前 `.github/workflows/ci.yml` 由分支推送或Pull Request触发；本次计划仅推送上述独立验证分支，不创建版本标签，不触发仅限版本标签或手动执行的Release工作流。

远程资格需要取得新提交对应的CI运行及各必需矩阵任务的实际结果，并检查日志和产物。实际推送仍须遵守用户每次推送需明确授权的约定；本记录不表示已经推送。

真人WSL验收暂留未执行。复杂Controller最新已记录正常控制诊断P95为1426.99ms，原500ms门槛仍失败；本轮未重测，也不因准备检查或未来CI通过而关闭该缺口。原完整计划继续保留。
