# C1 默认按需索引的未打开类补全

日期：2026-09-26。仅修改 SoPHP 源码与独立 Composer 测试夹具；没有修改业务项目，也没有重新打包 VSIX。

## 复现与修复

独立 Composer 项目将 `App\\` 映射到 `src/`。`ProjectType.php` 在语言服务器启动前已经存在，但编辑器只打开 `Consumer.php`。默认 `onDemand` 模式下，在 `new Proj` 请求补全原先返回空数组；已打开后新建文件的旧宿主用例无法覆盖此问题。

现在补全先从当前命名空间的 PSR-4 目录读取匹配前缀的 PHP 文件名，再按 Composer 映射加载并验证实际类声明；显式 `use` 的别名也按其完整类名加载。跨命名空间的未导入类先按文件名前缀在 Composer PSR-4 目录搜索，再验证声明并附加 `use` 编辑；同名类保留各自的完整名称供选择。`ProjectGhost.php` 如果只声明 `AnotherType`，不会出现伪 `ProjectGhost` 建议。每次请求最多返回 64 个类型建议；超过限制或搜索不完整时返回 LSP `isIncomplete: true`，用户继续输入时可重新请求更窄的结果。请求完成前再次检查文档版本与取消状态。

Linux 优先使用 `rg --files` 搜索匹配前缀的文件，失败时回退到有上限的 PSR-4 类名目录。完整搜索结果按前缀缓存，Composer 或 PHP 文件监视事件会清除缓存；搜索代次可防止事件之后尚在进行的旧请求把旧缓存写回。短于 3 个字符的前缀只返回已知候选并标记为不完整，不在每次按键时遍历整个项目。

## 验证与边界

- 修复前，上述启动前已存在的 `ProjectType` 真实 stdio 请求返回 `[]`；修复后，未打开类、导入别名、跨命名空间两个同名 `Invoice` 的不同 `use` 编辑、错误文件名排除、新文件监视事件、70 个额外候选的 `isIncomplete` 和继续输入后的 `ProjectExtra69` 均通过。可控暂停的真实 LSP 请求还验证了文件事件后旧请求被丢弃、下一请求包含新类，以及被取消的候选请求不返回旧建议。
- [重复基准脚本](../../../scripts/benchmark-ondemand-type-completion.mjs)分别生成约 1k、10k、50k 个 PHP 文件，并在每个规模启动三个独立语言服务器进程。首次 `new Requ` 请求耗时分别为 `36/40/38`、`34/34/39`、`47/68/46` ms，中位数为 38、34、47 ms；同进程第二次分别为 `3/4/4`、`3/3/3`、`4/3/3` ms。每次都返回目标 `Domain\\Target\\RequestTarget`。这是本机 Linux 合成文件夹具的 LSP 响应时间，不代表输入到建议列表可见的时间，也不证明 Windows/macOS 回退路径达到相同延迟。此前未缓存的目录扫描在约 50k 文件时单次为 569 ms。
- VS Code 1.139.1 Linux x64 的独立 Core 源码宿主加载了当前构建，C1 操作链退出码 0。新增的跨命名空间类补全断言检查 VS Code `CompletionItem.additionalTextEdits` 含正确 `use`，原有六项编辑查询及未保存接收者变化也通过。这项 API 检查不等同于完整 Pack、已安装 VSIX 或 WSL Remote 验收。
- 同一版本的独立 Core UI 源码宿主使用 Chromium 调试协议观察真实建议弹窗：在 `new C1VisibleTypeProb` 后输入 `e`，编辑器文本约 35 ms 更新，包含 `C1VisibleTypeProbe` 的弹窗约 252 ms 可见，宿主退出码 0。该类型只运行一次，不能从单样本推断 P95；同次六个普通成员建议样本为 223–263 ms，十轮未保存接收者切换没有显示旧类型方法。完整 Pack、已安装 VSIX、真实 WSL Remote 和类型建议的多轮可见时间仍待验收。
- `packages/language-server/test/stdio.test.ts` 定向测试 1/1 通过；Pack manifest 测试 4/4 通过；`@php-companion/semantic` 13 文件、400 项测试通过；语言服务器与根目录 TypeScript 检查、改动文件 ESLint、`git diff --check` 通过。
- Composer `classmap/files` 中类名与文件名不同的类型随后已加入[独立按需发现门禁](c1-ondemand-classmap-type-completion-2026-09-26.md)。PSR-0、动态别名、大小写不规范或未由文件监视器通知的新文件仍是边界。候选多于 64 个时只保证返回有界的首批建议，并要求继续输入。实际建议列表显示时间与真实 WSL Remote 安装验收仍属于 C4。
