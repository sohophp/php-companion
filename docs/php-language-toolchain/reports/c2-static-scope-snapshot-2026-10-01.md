# C2：静态声明头与局部共享绑定的隔离修复

日期：2026-10-01。临时准备阶段记录；后续已在 R19–R20 完整 stdio 375/375 终态及输入校验后应用当前分支，并通过[正式源码定向验证](c2-static-scope-value-types-2026-10-01.md)。下文保留临时准备阶段的范围，不以它替代协议或编辑器验证。未打包、提交或更新 Profile。

## 复现与原因

同一语义探针比较实例／静态方法、直接 new／Elvis 初始化四种组合：前三种都返回 ready，静态方法内 Elvis 初始化后再按值调用返回空列表。方法作用域从 `public static function` 声明头开始；局部逃逸检查对这一整个前缀作 static 等关键词检查，错把静态方法修饰符当作静态局部变量风险。完整复现数据在 `/tmp/sophp-static-method-value-repro.json`。

修复准备在 `/tmp/sophp-static-scope-snapshot`：从既有 CST 定位当前作用域的 body，前缀风险检查从 body 开始；找不到 body 时仍从旧 scope.start 开始。参数引用与闭包捕获引用继续通过既有结构化 scope 元数据检查，真正的 static/global 局部语句及引用别名继续留在 body 检查范围中。没有修改产品源文件或构建产物。

## 验证与界限

- 新用例先在未修复的临时源码上失败，再在临时修复上通过。
- 最终临时语义全量：17 文件、554/554，48.27 s；553 项原语义测试加一项新增矩阵。新矩阵覆盖 public/private/protected/final static、static 返回类型、无关引用参数、普通／static 闭包，以及真正 static/global 局部绑定、引用别名、引用参数和引用捕获反例；目标函数参数引用编辑也撤回／恢复。
- 临时目录内 ESLint 实际检查源文件及新增测试，退出码 0；此前直接从仓库调用目录外文件的 Lint 给出 ignored 警告，该次不能算通过。
- 临时源码使用原 semantic 包的自足 tsconfig，`tsc -p tsconfig.json --noEmit` 退出码 0，日志 `/tmp/sophp-static-scope-snapshot-typecheck-final.log`；此前临时配置误指向不存在的基础文件，该次失败不记为源码类型检查通过。
- 首次临时全量缺少 language-spec 的包解析路径，544 通过、10 项导入失败；合并独立临时 node_modules 链接后取得上述 554/554。没有修改共享 node_modules 或产品输入。
- 这不是当前分支、LSP、Extension Host 或真实 WSL 验收。临时目录的源码与测试待当前阶段回归结束后再应用和构建验证。

日志：`/tmp/sophp-static-scope-snapshot-{repro,targeted,full,full-final,lint,lint-final}.log`。准备期间当前分支八项输入 SHA-256 始终一致；stdio 会话 54117 随后终态退出码 0，终态校验后才应用修复，没有中断或重启本轮全量任务。
