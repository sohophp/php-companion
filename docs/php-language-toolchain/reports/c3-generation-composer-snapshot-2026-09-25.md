# C3 类型生成预览期间的 Composer 映射变化

日期：2026-09-25。类型生成预览现在记录项目 `composer.json` 的 SHA-256；确认创建前重新读取并比较。若 Composer 配置在预览期间改变或不可读，拒绝旧计划并提示重新执行，避免按过期 PSR-4 映射创建文件。

随后补上预览开始前的检查：当前 `composer.json` 摘要须与 VersionManager 加载项目时记录的输入证据一致。隔离 VS Code 1.139.0 Linux x64 Core/Symfony C3 源码宿主分别在命令调用前和预览确认时把 `App\\` 映射改为 `Changed\\`，验证不会按旧 `App\\` 映射创建文件，然后恢复夹具。宿主退出码 0；根扩展与测试 TypeScript、相关 ESLint 和差异检查通过。日志 `/tmp/sophp-c3-generation-composer-loaded-hash-20260925.log`。测试允许 VersionManager 在命令调用前及时刷新并显示正确的新映射；因此它证明不产生旧映射文件，不声称每次都会走同一种拒绝路径。

完整 11 项 Pack 源码宿主运行到测试文件 Rename 时，`recca0120.vscode-phpunit` 3.9.40 在已配置 `phpunit.xml` 的夹具中再次出现未处理的旧路径 ENOENT，宿主以失败退出；日志 `/tmp/sophp-c3-generation-composer-pack-20260925.log`。此前“新建测试文件后立即删除”的组合运行也出现同类错误。单独启用该文件创建/删除交错的一次重跑通过，因此目前只能确认它是间歇性风险，不能给出频率或把原因归到 Composer 变化。隔离 Profile 固定的 3.9.40 与 2026-09-25 查询到的[上游最新发布](https://api.github.com/repos/recca0120/vscode-phpunit/releases/latest)一致；没有发现可直接替换且已通过本组合门禁的测试扩展。

当前不把失败的完整 Pack 运行写成通过，也不把外部扩展问题算作 SoPHP Core 的已修复项。后续独立复现测试文件事件与 Rename 交错，再决定保留、设为可选或更换测试 Provider。类型生成 Undo 后一次 Redo 仍未恢复文件，C3 仍开放。未修改业务项目，未打包 VSIX。
