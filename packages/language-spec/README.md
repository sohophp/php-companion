# @php-companion/language-spec

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

PDO 目录覆盖 `PDO`、`PDOStatement`、`PDOException`、高频连接/事务/预处理/抓取方法与跨驱动稳定常量。失败返回保持 `false`，PDOStatement 的绑定参数保留引用语义和 PHP 8 `string|int` 参数身份；`PDO::connect(): static` 仅在 PHP 8.4+ 生成，`setFetchMode()` 的 PHP 8.4 `true` 契约同样按版本切换。

Reflection 核心目录覆盖类、函数、方法、属性、参数、类型、Attribute、类常量与 Enum 反射。`ReflectionClass<T>` 的三个实例工厂保留已证明的具体类，参数/方法/属性/Attribute/Enum case 集合保留元素类型；PHP 7.4 属性类型检查、PHP 8.0 export 移除与 Attribute/Union、PHP 8.1 tentative returns/Intersection/Enum、PHP 8.2 readonly/prototype、PHP 8.4 lazy object/property hook/typed constants 及 PHP 8.5 mangled name 按目标版本生成。

mbstring 覆盖 PHP 7.2–8.5 完整可调用目录。PHP 7 保留历史参数名与 14 个无下划线 mbregex 别名，PHP 8 使用原生联合类型；编码列表、字符分割、正则位置 pair 与匹配集合保留结构化返回。`MB_CASE_*`、`MB_OVERLOAD_*` 和 `MB_ONIGURUMA_VERSION` 按版本生成，并覆盖 7.4、8.0、8.2、8.3、8.4 的新增、移除和返回边界。

编码目录覆盖 serialize/unserialize、Base64、十六进制、URL 编解码、URL 分解、查询字符串和响应头签名。`parse_url` 区分省略 component 的 `array|false` 与指定 component 的完整多形返回，`base64_decode` 保留失败 false；`get_headers` 按 PHP 8.0 切换第二参数的 int/bool 类型与 format/associative 名称。

文件系统目录覆盖整文件读写、流打开/关闭/读取/写入、文件和目录检查、大小、路径拆分/规范化/glob，以及常用复制、移动和删除操作。`resource` 参数通过 PHPDoc 保留，失败返回不会被抹成成功类型；PHP 7 的不可空尾部长度由重载表达，PHP 8 使用可空原生长度。

`is_iterable`、`iterator_to_array` 与 `iterator_count` 已按 PHP 7.2–8.5 审计；后两者在 PHP 8.2 起把参数从 `Traversable` 扩展为 `Traversable|array`。`iterator_to_array` 保留输入键值模板，并在 `$preserve_keys=false` 时返回 `list<TValue>`。

类与对象检查目录覆盖 `get_class`/`get_parent_class`、class/interface/trait/enum existence、方法/属性检查、继承检查、类成员列表与已声明类型列表。PHP 8.0 原生类型和失败契约、PHP 8.1 `enum_exists` 门槛按版本生成；`get_class(T)` 返回 `class-string<T>`。

变量类型谓词目录覆盖 null/bool/int/float/string/array/object/resource/scalar/numeric/callable/countable 及历史别名。`is_countable` 从 PHP 7.3 开始，`is_real` 在 PHP 7.4 弃用并于 PHP 8.0 移除；PHP 8.0 起使用原生 mixed 参数和 bool 返回。

高频数组目录覆盖 keys/values、merge/replace/combine、filter/map/reduce、查找、切片、聚合和 walk，并以模板保留 key/value/callback 返回类型。PHP 7.3 的 `array_key_first/last`、PHP 8.4 的 `array_find/find_key/any/all` 和 PHP 8.5 的 `array_first/last` 按版本生成并保留键值模板。既有按引用目录中的 `array_pop`、`array_shift`、`array_splice` 和 `usort` 同样保留值模板及回调参数类型。`array_merge`、`array_combine`、`array_chunk`、`array_fill`、`array_rand`、`array_is_list` 与 `array_walk` 等按 PHP 7.2–8.5 切换可用性、失败返回和 literal true 契约。

PHP 目标版本元数据、Composer PHP 约束选择、语法可用性规则与经过审计的核心 stub 集。共同核心覆盖高频类、Date/Time、完整 Strings 与 mbstring callable 目录、JSON、迭代器/ArrayAccess/Countable/JSON 序列化契约、Closure、Generator、ArrayObject 与 ArrayIterator；WeakReference、WeakMap、Stringable、UnitEnum 和 BackedEnum 按 PHP 7.4/8.0/8.1 边界生成。Date/Time 工厂、异常和微秒 API 按 PHP 7.3/8.0/8.2/8.3/8.4 边界生成，`DatePeriod` 保留三种构造签名及稳定的 `DateTimeInterface` 迭代值契约。标准异常层级同样按 PHP 7.2–8.5 版本生成。泛型迭代器与 Generator 使用 PHPStan/Psalm 可消费的模板签名，并保留原生接口 tentative return type 的兼容边界。少量高频按引用函数也以显式逐版本声明提供，目前覆盖 `sort`、`array_pop`、`array_shift`、`array_push`、`array_unshift`、`array_splice`、`shuffle`、`usort` 和 `parse_str`；PCRE 使用独立完整目录。未审计的内建 API 不猜测加入。
