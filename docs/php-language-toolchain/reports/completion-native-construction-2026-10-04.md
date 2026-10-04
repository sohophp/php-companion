# D63：内建工厂类型的构造补全

## 修复范围与依据

D62 的自然键入暴露 `new Sh` 会推荐不能直接构造的 Shmop。本批补齐六个已审计类型的静态构造合同：Shmop、XMLParser 从 PHP 8.0 起；FTP Connection、PgSql Connection／Result／Lob 从 PHP 8.1 起。版本、扩展可用性及工厂函数签名沿用原有门禁。

固定 phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的六个类声明核对自 Git 对象；FTP 类在 `ftp/Connection.php`，PgSql 类在 `pgsql/pgsql_c.php`。禁止直接构造另由实际 PHP 检查，不把上游空类体或 Reflection isInstantiable=true 当作允许构造的依据。

沿用 GdImage、CurlHandle、Generator 等现有私有构造静态模型；由语义层已有可访问性规则过滤 `new`。它表达禁止直接构造，不宣称原生 Reflection 暴露私有构造函数。没有加入按名称过滤的服务器逻辑，也没有修改 CompletionItem 接口。

六套本机 CLI 为 PHP 7.2.34、7.4.33、8.1.34、8.2.32、8.4.23、8.5.9。检查 14 个已知类型的存在、Reflection 与自己的空构造表达式，共 84 条记录；不调用工厂，不使用网络、数据库、文件或共享内存资源。六个目标类型在实际存在时均不能直接构造；PHP 8.2／8.4 未加载 shmop 的缺席单列。ArrayObject、stdClass、WeakMap 保持正常构造，8.5 的 DelayedTargetValidation 也可构造，不能仅因类体为空而删除。实际 PHP 7.3／8.0／8.3 没有由本批运行。

## 验证

| 层次 | 当前证据 |
| --- | --- |
| stubs | 15 文件／249 项全部通过；原四处空类体预期更新，扩展关闭时确认整个 Shmop 声明不存在 |
| 语义 | 新增 10 项，覆盖九个目标 PHP 版本、六类直接／注释／导入别名构造排除，参数／返回／instanceof 引用保留，具名用户类及关闭扩展；完整 98 文件／2044 项通过，72.46 秒 |
| 真实 LSP | 生产 bundle stdio，PHP 7.2／8.5 两项测试通过，每版本 72 次未保存状态查询；24 次原有构造／注释／括号状态，加 48 次内建与用户类型状态。正常 stdClass／ArrayObject 仍插入括号；磁盘原文不变 |
| 自动可见列表 | Linux VS Code 1.140.0／配置 PHP 8.5，六流程／17 阶段通过；普通逐字符 Workbench 输入，无 Provider 预热或显式 triggerSuggest。new Sh、恢复 Sh 时保留两个匹配项目类型且无 Shmop；指定 getItemsByProvider 异常零次 |
| 类型引用接受 | 四个上下文各 Enter／Tab，共八次首项、实际文本、光标、Undo／Redo、磁盘不变通过；Shmop／XMLParser 参数类型、FTP 返回类型、PgSql Lob 导入保留，不加构造括号 |
| 实际 PHP 编译 | 八份实际接受文本在 PHP 7.2／8.5 上共 16 次 `-n -l` 通过；只编译自己的样例，没有执行项目代码 |

定向 ESLint、宿主 TypeScript noEmit、依赖构建、生产 bundle 构建和 diff 检查通过。bundle SHA-256 为 `5430124cda5682e1ed9b1d0c140ad1013616b11e46d82da07a7352fc9434d56e`；四份产品源码摘要、上游位置和完整运行时／UI 记录在 [JSON 证据](completion-native-construction-2026-10-04.json)。

八次显式列表观察为 124–268 ms；自动输入正例为 18–251 ms。三个声明名称的空列表检查包含 500 ms 稳定观察，function 名称还记录了 193 ms 后的可见撤回。单次观察不是 P95，也不代表全部旧请求、平台或真人会话。

## 初次失败与保留边界

原语义红测试复现六个现代版本仍推荐 Shmop；另一个测试错误地要求用户 Result 的列表只能有一个候选，误拒合法的 mysqli_result。改为核对用户类存在、对应内建工厂类不存在，没有因此修改产品匹配规则。

参数／返回／instanceof 已通过后，导入断言发现 `use Shmop` 和 `use \Shmop` 没有类型候选。同一语义消费者中恢复本批修改前六个空类体的对照，结果仍为空；FTP 的限定导入则前后均存在。本批把它记录为原有根命名空间导入缺口，验证限定导入，没有把测试失败隐藏成全导入通过。下一项可单独补齐此入口并保护命名空间、函数／常量与别名名称。

完整 LSP 当前输入尚未运行，不沿用旧输入 870 项资格。D61 普通连续编辑 P95 251.71 ms 仍超过 150 ms，本批没有性能改动或反复测量。大于恢复预算的输入、全部冻结场景、平台／规模／长会话及真人 WSL 继续开放。仅源码、本地构建与隔离验证；不打包、推送、发布或更新 Profile，goal 继续 active。
