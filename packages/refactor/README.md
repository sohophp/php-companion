# @php-companion/refactor

PHP Companion 的编辑器无关重构计划组件。它建立带文档版本或内容哈希前置条件的文本编辑与文件操作，拒绝越界、重叠和冲突计划，并可在应用前检查工作区是否已经变化。接口方法生成、类型 Rename、PSR-4 Safe Move、Extract Variable、Extract Method、Inline Variable 与 private 未使用参数删除使用该计划后再由 adapter 转换成编辑器操作。组件只返回数据，不写磁盘，也不依赖 VS Code/LSP。
