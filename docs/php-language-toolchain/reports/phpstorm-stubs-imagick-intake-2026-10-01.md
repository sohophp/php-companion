# phpstorm-stubs Imagick 接入（2026-10-01）

Winstar 的 Composer 依赖明确要求 `ext-imagick`，源码直接使用 `Imagick`、`ImagickDraw` 和 `ImagickPixel`。SoPHP 现在提供这三个类以及 `ImagickPixelIterator`、`ImagickKernel` 和五个异常类；缺少扩展时整组撤回。

固定 JetBrains/phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 提供名称参照。`scripts/sync-phpstorm-imagick.mjs` 从六个本机 PHP 运行时反射生成三份不同的实际签名／常量快照。PHP 7.2／7.4／8.1 链接 ImageMagick 6.9.13，`Imagick` 含 373 个方法与 583 个常量；PHP 8.2／8.4／8.5 链接 ImageMagick 7.1.2，含 398 个方法与 628 个常量。其余四个主类的方法数量在六版中一致。固定上游 `Imagick` 只列出 370 个方法和 628 个常量，不能直接当作某一项目运行时的完整候选。

项目运行时探测扩展版本、ImageMagick 版本号和方法名称／常量值指纹。三项与已审计快照一致时使用该快照；未知构建退回本机快照共有的 348 个 `Imagick` 方法和 323 个值一致的常量。这个后备只表明本机样本一致，不能证明其它平台的常量值相同。签名参数名、必填数、引用方式、默认值与 PHPDoc 类型来自反射；`Imagick` 的 `Iterator`／`Countable` 和 `ImagickPixelIterator` 的 `Iterator` 关系保留。

六版运行时指纹与快照一致、六版 `php -n -l` 和解析器零错误；语言规格、运行时探测及真实 stdio LSP 的 ImageMagick 7→6→卸载切换测试通过。通用编辑热补全 P95 2.44 ms、热成员补全 P95 6.48 ms，低于 150 ms 预算；该基准不是 Imagick 专项 UI 测量。实际 WSL 编辑器候选仍待人工使用反馈。源码未打包、安装或更新 Profile。
