# Symfony `@Bundle` 服务导入（2026-09-19）

## 目标

让传统 `@BundleName/Resources/config/...` 服务导入进入现有 YAML/XML/PHP 静态导入图，同时保持“不启动 Kernel、不执行项目 PHP、不按名称猜 vendor 路径”的边界。

## 证明链

1. framework-symfony 静态读取 `config/bundles.php` 中 `['all' => true]` 的 class-constant 键，或项目 `src/Kernel.php` / `app/AppKernel.php` 的 `registerBundles()` 顶层无条件 `yield new BundleClass()`。
2. Language Server 要求同一 bundle short name 只对应一个注册类，并通过已索引声明或 Composer PSR-4 得到唯一真实类文件。
3. 从注册类沿唯一父类链读取源码；链上不能声明 `getPath()` 或 `__construct()`，且必须最终到达 `Symfony\Component\HttpKernel\Bundle\Bundle`。后者避免遗漏构造器预设受保护 `$path` 的 Symfony 语义，因此资源根可严格对应基础 Bundle 的默认 `dirname(ReflectionObject::getFileName())` 路径。
4. `@BundleName/...` 的目标必须是 `.yaml`、`.yml`、`.xml` 或 `.php`，真实路径必须留在已证明的 bundle 根内；参数、glob、路径逃逸、重复 bundle 名和符号链接逃逸均不加载。
5. 导入继续沿用 32 层深度、循环去重、先导入后覆盖、来源缓存及 watcher 刷新规则。`config/bundles.php`、Kernel、已证明的 bundle 类或已导入配置变化都会重建服务目录。

环境专属 `bundles.php` 条目、条件内 Kernel yield、`yield from`、声明构造器、自定义或无法证明继承链的 `getPath()` 保持 unknown。PHP 路由配置中的 `@Bundle` 是另一条路由加载链，不由本次服务事实扩展代替。

## 验证

- framework-symfony 单元测试证明 `all => true` 和无条件 Kernel yield，排除 dev-only 条目、条件 yield、动态 key 与 `yield from`。
- 真实 stdio 冷/热测试从 XML 经 `@SharedBundle/Resources/config/bundled.php` 加载公开服务，Container 返回补全和 PHP 类型 References 均指向 bundle 配置；同目录但覆盖 `getPath()` 的 CustomBundle 和声明构造器的 ConstructedBundle 导入都不进入来源计数。
- Winstar 当前 `src/Kernel.php` 静态得到 14 个无条件 bundle 注册。当前服务配置没有 `@Bundle` 导入；`config/symfony/routes/dev/web_profiler.yaml` 的两个 `@WebProfilerBundle` PHP 路由资源保留给后续路由 PHP Configurator 增量。

完整仓库门禁、候选和安装证据在功能提交后补记。
