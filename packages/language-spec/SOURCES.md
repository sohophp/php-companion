# 数据来源

Intl／DOM／SimpleXML 已有签名及原生迭代合同的消费修复位于 SoPHP 语义层：按实际传入参数识别引用风险，固定父类类型事实可传给无独立泛型参数的子类；不更换 stubs 来源、不复制上游说明文本。完整语义、LSP、六版实际 PHP（PHP 7.4 缺 intl 单列）及 Linux／Windows 当前宿主证据见 [记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-call-and-inherited-flow-2026-10-03.md)与 [Windows 验收](../../docs/php-language-toolchain/reports/phpstorm-stubs-current-windows-2026-10-03.md)。

`array_reverse`、`array_slice`、`array_chunk` 的原生签名核对固定 phpstorm-stubs 修订 standard/standard_8.php／standard_9.php；键域传递与分块 preserve_keys 条件合同按 PHP 官方手册独立补充，并经六版运行时核验。PHP 7 slice 的 length 显式保持可空。见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-array-key-preservation-2026-10-03.md)。未复制说明文本。

`array_flip` 与 `array_count_values` 按固定 phpstorm-stubs 修订的标准数组声明及 PHP 官方手册核对签名，再通过六版 PHP 实际调用补充数组键与元素合同。保留宽输入与版本参数名；窄静态重载分别保持输入键类型和整数值形成的 int 键，不把运行时会跳过的值误判为整个调用失败。见 [array_flip 记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-array-flip-contract-2026-10-03.md)与 [array_count_values 记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-array-count-values-contract-2026-10-03.md)。原生 array 的模板绑定为 array-key/mixed 是 SoPHP 语义推导修复，见 [记录](../../docs/php-language-toolchain/reports/native-array-template-inference-2026-10-03.md)；未复制上游说明文本。

`str_replace`／`str_ireplace` 按固定修订 `standard/standard_1.php` 与 [官方手册](https://www.php.net/manual/en/function.str-replace.php)补充 subject 条件返回及数组键模板。PHP 7 数组保留 mixed（对象／嵌套数组可原样保留），PHP 8 数组成功返回元素为 string；边界另核对 [PHP 8.0 源码](https://github.com/php/php-src/blob/php-8.0.0/ext/standard/string.c)与 PHP 7.4 源码，并以六套 PHP 复测。保留旧版参数名与宽原生签名，窄数组签名仅为静态重载。见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-string-replacement-2026-10-03.md)。

`array_column` 的返回索引合同按固定修订 `standard/standard_9.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.array-column.php)核对：index_key 为 null 时返回列表，提供索引列时允许 array-key，未知索引模式保留两个分支；列值未知时不猜测元素类型。保留语义层已有的可证明列值细化。见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-array-column-return-2026-10-03.md)。

`iterator_apply` 的 args 按固定修订 `SPL/SPL_f.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.iterator-apply.php)核对为任意数组或 null，移除 list 误限。PHP 7 生成签名采用等价 `?array` 显式表示实际 allowsNull() 合同，避免隐式可空事实丢失；保留旧版 `$function` 名称与返回 PHPDoc。运行时、版本语义和未保存刷新见 [审计记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-iterator-apply-audit-2026-10-02.md)。未复制说明文本，不推断回调参数名称的版本边界。

CSV 写入的字段数组核对固定修订 `standard/standard_6.php`、`SPL/SPL_c1.php` 及 [PHP 官方手册](https://www.php.net/manual/en/function.fputcsv.php)：函数与 SplFileObject 方法采用 `array<array-key, mixed>`，不误限列表或字符串值，保留现有版本参数与 int|false 返回合同。实际值转换由运行时负责，不保证任意对象均可转换。见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-csv-fields-2026-10-02.md)。

`array_fill_keys` 任意输入索引及可转换键元素按固定修订 `standard/standard_8.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.array-fill-keys.php)核对，value/val 名称按 PHP 8/7 实际反射保持。数组函数组原有模板改用分行 PHPDoc，修复语义消费，不复制说明文本。十一项数组合同、无约束未知元素的容器保留、六版运行时及编辑器刷新见 [记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-array-template-consumption-2026-10-02.md)。

`array_combine` 的 PHP 7 false／PHP 8 ValueError 边界核对固定修订 `standard/standard_9.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.array-combine.php)。输入是任意数组，不能用 list 限制；按实际调用保留 values 元素模板，keys 元素允许运行时转换，返回键保持 array-key。六版运行时、四版语义、两版协议和隔离宿主见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-array-combine-contract-2026-10-02.md)。未复制说明文本。

`get_headers` 的版本签名核对固定修订 `standard/standard_6.php`；列表／关联返回合同按 [PHP 官方手册](https://www.php.net/manual/en/function.get-headers.php)和六版本机 loopback HTTP 调用独立补充。重复响应头保留 `list<string>` 值，未知模式保留两个分支，不猜测服务端响应头名称。见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-headers-contract-2026-10-02.md)。未复制说明文本或执行上游 stubs。

高亮三个入口的签名与 8.4 返回变化核对固定修订 `standard/standard_4.php`，按 PHP 官方手册独立补充 return 实参条件合同；旧版和文件失败分支保留。四版语义、九版规格、七套实际 PHP 与当前根 Linux 宿主见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-highlight-conditional-return-2026-10-02.md)。没有复制说明文本。

图片尺寸两个标准函数的字段名称核对固定修订 `standard/standard_0.php`／`standard_8.php` ArrayShape；bits／channels 可选性按 PHP 文档与实际调用修正。PHP 8.5 的单位字段及条件索引 3 按官方 `ext/standard/image.c` 和两平台实际调用独立建模，未复制 C 实现或说明文本。九版声明、两版协议、七套运行时与隔离宿主见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-image-size-shape-2026-10-02.md)。

`getrusage` 的原生版本签名核对固定修订 `standard/standard_3.php`；平台数组字段由项目实际 PHP 的自身／子进程调用提供，再生成条件返回形状并保留 false。六版 Linux 与原生 Windows 8.5 核验、运行时切换和两平台隔离宿主见 [接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-getrusage-runtime-contract-2026-10-02.md)。无运行时字段时保留宽数组，不把 Linux 字段复制给 Windows；手册与本机 Windows 子进程字段差异单列，未复制说明文本。

