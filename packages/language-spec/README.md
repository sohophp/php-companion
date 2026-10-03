# @php-companion/language-spec

固定上游覆盖复查使用 `scripts/audit-phpstorm-stubs.mjs --source PATH --php php85 --check MODULE...`；脚本拒绝不同上游修订，未归类名称或实际运行时函数缺席会返回失败。条件构建的待验证 API 单列，不豁免运行时覆盖检查。命令与范围见 [审计门禁记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-audit-gate-2026-10-01.md)。

`explode` 与 `str_split` 保留字符串列表的元素信息；PHP 7 输出 `list<string>|false`，PHP 8 输出 `list<string>`。负 limit 和 PHP 8.2 起空字符串拆分可能返回空列表，故不声明非空。

`parse_url` 提供可选 URL 数组字段，并按省略／-1、PORT 及其它组件选择条件返回类型；未知组件保留联合类型。结构来源及版本记录见 `SOURCES.md`，弱标量转换由语义层保守处理。

`CONFIGURABLE_PHP_EXTENSIONS` 导出当前可独立选择的审计扩展组；`builtinPhpStub(version, { disabledExtensions })` 可移除其中任一扩展。`builtinPhpExtensionStub(version, extension)` 从同一生成器返回单个扩展组，供符号所有权、诊断和独立组件消费；省略选项保持完整默认规格，libxml 作为 XML 共享基础保留。内置声明包含从固定版本 `phpstorm-stubs` 核对的名称，来源及许可见 `THIRD_PARTY_NOTICES.md`。

Date 扩展覆盖固定上游的 48 个过程式函数和本机运行时的 17 个全局常量；PHP 7 与 PHP 8 的参数名、原生类型及 PHP 8.2 新增常量按版本区分，`strftime`、`gmstrftime`、`date_sunrise`、`date_sunset` 自 PHP 8.1 起标记弃用。

标准数组函数新增 35 项排序、指针、递归数组工具与比较器函数，以及 22 个 `SORT_*`、`EXTR_*` 等选项常量。PHP 7/8 参数名和 PHP 8.2/8.5 排序返回值按版本区分；PHP 8 比较器函数的末尾回调仍显示为可变参数，数组指针函数的元素类型传播仍待语义层完善。

标准库时间与等待函数另补 8 项，包括 `microtime`、`gettimeofday`、`uniqid`、`sleep` 与 PHP 7.3 起的 `hrtime`。参数名及原生返回类型按 PHP 7/8 区分。

Stream Context 与过滤器补齐 13 个函数及三个 `STREAM_FILTER_*` 常量。`stream_context_set_options()` 从 PHP 8.3 起出现，Context 设置函数的 `true` 返回从 PHP 8.4 起提供；旧 `stream_context_set_option()` 两参数形式的弃用暂未单独标注到调用级诊断。

流 I/O、缓冲和状态查询另补 16 个函数，包含 `stream_select`、`stream_get_contents`、`stream_copy_to_stream` 与 `stream_set_timeout`；PHP 7／8 参数名和原生返回类型按运行时区分。

Stream Socket 再补 9 个函数及 13 个稳定标志常量，包含客户端／服务端连接、接收发送、加密、关闭与 socket pair。PHP 7／8 参数名和引用输出参数按运行时区分；仅适用于 PHP 8.6 的新增 context 参数不进入当前 8.5 规格。

Stream Wrapper 与 Bucket 再补 8 个函数及 `STREAM_IS_URL`。`stream_bucket_new()` 在 PHP 8.4 前返回普通对象，从 8.4 起返回 `StreamBucket`；append／prepend 的 bucket 参数也按该边界切换。

