# C4 安装内容核对：额外文件

日期：2026-09-26。只读核对现有 WSL Remote 扩展目录及私有 Alpha `21977ee1`；未安装、卸载或更新扩展，未修改业务项目，也未重打包 VSIX。

`alpha-preflight.mjs --check-editor --extensions-dir` 原先逐个验证候选 VSIX 中的文件，却没有拒绝安装目录里多出的旧文件。现递归列出三款 SoPHP 产品的安装文件，只允许 VS Code 安装时附加的 `.vsixmanifest`；其它额外文件、符号链接以及候选文件的内容差异都会使 `product-content-mismatch` 失败。这防止同版本覆盖安装后残留旧 bundle 被误判为候选完整内容。

正向对照将现有候选的 Core、Symfony、Pack 三份 VSIX 解到隔离临时目录，分别核对 15、15、6 个文件，`matching: true`。在 Core 目录添加 `dist/stale-worker.js` 后，预检返回 `matching: false` 且明确列出该额外文件。当前实际 WSL 扩展目录只读比较仍为 `matching: false`：三个产品无缺失或额外文件，但 Core、Symfony、Pack 分别有 4、5、2 个候选文件内容不同。目录内容可能随用户其它窗口操作变化；这只是本次快照，不是已安装候选的验收。

`test/unit/alpha-preflight.test.ts` 现有 7 项回归通过；脚本 ESLint 与差异检查通过。严格的真实 WSL Remote 门槛仍需在隔离 Alpha Profile 中安装同批候选，确认扩展宿主与竞争 Provider 状态，再执行实际编辑链。文件清单本身不能证明扩展已启用或正在运行。
