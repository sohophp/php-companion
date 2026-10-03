# C3 导入：声明名称冲突限定到当前 namespace

日期：2026-09-29。源码基线为 `32e7e6a` 加未提交增量；本批只改通用 SoPHP 语义层和回归测试，未改业务项目。

## 复现与修复

单文件包含 `namespace First { class Widget {} }` 和 `namespace Second { new Widget(); }` 时，导入 `Vendor\Widget` 只需要检查 `Second` 中已占用的名字。原实现把文件中所有 namespace 的类声明都计入冲突，因此候选错误标成 `aliasRequired: true`，未指定别名的导入插入也被拒绝。新增语义用例先取得红灯，再将 `typeImportCandidates` 与 `importInsertion` 的声明冲突检查限定到当前 namespace。重复的同名 namespace 块目前仍保守地要求别名并拒绝无别名插入。

后续 PHP 运行时对照澄清了这条保守限制：把 `class Widget` 和 `use Vendor\Widget` 放在**同一个** namespace 块，PHP 7.2、7.4、8.1、8.2、8.4、8.5 均报名称冲突；放在**同文件的两个同名** namespace 块，7.2、7.4、8.1、8.2 报冲突，8.4、8.5 则允许导入并将 `new Widget()` 解析为 `Vendor\Widget`。本机没有 PHP 8.3 运行时，不能据此写出完整版本边界。当前行为对 8.4/8.5 偏保守，但不会生成在已验证旧版本中无效的导入；此版本差异留待有 8.3 证据时再扩展。[PHP 手册](https://www.php.net/manual/en/language.namespaces.importing.php)解释了导入的编译时作用域，以上细分版本结论来自本机运行时对照。

## 验证

- 定向语义用例先失败，修复后通过；语义包全量 485/485 通过。
- 独立 Composer 项目的真实 stdio Language Server 用例通过：跨 namespace 候选无需别名，`phpCompanion/addImport` 把 `use App\External\UniqueService;` 放入目标 namespace 块。定向用例 1/1 通过。
- Core 语义与语言服务器构建、相关文件 ESLint、Extension Host TypeScript 编译通过。
- VS Code 1.139.1 Linux x64 的完整 C3 隔离源码宿主退出码 0，原有 Import、Rename、Safe Move、类型生成、预览/取消/应用及一次 Undo/Redo 操作链通过。

本批的新增多 namespace 场景已在语义和真实 LSP 层验证；C3 宿主覆盖的是现有操作链回归。已安装 Profile、真实 WSL Remote 可见交互和跨平台结果不由本批测试证明。未打包 VSIX、提交、推送或更新 Profile。
