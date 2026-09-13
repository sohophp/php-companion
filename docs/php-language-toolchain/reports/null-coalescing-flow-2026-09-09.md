# 空合并表达式类型传播验收

日期：2026-09-09。范围：`left ?? right` 的结果类型、同块局部别名传播、编辑器查询一致性、未知边界与 Winstar 真实源码验证。

## 已完成

- 只对 CST 中精确匹配的 `binary_expression` 和 `??` 运算符求值，不使用文本切分，因此字符串、嵌套表达式与其他二元运算不会误入规则。
- 结果由左侧去除 `null` 后的类型与可达右侧类型组成；左侧只有 `null` 时采用右侧，左侧确定非空时直接保留左侧。
- `false`、`0` 与空字符串不是 null，继续保留在结果 Union 中。
- nullsafe 方法调用产生的 nullable 返回、括号表达式及右结合嵌套 `??` 均可递归处理。
- 左侧可能为空而右侧无法证明时保持 unknown；左侧确定非空时不因不可达的未知右侧丢失类型。
- 精确结果经同块局部赋值进入成员补全、Definition 与参数类型诊断。一般对象赋值查询现在安全回退到已有局部值类型器，并继续要求对象层级完整。
- CST 查询只在表达式文本可能包含括号或 `??` 时触发，普通实参与局部值保留原有热路径。
- Semantic snapshot 升至 schema 64，使旧缓存重建。

## 自动验证

- `pnpm typecheck` 与 `pnpm lint` 通过。
- `pnpm test` 通过：15 个组件共 456 项，根包 30 项；其中 Parser 54、Semantic 208、Language Server 96 项。
- `pnpm verify:packages` 通过，15 个组件 tarball 均从隔离消费者安装并验证。
- Winstar PHP 8.5 `bin/php-runtime -l` 验证新增 Extension Host fixture 无语法错误。
- `pnpm package` 与 `pnpm verify:vsix` 通过，主扩展及 Open Source/Recommended 两个扩展包内容均验证通过。最终 `php-companion-0.4.5.vsix` SHA-256 为 `d95920d110be55a9da4f1170b6d68e31957d34581adb16d89de2ab1e9352dc31`。
- VS Code 1.136.2 打包宿主在全新隔离 profile 中通过并以 0 退出。宿主验证 nullable 与 `new` 回退后的补全和 Definition、确定非空左侧跳过未知回退、可达未知回退不产生 Definition、`false` 保留及字符串结果的两条精确参数诊断。完整输出保存于 `/tmp/php-null-coalescing-host-20260909-1213.out`。
- 宿主输出未出现 `AssertionError`、测试失败、超时或非零退出。无桌面 DBus、无 GitHub token 与 VS Code 自身 `url.parse()` 弃用信息属于隔离环境噪声。

## Winstar 真实项目

使用 schema 64 组件对 `/var/www/php/8.5/winstar2024` 做只读 Composer 索引：1,934 个项目 PHP 文件完整进入索引，总计载入 9,999 个文件、37,736,007 字节；依赖受 10,000 文件预算截断，因此 `complete=false`、`projectComplete=true`。

以下 6 个实际源码位置中的 `$toolbar = $page->getToolBar() ?? new Toolbar()` 均能在下一行补全 `addWithArray`，Definition 唯一落到 `src/Modules/Admin/Component/UserInterface/Widgets/Toolbar.php`：

- Solutions 文章后台展示
- News 文章后台展示
- Company 页面后台展示
- FreePages 后台展示
- Blog 文章后台展示
- Blog 分类后台展示

结构化结果保存于 `/tmp/php-null-coalescing-winstar-20260909.json`。该结果证明根项目源码与已载入依赖范围内的目标能力；不扩展为被预算截断的全部 vendor 语义完整。