标准库工具函数另补 19 项：源码高亮、连接状态、浏览器和 meta 信息、图像类型／尺寸、IPTC、`mail`、二进制 `pack`／`unpack`，以及仅 PHP 7.x 可用的 `ezmlm_hash`。十个连接和图像常量按版本提供，`IMAGETYPE_AVIF` 从 PHP 8.1 起、`IMAGETYPE_HEIF` 从 PHP 8.5 起出现。`strptime`、`sys_getloadavg`、`ftok` 另按目标 PHP 运行时的实际导出过滤；`strptime` 从 PHP 8.1 起标记弃用。

Fileinfo 覆盖 6 个过程式函数、`finfo` 类和版本化常量；PHP 8.1 起过程式句柄改为对象，PHP 8.2 起包含 `FILEINFO_APPLE`。`FILEINFO_EXTENSION` 采用五个本机运行时共同验证的值。

Hash 覆盖固定上游的 20 个函数与 40 个常量名，包含增量哈希的 `HashContext`、HKDF/PBKDF2 和已弃用的 `mhash*` 兼容 API。`mhash*` 可按项目运行时导出函数过滤；PHP 7/8 的失败返回、PHP 8.1 新参数和算法常量、PHP 8.4 的 `hash_update(): true` 均按版本生成。

Zlib 覆盖固定上游的 31 个函数名与 25 个固定常量；PHP 8 移除 `gzgetss` 并以 `InflateContext`/`DeflateContext` 对象表示增量上下文。`ZLIB_VERSION` 与 `ZLIB_VERNUM` 仅在探测项目运行时后加入内建文档。

Sockets 覆盖固定上游的 40 个函数名和 271 个平台相关常量名，按 PHP 7 资源与 PHP 8 `Socket`/`AddressInfo` 对象区分类型。运行时可用时使用实际导出的函数及常量值；否则只显示当前版本的跨平台函数和少量通用常量。

OpenSSL 覆盖固定上游的 64 个函数名和 70 个数字常量名，按 PHP 7 资源与 PHP 8 证书、CSR 和密钥对象区分类型。运行时可用时使用实际导出的函数和常量值；否则仅给版本范围内的函数及少量基本常量。

MySQLi 覆盖固定上游的 117 个函数名、116 个常量名和 6 个类；实际生成 PHP 7.2–8.5 运行时可用的声明。项目运行时可过滤客户端相关函数、常量和方法，并校正 `mysqli_stmt::execute()` 的可选数组实参及 `MYSQLI_IS_MARIADB` 布尔值。无运行时事实时使用本机版本快照，省略随客户端变化的值。

SQLite3 覆盖 4 个类、12 个全局常量和版本化的方法/类常量。PHP 8.3 起包含 `SQLite3Exception`，8.5 起包含本机确实导出的 `SQLite3Stmt::busy()`、`SQLite3Result::fetchAll()`；项目运行时未加载扩展时隐藏整组。

Phar 覆盖 4 个类、127 个运行时自有方法和版本化的类常量，保留 SPL 继承与迭代/数组访问接口。PHP 8.1 起显示两个 OpenSSL 签名常量；项目运行时未加载扩展时隐藏整组。

Sodium 覆盖本机 PHP 8.1–8.5 当前导出的 103/104 个函数、常量和 `SodiumException`；7.2–8.0 按上游可用性标注提供保守子集。排除已移除别名和 PHP 8.6 API；项目运行时事实过滤可用函数与常量，并提供实际 `SODIUM_LIBRARY_*` 值。未加载扩展时隐藏整组。

Zip 覆盖 `ZipArchive` 当前 52 个方法、6 个属性、固定上游的常量目录和 10 个过程式函数。运行时反射事实可精确过滤 libzip 条件方法与常量，并提供实际 `LIBZIP_VERSION` 和 `ER_TRUNCATED_ZIP`；PHP 8.6 方法在当前支持版本中不生成。没有运行时事实时使用固定目录，可能含目标编译未提供的可选项。

