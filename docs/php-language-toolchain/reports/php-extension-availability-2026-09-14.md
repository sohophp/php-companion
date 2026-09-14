# PHP 扩展能力选择验收

日期：2026-09-14

## 目标与判定规则

本轮为自研 PHP 语言服务器加入首个可验证的扩展能力选择子集。默认行为继续加载现有完整内建规格；只有以下两类明确证据会把扩展视为不可用：

- workspace folder 的 `phpCompanion.disabledExtensions` 明确列出扩展；
- Composer `config.platform` 或 lock 的 `platform-overrides` 将对应 `ext-*` 明确设为 `false`。

Composer 官方文档说明 `config.platform` 可模拟目标平台，并用 `{"ext-foo": false}` 隐藏生产环境没有的扩展：[Composer config.platform](https://getcomposer.org/doc/06-config.md#platform)。项目没有在 `require` 中声明某个 `ext-*` 只表示依赖没有要求它，不能证明运行环境缺失，因此不参与裁剪。

## 已实现范围

首批只开放已经完整审计且可以独立拆分的八组：

- `dom`
- `filter`
- `mbstring`
- `pdo`
- `simplexml`
- `xml`
- `xmlreader`
- `xmlwriter`

`libxml` 继续作为共享基础规格加载，避免 DOM、SimpleXML、XMLReader 等启用时丢失共同类型和函数。JSON、PCRE、安全函数等仍在核心组合中，待边界可独立证明后再开放选择。

`@php-companion/language-spec` 提供机器可读扩展列表和可选 stub 生成参数；无参数生成结果保持原顺序和内容。`@php-companion/project` 只静态读取 JSON，不执行 Composer、项目 PHP 或 autoloader。Language Server 按最接近的 workspace folder 合并用户配置和各 Composer 根的显式禁用项；嵌套 Composer 项目保留各自语义空间。配置通知会直接替换内建文档，`composer.json` / `composer.lock` 文件变化会在重新索引时刷新，均无需重启服务器。

## 精准边界

- 未知扩展名被忽略，不会意外删除其他符号；VS Code 设置页同时用 enum 限制可选值。
- 字符串版本号、`*`、`true` 和普通 Composer `require` 项都不会被解释为禁用。
- 多根工作区按资源配置隔离；嵌套 Composer 根继承包含它的最深 workspace folder 配置，再合并自己的平台覆盖。
- 本轮不探测本机 `php -m`，因为编辑目标可能位于容器、远端或部署环境；也不声称已经覆盖全部 PHP 扩展和版本。

## 验证

- `@php-companion/language-spec` 正反例逐一验证八组单独移除不会删除其他七组，共享 libxml 保留，默认输出保持一致。
- `@php-companion/project` 验证 composer/lock 中仅值为 `false` 的合法 `ext-*` 被归一化、去重和排序；require 项及平台版本字符串不产生禁用事实。
- 真实 stdio Language Server 验证初始化时 DOM 配置禁用与 Composer mbstring 禁用同时生效、PDO 仍可 Definition；实时清空配置后 DOM 恢复而 mbstring 继续缺失；移除 Composer 覆盖并发送文件变化后 mbstring 恢复。
- 十五个组件共 610 项、根扩展 33 项测试通过；其中 Language Server 160 项将 workspace 配置刷新与 Composer manifest 刷新拆成独立、固定预算的真实 stdio 生命周期。
- 全仓 TypeScript 与 ESLint 通过，十五个组件 tarball 均通过仓库外安装和消费。
- 三份 VSIX 内容检查通过；主扩展 VSIX 在 VS Code 1.137.0 Linux x64 隔离 Profile 中以退出码 0 完成完整 Extension Host 用例。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256：`425ac3b3e0b0175cd4b40d224acae0bcda8f1c156142db8073090549a5568f93`。
- Open Source Pack SHA-256：`990c8594ac13004679ddb1093b3a36e95138f311493de40d26eabdda636c4494`；Recommended Pack SHA-256：`4ef4761ac6f8463a447fb474541642c653a05765c3dcae77ef84d88810419ab1`。

打包宿主核验期间还发现通用配置同步会对任意设置变化重建完整 Composer 索引。服务器现只在语义 Provider 配置实际变化时重建项目索引；诊断开关只重算诊断，扩展选择只更新发生变化的内建文档，避免设置切换触发无关全量索引。

## 未完成范围

启用扩展的具体版本选择、`php -m` 或容器/远端运行时探测、用户环境与部署环境切换、其余扩展的完整审计规格仍属于 P3 后续工作。P3 总项和 R4 最终验收保持开放。
