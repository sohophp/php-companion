# @php-companion/runtime-probe

通过受限的一次性 PHP CLI 进程读取实际版本、SAPI、已加载扩展和 INI 文件来源。探测使用参数数组直接执行可执行文件，不经过 shell；默认限制为 3 秒和 128 KiB 输出。调用方只能在探测成功且版本与项目目标一致时，把扩展缺失解释为运行时事实；失败、超时、畸形输出和版本不匹配均应保持 unknown。

组件不读取项目代码、不加载 Composer autoloader，也不启动 Symfony Kernel。它适合由 VS Code Extension Host 在本地、WSL、SSH 或 Dev Container 所在环境中调用，并可独立发布。

Windows 可执行文件发现支持 `Path`／`PATH` 和 `PATHEXT` 的大小写变体、含空格或双引号的 PATH 目录，以及显式的 `php.exe` 文件名。已带 PATHEXT 后缀的命令不再重复追加扩展名。发现 `.bat` 文件只证明路径存在，不代表 PHP 探测器能够执行该脚本。

PATH 搜索跳过同名目录；Linux 等 POSIX 环境还跳过没有执行权限的文件。符号链接按目标文件类型和执行权限检查，合法链接仍可用于 PHP 探测。显式路径同样检查这些条件，失败时保持运行时 unknown。

对已加载的 Zip 扩展，还读取 `ZipArchive` 的公开方法名与类常量值；语言规范会校验它们，再过滤 libzip/PECL zip 条件能力并使用当前 `LIBZIP_VERSION`。探测不实例化归档或访问项目文件。

对已加载的 Zlib 扩展，读取当前 `ZLIB_VERSION` 和 `ZLIB_VERNUM`；未探测到时语言规范不猜测这两个随运行时变化的值。

对已加载的 Sockets 扩展，读取函数和常量清单；语言规范据此过滤 Windows 专用函数以及操作系统、PHP 版本和编译选项相关常量。

对已加载的 cURL 扩展，读取实际导出的数字常量；语言规范按固定上游名称目录校验后提供目标 libcurl 和平台真正可用的候选，而不是把上游全集直接显示给所有项目。

对已加载的 GD 扩展，读取实际导出的数字和字符串常量，包括当前 `GD_VERSION`；语言规范据此过滤 PHP 版本与编译能力差异。

对已加载的 OpenSSL 扩展，读取函数与常量清单，特别保留当前 OpenSSL 库的版本号、版本文本和默认 cipher 列表；语言规范不使用固定上游的版本占位值。

对已加载的 MySQLi 扩展，读取实际导出的过程式函数、常量值、六个核心类的自有方法及 `mysqli_stmt::execute()` 参数个数；语言规范据此过滤客户端或编译条件相关的候选和参数提示。

对已加载的 PDO 扩展，读取 MySQL/PostgreSQL/SQLite 驱动常量及 PHP 8.4+ 驱动子类的自有方法和常量；语言规范只为项目实际加载的驱动提供这些候选。

对已加载的 Sodium 扩展，读取实际函数和常量清单。语言规范据此过滤目标 libsodium 缺席的候选，并只使用项目运行时的 `SODIUM_LIBRARY_*` 版本值。

对已加载的 PCRE 扩展，读取 `PCRE_VERSION`、主次版本和 JIT 支持常量；只把目标运行时实际导出的项传给语言规范。

对已加载的 mbstring 扩展，只有运行时实际定义 `MB_ONIGURUMA_VERSION` 时才读取它，避免固定上游版本值与目标 PHP 不一致。

对已加载的 Intl 扩展，探测 `NumberFormatter::CURRENCY_ACCOUNTING` 是否实际存在；PHP 7.4 目标可据此区分补丁版本及 ICU 编译条件。
