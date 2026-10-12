# ADR 0003：设置迁移尊重显式选择与现有语言服务

状态：记录现有设置解析与启动策略；不改变用户配置或安装扩展。

通用PHP语言服务默认启用；检测到竞争服务且用户没有显式选择时，不自动抢占。用户显式启用时允许启动，显式关闭时保持关闭。这是启动策略，不等于已经证明全部运行时 Provider 在所有平台只有一个所有者。

Rename 的新设置 rename.file 已显式配置时优先使用其有效值，支持 off/preview/always；否则旧 rename.syncFileName 的 never 映射为off，whenMatched映射为preview，没有显式设置时默认preview。Paste的新设置 imports.onPaste 同样优先；旧 pasteImports.mode 的auto/off保持，preview映射为prompt，默认prompt。显式新值无效时使用新设置默认值，不再让旧值反向覆盖。全局、工作区、文件夹及语言覆盖通过 inspect 判断显式性，再由 get 读取有效值；不直接重写 settings.json。

现有完整根单元结果中，设置迁移8项、语言服务激活3项，以及同一策略文件的重启预算/项目检测2项，共13项相关单元通过；[机器基线](../reports/public-contract-baseline-2026-10-09.json)保存原案例身份。它们不代替真实编辑器配置切换、所有索引模式、平台、升级安装及真人 WSL 验收。

源码：[迁移解析](../../../src/extension/legacySettings.ts)、[启动策略](../../../src/extension/languageServerPolicy.ts)。旧 indexing.mode 与完整工作流迁移、实际注册所有权的剩余核对继续保留，不因本ADR而关闭P0总条目。