Intl 当前覆盖 `Locale` 与 `Normalizer` 两个类及其 24 对过程式函数/静态方法，包含版本化类常量。`Normalizer::NONE` 与 FORM 常量值按 PHP 7/8 分开，原始分解函数从 PHP 7.3、新增的三个 Locale 函数从 PHP 8.5 起生成。Intl 其余类和函数待逐组审计。
另覆盖 13 个 grapheme/IDN 函数和 24/25 个版本化常量。`grapheme_str_split` 从 PHP 8.4、`grapheme_levenshtein` 从 PHP 8.5 起生成；`IDNA_DEFAULT` 使用经运行时验证的值 0。Intl 其余类和函数待逐组审计。
`Collator` 覆盖 13 对过程式函数与类方法、24 个类常量；PHP 8.4 起 `setStrength` 的返回值为 `true`。方法返回使用 PHPDoc 表达运行时的暂定类型，过程式函数在 PHP 8 保留原生返回类型。
`NumberFormatter` 覆盖 16 对过程式函数与类方法、73–83 个版本化类常量。解析输出参数保留引用，失败结果保留 `false`；PHP 8.4/8.5 新舍入与货币常量按版本生成。`CURRENCY_ACCOUNTING` 在 PHP 7.4 目标中保守隐藏，因为其可用性始于 PHP 7.4.1 且依赖 ICU 53。
`IntlDateFormatter` 覆盖 20 对过程式函数与类方法、7–12 个版本化类常量；PHP 8.4 起包含 `parseToCalendar()`。保留解析偏移引用参数，并排除 PHP 7.0 已移除的 `datefmt_set_timezone_id`。
Intl 全局错误 API 包含 `intl_error_name`、`intl_get_error_code`、`intl_get_error_message` 与 `intl_is_failure`。
`ResourceBundle` 覆盖 6 对过程式函数与类方法，并按 PHP 7.4/8.0 切换集合接口、按 PHP 8.4 收窄 `get()` 签名。`getIterator()` 仅在 PHP 8.0 起生成。
`Transliterator` 覆盖 7 对过程式函数与类方法、两个常量，以及版本化 `id` 属性。其静态工厂可返回 `null`；实例访问时的安全导航在补全和跳转用例中验证。
`MessageFormatter` 覆盖 10 对过程式函数与类方法，保留工厂返回 `null`、格式化返回 `false`、解析返回 `false` 的分支，并按 PHP 7/8 生成参数名与原生返回类型。
`IntlTimeZone` 覆盖 25 对过程式函数与类方法及 11 个常量；按版本处理 Windows ID 函数与 ICU 74 的 IANA ID 能力，并保留偏移输出引用参数。`IntlIterator`/`IntlException` 为时区枚举与 Intl 异常提供可导航的类型。
`IntlCalendar`/`IntlGregorianCalendar` 覆盖 49 个实际过程式函数与 39 个常量名，签名由固定上游名称及五个本机 PHP 运行时反射核对；PHP 8.3 日期工厂和 PHP 8.4 常量类型按版本生成。`FIELD_FIELD_COUNT` 只在探测到实际 ICU 值后生成。
`Spoofchecker` 覆盖 7 个类方法与最多 19 个常量，按 PHP 7.3/8.4 边界生成限制级别与允许字符设置。
`IntlBreakIterator` 及规则、片段、代码点三个相关类覆盖 30 个自身方法与 22 个常量；PHP 7/8 的迭代接口、PHP 8 快照中的片段规则状态方法和 PHP 8.4 常量类型按版本生成。
`UConverter` 覆盖 19 个方法与 41 个常量，保留回调错误输出引用、PHP 7 历史参数及 PHP 8.4 常量类型。
`IntlChar` 覆盖 59 个静态方法与按 PHP 版本分段的 663/666 个常量名；其中 7 个 ICU 相关常量只在取得运行时值后生成，其余固定数值经过本机五个 PHP 运行时核对。
`IntlDatePatternGenerator` 从 PHP 8.1 起生成；`IntlListFormatter` 从 PHP 8.5 起生成四个方法及六个常量，并注明构造可能因 ICU/locale 抛异常。

