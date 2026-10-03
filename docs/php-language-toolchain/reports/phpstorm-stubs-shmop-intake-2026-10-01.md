# phpstorm-stubs Shmop 接入（2026-10-01）

固定 [JetBrains/phpstorm-stubs 的 shmop 目录](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/shmop/shmop.php)包含六个函数及 PHP 8 的 `Shmop` 类；此前本机 PHP 8.5 已导出这组函数，SoPHP 声明却未覆盖。`scripts/sync-phpstorm-shmop.mjs` 核对固定名称与本机 PHP 8.1／8.5 的函数签名、返回类型、类和常量。SoPHP 自写简短声明，不复制上游说明文字。

PHP 8 目标使用 `Shmop` 句柄、实际原生返回类型和从 8.0 起弃用的 `shmop_close()` 标记。PHP 7 目标用资源句柄及保守的失败返回 PHPDoc；`Shmop` 类不会出现。版本边界参考 [PHP Shmop 类](https://www.php.net/manual/en/class.shmop.php)、[shmop_read](https://www.php.net/manual/en/function.shmop-read.php)与[shmop_close](https://www.php.net/manual/en/function.shmop-close.php)官方文档。按项目实际 PHP 扩展可用性或显式 `disabledExtensions` 撤回整组候选。

验证：固定上游及 PHP 8.1／8.5 运行时核对通过，PHP 8.5 导出的 6/6 函数均被声明覆盖；语言规格 122/122、真实 stdio LSP 定向测试、设置清单单元测试、构建、受影响文件 ESLint 和四个目标版本生成声明的 PHP 语法检查通过。LSP 验证函数定义与签名提示，以及运行时卸载后的定义撤回。Winstar2024 只读打开缓冲区交替 100 次输入函数和类型前缀，目标均出现，热查询 P95 19.47 ms，最大单次 552.73 ms；[机器结果](phpstorm-stubs-shmop-benchmark-2026-10-01.json)。单次峰值及协议响应都不等于真实弹窗等待。

本机 PHP 7.2／7.4／8.2／8.4 未加载 Shmop，旧版扩展签名没有本机反射实测。自动化不等于已安装 Profile 的真实 WSL 验收；本轮未改 Winstar 文件、打包、提交或更新 Profile。
