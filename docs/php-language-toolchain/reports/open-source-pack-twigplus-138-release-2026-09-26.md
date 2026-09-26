# Open Source Pack：TwigPlus 1.3.8 已发布版本核对

日期：2026-09-26。新组合的外部版本清单把 TwigPlus 从 1.3.7 更新到 1.3.8，直接成员总数仍为 10。旧私有候选 `15a5254` 的 `candidate.json` 不变，继续固定 1.3.7；不把新清单追溯套用到旧候选。

TwigPlus 源码仓 `/var/www/node/twig-plus` 干净，`v1.3.8` 指向 `c3d1aa5323f621a71d8055e12b3578b0a1866e4b`。GitHub Release 提供 `twig-plus-1.3.8.vsix`，下载后 SHA-256 为 `c624f1faa5f5d1369aeea07d3152d72c7576f9859c6275e5ad0499c03b349ab3`，与 Release 的摘要一致。VS Marketplace 官方扩展查询接口返回最新版本 1.3.8。Release 页面：<https://github.com/sohophp/twig-plus/releases/tag/v1.3.8>；Marketplace 页面：<https://marketplace.visualstudio.com/items?itemName=sohophp.twig-plus>。

VS Code 1.139.1 Linux x64 的隔离完整 Open Source Pack 源码 Profile，把 Core、Symfony、Pack 从当前源码加载，TwigPlus 从上述已发布 VSIX 加载，其他七个外部成员沿用隔离扩展目录。宿主新增断言核对 TwigPlus 的实际扩展路径和版本来自所选 VSIX。Symfony→Twig Controller 上下文链、PHP C2 编辑链、Twig/YAML/XML、格式化、调试和 CLI 测试所在的完整 Profile 退出码 0。日志 `/tmp/sophp-pack10-twig138-release-path-profile-20260926.log`。Pack manifest 的定向测试 4/4、测试 TypeScript 编译、相关 ESLint、`git diff --check` 均通过。

隔离安装尝试中，WSL Remote `code` CLI 明确提示忽略 `--extensions-dir`，却把 1.3.8 安装到当前 WSL 扩展目录。这是本轮操作失误；随后立即用 CLI 强制恢复到原来的 1.3.7，`code --list-extensions --show-versions` 已再次返回 `sohophp.twig-plus@1.3.7`。1.3.8 目录被 VS Code 标记为 obsolete，留待其清理。产品的当前 WSL Profile 没有被用于本次隔离宿主验证。

结果证明已发布 TwigPlus 1.3.8 VSIX 与当前 SoPHP 源码组合可运行；当前 Core/Symfony/Pack 的未冻结源码增量尚未进入新候选，真实 WSL Remote Profile 的安装内容、启用状态与长会话仍待 C4。