PHP 8.3 动态类常量访问具有独立的语法可用性规则；低于 8.3 的目标版本会在动态名称范围报告版本边界。

SPL 迭代器适配器已覆盖 `IteratorIterator`、`FilterIterator`、`CallbackFilterIterator`、`RecursiveFilterIterator`、`ParentIterator`、`RecursiveCallbackFilterIterator`、`LimitIterator`、`NoRewindIterator`、`InfiniteIterator`、`AppendIterator` 与 `EmptyIterator`。高级迭代器进一步覆盖 `RecursiveIteratorIterator`、`CachingIterator`、`RecursiveCachingIterator`、`RegexIterator`、`RecursiveRegexIterator` 与 `RecursiveTreeIterator`；目录迭代器覆盖 `DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator`。键和值模板会穿过适配器继承关系；正则、树和目录 flags 产生的字符串/数组/文件对象不会被误报成单一原始对象。PHP 7/8 参数、PHP 8.1 tentative returns、PHP 8.2 `EmptyIterator::valid(): false`、PHP 8.4 typed constants 及 PHP 8.5 树构造联合类型均按目标版本生成。

`MultipleIterator<TInnerKey,TValue>` 按 PHP 7.2–8.5 生成完整公开成员、flags 常量、附加 iterator 契约和键值数组类型。PHP 7/8.0 的 `current()`/`key()` 保留 `false` 失败分支，PHP 8.1 起使用 tentative array 返回，PHP 8.4 起常量带原生 `int` 类型。

`SplObserver` 与 `SplSubject` 已完整声明；PHP 7.2 的旧 arginfo 参数名、PHP 7.4 起的现代参数名和 PHP 8.1 起的 tentative `void` 按目标版本生成。

SPL 堆已完整声明 `SplHeap<TValue>`、`SplMinHeap<TValue>`、`SplMaxHeap<TValue>` 与 `SplPriorityQueue<TValue,TPriority>`。普通堆的具体值进入继承成员和 Iterator；优先队列因 extract flags 可变，安全返回 data、priority 或 `{data,priority}` shape 的 Union。PHP 7/8 compare 参数、PHP 7.4 debug 信息、PHP 8.4 literal `true`/typed constants 和 PHP 8.5 serialization 均按版本生成。

SPL 线性容器已完整声明 `SplDoublyLinkedList<TValue>`、`SplQueue<TValue>` 与 `SplStack<TValue>`。模板值会进入 Iterator、ArrayAccess、队列/栈和序列化结果；PHP 7 的插入操作返回 `true`，PHP 7.4 增加 magic serialization，PHP 8 切换参数和 `void` 返回，PHP 8.4 使用 typed constants。

SPL 对象与固定数组容器已完整声明 `SplObjectStorage<TObject,TInfo>` 和 `SplFixedArray<TValue>`。对象键、附加信息与固定槽位的可空值类型会进入迭代、offset、数组转换及静态 `fromArray()` 工厂；PHP 7.4 magic serialization、PHP 8.0 IteratorAggregate 转换、PHP 8.1 JSON、PHP 8.2 serialization、PHP 8.4 SeekableIterator/`__wakeup` 弃用及 PHP 8.5 storage alias 弃用均按目标版本生成。

SPL 数组容器已完整声明 `ArrayObject` 与 `ArrayIterator` 的公开成员、常量、继承接口和键值模板。`getArrayCopy()`、`getIterator()`、`offsetGet()` 与 `current()` 保留容器的 key/value 类型；PHP 7.4 序列化方法、PHP 8 参数名和类型、PHP 8.2 排序 `true` 返回及 PHP 8.4 typed class constants 均按目标版本生成。PHP 8.5 对 object storage 的弃用属于构造或替换输入的调用形状，不错误弃用整个类型。

