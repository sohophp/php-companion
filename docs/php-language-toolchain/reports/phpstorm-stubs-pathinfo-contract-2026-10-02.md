# phpstorm-stubs：pathinfo 条件返回与键补全

日期：2026-10-02。优先处理现有 stubs 中影响日常补全的缺口，不升级固定上游。

## 修改

- 对照固定修订 standard/standard_1.php 的结构化字段，补齐 dirname、basename、extension、filename。默认或 flags/options 为 15 时返回数组形状，单组件返回 string；未知实参保留联合类型、不输出确定数组键。
- dirname 在空路径时缺席，extension 在无后缀时缺席，均为可选字段。字段值不按平台猜测。
- 修复旧声明把 PATHINFO_ALL 提供给 PHP 7 的问题；常量只在 PHP 8 输出。签名默认值统一用等价的 15，使既有条件类型求值可以处理省略的实参。
- 保留 PHP 7 options／PHP 8 flags 参数名；命名实参、常量别名、同名常量与用户函数遮蔽均有定向覆盖。来源和第三方许可记录同步更新。

依据：[固定上游](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_1.php)、[PHP 手册](https://www.php.net/manual/en/function.pathinfo.php)、[PHP 8.0 常量注册源码](https://github.com/php/php-src/blob/PHP-8.0/ext/standard/string.c)。六版本机实际调用进一步复核空路径、无扩展名、空扩展名、点文件、根目录及四个单组件结果。没有复制上游说明文本。

## 验证

| 项目 | 结果 |
| --- | --- |
| PHP 7.2／7.4／8.1／8.2／8.4／8.5 实际调用 | 六组通过，包括常量存在性 |
| language-spec 全量 | 130/130、零跳过 |
| semantic 全量 | 42 文件、1118/1118、零跳过，49.28 秒 |
| PHP 7.2／8.5 真实 stdio | 两项通过，437 项未选中；当前总量 439，不称全量通过 |
| 隔离 Core Extension Host | 四键补全、未保存改成单组件后撤回、改回全部后恢复、磁盘不变通过 |
| 固定上游 Standard 覆盖门禁 | 585 上游名称、545 本机函数；未归类缺席 0、运行时缺席 0 |
| 构建、类型检查及相关 ESLint | 通过 |

结构化结果与输入哈希见 [报告 JSON](phpstorm-stubs-pathinfo-contract-2026-10-02.json)。本轮没有重跑修改后的 439 项完整协议集合；之前 437 全量已经正常结束并归档，其证据属于修改前。隔离宿主检查的是实际 Provider，不代替真人 WSL 可见弹窗。没有打包、提交、推送、发布或更新 Profile。
