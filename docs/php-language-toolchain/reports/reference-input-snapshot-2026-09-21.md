# References 持久化复用：输入校验基础与成本

日期：2026-09-21。当前产品查询路径基线：`a9c34ac`。

## 已实现的校验基础

新增内部模块 `referenceInputSnapshot.ts` 和独立 `benchmark-reference-inputs.mjs`。它们尚未接入 References 的结果返回路径，不会直接向用户返回旧结果。

- 对调用方指定的全部 PHP 源码根、显式配置/依赖文件做内容 SHA-256，覆盖文件集合变化和不存在输入后来出现的情况。
- 对引擎/查询/配置上下文和未保存文档计算指纹；返回数据只含文件路径、摘要和总指纹，不含源码或配置内容。
- 文件打开后检查设备、inode、大小、纳秒级 mtime/ctime；读取后同时验证句柄与当前路径，扫描末尾重查文件集合及全部文件状态，拒绝扫描中发生的变更。
- 显式源码根可以是符号链接，其解析目标进入指纹；目录内部符号链接暂时拒绝复用，避免把未遍历区域当作完整输入。
- 文件数、单文件和总字节数均有上限，每批最多 32 个文件；分配和读取长度有界。取消、I/O 失败、预算超限或不完整遍历均返回不可复用。

7 项定向回归覆盖稳定输入、同长度且恢复 mtime 的依赖修改、增删移动、缺失路径后来出现、未保存编辑/上下文改变、取消/预算、符号链接，以及读取期间的内容/集合变化。TypeScript 与 ESLint 通过。该模块尚未接入线上路径，因此本轮没有重复已有全量语义/LSP 或打包验收。

## 真实项目发现

只读清点 Winstar 的全部 Composer 源码及依赖路径，得到 **54,907 个 PHP 文件、246,524,063 字节**。默认完整扫描 50,000 文件上限被触及，捕获返回不可复用，耗时约 1.838 秒；不能把该结果称为成功校验。

缩为项目源码根，额外指定 Composer 三份元数据、`Request.php` 与 `ParameterBag.php`，可以捕获 2,290 个文件。早期实现约 1.940 秒，最终有界读取实现为 1.694 秒，二者总指纹一致；以上为单次测量。该样本中的依赖是手工指定，**没有证明覆盖全部语义输入或 Provider 事实**。脚本明确输出 `semanticCoverageVerified: false`，不能据此启用缓存命中，也不能把校验耗时当 References 总延迟。

可复现命令（先构建 language-server 及其依赖）：

```sh
node scripts/benchmark-reference-inputs.mjs /var/www/php/8.5/winstar2024 project \
  /var/www/php/8.5/winstar2024/vendor/symfony/http-foundation/Request.php \
  /var/www/php/8.5/winstar2024/vendor/symfony/http-foundation/ParameterBag.php
```

## 接入前仍需完成

1. 从实际查询自动收集所有已消费依赖与尝试过但缺失/失败的路径；`hydrateCanonicalTypes()` 的候选上限、I/O 失败及已有语义工作区的来源都须显式处理。
2. 证明内存语义事实与捕获的磁盘/未保存来源一致；不能只检查返回的 112 处位置所在文件。
3. 定义随实际引擎构建变化的缓存身份、原子持久化格式和损坏回退，覆盖取消及查询中途编辑。
4. 核对独立 Symfony/其他 Provider 的权威输入及事实。仅在没有 Provider 的基准命中，不能据此宣称真实 Symfony Profile 获益。
5. 完成真实首次/Reload、文件编辑/新增/移动/删除、依赖与配置变化的结果位置回归，再考虑启用结果复用。

Goal 继续；首次查询约 9 秒的问题尚未解决，未冻结或安装新 WSL VSIX。