SPL 文件对象已覆盖 `SplFileInfo`、`SplFileObject` 与 `SplTempFileObject`。文件元数据和读取保留 `false`，CSV 控制符使用固定三元素 shape，迭代值反映普通行、CSV 行与失败分支；PHP 7 的 `fgetss`、PHP 8 参数名、PHP 8.1 CSV EOL 和 PHP 8.5 nullable write length 均按目标版本生成。

SPL 函数已覆盖官方 15 项完整目录。类关系查询返回 `class-string` 键值映射，autoload 队列返回 callable list；PHP 7/8 参数名、原生返回、PHP 8.0 返回收窄、PHP 8.2 iterator 数组输入及 PHP 8.5 特定注销调用弃用边界均保留。

Strings 已覆盖 PHP 官方 103 项 callable union。PHP 7.2–8.5 分别生成适用函数、稳定 `HTML_*`/`ENT_*`/`STR_PAD_*` 常量及历史参数名；`count_chars`、`str_word_count`、`str_getcsv`、`localeconv` 与 `substr_replace` 保留模式相关或结构化返回，PHP 7.4 弃用、PHP 8.0 移除、PHP 8.2 弃用和 PHP 8.3 新增边界均按版本选择。

Filesystem 已覆盖官方完整可调用目录。除既有整文件、路径、元数据、权限、上传和链接 API 外，流状态、CSV/INI、锁、seek、stream stat、同步、process-file 与临时流均有版本化契约；`stat`/`lstat`/`fstat` 返回完整混合键 shape，CSV 行与 `file()` 保留 list 元素类型，resource、引用参数和失败分支不会被抹除。PHP 7 保留历史参数名与 `fgetss`，PHP 8.1 起生成 `fsync`/`fdatasync` 和 `fputcsv` EOL，PHP 8.4 依赖 CSV escape 默认值的弃用保持显式文档边界。手册中的 `delete` 只是指向 `unlink`/`unset` 的索引项，不伪造同名函数。平台、构建、SAPI、权限及真实文件系统能力仍是环境边界。

Program Execution 目录覆盖 11 项函数。`exec`/`system`/`passthru` 保留输出或退出码引用，`proc_open` 保留描述符、pipe output 与 `resource|false`，`proc_get_status` 使用固定字段 shape；array command 从 PHP 7.4 起可用，PHP 8 切换参数名和原生类型，`passthru` 从 PHP 8.2 使用 `false|null`，状态的 `cached` 字段从 PHP 8.3 起生成。`proc_nice` 的平台能力与进程执行权限保持显式环境边界。

Directory 目录覆盖 9 项函数、3 项稳定排序常量和 `Directory` 类型。目录 handle 保留 `resource|false`，读取与 cwd 保留失败分支，`scandir` 返回 `list<string>|false`；PHP 7/8 的参数名与对象方法参数分别生成，PHP 8.1 起声明 readonly `path`/`handle`，PHP 8.5 将类型标记为 final。`chroot` 的构建/SAPI 可用性以及路径、GLOB 常量的平台差异保持显式边界。

Network 目录覆盖 37 项网络、DNS、HTTP header、cookie、地址转换、stream alias 与 syslog 函数，以及 15 项跨平台稳定 DNS 常量。返回类型保留 hostname/DNS/stream 的失败分支、header list、网络接口与请求 body shape；`net_get_interfaces` 从 PHP 7.3、last-response-header 与 request-body API 从 PHP 8.4 起生成，syslog 函数从 PHP 8.2 收窄为 `true`，`long2ip` 从 PHP 8.4 收窄为 `string`，cookie options 在 PHP 8.5 增加 `partitioned`。平台相关 `LOG_*` 值不伪造为跨平台常量。