SimpleXML 三个加载入口的原生签名核对固定修订 `SimpleXML/SimpleXML.php`；自定义子类返回合同按 [PHP 官方加载文档](https://www.php.net/manual/en/function.simplexml-load-string.php)独立补为 bounded class-string 模板，保留 false／null 失败分支。默认、显式 null、自定义子类与实际失败节点由六版运行时核验，见 [记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-simplexml-factory-2026-10-02.md)。未复制上游说明或直接执行 stubs。

`stat`／`lstat` 的 PHP 8 PHPDoc 与原生失败分支统一为形状加 false；对照固定上游 `standard/standard_7.php` 和 [PHP stat 手册](https://www.php.net/manual/en/function.stat.php)，六版实际调用与成功保护后的键提示验证见 [记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-stat-failure-shape-2026-10-02.md)。原字段结构沿用现有声明，不复制说明文本。

`pathinfo` 的四个返回字段核对固定修订 `standard/standard_1.php` 的结构化 PHPDoc／ArrayShape；条件返回独立写为 flags/options 等于 15 时的数组形状，其余为 string。空路径缺少 dirname、无后缀缺少 extension，按六版本机运行时修正为可选字段；PATHINFO_ALL 只在 PHP 8 输出。见 [接入验证](../../docs/php-language-toolchain/reports/phpstorm-stubs-pathinfo-contract-2026-10-02.md)。不复制说明文本。

PostgreSQL 的 `pg_close_stmt` 与 `pg_set_chunked_rows_size` 条件签名从固定上游生成，另对照 PHP 官方 8.5 `pgsql.stub.php`。只在项目运行时导出且 PHP 版本适用时输出；四个上游 pipeline 名称在核对的 PHP 8.3/8.5 官方声明中缺席，不复制为候选。详见 [条件声明记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-pgsql-conditional-2026-10-01.md)。

`preg_split` 的签名核对固定修订 [pcre/pcre.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/pcre/pcre.php)。原宽返回声明保留，语义层按 [PHP 手册](https://www.php.net/manual/en/function.preg-split.php)与六版本机运行时独立区分普通字符串和偏移捕获二元数组；未知 flags 不选定分支。[验证记录](../../docs/php-language-toolchain/reports/c2-preg-split-flag-types-2026-10-01.md)。

`explode` 与 `str_split` 的字符串元素类型和 PHP 7／8 失败边界核对固定修订的 [standard/standard_1.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_1.php)，列表结构另以本机六版运行时复核。PHP 8 返回 `list<string>`，PHP 7 保留 `false`；空结果不声明为非空列表。参见 [explode 手册](https://www.php.net/manual/en/function.explode.php)与 [str_split 手册](https://www.php.net/manual/en/function.str-split.php)。不复制上游说明文本。

`parse_url` 的数组形状字段与类型核对固定修订的 [standard/standard_2.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_2.php) 的 `ArrayShape`。字段改为可选；组件对应的条件返回类型按 [PHP 文档](https://www.php.net/manual/en/function.parse-url.php)与运行时独立复核，不复制上游说明文本。

Mcrypt 的 32 个实际函数及 41 个常量与固定修订的 [mcrypt/mcrypt.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/mcrypt/mcrypt.php)核对。`scripts/sync-phpstorm-mcrypt.mjs` 复核六个 PHP 运行时的 Mcrypt 1.0.9 参数、弃用标记与常量值；反射未提供的默认参数取固定上游声明。只保留结构化 PHPDoc 类型，不复制说明文本；五个已移除 API 不输出。[接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-mcrypt-intake-2026-10-01.md)。

POSIX 的 41 个函数名来自固定修订的 [posix/posix.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/posix/posix.php)。`scripts/sync-phpstorm-posix.mjs` 用本机 PHP 8.1／8.5 反射生成签名快照，PHP 8.3 新函数与 getrlimit 参数边界另用官方手册核对。按项目扩展可用性撤回；43 个平台常量名称由同一目录生成，数值按项目 PHP 探测并用十进制字符串保存 64 位精度。[常量记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-posix-constants-2026-10-01.md)。不复制上游说明文本。[函数接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-posix-functions-2026-10-01.md)。

SysV IPC 的 18 个过程式函数及 PHP 8 起的三个句柄类名来自固定修订的 [sysvmsg](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/sysvmsg/sysvmsg.php)、[sysvsem](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/sysvsem/sysvsem.php) 与 [sysvshm](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/sysvshm/sysvshm.php)。PHP 8.1／8.5 的函数参数、返回类型和类由本机反射核对；PHP 7 使用上游资源句柄声明。三个扩展分别按项目运行时可用性过滤。`MSG_EAGAIN` 与 `MSG_ENOMSG` 的 errno 数值仅按项目运行时探测结果输出，并随内置文档 URI 版本化；未知时缺席。其余三个消息标志常量以本机值核对。不复制上游说明文本。[接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-sysv-ipc-intake-2026-10-01.md)。

Shmop 的六个函数名与 PHP 8 `Shmop` 类名来自固定修订的 [shmop/shmop.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/shmop/shmop.php)。`scripts/sync-phpstorm-shmop.mjs` 对本机 PHP 8.1／8.5 的参数、返回类型和类逐项复核；PHP 7 资源句柄与 8.0 版本边界依据 PHP 官方手册，本机旧版没有加载该扩展。项目未加载 Shmop 时撤回相关声明。不复制上游说明文本。[接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-shmop-intake-2026-10-01.md)。

标准数组目录中的 `count`、`sizeof`、`array_walk`、`array_walk_recursive`、`array_column` 已用 `scripts/audit-phpstorm-standard-native-types.mjs` 对本机 PHP 8.1／8.2／8.4／8.5 的原生参数与返回类型逐项复核；PHP 7 沿用现有 PHPDoc 与声明边界。[核对记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-standard-native-types-2026-10-01.md)。

Msgpack 的四个过程式函数名与两个类名来自固定修订的 [msgpack/msgpack.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/msgpack/msgpack.php)。`scripts/sync-phpstorm-msgpack.mjs` 对本机 PHP 7.4／8.1／8.5 的 Msgpack 3.0.1 核对参数名、可选性、引用方式、类方法和常量值；固定上游未列出的 `OPT_ASSOC`、`OPT_FORCE_F32` 仅依据运行时事实加入。项目未加载扩展时撤回该组符号。不复制上游说明文本。[审计记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-msgpack-intake-2026-10-01.md)。

Imagick 的五个主类方法名和类常量名与固定修订的 [imagick/imagick.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/imagick/imagick.php)核对。`scripts/sync-phpstorm-imagick.mjs` 从本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 的 imagick 3.8.1 反射生成实际方法签名和常量值，按扩展版本、底层 ImageMagick 版本号及方法名称／常量值指纹选择快照；未知构建只使用本机快照共有的方法和一致的常量。五个异常类型、`Iterator` 与 `Countable` 契约按运行时及固定上游声明。PHPDoc 类型来自反射，不复制上游说明文本。[审计与接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-imagick-intake-2026-10-01.md)。

Redis 的 `Redis`、`RedisArray`、`RedisCluster`、`RedisSentinel` 方法名及类常量名与固定修订的 [redis 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/redis)核对。`scripts/sync-phpstorm-redis.mjs` 从本机 phpredis 4.3.0、5.3.7、6.3.0 的四个 PHP 运行时反射生成实际存在的方法签名、常量值和异常类父类；项目运行时版本选取对应快照。`RedisArray` 在本机通过 `__call` 代理大量方法，仅从上游明示的方法与该版本 `Redis` 可用方法的交集补代理候选。未知扩展版本只提供各快照共同成员。PHPDoc 类型根据反射生成，不复制上游说明文本。[审计与接入记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-redis-intake-2026-10-01.md)。

igbinary 的两个函数名来自固定修订的 [igbinary/igbinary.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/igbinary/igbinary.php)。`scripts/sync-phpstorm-igbinary.mjs` 核对本机 PHP 7.2／7.4／8.1／8.5 的函数名和参数形状；项目未加载扩展时撤回两项声明。不复制上游说明文本。[审计记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-igbinary-intake-2026-10-01.md)。Redis 类的版本差异见[单独审计](../../docs/php-language-toolchain/reports/phpstorm-stubs-redis-audit-2026-10-01.md)。

YAML 的五个函数名和 25 个常量名来自固定修订的 [yaml/yaml.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/yaml/yaml.php)。`scripts/sync-phpstorm-yaml.mjs` 核对本机 PHP 7.2／8.1／8.2／8.4／8.5 的参数名、可选性、引用方式和常量值，五版均一致；PHP 7.4 本机未加载该扩展，按相邻版本后备。项目 PHP 未加载 YAML 时整组声明撤回。不复制上游说明文本。[审计记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-yaml-intake-2026-10-01.md)。

XSL 的 `XSLTProcessor` 13 个方法名、4 个属性名与 14 个常量名来自固定修订的 [xsl 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/xsl)。`scripts/sync-phpstorm-xsl.mjs` 按本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 反射生成签名和实际常量快照；PHP 8.4 起的属性和 `registerPHPFunctionNS()` 按版本提供。libxslt／libexslt 版本常量只使用项目实际运行时值，不采用上游占位值。[审计记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-xsl-intake-2026-10-01.md)。

PostgreSQL 的 127 个上游函数名、81 个上游常量名与三个 `PgSql` 句柄类来自固定修订的 [pgsql 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/pgsql)。`scripts/sync-phpstorm-pgsql.mjs` 对本机 PHP 8.1／8.2／8.4／8.5 生成签名及常量快照；项目运行时的实际导出函数和常量用于过滤条件编译项，libpq 版本字符串不采用上游占位值。PHP 7.2／7.4 的 114 个函数名已与 PHP 官方版本源码核对；本机未安装旧版 PostgreSQL 扩展，参数及重载仍待实际运行时核对。[审计记录](../../docs/php-language-toolchain/reports/phpstorm-stubs-pgsql-catalog-2026-10-01.md)。

PCNTL 的 29 个固定上游函数名、129 个信号与进程常量名及 `Pcntl\QosClass` 来自固定修订的 [pcntl 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/pcntl)。`scripts/sync-phpstorm-pcntl.mjs` 从固定 Git 树核对名称，并按本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 生成函数签名快照。函数可用性、常量存在性与数值、QoS 枚举存在性由项目实际 PHP 运行时探测；固定上游的 `SIGRTMIN=35` 与本机六版的 34 不一致，不能照抄。PHP 7.4 的 `pcntl_unshare()`、PHP 8.4 的 `pcntl_waitid()`、PHP 8.5 新增的 `resource_usage` 参数按 [PHP PCNTL 手册](https://www.php.net/manual/en/book.pcntl.php)、[pcntl_unshare](https://www.php.net/manual/en/function.pcntl-unshare.php) 与 [pcntl_waitid](https://www.php.net/manual/en/function.pcntl-waitid.php)核对。Apple 上的 `pcntl_getqos_class()`、`pcntl_setqos_class()` 和平台可用的 `pcntl_setns()` 不在固定上游的 29 个名称中，按官方签名且仅在运行时导出时提供；其它平台专有 PCNTL 入口未在本机核验。PHP 7.3／8.0／8.3 本机缺少运行时，按邻近快照与已知官方版本边界选择，不复制上游说明文本。

Session 的 23 个过程式函数名、4 个类型名和 3 个 `PHP_SESSION_*` 常量与固定修订的 [session 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/session)及本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 运行时核对。现有声明保留 `session_set_save_handler()` 的对象与回调两种签名，运行时反射只合并报告一个入口，通用单签名审计会把此重载报为形状差异。项目 PHP 未加载 Session 时整组函数、类型和常量撤回；PHP 7.2 尚无数组形式的 `session_set_cookie_params()` 重载。不复制上游说明文本。

FTP 的 36 个函数名、`FTP\Connection` 和 11 个 `FTP_*` 常量来自固定修订的 [ftp 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/ftp)。PHP 7.2／7.4／8.1／8.2／8.4／8.5 的函数参数名与必填数、常量数值按本机反射核对；PHP 7.3 起传输函数的 `mode` 可省略、PHP 8.1 起 FTP 资源改为 `FTP\Connection`，依据 [PHP ftp_get 手册](https://www.php.net/manual/en/function.ftp-get.php)和 [PHP 8.1 发行说明](https://www.php.net/releases/8.1/en.php)。PHP 7.3 与 8.0 本机缺少运行时，签名按相邻版本和官方边界推定，仍待独立反射验证。不复制上游说明文本。

Readline 的 13 个函数名与 `READLINE_LIB` 名称来自固定修订的 [readline/readline.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/readline/readline.php)。PHP 7.2／7.4／8.1／8.2／8.4／8.5 参数名、必填数和 PHP 8.5 三个 `true` 返回类型按本机反射核对。`readline_list_history()` 是否存在取决于底层库，[PHP 手册](https://www.php.net/manual/en/function.readline-list-history.php)有说明；`READLINE_LIB` 值也由项目实际运行时探测，不采用上游固定的 `readline` 值。本机六版常量值均为 `libedit`，PHP 7.2 未导出 `readline_list_history()`。无运行时事实时不猜测常量值，不复制上游说明文本。

Calendar 的 18 个函数名和 21 个 `CAL_*` 常量名称、数值来自固定修订的 [calendar/calendar.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/calendar/calendar.php)。PHP 7.2／7.4／8.1／8.2／8.4／8.5 的实际函数参数名、必填数和常量数值按本机反射核对；PHP 7 的非原生返回类型按上游摘要保守声明。Calendar 未加载时，函数和常量都从项目内置声明中撤回。不复制上游说明文本。

APCu 的 14 个 `apcu_*` 函数名和 19 个 `APC_ITER_*`／`APC_LIST_*` 合法常量名来自固定修订的 [apcu/apcu.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/apcu/apcu.php)，可用 `scripts/sync-phpstorm-apcu.mjs` 复核。上游同文件中的 19 个 `apc_*` 属旧 APC API，不作为 APCu 5 候选。函数及 `APCUIterator` 方法签名按本机 PHP 8.5／APCu 5.1.28 反射核对；其它版本保守按 [PHP APCu 手册](https://www.php.net/manual/en/book.apcu.php)和上游声明。常量数值、可用函数及迭代器类存在性由项目运行时决定，不复制上游说明文本或固定上游数值。

Tokenizer 的两个函数名、`PhpToken` 类及成员与固定修订的 [tokenizer 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/tokenizer) 核对；154 个 `T_*` 合法名称从 `tokenizer.php` 生成。PHP 7.2／7.4／8.1／8.2／8.4／8.5 的函数及 PHP 8.1–8.5 类方法签名按本机反射核对。`T_*` 的数值不取固定上游值，而从项目实际 PHP 运行时读取，因为 [PHP Tokenizer 手册](https://www.php.net/manual/en/tokens.php)明确说明数值会随版本改变；没有可用运行时快照时只提供稳定的 `TOKEN_PARSE` 常量。`scripts/sync-phpstorm-tokenizer.mjs` 可复核名称清单，不复制上游说明文本。

Bzip2 的 10 个函数名来自固定修订的 [bz2/bz2.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/bz2/bz2.php)。PHP 7 与 PHP 8 参数名及最少参数数按本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 反射核对，失败返回值参照固定上游和 [PHP Bzip2 手册](https://www.php.net/manual/en/ref.bzip2.php)。`scripts/audit-phpstorm-stubs.mjs` 从固定 Git 树读取源码，稀疏 checkout 也可复核上游、运行时和内置声明的函数名；不复制上游说明文本。

Gettext 的 10 个函数名来自固定修订的 [gettext/gettext.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/gettext/gettext.php)，可用 `scripts/audit-phpstorm-gettext-source.mjs` 重新比对。参数名和必填数按本机 PHP 7.2／7.4／8.1／8.4／8.5 反射核对；`textdomain`、`bindtextdomain` 和 `bind_textdomain_codeset` 的省略参数边界按 [PHP 手册](https://www.php.net/manual/en/function.textdomain.php)、[bindtextdomain](https://www.php.net/manual/en/function.bindtextdomain.php) 与 [bind_textdomain_codeset](https://www.php.net/manual/en/function.bind-textdomain-codeset.php) 定为 8.4。缺少补丁版本区分时，PHP 8.0 对后两项维持不可传 `null` 的保守签名，不复制上游说明文本。

Exif 的五个 PHP 7 函数名与 `EXIF_USE_MBSTRING` 来自固定修订的 [exif/exif.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/exif/exif.php)。PHP 8 移除 `read_exif_data` 别名；参数名、默认值、引用输出及返回类型按本机 PHP 7.2／7.4／8.5 反射核对。Exif 缺席时按项目运行时扩展清单撤回候选；不复制上游说明文本。

PHP 7.x 旧 DOM 的 11 个类名及方法名与固定修订的 [dom_c.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/dom/dom_c.php) 和本机 PHP 7.2／7.4 反射核对。PHP 8 运行时不再导出这些类，内置摘要按版本撤回；参数形式按反射保守编写，不复制上游说明文本。

签名依据 PHP 官方手册中 Date/Time、Exceptions、SPL、Closure、数组排序、数组操作、PCRE 与 URL 字符串文档人工核对。除下述 Date、标准数组函数、Ctype、BCMath、cURL、Fileinfo、GD、Hash、iconv、Intl、MySQLi、OpenSSL、Sockets、Zip、Zlib 等名称目录外，stub 是本项目独立编写的声明摘要，不复制手册说明文本。

Date 扩展的 48 个过程式函数名从固定修订的 [date/date.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/date/date.php) 生成，17 个全局常量名与 [date/date_d.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/date/date_d.php) 和本机 PHP 7.2–8.5 运行时核对。参数名、类型、默认值和返回类型依据运行时反射生成；PHP 7 无原生签名的部分使用独立 PHPDoc 摘要。`DATE_ISO8601_EXPANDED` 从 PHP 8.2 起提供；`date_get_last_errors()` 在 PHP 8.2 前的实际返回收窄为 `array`。`timezone_transitions_get()` 的第三个参数默认值按本机 8.1–8.4 与 8.5 反射分别保留；详见 [PHP Date/Time 手册](https://www.php.net/manual/en/book.datetime.php)。

标准数组函数本轮选择的 35 个名称与固定修订的 [standard_8.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_8.php) 和 [standard_9.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_9.php) 核对；22 个数组选项常量名称与数值按本机 PHP 7.2/8.5 反射核对。`ksort` 等排序函数在 PHP 8.2 起返回 `true`，`array_multisort` 在 PHP 8.5 起返回 `true`；旧参数名与默认值按本机 PHP 7.2 反射及 [PHP 数组函数手册](https://www.php.net/manual/en/ref.array.php)核对。12 个比较器函数在 PHP 7 使用固定回调参数，PHP 8 按实际反射保留 `...$rest`，因此该版本的参数提示尚不能指出末尾回调位置；`current()` 等数组指针函数目前仍有数组元素类型传播限制，不能把模板返回值当成已实现的推断能力。

标准库时间与等待函数的 8 个名称从相同修订的 [standard_0.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_0.php)、[standard_3.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_3.php) 和 [standard_4.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_4.php) 核对；PHP 7.2／7.4／8.1／8.5 参数名和返回类型按本机反射。`hrtime` 从 7.3 起生成，PHP 7.2 不提供；旧版 `sleep` 的 `false` 失败返回按上游注释保留。

Stream Context 与过滤器的 13 个函数名从相同修订的 [standard_6.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_6.php) 和 [standard_9.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_9.php) 核对；三个 `STREAM_FILTER_*` 常量值按 PHP 7.2／8.5 反射核对。`stream_context_set_options()` 自 [PHP 8.3](https://www.php.net/manual/en/function.stream-context-set-options.php) 起提供；`stream_context_set_option()` 的两参数形式在 [PHP 8.4](https://www.php.net/manual/en/function.stream-context-set-option.php) 弃用。PHP 7.2、8.1、8.2、8.4、8.5 签名按本机反射，缺少的 8.3 运行时边界参照上游版本标签和 PHP 手册。

流 I/O、缓冲与状态查询的 16 个函数名从同一修订的 `standard_6.php`、[standard_8.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_8.php) 和 `standard_9.php` 核对；PHP 7.2／8.5 实际可用性及参数名按本机反射。固定上游还列有 PHP 8.6 的 `stream_copy_to_stream()`、`stream_is_local()` 新增 context 参数；当前支持至 8.5，故不加入。

Stream Socket 的 9 个函数名和 13 个选定常量分别从同一修订的 `standard_6.php`、[standard_defines.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_defines.php) 核对，并与 PHP 7.2／8.5 导出及数值比对。参数名和引用输出按运行时反射；`stream_socket_pair()` 在固定上游标注的 PHP 8.6 新 context 参数不进入当前版本。平台相关的 IPv6／Unix 域常量未固定写入通用摘要。

Stream Wrapper 与 Bucket 的 8 个名称从同一修订的 `standard_6.php`、`standard_9.php` 核对，`STREAM_IS_URL` 按 `standard_defines.php` 及 PHP 7.2／8.5 校验。`stream_bucket_new()` 旧版运行时返回 `stdClass`，8.4 起返回 [StreamBucket](https://www.php.net/manual/en/class.streambucket.php)；声明在旧版用通用 `object`，从 8.4 起用内置 `StreamBucket` 类。

标准库工具函数的 19 个名称从同一修订的 `standard_0.php`、`standard_4.php`、`standard_6.php`、`standard_7.php`、`standard_8.php` 核对；十个连接／图像常量从 `standard_defines.php` 选取，并按本机 PHP 7.2／7.4／8.1／8.5 反射核对。`pack()` 自 PHP 8.0 起不再返回 `false`；`highlight_string()` 自 PHP 8.4 起返回 `string|true`，分别参照 [PHP pack](https://www.php.net/manual/en/function.pack.php) 和 [highlight_string](https://www.php.net/manual/en/function.highlight-string.php) 手册。`IMAGETYPE_AVIF` 自 8.1、`IMAGETYPE_HEIF` 自 8.5 起提供。另三个平台相关函数 `strptime`、`sys_getloadavg`、`ftok` 分别从 `standard_0.php`、`standard_3.php`、`standard_9.php` 核对；运行时探测记录其实际可用性，项目内置声明据此过滤。`strptime` 自 [PHP 8.1](https://www.php.net/manual/en/function.strptime.php) 起弃用。

Date/Time 和 Closure 的本轮成员核对使用本机 PHP 7.2–8.5 反射及 [DateTimeZone](https://www.php.net/manual/en/class.datetimezone.php)、[DatePeriod](https://www.php.net/manual/en/class.dateperiod.php)、[Closure::getCurrent](https://www.php.net/manual/en/closure.getcurrent.php) 手册：`DateTimeZone` 分组常量全版本存在且 PHP 8.4 起带类型，`DatePeriod` 的七个声明属性从 PHP 8.2 起可见，`Closure::getCurrent()` 从 PHP 8.5 起提供。`RegexIterator::MATCH` 的运行时值与可用性也按反射核对；为绕开当前解析器对带类型关键字名称的漏读，摘要使用 `@var int` 和无原生类型声明。

Core 的过程式函数名另与固定上游 [Core 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/Core) 核对。`class_alias`、`get_called_class` 和 PHP 7 的 `each` 按本机 PHP 7.2–8.5 反射及官方手册手写签名；`exit`、`die`、`clone` 是保留语法，不能作为普通 PHP 函数声明生成。

Core 的 `Attribute`、`ReturnTypeWillChange`、`AllowDynamicProperties`、`Override` 等内置属性类也参照该固定目录；属性、常量值、构造签名及 PHP 8.0–8.5 边界按本机可用运行时反射和 [PHP Attribute 手册](https://www.php.net/manual/en/class.attribute.php)核对。PHP 8.5 新增 `Attribute::TARGET_CONSTANT`，并改变 `TARGET_ALL`、`IS_REPEATABLE` 的数值；`Override` 的属性目标从 8.5 起提供。固定上游 `Override` 还列出 PHP 8.6 的类常量目标，本项目当前支持至 8.5，故不引入该目标。

`ReflectionExtension`、`ReflectionZendExtension` 和 `ReflectionConstant` 的类名与公开方法清单参照同一修订的 [Reflection 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/Reflection)。签名和 PHP 7.2/8.1/8.4/8.5 边界按本机反射与 [PHP Reflection 手册](https://www.php.net/manual/en/book.reflection.php)核对：前两个类在所有受支持版本存在，旧版 `export` 在 PHP 8.0 移除；`ReflectionConstant` 从 8.4 起提供，该版为 final，8.5 起可继承并新增 `getFileName`、`getExtension`、`getExtensionName`、`getAttributes`。固定上游还列有 PHP 8.6 的 `inNamespace`，当前声明排除。

本轮继续核对该固定修订的 [Core](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/Core)、[Reflection](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/Reflection)、[SPL](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/SPL)、[standard](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard) 与 [filter](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/filter) 类型名称，补入 `ReflectionGenerator`、`ReflectionReference`、`InternalIterator`、`ClosedGeneratorException`、`RecursiveArrayIterator`、`__PHP_Incomplete_Class`、`php_user_filter`、`StreamBucket` 与 PHP 8.5 的 `Filter\FilterException`、`Filter\FilterFailedException`。版本、方法和继承签名依据本机 PHP 7.2–8.5 反射及相应 PHP 官方类手册独立核对；Filter 的命名空间类放在独立内置文档，并受扩展可用性过滤。

固定上游 Core 目录未列出 PHP 7.4 新增的 `get_mangled_object_vars()`；其 PHP 7.4 可用性、参数名和返回结构按 [PHP 官方手册](https://www.php.net/manual/en/function.get-mangled-object-vars.php)与本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射核对。PHP 7.4 的参数名为 `obj` 且没有原生类型，PHP 8 起使用 `object $object` 与 `array` 返回类型；返回键可能含数字和名称改写前缀，所以 PHPDoc 使用 `array<array-key, mixed>`。

Ctype 的 11 个函数名由 [JetBrains/phpstorm-stubs](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/ctype) 生成。详情及许可见 `THIRD_PARTY_NOTICES.md`；签名仍按 PHP 运行时手册审计。

PDO 的核心与驱动常量名称、`Pdo\Mysql`、`Pdo\Pgsql`、`Pdo\Sqlite` 成员名取自同一固定修订的 [PDO 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/PDO)，数值、签名及可用版本按本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射生成。`FETCH_GROUP`、`FETCH_UNIQUE`、`FETCH_CLASSTYPE`、`FETCH_PROPS_LATE`、`FETCH_SERIALIZE` 在 PHP 8.5 改值，因此旧版本采用运行时值。驱动常量与 PHP 8.4 起的驱动子类仅在项目 PHP 运行时确实加载相应扩展时加入；未探测运行时不猜测驱动能力。

Random 的 9 个过程式函数名与 11 个类型名称取自同一固定修订的 [random 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/random)。原有 `random_bytes`、`random_int` 保持独立手写声明；其余七个函数按 PHP 7.2/7.4/8.1/8.2/8.4/8.5 的运行时和官方手册核对。`Random\*` 类与接口方法按 PHP 8.2/8.4/8.5 反射生成；8.3 新增的 `IntervalBoundary`、`getFloat`、`nextFloat`、`getBytesFromString` 根据上游 `@since` 和官方手册补足版本边界。PHP 8.2 起 Random 扩展是 PHP 发行的一部分。

SQLite3 的 4 个类及其方法、类常量名称和 12 个全局常量名取自同一固定修订的 [sqlite3 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/sqlite3)。签名、常量值与可用版本按本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射生成；`SQLite3Exception` 从 8.3、`SQLite3Stmt::busy` 与 `SQLite3Result::fetchAll` 从 8.5 起提供。上游列有但本机 PHP 8.5 未导出的 `SQLite3Stmt::explain`、`setExplain` 暂不作为通用候选。项目运行时未加载 SQLite3 时不提供这些符号。

Phar 的 4 个类、126 个自有方法名和 16 个类常量名取自同一固定修订的 [Phar 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/Phar)。第 127 个自有方法 `Phar::getPath()` 由六个本机 PHP 运行时反射证实，但固定上游仅将它列于 `PharData`。签名、常量值与版本差异按 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射生成；`OPENSSL_SHA256` 和 `OPENSSL_SHA512` 从 PHP 8.1 起提供。项目运行时未加载 Phar 时不提供这些符号。

Sodium 的 141 个上游函数名及 `SODIUM_*` 常量目录来自同一固定修订的 [sodium 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/sodium)。PHP 8.1/8.2/8.4/8.5 反射实际导出 103/104 个函数；其余包括已移除旧别名及上游 PHP 8.6 API，不进入当前候选。旧版 7.2–8.0 使用上游标注过滤 8.1 Ristretto/XChaCha20 相关 API 和 8.2 新函数；本机 PHP 7.2/7.4 未安装 Sodium，无法提供旧版反射验证。项目 PHP 运行时可过滤实际函数和常量，并提供真实的 `SODIUM_LIBRARY_*` 值；无探测事实时不猜测库版本。同一运行时导出的 `PASSWORD_ARGON2_*` 属密码 API，不归入此 Sodium 目录。项目运行时未加载 Sodium 时不提供这些符号。

PCRE 的过程式函数和固定 `PREG_*` 常量已与同一固定修订的 [pcre 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/pcre) 及六个本机 PHP 运行时核对。上游 `PCRE_VERSION` 是与目标运行时不符的占位值；`PCRE_VERSION_MAJOR`、`PCRE_VERSION_MINOR` 和 `PCRE_JIT_SUPPORT` 也会随目标 PHP/PCRE 构建变化。这四项只按项目 PHP 运行时反射生成；本机 PHP 7.2 只导出 `PCRE_VERSION`，因此不补出其余三项。无探测事实时不猜测版本或 JIT 能力。

mbstring 的 79 个上游过程式函数名与同一固定修订的 [mbstring 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/mbstring) 核对；其中 14 个无下划线旧别名仅在 PHP 7 保留。固定上游将 `MB_ONIGURUMA_VERSION` 写为 `6.9.9`，本机 PHP 7.4–8.5 导出 `6.9.10`，因此该值仅由项目 PHP 运行时提供；PHP 7.2 不导出该常量。没有运行时事实时不提供伪造的空字符串版本。

BCMath 的 14 个函数名由同一修订的 [bcmath 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/bcmath) 生成；`BcMath\Number` 的公开方法清单也参照该固定修订。签名与版本边界仍按 PHP 手册审计。

iconv 的 11 个函数名由同一修订的 [iconv 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/iconv) 生成；签名按 PHP 手册审计。

Fileinfo 的 6 个过程式函数、5 个版本化类方法名和 11 个常量名来自同一修订的 [fileinfo 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/fileinfo)，签名按 PHP 手册及本机 PHP 7.2/8.1/8.2/8.4/8.5 反射核对。固定上游的 `FILEINFO_EXTENSION=2097152` 与五个运行时的 `16777216` 不一致，生成器采用运行时核对值；`FILEINFO_APPLE` 从 PHP 8.2 起生成。

Hash 的 20 个函数名与 40 个常量名及数值来自同一修订的 [hash 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/hash)，与本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 的导出结果核对。`HashContext` 自 PHP 7.2 起为对象，序列化方法从 PHP 8.0、调试方法从 PHP 8.4 起生成。PHP 7.2 的 `hash_hkdf` 反射参数名顺序与实际调用不一致，以实际调用和官方手册为准。`mhash*` 兼容函数可能因编译配置而缺席，运行时探测后过滤。

Zip 的 10 个过程式函数、52 个当前 `ZipArchive` 方法名、6 个属性名与 109 个固定常量值来自同一修订的 [zip 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/zip)。签名与本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射核对；上游的四个 PHP 8.6 方法在当前版本范围排除。`LIBZIP_VERSION` 随运行时变化，`ER_TRUNCATED_ZIP` 出现在本机运行时而不在固定上游，两者仅按项目运行时反射生成。运行时提供的类方法和常量清单也用于过滤其它 libzip/PECL zip 条件项；没有运行时事实时按固定目录提供常用候选，不能证明可选编译能力。

Zlib 的 31 个函数名与 25 个固定常量值来自同一修订的 [zlib 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/zlib)。签名与本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射核对。`gzgetss` 只在 PHP 7 提供；PHP 8 起 `InflateContext` 和 `DeflateContext` 是对象；PHP 8.3 起初始化选项允许对象；PHP 8.5 的 `gzfile`、`gzopen`、`readgzfile` include-path 参数为布尔值。`ZLIB_VERSION` 和 `ZLIB_VERNUM` 随运行时变化，只按项目运行时值生成。

Sockets 的 40 个函数名及 271 个数字常量名和值来自同一修订的 [sockets 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/sockets)。签名和平台常量与本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射核对；PHP 8.0 的资源转 `Socket`/`AddressInfo` 对象、PHP 8.3 的 `socket_atmark` 及 Windows 专用 `socket_wsaprotocol_*` 的边界按 PHP 官方手册核对。没有运行时信息时只给 10 个通用常量；运行时可用时使用其实际函数和常量清单。本机运行时还导出固定上游未列出的 `AI_IDN`、`AI_CANONIDN`，PHP 7 另有两个 PHP 8 已移除的 IDN 标志；这些值仅按运行时生成。

OpenSSL 的 64 个函数名和 70 个数字常量名及数值来自同一修订的 [openssl 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/openssl)。签名与本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射核对；PHP 7.3 `pkey_derive`、7.4 `x509_verify`、8.0 CMS 与对象句柄、8.2 `cipher_key_length`、8.5 CMS cipher 参数变化按官方手册补足边界。上游 `OPENSSL_VERSION_NUMBER` 与六个本机运行时不符，`OPENSSL_VERSION_TEXT` 和默认 cipher 列表同样依赖运行时，三者不取固定上游值。没有项目运行时事实时仅提供 12 个基本常量。

MySQLi 的 117 个函数名、116 个常量名和 6 个类的成员名来自同一修订的 [mysqli 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/mysqli)。签名与可用性按本机 PHP 7.2/7.4/8.1/8.2/8.4/8.5 反射生成；其中 10 个 PHP 5.4/5.5 已移除项及 PHP 8.6 的 `mysqli_quote_string` 不进入当前声明。`mysqli_result` 从 8.0 起实现 `IteratorAggregate`，`mysqli_fetch_column` 和 `mysqli_result::fetch_column` 从 8.1 起，`mysqli_execute_query` 与对应方法从 8.2 起。8.1 的 `mysqli_stmt::execute()` 数组实参由实际 mysqlnd 运行时参数个数决定。`MYSQLI_IS_MARIADB` 采用实际布尔运行时值；函数、类方法和常量可按项目运行时过滤。缺少运行时事实时排除客户端版本常量及 MariaDB 标志，不推测其值。

cURL 的 35 个函数名、701 个常量名及 72 个无运行时快照时使用的精选常量数值由同一修订的 [curl 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/curl) 生成；句柄类、版本边界和签名按 PHP 手册审计。项目运行时可用时，常量候选严格采用其实际导出的名称和值，不把上游全集当成所有平台都可用。`CURLOPT_INFILESIZE_LARGE` 是六个本机运行时均导出、但固定上游目录未列出的常量，仅在运行时实际导出时补充。没有运行时快照时保留原来的 72 项精选集。

GD 的 109 个函数名、89 个常量名与 50 个无运行时快照时的精选常量数值由同一修订的 [gd 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/gd) 生成；覆盖已安装 PHP 7.2–8.5 运行时的全部 GD 导出函数，包括仅限 PHP 7 的三个 WBMP 旧函数。项目运行时可用时，GD 常量按实际导出的 85–89 个名称和值生成，`GD_VERSION` 等字符串值不沿用上游占位值；无快照时仍提供 50 个精选项。资源、`GdImage`、`GdFont`、版本边界和签名按 PHP 手册及实际运行时核对。上游还含 7 个在支持版本之前已移除的 PostScript 函数和 2 个 Windows 专用截屏函数，暂不作为通用候选。

Intl `Locale`/`Normalizer` 的 24 对过程式函数与静态方法名称由同一修订的 [intl 目录](https://github.com/JetBrains/phpstorm-stubs/tree/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/intl) 生成。签名、类常量值及 PHP 7.3/8.0/8.5 边界按 PHP 手册与可用本机运行时核对；本次只覆盖这两个 Intl 类，不代表完整 Intl 扩展。上游的 `getDisplayKeyword` 相关函数未见于本机 PHP 8.5 运行时，未作为通用候选。

Intl grapheme/IDN 的 13 个函数名由同一目录生成；常量值、签名和版本边界按实际 PHP 运行时核对。上游 `grapheme_strrev` 在本机 PHP 8.5 不存在，因此未加入候选；固定上游的 `IDNA_DEFAULT=48` 与本机 PHP 7.2–8.5 运行时的 `0` 不一致，使用本机多版本验证的值。

Intl `Collator` 的 13 对过程式函数/方法名称与 24 个类常量值由同一目录生成；签名、PHP 8.4 `setStrength` 返回值及暂定返回类型按 PHP 手册与本机运行时核对。

Intl `NumberFormatter` 的 16 对过程式函数/方法名称与 83 个类常量值由同一目录生成；构造、工厂、解析、输出引用、失败返回和版本边界按 PHP 手册与本机运行时核对。`CURRENCY_ACCOUNTING` 自 PHP 7.4.1 且 ICU 53 起可用；项目运行时探测到该常量时按实际存在性显示或撤回。缺少运行时快照时，7.4 目标仍保守隐藏，8.0 起沿用版本后备判断。

Intl `IntlDateFormatter` 的 20 对过程式函数/方法名称与 12 个类常量值由同一目录生成；PHP 7.2/8.1/8.2/8.4/8.5 的签名及版本边界按实际运行时核对。PHP 8.4 新增的 `parseToCalendar()` 使用运行时原生 `int|float|false` 返回类型。上游仍列有 PHP 7.0 已移除的 `datefmt_set_timezone_id`，因此排除。PHP 7.2 的 `format` 和 `datefmt_set_lenient` 反射参数信息与实际可调用形式不一致，按实际调用与 PHP 手册建模。

Intl 全局错误 API 的 4 个函数名由同一目录生成；签名按 PHP 手册与本机运行时核对。

Intl `ResourceBundle` 的 6 对过程式函数/方法名称由同一目录生成；PHP 7.4 `Countable`、PHP 8.0 `IteratorAggregate`/`getIterator`、PHP 8.4 `get()` 参数及返回类型的变化按 PHP 手册与本机运行时核对。PHP 7.4 本机未启用 Intl，该版本边界以官方手册为准。

Intl `Transliterator` 的 7 对过程式函数/方法名称及两个类常量值由同一目录生成；PHP 8.1 `id` 属性类型、PHP 8.2 readonly、PHP 8.4 常量类型及 PHP 8.5 错误返回值按 PHP 手册与本机运行时核对。

Intl `MessageFormatter` 的 10 对过程式函数/方法名称由同一目录生成；PHP 7 历史参数名、PHP 8 原生签名、工厂的可空结果及格式化/解析失败返回按 PHP 手册与本机运行时核对。

Intl `IntlTimeZone` 的 25 对过程式函数/类方法名称及 11 个类常量值由同一目录生成；PHP 7.2/8.1/8.2/8.4/8.5 的反射结果已核对。PHP 7.2 本机只有两个 Windows ID 类方法而没有其过程式函数，按实际运行时建模；PHP 8.4 新增的 `getIanaID`/`intltz_get_iana_id` 还要求 ICU 74，已探测运行时缺少该函数时一并隐藏方法和函数，类方法使用原生 `string|false` 返回类型。上游非运行时拼写 `intltz_getGMT` 已排除。`IntlIterator` 的五个 Iterator 方法和 `IntlException` 继承关系也按固定上游与本机 PHP 7.2/8.1/8.2/8.4/8.5 核对，以承接枚举结果。

Intl `IntlCalendar`/`IntlGregorianCalendar` 的 49 个实际过程式函数、39 个类常量及类方法名称来自固定上游目录，并以本机 PHP 7.2/8.1/8.2/8.4/8.5 反射生成签名快照。上游 `intcal_get_maximum`、`intlcal_greates_minimum` 是非运行时拼写，排除。PHP 8.3 的 `setDate`/`setDateTime` 和 Gregorian 静态日期工厂以 PHP 官方手册补足本机缺少 PHP 8.3 运行时的版本边界；PHP 8.4 起常量带原生 `int` 类型。`FIELD_FIELD_COUNT` 受 ICU 版本影响，本机 PHP 7.2/ICU 69 为 23，其余审计运行时/ICU 74 为 24；现在仅按已探测的项目运行时值输出，未探测时不输出该常量。

Intl `Spoofchecker` 的 7 个方法与 19 个常量名称/数值来自固定上游目录，按 PHP 官方手册与本机 PHP 7.2/8.1/8.2/8.4/8.5 反射分段：`setRestrictionLevel` 和 6 个限制级别常量从 PHP 7.3 起，`setAllowedChars` 与另 6 个常量从 PHP 8.4 起；PHP 8.4 起类常量带原生 `int` 类型。

Intl `IntlBreakIterator`、`IntlRuleBasedBreakIterator`、`IntlPartsIterator` 与 `IntlCodePointBreakIterator` 的 30 个自身方法名称及 22 个类常量名称/数值来自固定上游目录；签名由本机 PHP 7.2/8.1/8.2/8.4/8.5 反射生成，并按 PHP 官方手册补足 PHP 8.0 接口切换及旧版默认参数。`IntlBreakIterator` 在 PHP 7 使用 `Traversable`，PHP 8 起使用 `IteratorAggregate` 并提供 `getIterator()`；`IntlPartsIterator::getRuleStatus()` 在 PHP 7.2 运行时不存在、在已审计的 PHP 8.1+ 运行时存在，PHP 8.0 暂按 8.1 快照建模。PHP 8.4 起类常量带原生 `int` 类型。

Intl `UConverter` 的 19 个方法名称及 41 个类常量名称/数值来自固定上游目录，并与本机 PHP 7.2/8.1/8.2/8.4/8.5 反射及 PHP 官方手册核对。PHP 7.2 的 `convert` 和 `reasonText` 反射把可选参数默认值报告为 `null`；按固定上游声明和手册保留 `false`、`0`。回调错误参数保留引用，PHP 8.4 起类常量带原生 `int` 类型。

Intl `IntlChar` 的 59 个静态方法名称与 666 个常量名称来自同一固定上游的独立 `intl/IntlChar.php`；签名和数值与本机 PHP 7.2/8.1/8.2/8.4/8.5 反射核对。PHP 8.4 新增三个属性常量并为类常量加原生类型；`enumCharNames` 在 PHP 8.3 起把失败结果由 `null` 改为 `false`。固定上游的 `UNICODE_VERSION` 和六个 Unicode 属性计数在 ICU 69/74 本机运行时存在 6–7 处差异，故只在运行时探测提供值时生成这七个常量；其余 659 个常量按已核对固定值生成。PHP 7 历史默认参数在反射为 `null` 但上游声明另有默认值时，按上游声明补正。

Intl `IntlDatePatternGenerator` 的三个方法名称来自固定上游独立目录，PHP 8.1 起提供；`IntlListFormatter` 的四个方法与六个常量名称/数值来自固定上游独立目录，PHP 8.5 起提供。已与本机 PHP 7.2/8.1/8.2/8.4/8.5 反射及 PHP 官方手册核对。`IntlListFormatter` 构造在 ICU 低于 67 或 locale 无效时可抛 `IntlException`；类本身仍按 PHP 8.5 版本生成。

- https://www.php.net/manual/en/ref.ctype.php
- https://www.php.net/manual/en/function.ctype-digit.php
- https://www.php.net/manual/en/book.bc.php
- https://www.php.net/manual/en/function.bcscale.php
- https://www.php.net/manual/en/function.bcdiv.php
- https://www.php.net/manual/en/function.bcmod.php
- https://www.php.net/manual/en/function.bcpowmod.php
- https://www.php.net/manual/en/function.bcdivmod.php
- https://www.php.net/manual/en/class.bcmath-number.php
- https://www.php.net/manual/en/book.iconv.php
- https://www.php.net/manual/en/book.fileinfo.php
- https://www.php.net/manual/en/book.hash.php
- https://www.php.net/manual/en/class.hashcontext.php
- https://www.php.net/manual/en/book.zip.php
- https://www.php.net/manual/en/class.ziparchive.php
- https://www.php.net/manual/en/zip.constants.php
- https://www.php.net/manual/en/function.iconv-substr.php
- https://www.php.net/manual/en/iconv.constants.php
- https://www.php.net/manual/en/book.curl.php
- https://www.php.net/manual/en/curl.resources.php
- https://www.php.net/manual/en/function.curl-upkeep.php
- https://www.php.net/manual/en/migration85.new-functions.php
- https://www.php.net/manual/en/book.image.php
- https://www.php.net/manual/en/class.gdimage.php
- https://www.php.net/manual/en/class.gdfont.php
- https://www.php.net/manual/en/function.imagecreatefromavif.php
- https://www.php.net/manual/en/function.imagerotate.php
- https://www.php.net/manual/en/function.imageloadfont.php
- https://www.php.net/manual/en/image.constants.php
- https://www.php.net/manual/en/class.locale.php
- https://www.php.net/manual/en/class.normalizer.php
- https://www.php.net/manual/en/migration73.new-functions.php
- https://www.php.net/manual/en/migration85.new-features.php
- https://www.php.net/manual/en/ref.intl.grapheme.php
- https://www.php.net/manual/en/ref.intl.idn.php
- https://www.php.net/manual/en/migration84.new-functions.php
- https://www.php.net/manual/en/class.collator.php
- https://www.php.net/manual/en/collator.setstrength.php
- https://www.php.net/manual/en/class.numberformatter.php
- https://www.php.net/manual/en/numberformatter.create.php
- https://www.php.net/manual/en/class.intldateformatter.php
- https://www.php.net/manual/en/intldateformatter.settimezone.php
- https://www.php.net/manual/en/migration70.incompatible.php
- https://www.php.net/manual/en/ref.intl.php
- https://www.php.net/manual/en/class.resourcebundle.php
- https://www.php.net/manual/en/resourcebundle.create.php
- https://www.php.net/manual/en/class.transliterator.php
- https://www.php.net/manual/en/transliterator.transliterate.php
- https://www.php.net/manual/en/class.messageformatter.php
- https://www.php.net/manual/en/messageformatter.create.php

- https://www.php.net/manual/en/book.datetime.php
- https://www.php.net/manual/en/class.datetimeinterface.php
- https://www.php.net/manual/en/class.datetime.php
- https://www.php.net/manual/en/class.datetimeimmutable.php
- https://www.php.net/manual/en/class.datetimezone.php
- https://www.php.net/manual/en/class.dateinterval.php
- https://www.php.net/manual/en/class.dateperiod.php
- https://www.php.net/manual/en/datetime.error.tree.php
- https://www.php.net/manual/en/datetime.createfromimmutable.php
- https://www.php.net/manual/en/datetime.createfrominterface.php
- https://www.php.net/manual/en/datetime.modify.php
- https://www.php.net/manual/en/dateinterval.createfromdatestring.php
- https://www.php.net/manual/en/dateperiod.createfromiso8601string.php
- https://www.php.net/manual/en/dateperiod.getrecurrences.php
- https://www.php.net/manual/en/language.exceptions.php
- https://www.php.net/manual/en/language.errors.php7.php
- https://www.php.net/manual/en/spl.exceptions.php
- https://www.php.net/manual/en/ref.spl.php
- https://www.php.net/manual/en/class.splfileinfo.php
- https://www.php.net/manual/en/class.splfileobject.php
- https://www.php.net/manual/en/class.spltempfileobject.php
- https://www.php.net/manual/en/splfileinfo.openfile.php
- https://www.php.net/manual/en/splfileobject.fgetcsv.php
- https://www.php.net/manual/en/splfileobject.fputcsv.php
- https://www.php.net/manual/en/splfileobject.fwrite.php
- https://www.php.net/manual/en/splfileobject.getcsvcontrol.php
- https://www.php.net/manual/en/spltempfileobject.construct.php
- https://www.php.net/manual/en/function.class-implements.php
- https://www.php.net/manual/en/function.class-parents.php
- https://www.php.net/manual/en/function.class-uses.php
- https://www.php.net/manual/en/function.iterator-apply.php
- https://www.php.net/manual/en/function.iterator-count.php
- https://www.php.net/manual/en/function.iterator-to-array.php
- https://www.php.net/manual/en/function.spl-autoload.php
- https://www.php.net/manual/en/function.spl-autoload-call.php
- https://www.php.net/manual/en/function.spl-autoload-extensions.php
- https://www.php.net/manual/en/function.spl-autoload-functions.php
- https://www.php.net/manual/en/function.spl-autoload-register.php
- https://www.php.net/manual/en/function.spl-autoload-unregister.php
- https://www.php.net/manual/en/function.spl-classes.php
- https://www.php.net/manual/en/function.spl-object-hash.php
- https://www.php.net/manual/en/function.spl-object-id.php
- https://www.php.net/manual/en/class.errorexception.php
- https://www.php.net/manual/en/class.compileerror.php
- https://www.php.net/manual/en/class.jsonexception.php
- https://www.php.net/manual/en/class.unhandledmatcherror.php
- https://www.php.net/manual/en/class.fibererror.php
- https://www.php.net/manual/en/function.request-parse-body.php
- https://www.php.net/manual/en/class.traversable.php
- https://www.php.net/manual/en/class.iterator.php
- https://www.php.net/manual/en/class.iteratoraggregate.php
- https://www.php.net/manual/en/class.arrayaccess.php
- https://www.php.net/manual/en/class.countable.php
- https://www.php.net/manual/en/class.generator.php
- https://www.php.net/manual/en/class.multipleiterator.php
- https://www.php.net/manual/en/multipleiterator.attachiterator.php
- https://www.php.net/manual/en/multipleiterator.setflags.php
- https://www.php.net/manual/en/class.weakreference.php
- https://www.php.net/manual/en/class.weakmap.php
- https://www.php.net/manual/en/class.stringable.php
- https://www.php.net/manual/en/class.unitenum.php
- https://www.php.net/manual/en/class.backedenum.php
- https://phpstan.org/blog/generics-in-php-using-phpdocs
- https://www.php.net/manual/en/book.spl.php
- https://www.php.net/manual/en/class.closure.php
- https://www.php.net/manual/en/function.sort.php
- https://www.php.net/manual/en/function.array-pop.php
- https://www.php.net/manual/en/function.array-shift.php
- https://www.php.net/manual/en/function.array-walk.php
- https://www.php.net/manual/en/function.usort.php
- https://www.php.net/manual/en/function.uasort.php
- https://www.php.net/manual/en/function.uksort.php
- https://www.php.net/manual/en/function.array-push.php
- https://www.php.net/manual/en/function.array-unshift.php
- https://www.php.net/manual/en/function.array-splice.php
- https://www.php.net/manual/en/function.shuffle.php
- https://www.php.net/manual/en/function.preg-match.php
- https://www.php.net/manual/en/function.preg-match-all.php
- https://www.php.net/manual/en/ref.pcre.php
- https://www.php.net/manual/en/pcre.constants.php
- https://www.php.net/manual/en/function.preg-filter.php
- https://www.php.net/manual/en/function.preg-grep.php
- https://www.php.net/manual/en/function.preg-last-error.php
- https://www.php.net/manual/en/function.preg-last-error-msg.php
- https://www.php.net/manual/en/function.preg-quote.php
- https://www.php.net/manual/en/function.preg-replace.php
- https://www.php.net/manual/en/function.preg-replace-callback.php
- https://www.php.net/manual/en/function.preg-replace-callback-array.php
- https://www.php.net/manual/en/function.preg-split.php
- https://www.php.net/manual/en/book.math.php
- https://www.php.net/manual/en/math.constants.php
- https://www.php.net/manual/en/enum.roundingmode.php
- https://www.php.net/manual/en/function.abs.php
- https://www.php.net/manual/en/function.acos.php
- https://www.php.net/manual/en/function.acosh.php
- https://www.php.net/manual/en/function.asin.php
- https://www.php.net/manual/en/function.asinh.php
- https://www.php.net/manual/en/function.atan.php
- https://www.php.net/manual/en/function.atan2.php
- https://www.php.net/manual/en/function.atanh.php
- https://www.php.net/manual/en/function.base-convert.php
- https://www.php.net/manual/en/function.bindec.php
- https://www.php.net/manual/en/function.ceil.php
- https://www.php.net/manual/en/function.cos.php
- https://www.php.net/manual/en/function.cosh.php
- https://www.php.net/manual/en/function.decbin.php
- https://www.php.net/manual/en/function.dechex.php
- https://www.php.net/manual/en/function.decoct.php
- https://www.php.net/manual/en/function.deg2rad.php
- https://www.php.net/manual/en/function.exp.php
- https://www.php.net/manual/en/function.expm1.php
- https://www.php.net/manual/en/function.fdiv.php
- https://www.php.net/manual/en/function.floor.php
- https://www.php.net/manual/en/function.fmod.php
- https://www.php.net/manual/en/function.fpow.php
- https://www.php.net/manual/en/function.hexdec.php
- https://www.php.net/manual/en/function.hypot.php
- https://www.php.net/manual/en/function.intdiv.php
- https://www.php.net/manual/en/function.is-finite.php
- https://www.php.net/manual/en/function.is-infinite.php
- https://www.php.net/manual/en/function.is-nan.php
- https://www.php.net/manual/en/function.log.php
- https://www.php.net/manual/en/function.log10.php
- https://www.php.net/manual/en/function.log1p.php
- https://www.php.net/manual/en/function.max.php
- https://www.php.net/manual/en/function.min.php
- https://www.php.net/manual/en/function.octdec.php
- https://www.php.net/manual/en/function.pi.php
- https://www.php.net/manual/en/function.pow.php
- https://www.php.net/manual/en/function.rad2deg.php
- https://www.php.net/manual/en/function.round.php
- https://www.php.net/manual/en/function.sin.php
- https://www.php.net/manual/en/function.sinh.php
- https://www.php.net/manual/en/function.sqrt.php
- https://www.php.net/manual/en/function.tan.php
- https://www.php.net/manual/en/function.tanh.php
- https://www.php.net/manual/en/ref.var.php
- https://www.php.net/manual/en/function.boolval.php
- https://www.php.net/manual/en/function.debug-zval-dump.php
- https://www.php.net/manual/en/function.floatval.php
- https://www.php.net/manual/en/function.get-debug-type.php
- https://www.php.net/manual/en/function.get-defined-vars.php
- https://www.php.net/manual/en/function.get-resource-id.php
- https://www.php.net/manual/en/function.get-resource-type.php
- https://www.php.net/manual/en/function.gettype.php
- https://www.php.net/manual/en/function.intval.php
- https://www.php.net/manual/en/function.print-r.php
- https://www.php.net/manual/en/function.settype.php
- https://www.php.net/manual/en/function.strval.php
- https://www.php.net/manual/en/function.var-dump.php
- https://www.php.net/manual/en/function.var-export.php
- https://www.php.net/manual/en/function.define.php
- https://www.php.net/manual/en/function.defined.php
- https://www.php.net/manual/en/function.constant.php
- https://www.php.net/manual/en/function.function-exists.php
- https://www.php.net/manual/en/function.get-defined-functions.php
- https://www.php.net/manual/en/function.get-defined-constants.php
- https://www.php.net/manual/en/function.get-loaded-extensions.php
- https://www.php.net/manual/en/function.extension-loaded.php
- https://www.php.net/manual/en/function.get-extension-funcs.php
- https://www.php.net/manual/en/book.info.php
- https://www.php.net/manual/en/info.constants.php
- https://www.php.net/manual/en/function.get-cfg-var.php
- https://www.php.net/manual/en/function.ini-get.php
- https://www.php.net/manual/en/function.ini-get-all.php
- https://www.php.net/manual/en/function.ini-set.php
- https://www.php.net/manual/en/function.ini-restore.php
- https://www.php.net/manual/en/function.get-include-path.php
- https://www.php.net/manual/en/function.set-include-path.php
- https://www.php.net/manual/en/function.restore-include-path.php
- https://www.php.net/manual/en/function.phpversion.php
- https://www.php.net/manual/en/function.php-sapi-name.php
- https://www.php.net/manual/en/function.php-uname.php
- https://www.php.net/manual/en/function.php-ini-scanned-files.php
- https://www.php.net/manual/en/function.php-ini-loaded-file.php
- https://www.php.net/manual/en/function.memory-get-usage.php
- https://www.php.net/manual/en/function.memory-get-peak-usage.php
- https://www.php.net/manual/en/function.memory-reset-peak-usage.php
- https://www.php.net/manual/en/function.ini-parse-quantity.php
- https://www.php.net/manual/en/function.assert.php
- https://www.php.net/manual/en/function.assert-options.php
- https://www.php.net/manual/en/function.cli-get-process-title.php
- https://www.php.net/manual/en/function.cli-set-process-title.php
- https://www.php.net/manual/en/function.dl.php
- https://www.php.net/manual/en/function.gc-collect-cycles.php
- https://www.php.net/manual/en/function.gc-disable.php
- https://www.php.net/manual/en/function.gc-enable.php
- https://www.php.net/manual/en/function.gc-enabled.php
- https://www.php.net/manual/en/function.gc-mem-caches.php
- https://www.php.net/manual/en/function.gc-status.php
- https://www.php.net/manual/en/function.get-current-user.php
- https://www.php.net/manual/en/function.get-magic-quotes-gpc.php
- https://www.php.net/manual/en/function.get-magic-quotes-runtime.php
- https://www.php.net/manual/en/function.get-included-files.php
- https://www.php.net/manual/en/function.get-resources.php
- https://www.php.net/manual/en/function.getenv.php
- https://www.php.net/manual/en/function.getlastmod.php
- https://www.php.net/manual/en/function.getmygid.php
- https://www.php.net/manual/en/function.getmyinode.php
- https://www.php.net/manual/en/function.getmypid.php
- https://www.php.net/manual/en/function.getmyuid.php
- https://www.php.net/manual/en/function.getopt.php
- https://www.php.net/manual/en/function.getrusage.php
- https://www.php.net/manual/en/function.phpcredits.php
- https://www.php.net/manual/en/function.phpinfo.php
- https://www.php.net/manual/en/function.putenv.php
- https://www.php.net/manual/en/function.set-time-limit.php
- https://www.php.net/manual/en/function.sys-get-temp-dir.php
- https://www.php.net/manual/en/function.version-compare.php
- https://www.php.net/manual/en/function.zend-thread-id.php
- https://www.php.net/manual/en/function.zend-version.php
- https://www.php.net/manual/en/function.parse-str.php
- https://www.php.net/manual/en/ref.strings.php
- https://www.php.net/manual/en/function.addcslashes.php
- https://www.php.net/manual/en/function.addslashes.php
- https://www.php.net/manual/en/function.chop.php
- https://www.php.net/manual/en/function.chr.php
- https://www.php.net/manual/en/function.chunk-split.php
- https://www.php.net/manual/en/function.convert-cyr-string.php
- https://www.php.net/manual/en/function.convert-uudecode.php
- https://www.php.net/manual/en/function.convert-uuencode.php
- https://www.php.net/manual/en/function.count-chars.php
- https://www.php.net/manual/en/function.crc32.php
- https://www.php.net/manual/en/function.crypt.php
- https://www.php.net/manual/en/function.fprintf.php
- https://www.php.net/manual/en/function.get-html-translation-table.php
- https://www.php.net/manual/en/function.hebrev.php
- https://www.php.net/manual/en/function.hebrevc.php
- https://www.php.net/manual/en/function.levenshtein.php
- https://www.php.net/manual/en/function.localeconv.php
- https://www.php.net/manual/en/function.md5.php
- https://www.php.net/manual/en/function.md5-file.php
- https://www.php.net/manual/en/function.metaphone.php
- https://www.php.net/manual/en/function.money-format.php
- https://www.php.net/manual/en/function.nl-langinfo.php
- https://www.php.net/manual/en/function.number-format.php
- https://www.php.net/manual/en/function.ord.php
- https://www.php.net/manual/en/function.printf.php
- https://www.php.net/manual/en/function.quoted-printable-decode.php
- https://www.php.net/manual/en/function.quoted-printable-encode.php
- https://www.php.net/manual/en/function.quotemeta.php
- https://www.php.net/manual/en/function.setlocale.php
- https://www.php.net/manual/en/function.sha1.php
- https://www.php.net/manual/en/function.sha1-file.php
- https://www.php.net/manual/en/function.similar-text.php
- https://www.php.net/manual/en/function.soundex.php
- https://www.php.net/manual/en/function.sscanf.php
- https://www.php.net/manual/en/function.str-decrement.php
- https://www.php.net/manual/en/function.str-getcsv.php
- https://www.php.net/manual/en/function.str-increment.php
- https://www.php.net/manual/en/function.str-repeat.php
- https://www.php.net/manual/en/function.str-rot13.php
- https://www.php.net/manual/en/function.str-shuffle.php
- https://www.php.net/manual/en/function.str-word-count.php
- https://www.php.net/manual/en/function.strchr.php
- https://www.php.net/manual/en/function.strcoll.php
- https://www.php.net/manual/en/function.strcspn.php
- https://www.php.net/manual/en/function.strip-tags.php
- https://www.php.net/manual/en/function.stripcslashes.php
- https://www.php.net/manual/en/function.stripslashes.php
- https://www.php.net/manual/en/function.stristr.php
- https://www.php.net/manual/en/function.strpbrk.php
- https://www.php.net/manual/en/function.strrchr.php
- https://www.php.net/manual/en/function.strspn.php
- https://www.php.net/manual/en/function.strstr.php
- https://www.php.net/manual/en/function.strtok.php
- https://www.php.net/manual/en/function.substr-compare.php
- https://www.php.net/manual/en/function.substr-count.php
- https://www.php.net/manual/en/function.substr-replace.php
- https://www.php.net/manual/en/function.utf8-decode.php
- https://www.php.net/manual/en/function.utf8-encode.php
- https://www.php.net/manual/en/function.vfprintf.php
- https://www.php.net/manual/en/function.vprintf.php
- https://www.php.net/manual/en/function.substr.php
- https://www.php.net/manual/en/function.strpos.php
- https://www.php.net/manual/en/function.str-contains.php
- https://www.php.net/manual/en/function.str-replace.php
- https://www.php.net/manual/en/function.explode.php
- https://www.php.net/manual/en/function.implode.php
- https://www.php.net/manual/en/function.sprintf.php
- https://www.php.net/manual/en/function.htmlspecialchars.php
- https://www.php.net/manual/en/function.str-split.php
- https://www.php.net/manual/en/function.strtr.php
- https://www.php.net/manual/en/ref.array.php
- https://www.php.net/manual/en/function.array-map.php
- https://www.php.net/manual/en/function.array-filter.php
- https://www.php.net/manual/en/function.array-search.php
- https://www.php.net/manual/en/function.array-merge.php
- https://www.php.net/manual/en/function.array-combine.php
- https://www.php.net/manual/en/function.array-chunk.php
- https://www.php.net/manual/en/function.array-rand.php
- https://www.php.net/manual/en/function.array-walk.php
- https://www.php.net/manual/en/function.array-is-list.php
- https://www.php.net/manual/en/function.array-key-first.php
- https://www.php.net/manual/en/function.array-key-last.php
- https://www.php.net/manual/en/function.array-find.php
- https://www.php.net/manual/en/function.array-find-key.php
- https://www.php.net/manual/en/function.array-any.php
- https://www.php.net/manual/en/function.array-all.php
- https://www.php.net/manual/en/function.array-first.php
- https://www.php.net/manual/en/function.array-last.php
- https://www.php.net/manual/en/function.iterator-to-array.php
- https://www.php.net/manual/en/function.iterator-count.php
- https://www.php.net/manual/en/function.is-iterable.php
- https://www.php.net/manual/en/book.classobj.php
- https://www.php.net/manual/en/function.get-class.php
- https://www.php.net/manual/en/function.get-parent-class.php
- https://www.php.net/manual/en/function.class-exists.php
- https://www.php.net/manual/en/function.interface-exists.php
- https://www.php.net/manual/en/function.trait-exists.php
- https://www.php.net/manual/en/function.enum-exists.php
- https://www.php.net/manual/en/function.method-exists.php
- https://www.php.net/manual/en/function.property-exists.php
- https://www.php.net/manual/en/function.is-a.php
- https://www.php.net/manual/en/function.is-subclass-of.php
- https://www.php.net/manual/en/function.get-class-methods.php
- https://www.php.net/manual/en/function.get-class-vars.php
- https://www.php.net/manual/en/function.get-object-vars.php
- https://www.php.net/manual/en/function.get-declared-classes.php
- https://www.php.net/manual/en/function.get-declared-interfaces.php
- https://www.php.net/manual/en/function.get-declared-traits.php
- https://www.php.net/manual/en/ref.var.php
- https://www.php.net/manual/en/function.is-countable.php
- https://www.php.net/manual/en/function.is-real.php
- https://www.php.net/manual/en/ref.json.php
- https://www.php.net/manual/en/json.constants.php
- https://www.php.net/manual/en/function.json-encode.php
- https://www.php.net/manual/en/function.json-decode.php
- https://www.php.net/manual/en/function.json-validate.php
- https://www.php.net/manual/en/function.json-last-error.php
- https://www.php.net/manual/en/function.json-last-error-msg.php
- https://www.php.net/manual/en/ref.filesystem.php
- https://www.php.net/manual/en/function.file-get-contents.php
- https://www.php.net/manual/en/function.file-put-contents.php
- https://www.php.net/manual/en/function.fopen.php
- https://www.php.net/manual/en/function.fclose.php
- https://www.php.net/manual/en/function.fread.php
- https://www.php.net/manual/en/function.fwrite.php
- https://www.php.net/manual/en/function.basename.php
- https://www.php.net/manual/en/function.dirname.php
- https://www.php.net/manual/en/function.pathinfo.php
- https://www.php.net/manual/en/function.realpath.php
- https://www.php.net/manual/en/function.glob.php
- https://www.php.net/manual/en/function.mkdir.php
- https://www.php.net/manual/en/function.unlink.php
- https://www.php.net/manual/en/function.rename.php
- https://www.php.net/manual/en/function.copy.php
- https://www.php.net/manual/en/function.serialize.php
- https://www.php.net/manual/en/function.unserialize.php
- https://www.php.net/manual/en/function.base64-encode.php
- https://www.php.net/manual/en/function.base64-decode.php
- https://www.php.net/manual/en/function.bin2hex.php
- https://www.php.net/manual/en/function.hex2bin.php
- https://www.php.net/manual/en/ref.url.php
- https://www.php.net/manual/en/url.constants.php
- https://www.php.net/manual/en/function.urlencode.php
- https://www.php.net/manual/en/function.urldecode.php
- https://www.php.net/manual/en/function.rawurlencode.php
- https://www.php.net/manual/en/function.rawurldecode.php
- https://www.php.net/manual/en/function.parse-url.php
- https://www.php.net/manual/en/function.http-build-query.php
- https://www.php.net/manual/en/function.get-headers.php
- https://www.php.net/manual/en/class.pdo.php
- https://www.php.net/manual/en/class.pdostatement.php
- https://www.php.net/manual/en/class.pdoexception.php
- https://www.php.net/manual/en/pdo.constants.php
- https://www.php.net/manual/en/function.password-hash.php
- https://www.php.net/manual/en/function.password-verify.php
- https://www.php.net/manual/en/function.password-needs-rehash.php
- https://www.php.net/manual/en/function.password-get-info.php
- https://www.php.net/manual/en/function.password-algos.php
- https://www.php.net/manual/en/password.constants.php
- https://www.php.net/manual/en/function.hash.php
- https://www.php.net/manual/en/function.hash-file.php
- https://www.php.net/manual/en/function.hash-hmac.php
- https://www.php.net/manual/en/function.hash-hmac-file.php
- https://www.php.net/manual/en/function.hash-equals.php
- https://www.php.net/manual/en/function.hash-algos.php
- https://www.php.net/manual/en/function.hash-hmac-algos.php
- https://www.php.net/manual/en/function.random-bytes.php
- https://www.php.net/manual/en/function.random-int.php
- https://www.php.net/manual/en/book.filter.php
- https://www.php.net/manual/en/filter.constants.php
- https://www.php.net/manual/en/function.filter-has-var.php
- https://www.php.net/manual/en/function.filter-input.php
- https://www.php.net/manual/en/function.filter-input-array.php
- https://www.php.net/manual/en/function.filter-var.php
- https://www.php.net/manual/en/function.filter-var-array.php
- https://www.php.net/manual/en/function.filter-list.php
- https://www.php.net/manual/en/function.filter-id.php
- https://www.php.net/manual/en/ref.errorfunc.php
- https://www.php.net/manual/en/errorfunc.constants.php
- https://www.php.net/manual/en/function.debug-backtrace.php
- https://www.php.net/manual/en/function.debug-print-backtrace.php
- https://www.php.net/manual/en/function.error-clear-last.php
- https://www.php.net/manual/en/function.error-get-last.php
- https://www.php.net/manual/en/function.error-log.php
- https://www.php.net/manual/en/function.error-reporting.php
- https://www.php.net/manual/en/function.get-error-handler.php
- https://www.php.net/manual/en/function.get-exception-handler.php
- https://www.php.net/manual/en/function.restore-error-handler.php
- https://www.php.net/manual/en/function.restore-exception-handler.php
- https://www.php.net/manual/en/function.set-error-handler.php
- https://www.php.net/manual/en/function.set-exception-handler.php
- https://www.php.net/manual/en/function.trigger-error.php
- https://www.php.net/manual/en/ref.outcontrol.php
- https://www.php.net/manual/en/outcontrol.constants.php
- https://www.php.net/manual/en/function.flush.php
- https://www.php.net/manual/en/function.ob-clean.php
- https://www.php.net/manual/en/function.ob-end-clean.php
- https://www.php.net/manual/en/function.ob-end-flush.php
- https://www.php.net/manual/en/function.ob-flush.php
- https://www.php.net/manual/en/function.ob-get-clean.php
- https://www.php.net/manual/en/function.ob-get-contents.php
- https://www.php.net/manual/en/function.ob-get-flush.php
- https://www.php.net/manual/en/function.ob-get-length.php
- https://www.php.net/manual/en/function.ob-get-level.php
- https://www.php.net/manual/en/function.ob-get-status.php
- https://www.php.net/manual/en/function.ob-implicit-flush.php
- https://www.php.net/manual/en/function.ob-list-handlers.php
- https://www.php.net/manual/en/function.ob-start.php
- https://www.php.net/manual/en/function.output-add-rewrite-var.php
- https://www.php.net/manual/en/function.output-reset-rewrite-vars.php
- https://www.php.net/manual/en/ref.funchand.php
- https://www.php.net/manual/en/function.call-user-func.php
- https://www.php.net/manual/en/function.call-user-func-array.php
- https://www.php.net/manual/en/function.create-function.php
- https://www.php.net/manual/en/function.forward-static-call.php
- https://www.php.net/manual/en/function.forward-static-call-array.php
- https://www.php.net/manual/en/function.func-get-arg.php
- https://www.php.net/manual/en/function.func-get-args.php
- https://www.php.net/manual/en/function.func-num-args.php
- https://www.php.net/manual/en/function.register-shutdown-function.php
- https://www.php.net/manual/en/function.register-tick-function.php
- https://www.php.net/manual/en/function.unregister-tick-function.php
- https://www.php.net/manual/en/ref.session.php
- https://www.php.net/manual/en/session.constants.php
- https://www.php.net/manual/en/function.session-abort.php
- https://www.php.net/manual/en/function.session-cache-expire.php
- https://www.php.net/manual/en/function.session-cache-limiter.php
- https://www.php.net/manual/en/function.session-commit.php
- https://www.php.net/manual/en/function.session-create-id.php
- https://www.php.net/manual/en/function.session-decode.php
- https://www.php.net/manual/en/function.session-destroy.php
- https://www.php.net/manual/en/function.session-encode.php
- https://www.php.net/manual/en/function.session-gc.php
- https://www.php.net/manual/en/function.session-get-cookie-params.php
- https://www.php.net/manual/en/function.session-id.php
- https://www.php.net/manual/en/function.session-module-name.php
- https://www.php.net/manual/en/function.session-name.php
- https://www.php.net/manual/en/function.session-regenerate-id.php
- https://www.php.net/manual/en/function.session-register-shutdown.php
- https://www.php.net/manual/en/function.session-reset.php
- https://www.php.net/manual/en/function.session-save-path.php
- https://www.php.net/manual/en/function.session-set-cookie-params.php
- https://www.php.net/manual/en/function.session-set-save-handler.php
- https://www.php.net/manual/en/function.session-start.php
- https://www.php.net/manual/en/function.session-status.php
- https://www.php.net/manual/en/function.session-unset.php
- https://www.php.net/manual/en/function.session-write-close.php
- https://www.php.net/manual/en/class.sessionhandler.php
- https://www.php.net/manual/en/class.sessionhandlerinterface.php
- https://www.php.net/manual/en/class.sessionidinterface.php
- https://www.php.net/manual/en/class.sessionupdatetimestamphandlerinterface.php
- https://www.php.net/manual/en/ref.network.php
- https://www.php.net/manual/en/network.constants.php
- https://www.php.net/manual/en/function.checkdnsrr.php
- https://www.php.net/manual/en/function.closelog.php
- https://www.php.net/manual/en/function.dns-check-record.php
- https://www.php.net/manual/en/function.dns-get-mx.php
- https://www.php.net/manual/en/function.dns-get-record.php
- https://www.php.net/manual/en/function.fsockopen.php
- https://www.php.net/manual/en/function.gethostbyaddr.php
- https://www.php.net/manual/en/function.gethostbynamel.php
- https://www.php.net/manual/en/function.gethostbyname.php
- https://www.php.net/manual/en/function.gethostname.php
- https://www.php.net/manual/en/function.getmxrr.php
- https://www.php.net/manual/en/function.getprotobyname.php
- https://www.php.net/manual/en/function.getprotobynumber.php
- https://www.php.net/manual/en/function.getservbyname.php
- https://www.php.net/manual/en/function.getservbyport.php
- https://www.php.net/manual/en/function.header.php
- https://www.php.net/manual/en/function.header-register-callback.php
- https://www.php.net/manual/en/function.header-remove.php
- https://www.php.net/manual/en/function.headers-list.php
- https://www.php.net/manual/en/function.headers-sent.php
- https://www.php.net/manual/en/function.http-clear-last-response-headers.php
- https://www.php.net/manual/en/function.http-get-last-response-headers.php
- https://www.php.net/manual/en/function.http-response-code.php
- https://www.php.net/manual/en/function.inet-ntop.php
- https://www.php.net/manual/en/function.inet-pton.php
- https://www.php.net/manual/en/function.ip2long.php
- https://www.php.net/manual/en/function.long2ip.php
- https://www.php.net/manual/en/function.net-get-interfaces.php
- https://www.php.net/manual/en/function.openlog.php
- https://www.php.net/manual/en/function.pfsockopen.php
- https://www.php.net/manual/en/function.request-parse-body.php
- https://www.php.net/manual/en/function.setcookie.php
- https://www.php.net/manual/en/function.setrawcookie.php
- https://www.php.net/manual/en/function.socket-get-status.php
- https://www.php.net/manual/en/function.socket-set-blocking.php
- https://www.php.net/manual/en/function.socket-set-timeout.php
- https://www.php.net/manual/en/function.syslog.php
- https://www.php.net/manual/en/ref.dir.php
- https://www.php.net/manual/en/dir.constants.php
- https://www.php.net/manual/en/class.directory.php
- https://www.php.net/manual/en/directory.close.php
- https://www.php.net/manual/en/directory.read.php
- https://www.php.net/manual/en/directory.rewind.php
- https://www.php.net/manual/en/function.chdir.php
- https://www.php.net/manual/en/function.chroot.php
- https://www.php.net/manual/en/function.closedir.php
- https://www.php.net/manual/en/function.dir.php
- https://www.php.net/manual/en/function.getcwd.php
- https://www.php.net/manual/en/function.opendir.php
- https://www.php.net/manual/en/function.readdir.php
- https://www.php.net/manual/en/function.rewinddir.php
- https://www.php.net/manual/en/function.scandir.php
- https://www.php.net/manual/en/ref.exec.php
- https://www.php.net/manual/en/function.escapeshellarg.php
- https://www.php.net/manual/en/function.escapeshellcmd.php
- https://www.php.net/manual/en/function.exec.php
- https://www.php.net/manual/en/function.passthru.php
- https://www.php.net/manual/en/function.proc-close.php
- https://www.php.net/manual/en/function.proc-get-status.php
- https://www.php.net/manual/en/function.proc-nice.php
- https://www.php.net/manual/en/function.proc-open.php
- https://www.php.net/manual/en/function.proc-terminate.php
- https://www.php.net/manual/en/function.shell-exec.php
- https://www.php.net/manual/en/function.system.php
- https://www.php.net/manual/en/ref.filesystem.php
- https://www.php.net/manual/en/function.chgrp.php
- https://www.php.net/manual/en/function.chmod.php
- https://www.php.net/manual/en/function.chown.php
- https://www.php.net/manual/en/function.clearstatcache.php
- https://www.php.net/manual/en/function.disk-free-space.php
- https://www.php.net/manual/en/function.disk-total-space.php
- https://www.php.net/manual/en/function.fileatime.php
- https://www.php.net/manual/en/function.filectime.php
- https://www.php.net/manual/en/function.filegroup.php
- https://www.php.net/manual/en/function.fileinode.php
- https://www.php.net/manual/en/function.filemtime.php
- https://www.php.net/manual/en/function.fileowner.php
- https://www.php.net/manual/en/function.fileperms.php
- https://www.php.net/manual/en/function.filetype.php
- https://www.php.net/manual/en/function.is-executable.php
- https://www.php.net/manual/en/function.is-link.php
- https://www.php.net/manual/en/function.is-uploaded-file.php
- https://www.php.net/manual/en/function.lchgrp.php
- https://www.php.net/manual/en/function.lchown.php
- https://www.php.net/manual/en/function.link.php
- https://www.php.net/manual/en/function.linkinfo.php
- https://www.php.net/manual/en/function.lstat.php
- https://www.php.net/manual/en/function.move-uploaded-file.php
- https://www.php.net/manual/en/function.readlink.php
- https://www.php.net/manual/en/function.realpath-cache-get.php
- https://www.php.net/manual/en/function.realpath-cache-size.php
- https://www.php.net/manual/en/function.rmdir.php
- https://www.php.net/manual/en/function.stat.php
- https://www.php.net/manual/en/function.symlink.php
- https://www.php.net/manual/en/function.tempnam.php
- https://www.php.net/manual/en/function.touch.php
- https://www.php.net/manual/en/function.umask.php
- https://www.php.net/manual/en/filesystem.constants.php
- https://www.php.net/manual/en/function.fdatasync.php
- https://www.php.net/manual/en/function.feof.php
- https://www.php.net/manual/en/function.fflush.php
- https://www.php.net/manual/en/function.fgetc.php
- https://www.php.net/manual/en/function.fgetcsv.php
- https://www.php.net/manual/en/function.fgets.php
- https://www.php.net/manual/en/function.fgetss.php
- https://www.php.net/manual/en/function.file.php
- https://www.php.net/manual/en/function.flock.php
- https://www.php.net/manual/en/function.fnmatch.php
- https://www.php.net/manual/en/function.fpassthru.php
- https://www.php.net/manual/en/function.fputcsv.php
- https://www.php.net/manual/en/function.fscanf.php
- https://www.php.net/manual/en/function.fseek.php
- https://www.php.net/manual/en/function.fstat.php
- https://www.php.net/manual/en/function.fsync.php
- https://www.php.net/manual/en/function.ftell.php
- https://www.php.net/manual/en/function.ftruncate.php
- https://www.php.net/manual/en/function.parse-ini-file.php
- https://www.php.net/manual/en/function.parse-ini-string.php
- https://www.php.net/manual/en/function.pclose.php
- https://www.php.net/manual/en/function.popen.php
- https://www.php.net/manual/en/function.readfile.php
- https://www.php.net/manual/en/function.rewind.php
- https://www.php.net/manual/en/function.set-file-buffer.php
- https://www.php.net/manual/en/function.tmpfile.php
- https://www.php.net/manual/en/class.arrayobject.php
- https://www.php.net/manual/en/class.arrayiterator.php
- https://www.php.net/manual/en/arrayobject.construct.php
- https://www.php.net/manual/en/arrayiterator.construct.php
- https://www.php.net/manual/en/arrayobject.exchangearray.php
- https://www.php.net/manual/en/arrayobject.uasort.php
- https://www.php.net/manual/en/class.splobjectstorage.php
- https://www.php.net/manual/en/splobjectstorage.seek.php
- https://www.php.net/manual/en/class.splfixedarray.php
- https://www.php.net/manual/en/splfixedarray.fromarray.php
- https://www.php.net/manual/en/splfixedarray.setsize.php
- https://www.php.net/manual/en/splfixedarray.wakeup.php
- https://www.php.net/manual/en/migration80.incompatible.php#migration80.incompatible.spl
- https://www.php.net/manual/en/migration85.deprecated.php
- https://www.php.net/manual/en/class.spldoublylinkedlist.php
- https://www.php.net/manual/en/class.splqueue.php
- https://www.php.net/manual/en/class.splstack.php
- https://www.php.net/manual/en/spldoublylinkedlist.push.php
- https://www.php.net/manual/en/spldoublylinkedlist.setiteratormode.php
- https://www.php.net/manual/en/splqueue.enqueue.php
- https://www.php.net/manual/en/class.splheap.php
- https://www.php.net/manual/en/class.splminheap.php
- https://www.php.net/manual/en/class.splmaxheap.php
- https://www.php.net/manual/en/class.splpriorityqueue.php
- https://www.php.net/manual/en/splheap.insert.php
- https://www.php.net/manual/en/splheap.recoverfromcorruption.php
- https://www.php.net/manual/en/splpriorityqueue.setextractflags.php
- https://www.php.net/manual/en/splpriorityqueue.extract.php
- https://www.php.net/manual/en/class.splobserver.php
- https://www.php.net/manual/en/class.splsubject.php
- https://github.com/php/php-src/blob/PHP-8.0/ext/spl/spl_observer.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/spl/spl_observer.stub.php
- https://www.php.net/manual/en/class.iteratoriterator.php
- https://www.php.net/manual/en/class.filteriterator.php
- https://www.php.net/manual/en/class.callbackfilteriterator.php
- https://www.php.net/manual/en/class.recursivefilteriterator.php
- https://www.php.net/manual/en/class.parentiterator.php
- https://www.php.net/manual/en/class.recursivecallbackfilteriterator.php
- https://www.php.net/manual/en/class.limititerator.php
- https://www.php.net/manual/en/class.norewinditerator.php
- https://www.php.net/manual/en/class.infiniteiterator.php
- https://www.php.net/manual/en/class.appenditerator.php
- https://www.php.net/manual/en/class.emptyiterator.php
- https://www.php.net/manual/en/class.recursiveiteratoriterator.php
- https://www.php.net/manual/en/class.cachingiterator.php
- https://www.php.net/manual/en/class.recursivecachingiterator.php
- https://www.php.net/manual/en/class.regexiterator.php
- https://www.php.net/manual/en/class.recursiveregexiterator.php
- https://www.php.net/manual/en/class.recursivetreeiterator.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/spl/spl_iterators.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/spl/spl_iterators.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/spl/spl_iterators.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/spl/spl_iterators.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/spl/spl_iterators.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/spl/spl_iterators.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/spl/spl_iterators.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/spl/spl_iterators.stub.php
- https://www.php.net/manual/en/class.directoryiterator.php
- https://www.php.net/manual/en/class.filesystemiterator.php
- https://www.php.net/manual/en/class.recursivedirectoryiterator.php
- https://www.php.net/manual/en/class.globiterator.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/spl/spl_directory.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/spl/spl_directory.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/spl/spl_directory.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/spl/spl_directory.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/spl/spl_directory.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/spl/spl_directory.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/spl/spl_directory.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/spl/spl_directory.stub.php
- https://www.php.net/manual/en/migration80.incompatible.php#migration80.incompatible.spl
- https://www.php.net/manual/en/doc.changelog.php
- https://www.php.net/ChangeLog-8.php
- https://www.php.net/manual/en/book.reflection.php
- https://www.php.net/manual/en/class.reflectionclass.php
- https://www.php.net/manual/en/class.reflectionfunctionabstract.php
- https://www.php.net/manual/en/class.reflectionmethod.php
- https://www.php.net/manual/en/class.reflectionproperty.php
- https://www.php.net/manual/en/class.reflectionparameter.php
- https://www.php.net/manual/en/class.reflectionclassconstant.php
- https://www.php.net/manual/en/class.reflectionattribute.php
- https://www.php.net/manual/en/class.reflectionenum.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/reflection/php_reflection.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/reflection/php_reflection.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/reflection/php_reflection.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/reflection/php_reflection.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/reflection/php_reflection.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/reflection/php_reflection.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/reflection/php_reflection.stub.php
- https://www.php.net/manual/en/book.mbstring.php
- https://www.php.net/manual/en/ref.mbstring.php
- https://www.php.net/manual/en/mbstring.constants.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/mbstring/mbstring.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/mbstring/mbstring.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/mbstring/mbstring.c
- https://github.com/php/php-src/blob/PHP-7.2/ext/mbstring/php_mbregex.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/mbstring/php_mbregex.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/mbstring/php_mbregex.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/mbstring/mbstring.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/mbstring/mbstring.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/mbstring/mbstring.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/mbstring/mbstring.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/mbstring/mbstring.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/mbstring/mbstring.stub.php
- https://www.php.net/manual/en/book.libxml.php
- https://www.php.net/manual/en/ref.libxml.php
- https://www.php.net/manual/en/libxml.constants.php
- https://www.php.net/manual/en/function.libxml-get-external-entity-loader.php
- https://www.php.net/manual/en/function.libxml-set-external-entity-loader.php
- https://www.php.net/manual/en/book.simplexml.php
- https://www.php.net/manual/en/class.simplexmlelement.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/libxml/libxml.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/libxml/libxml.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/libxml/libxml.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/libxml/libxml.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/libxml/libxml.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/libxml/libxml.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/libxml/libxml.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/libxml/libxml.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/libxml/libxml.stub.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/simplexml/simplexml.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/simplexml/simplexml.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/simplexml/simplexml.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/simplexml/simplexml.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/simplexml/simplexml.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/simplexml/simplexml.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/simplexml/simplexml.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/simplexml/simplexml.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/simplexml/simplexml.stub.php
- https://www.php.net/manual/en/book.xml.php
- https://www.php.net/manual/en/ref.xml.php
- https://www.php.net/manual/en/xml.constants.php
- https://www.php.net/manual/en/class.xmlparser.php
- https://www.php.net/manual/en/function.xml-parser-create.php
- https://www.php.net/manual/en/function.xml-parse-into-struct.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/xml/xml.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/xml/xml.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/xml/xml.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/xml/xml.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/xml/xml.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/xml/xml.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/xml/xml.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/xml/xml.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/xml/xml.stub.php
- https://www.php.net/manual/en/book.xmlreader.php
- https://www.php.net/manual/en/class.xmlreader.php
- https://www.php.net/manual/en/book.xmlwriter.php
- https://www.php.net/manual/en/class.xmlwriter.php
- https://www.php.net/manual/en/ref.xmlwriter.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/xmlreader/php_xmlreader.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/xmlreader/php_xmlreader.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/xmlreader/php_xmlreader.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/xmlreader/php_xmlreader.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/xmlreader/php_xmlreader.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/xmlreader/php_xmlreader.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/xmlreader/php_xmlreader.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/xmlreader/php_xmlreader.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/xmlreader/php_xmlreader.stub.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/xmlwriter/php_xmlwriter.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/xmlwriter/php_xmlwriter.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/xmlwriter/php_xmlwriter.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/xmlwriter/php_xmlwriter.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/xmlwriter/php_xmlwriter.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/xmlwriter/php_xmlwriter.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/xmlwriter/php_xmlwriter.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/xmlwriter/php_xmlwriter.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/xmlwriter/php_xmlwriter.stub.php
- https://www.php.net/manual/en/book.dom.php
- https://www.php.net/manual/en/dom.constants.php
- https://www.php.net/manual/en/class.domnode.php
- https://www.php.net/manual/en/class.domdocument.php
- https://www.php.net/manual/en/class.domelement.php
- https://www.php.net/manual/en/class.domxpath.php
- https://www.php.net/manual/en/function.dom-import-simplexml.php
- https://github.com/php/php-src/blob/PHP-7.2/ext/dom/php_dom.c
- https://github.com/php/php-src/blob/PHP-7.2/ext/dom/document.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/dom/php_dom.c
- https://github.com/php/php-src/blob/PHP-7.3/ext/dom/document.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/dom/php_dom.c
- https://github.com/php/php-src/blob/PHP-7.4/ext/dom/document.c
- https://github.com/php/php-src/blob/PHP-8.0/ext/dom/php_dom.stub.php
- https://github.com/php/php-src/blob/PHP-8.1/ext/dom/php_dom.stub.php
- https://github.com/php/php-src/blob/PHP-8.2/ext/dom/php_dom.stub.php
- https://github.com/php/php-src/blob/PHP-8.3/ext/dom/php_dom.stub.php
- https://github.com/php/php-src/blob/PHP-8.4/ext/dom/php_dom.stub.php
- https://github.com/php/php-src/blob/PHP-8.5/ext/dom/php_dom.stub.php
- https://www.php.net/manual/en/class.dom-node.php
- https://www.php.net/manual/en/class.dom-document.php
- https://www.php.net/manual/en/class.dom-htmldocument.php
- https://www.php.net/manual/en/class.dom-xmldocument.php
- https://www.php.net/manual/en/class.dom-element.php
- https://www.php.net/manual/en/class.dom-xpath.php
- https://www.php.net/manual/en/class.dom-tokenlist.php
- https://www.php.net/manual/en/ref.dom.php
- https://www.php.net/manual/en/class.fiber.php
- https://www.php.net/manual/en/class.sensitiveparameter.php
- https://www.php.net/manual/en/class.sensitiveparametervalue.php
- https://www.php.net/manual/en/class.reflectionfiber.php
- https://www.php.net/manual/en/reflectionfiber.gettrace.php
