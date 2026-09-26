# Symfony 路由数据不完整时的编辑器反馈

日期：2026-09-26。仅修改 SoPHP 源码和独立 Composer 测试夹具；未修改业务项目，未打包 VSIX。

## 问题与处理

路由 Provider 返回不完整快照时，语言服务为避免错误补全与错误跳转会忽略整份路由图。此前编辑器只得到空结果，原因仅出现在 SoPHP Output 中，用户无法区分路由确实不存在与路由数据暂不可用。

语言服务现在向客户端发送 `phpCompanion/symfonyRouteStatus`：不完整或 Provider 失败时标记项目路由暂不可用，下一次查询取得完整快照后撤销标记。状态随路由输入失效而清除，取消或过期请求不会更新它；同一项目的旧查询也不会覆盖新查询的状态。客户端只在当前 PHP 编辑器属于受影响的项目时显示 `SoPHP 路由` 状态栏提示，切换项目或语言时隐藏，语言服务重启时清空状态。提示说明路由补全和跳转暂不可用、下一次查询会重试；不弹出通知，也不把不完整的候选放进补全列表。

## 本轮验证

- 独立 stdio 用例让 Provider 先返回 `complete: false`，再返回完整路由：首次补全为空且状态为不可用，下一次补全包含恢复后的路由且状态恢复。定向的 F09 路由用例与恢复用例 2/2 通过。
- `pnpm --filter @php-companion/language-server build`、`pnpm exec tsc --noEmit`、四个改动文件的 ESLint、`node esbuild.mjs --production`、`git diff --check` 均退出码 0。
- VS Code 1.139.1 Linux x64 的隔离源码宿主使用两个临时 Composer 工作区、独立路由 Provider 和 Workbench DOM 检查：不完整快照时可见 `SoPHP Routes`，切到另一个项目时隐藏、切回后恢复；Provider 恢复完整快照后补全 `profile_user`，提示消失。`PHP_COMPANION_TEST_ROUTE_STATUS_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js` 退出码 0；宿主测试 TypeScript 编译与改动文件 ESLint 通过。

本轮证明了协议状态的往返及隔离源码宿主中的状态栏呈现；实际 VSIX 安装候选、WSL Remote 归属以及长会话仍需 C4 验收。当前 `15a5254` 私有候选不含此改动。下一步继续独立 Composer 项目的 Symfony Controller→Twig 与路由操作链，并以用户可见的错误结果为优先修复依据。