Session Handling 覆盖 23 项函数、`PHP_SESSION_*` 三个状态常量，以及 `SessionHandler`、`SessionHandlerInterface`、`SessionIdInterface` 与 `SessionUpdateTimestampHandlerInterface`。cookie 参数返回值使用逐版本 array shape；PHP 7.3 起支持 options 数组，PHP 8.5 增加 `partitioned` 字段。`session_set_save_handler` 分别表示 handler object 与 callback 两种调用方式，`session_status` 返回 `0|1|2`。

Function Handling 目录结合既有 `function_exists`/`get_defined_functions` 覆盖全部 13 项 API。动态 callback 调用保持 `mixed`，不在无法证明具体目标时伪造返回；`func_get_args` 返回 `list<mixed>`，shutdown/tick callback 与参数按 PHP 7/8 分别生成。`register_shutdown_function` 在 PHP 8.0–8.1 保留原生 `?bool`，PHP 8.2 起为 `void`；`create_function` 在 PHP 7.2–7.4 标记弃用并从 PHP 8.0 移除。

Output Control 目录覆盖 16 项函数和 PHP 7.2–8.5 的 13/14 项常量。`ob_get_status` 根据 `$full_status` literal 返回单层可空 shape 或 buffer status list，内容与长度读取保留 `false`；`ob_start` 保留 nullable output-handler callable 及其 `string|false` 返回，PHP 7/8 参数名和原生类型分别生成，`PHP_OUTPUT_HANDLER_PROCESSED` 从 PHP 8.4 起生成。

Error Handling 目录覆盖 14 项函数和 18 项稳定常量。backtrace frame 与最后错误保留结构化 shape，handler 安装函数保留 callable/null 契约；恢复处理器从 PHP 8.2、`trigger_error`/`user_error` 从 PHP 8.4 收窄为 `true`，PHP 8.4 的 `E_ALL` 值与 `E_STRICT` 弃用、PHP 8.5 的当前 handler 查询均按版本生成。backtrace 的 `type` 字段当前使用 `string`，以兼容共享 PHPDoc shape 解析器并保留其后的 `args`/`object` 字段。

Math 目录覆盖核心扩展全部四十四项函数、稳定数学/舍入/IEEE 常量、`abs` 类型关联重载和 `min/max` 泛型返回。`fdiv` 从 PHP 8.0 起生成，`fpow` 与八 case 的 `RoundingMode` 从 PHP 8.4 起生成；依赖平台表示的 `PHP_FLOAT_*` 值不伪造为固定常量。

Variable Handling 目录在既有类型谓词及序列化函数之外覆盖数值/字符串转换、变量表、资源信息和调试输出。`print_r` 与 `var_export` 按 `$return` literal 选择 `string`、`true` 或 `null`；`get_debug_type`/`get_resource_id` 从 PHP 8.0 起生成，PHP 8.4 的 `print_r` 原生返回收窄为 `string|true`。

运行时符号与扩展自省目录覆盖常量定义/读取、函数存在检查、已定义函数/常量以及已加载扩展查询。集合返回保留固定 `internal`/`user` shape、分组常量条件类型、字符串列表和 `false` 失败分支；PHP 7 与 PHP 8 的参数名、原生类型及 `get_defined_functions` 默认值分别生成，`define` 从 PHP 8.1 起才允许对象并声明 `mixed $value`。

PHP 配置与运行时信息目录覆盖 INI 读取/修改、include path、PHP 版本/SAPI/配置文件和内存统计。`ini_get_all` 根据 `$details` literal 返回带 nullable 值的详细 shape 或扁平映射；`restore_include_path` 在 PHP 7.4 标记弃用并从 PHP 8.0 移除，`ini_set`/`ini_alter` 从 PHP 8.1 接受标量/null Union，`memory_reset_peak_usage` 与 `ini_parse_quantity` 从 PHP 8.2 起生成。

