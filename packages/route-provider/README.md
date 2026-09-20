# @php-companion/route-provider

框架无关、可独立发布的 PHP Companion 路由事实契约。默认每次查询都请求一份完整快照；可信静态 Provider 可声明 `cacheUntilInvalidated: true`，由核心在 Provider/环境、磁盘 PHP/YAML 或打开文档快照变化时失效。每条路由必须包含实际路由名、路径及可导航的声明位置。

Provider 从 stdin 读取一个 JSON 请求，向 stdout 写一个 JSON 响应，诊断写到 stderr。它必须原样返回请求 ID，并使用同一 `providerId` 与 generation。核心不会发现或自动执行项目代码。
