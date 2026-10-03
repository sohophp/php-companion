# phpstorm-stubs Msgpack 接入（2026-10-01）

差集审计发现本机 PHP 8.5 已加载 Msgpack，但 SoPHP 尚未声明其四个过程式函数、两个类及常量。`scripts/sync-phpstorm-msgpack.mjs` 把固定 [JetBrains/phpstorm-stubs 修订](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/msgpack/msgpack.php)中的名称，与本机 PHP 7.4／8.1／8.5 的 Msgpack 3.0.1 反射对照。上游只列出 `OPT_PHPONLY`，另外两项选项常量依据三个运行时实际导出值加入。SoPHP 自行编写简短签名与 PHPDoc，不复制上游说明文字。

新增 `msgpack_serialize`、`msgpack_unserialize`、`msgpack_pack`、`msgpack_unpack`，以及 `MessagePack`、`MessagePackUnpacker` 的公开方法。`execute()` 第二参数保留可选引用；序列化结果和 `unpacker()` 的常用返回类型依据本机调用及 [扩展官方示例](https://github.com/msgpack/msgpack-php#readme)描述。构造参数与解包结果不猜测更细类型。按项目 PHP 运行时扩展列表或显式 `disabledExtensions` 撤回整组符号；无运行时事实时沿用项目现有的内置声明策略。

验证：固定上游与三个本机运行时核对通过；PHP 8.5 差集审计中 4/4 运行时函数均已覆盖，上游未归类名称为零。语言规范 121/121、真实 stdio LSP 定向测试、构建、受影响文件 ESLint 和四个版本的 PHP 语法检查通过。LSP 测试核对函数、类、常量的 Definition，实例方法补全及运行时撤回。在 Winstar2024 项目只读打开缓冲区交替 100 次输入函数／类前缀，目标每次出现，热查询 P95 17.55 ms、最大单次 406.67 ms；[机器结果](phpstorm-stubs-msgpack-benchmark-2026-10-01.json)。单次峰值不代表可见弹窗等待。

PHP 7.2／8.2／8.4 本机未加载该扩展，尚不能声称这些运行时版本的扩展签名经过实测。自动化不等于真实 WSL 编辑器验收；本轮未打包、提交、推送或更新 Profile。
