# @php-companion/index

受资源预算和取消信号约束的 Composer PHP 源码扫描组件。扫描始终先完整收集根项目源码；项目自身超过预算时拒绝发布部分项目索引，只有依赖超限时才按稳定路径顺序截断，并分别报告 `projectComplete` 与全量 `complete`。扫描遵守根包及依赖各自的 exclude-from-classmap 规则，可复用版本化持久快照；组件不依赖 semantic 或编辑器 API，调用方决定快照内容，并可注入路径到 URI 的映射以保持 Remote 编辑器身份。
