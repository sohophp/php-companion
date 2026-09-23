# F14 旧 Profile 设置兼容

日期：2026-09-23。旧版 SoPHP 用户设置仍保留在原位置；扩展读取有效配置时，仅在新版键没有显式值的情况下使用旧版键。用户级、工作区级、文件夹级和 PHP 语言级设置均参与判断；新版键一旦显式设置，其 VS Code 有效值优先。

| 旧设置 | 旧值 | 当前行为 / 新设置 |
| --- | --- | --- |
| `phpCompanion.pasteImports.mode` | `auto` | `phpCompanion.imports.onPaste: auto` |
| 同上 | `preview` | `phpCompanion.imports.onPaste: prompt` |
| 同上 | `off` | `phpCompanion.imports.onPaste: off` |
| `phpCompanion.rename.syncFileName` | `never` | `phpCompanion.rename.file: off` |
| 同上 | `whenMatched` | `phpCompanion.rename.file: preview` |

迁移兼容适用于默认 Language Server 的 Rename 与 Paste/Resolve Imports，以及关闭自研服务器时的旧 Provider。升级无需改写 `settings.json`；需要明确选择新行为时，在相应作用域设置新版键即可。若要回退到旧扩展，保留的旧键仍可供旧版读取；若新旧键同时存在，回退前应检查旧键是否符合预期。

`phpCompanion.rename.includeTextMatches` 的 `confirm`/`always` 无法安全映射到当前保守的字符串引用策略；字符串及动态引用仍需人工检查。旧 `phpCompanion.enablePhpStormKeybindings` 没有对应的当前开关；键位须在 VS Code Keyboard Shortcuts 中自行配置。已弃用的 `phpCompanion.indexing.onStartup` 不自动映射到 `indexing.mode: experimental`，以免升级触发全项目依赖索引。上述三项属于手动迁移边界。

定向测试覆盖默认值、旧值映射、新键优先级和语言级有效值。隔离 VS Code 1.138.0 Profile 从旧式 User/settings.json 加载 `rename.syncFileName: never` 与 `pasteImports.mode: off`，验证默认 Language Server 的实际 Rename 保留原 PHP 文件名、新版 `rename.file: preview` 覆盖后改名，并从打包扩展的测试入口核对 Paste 旧值与新版覆盖。该 Profile 是测试夹具，不等于用户现有 Profile 原地升级或长时间人工试用。

F14 仍需其余命令行为、配置迁移范围和 Language Server/Provider 文案的最终验收；P9 实际 WSL Remote 会话及跨平台矩阵另行记录。