PHP Options/Info 其余目录覆盖环境变量、已包含文件、资源/进程信息、垃圾回收、CLI 进程标题、运行时输出、版本比较和历史兼容接口。`getenv` 根据变量名是否为 null 返回环境映射或单值失败 Union，`version_compare` 区分三值比较与操作符布尔结果；`gc_status` 从 PHP 7.3 起生成并在 PHP 8.3 扩展为十二字段 shape，`phpinfo`/`phpcredits` 从 PHP 8.2 起返回 `true`。`assert_options` 在 PHP 8.3 起标记弃用，magic-quotes 查询在 PHP 7.4 标记弃用并从 PHP 8.0 移除，相应 `ASSERT_*` 值按 PHP 8.0 切换。`zend_thread_id` 依赖 ZTS debug 编译能力，不进入仅按 PHP 版本选择的基础目录。

PCRE 目录覆盖全部十一项主函数及稳定 `PREG_*` 常量。匹配函数保留 `int|false`，替换与过滤函数按字符串或数组 subject 选择关联返回，`preg_grep` 保留输入键值模板；callback flags 从 PHP 7.4 起生成，`preg_last_error_msg` 从 PHP 8.0 起生成。编译时 PCRE 版本/JIT 信息不伪造为固定值。

Filter 目录覆盖单值/输入/数组过滤、过滤器枚举和 PHP 7.2–8.5 的常用验证、清理与 flag 常量。`FILTER_VALIDATE_INT/FLOAT/BOOL` 及字符串验证器提供基于过滤器 literal 的返回重载；动态 options 保持 `mixed`。PHP 8.0 移除/规范名、PHP 8.2 global-range flag 及 PHP 8.5 throw-on-failure/value 变化按版本生成。

安全函数目录覆盖 Password Hashing、Hash/HMAC 与密码学安全随机数。PHP 7 的 `password_hash`、`hash` 和 `hash_hmac` 失败返回不会被抹除；`password_algos` 从 PHP 7.4 起生成，Hash options 从 PHP 8.1 起生成，bcrypt 默认成本在 PHP 8.4 从 10 切换为 12。依赖编译能力的 Argon 常量不进入仅按版本选择的基础目录。

PDO 目录覆盖 `PDO`、`PDOStatement`、`PDOException`、`PDORow`、连接/事务/预处理/抓取方法和按 PHP 版本校准的核心常量。失败返回保持 `false`，PDOStatement 的绑定参数保留引用语义和 PHP 8 `string|int` 参数身份；`PDO::connect(): static` 仅在 PHP 8.4+ 生成。项目 PHP 运行时探测提供驱动专有常量，并为 PHP 8.4+ 的 `Pdo\Mysql`、`Pdo\Pgsql`、`Pdo\Sqlite` 建立独立命名空间声明；没有驱动运行时证据时不生成这些候选。

Random 目录补齐 `rand`、`mt_rand`、`srand`、`mt_srand`、`getrandmax`、`mt_getrandmax`、`lcg_value` 与 Mersenne Twister 常量；`Random\Randomizer`、引擎、接口及异常使用独立命名空间声明。浮点随机方法与 `IntervalBoundary` 仅在 PHP 8.3+ 提供。

Reflection 核心目录覆盖类、函数、方法、属性、参数、类型、Attribute、类常量与 Enum 反射。`ReflectionClass<T>` 的三个实例工厂保留已证明的具体类，参数/方法/属性/Attribute/Enum case 集合保留元素类型；PHP 7.4 属性类型检查、PHP 8.0 export 移除与 Attribute/Union、PHP 8.1 tentative returns/Intersection/Enum、PHP 8.2 readonly/prototype、PHP 8.4 lazy object/property hook/typed constants 及 PHP 8.5 mangled name 按目标版本生成。

mbstring 覆盖 PHP 7.2–8.5 完整可调用目录。PHP 7 保留历史参数名与 14 个无下划线 mbregex 别名，PHP 8 使用原生联合类型；编码列表、字符分割、正则位置 pair 与匹配集合保留结构化返回。`MB_CASE_*`、`MB_OVERLOAD_*` 按版本生成；`MB_ONIGURUMA_VERSION` 从 PHP 7.4 起仅使用项目 PHP 运行时的实际值。覆盖 7.4、8.0、8.2、8.3、8.4 的新增、移除和返回边界。

