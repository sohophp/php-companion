# phpstorm-stubs：图片元数据返回形状

2026-10-02。本轮限定 `getimagesize`／`getimagesizefromstring` 的已有声明，没有增加图像编辑或格式识别功能。

## 复现与修改

修改前 PHP 7.2／8.5 的两项语义用例都失败：只有 `array|false`，成功保护后没有结构化键信息。

在 `standard-utilities.ts` 为两函数补充 PHPDoc 形状，保留原生签名和失败 false；索引 0／1／2 为 int，mime 为 string，bits／channels 为可选 int。PHP 8.5 增加 width_unit／height_unit 字符串字段，并将索引 3 标为可选；旧版本索引 3 仍为 string。保持标准库所有者，显式关闭 GD 后仍可查询。

字段名称与固定 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_0.php`／`standard_8.php` ArrayShape 核对。可选 bits／channels 依据 [PHP 手册](https://www.php.net/manual/en/function.getimagesize.php)；8.5 单位及条件索引依据 [PHP 8.5.0 官方实现](https://raw.githubusercontent.com/php/php-src/php-8.5.0/ext/standard/image.c)，并与 [8.4.0](https://raw.githubusercontent.com/php/php-src/php-8.4.0/ext/standard/image.c)对照。没有复制说明文本或 C 实现。

## 本轮验证

- 七套实际 PHP：Linux 7.2／7.4／8.1／8.2／8.4／8.5，以及原生 Windows 8.5.11。使用脚本生成的 1×1 PNG／GIF 和无效内容；文件与字符串入口结果一致、失败返回 false。PNG 没有 channels；8.5 两平台返回 px 单位，旧版没有单位字段。Windows 未加载 GD，两个入口均成功。
- language-spec 全量 144/144、零跳过，14.20 秒；新增九版合同检查。
- 相关语义四文件 11/11、零跳过，8.18 秒；覆盖新形状及 pathinfo／stat／getrusage 原合同。新增图片用例证明成功保护、撤回与恢复、GD 禁用仍有效、数值宽度为 int，以及 8.5 索引 3 可为空。
- PHP 7.2／8.5 两项真实 LSP 通过，6.02 秒；未保存修改撤回／恢复，8.5 命名实参，磁盘保持原样。首次协议夹具遗漏 root bundle 所需的两个 WASM 参数，修正为客户端实际调用方式后通过；未改产品解析器。
- 当前根 Core 的 Linux 隔离编辑器宿主退出 0，两函数的三步保护切换和未保存磁盘保护通过。
- language-spec／Core 构建、扩展夹具 TypeScript noEmit 与定向 ESLint 通过；脚本补充 node:buffer 显式导入修复首次 lint 错误。

[原始结果、源码与官方对照哈希](phpstorm-stubs-image-size-shape-2026-10-02.json)。日志 `/tmp/sophp-stubs-image-size-*`。

本轮没有重跑完整语义或完整 stdio。此前 getrusage 的完整语义 1128 和更早的完整协议 443 都是历史构建证据；本轮不借用为当前全量。Windows 实际 PHP 调用不等于 Windows 编辑器宿主，真实 WSL UI 仍待用户使用。未打包、提交、推送或更新 Profile。