编码目录覆盖 serialize/unserialize、Base64、十六进制、URL 编解码、URL 分解、查询字符串和响应头签名。`parse_url` 区分省略 component 的 `array|false` 与指定 component 的完整多形返回，`base64_decode` 保留失败 false；`get_headers` 按 PHP 8.0 切换第二参数的 int/bool 类型与 format/associative 名称。

文件系统目录覆盖整文件读写、流打开/关闭/读取/写入、文件和目录检查、大小、路径拆分/规范化/glob，以及常用复制、移动和删除操作。`resource` 参数通过 PHPDoc 保留，失败返回不会被抹成成功类型；PHP 7 的不可空尾部长度由重载表达，PHP 8 使用可空原生长度。

`is_iterable`、`iterator_to_array` 与 `iterator_count` 已按 PHP 7.2–8.5 审计；后两者在 PHP 8.2 起把参数从 `Traversable` 扩展为 `Traversable|array`。`iterator_to_array` 保留输入键值模板，并在 `$preserve_keys=false` 时返回 `list<TValue>`。

类与对象检查目录覆盖 `get_class`/`get_parent_class`、class/interface/trait/enum existence、方法/属性检查、继承检查、类成员列表与已声明类型列表。PHP 8.0 原生类型和失败契约、PHP 8.1 `enum_exists` 门槛按版本生成；`get_class(T)` 返回 `class-string<T>`。

变量类型谓词目录覆盖 null/bool/int/float/string/array/object/resource/scalar/numeric/callable/countable 及历史别名。`is_countable` 从 PHP 7.3 开始，`is_real` 在 PHP 7.4 弃用并于 PHP 8.0 移除；PHP 8.0 起使用原生 mixed 参数和 bool 返回。

高频数组目录覆盖 keys/values、merge/replace/combine、filter/map/reduce、查找、切片、聚合和 walk，并以模板保留 key/value/callback 返回类型。PHP 7.3 的 `array_key_first/last`、PHP 8.4 的 `array_find/find_key/any/all` 和 PHP 8.5 的 `array_first/last` 按版本生成并保留键值模板。既有按引用目录中的 `array_pop`、`array_shift`、`array_splice` 和 `usort` 同样保留值模板及回调参数类型。`array_merge`、`array_combine`、`array_chunk`、`array_fill`、`array_rand`、`array_is_list` 与 `array_walk` 等按 PHP 7.2–8.5 切换可用性、失败返回和 literal true 契约。

PHP 目标版本元数据、Composer PHP 约束选择、语法可用性规则与经过审计的核心 stub 集。共同核心覆盖高频类、Date/Time、完整 Strings 与 mbstring callable 目录、JSON、迭代器/ArrayAccess/Countable/JSON 序列化契约、Closure、Generator、ArrayObject 与 ArrayIterator；WeakReference、WeakMap、Stringable、UnitEnum 和 BackedEnum 按 PHP 7.4/8.0/8.1 边界生成。Date/Time 工厂、异常和微秒 API 按 PHP 7.3/8.0/8.2/8.3/8.4 边界生成，`DatePeriod` 保留三种构造签名及稳定的 `DateTimeInterface` 迭代值契约。标准异常层级同样按 PHP 7.2–8.5 版本生成。泛型迭代器与 Generator 使用 PHPStan/Psalm 可消费的模板签名，并保留原生接口 tentative return type 的兼容边界。少量高频按引用函数也以显式逐版本声明提供，目前覆盖 `sort`、`array_pop`、`array_shift`、`array_push`、`array_unshift`、`array_splice`、`shuffle`、`usort` 和 `parse_str`；PCRE 使用独立完整目录。未审计的内建 API 不猜测加入。
