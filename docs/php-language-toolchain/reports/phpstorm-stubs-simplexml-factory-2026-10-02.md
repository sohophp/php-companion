# phpstorm-stubs：SimpleXML 工厂的自定义子类

日期：2026-10-02。

## 缺口及修改

修改前 PHP 7.2／8.5 的 simplexml_load_string 自定义类参数都只推断为 SimpleXMLElement|false，子类方法缺席。现在 load_string、load_file、import_dom 三个入口用有界 class-string<T> 合同保留可证明的子类，分别保留 false、false、null 失败分支。没有读取 XML 内容猜测属性或类型。

通用语义层修正：nullable class-string 参数可细化原生 nullable string；省略的 class-string 模板参数可用合法的 ::class 默认值证明绑定，名称在声明作用域解析，调用方同名类型不能覆盖；条件返回的已选择分支不依赖模板时允许返回，而仍包含未绑定模板名称的结果拒绝，不把 T 当成普通类。默认原生签名和参数值保持。

既有数组返回失败检查对当前 PHP 8.5 的 203 个相邻 PHPDoc／原生 false 声明做了只读核对，没有发现更多漏写 false 的数组文档；此数不是全签名或所有版本审计。

依据：[固定上游 SimpleXML 声明](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/SimpleXML/SimpleXML.php)、[PHP 官方加载文档](https://www.php.net/manual/en/function.simplexml-load-string.php)。模板合同独立编写，不复制说明文本。固定上游声称 PHP 7 DOM 失败为 false，本机 PHP 7.2／7.4 的无效 DOMComment 实际返回 null，本轮保持有运行时证据的现有 null 合同，没有盲从上游。

## 验证

| 检查 | 结果 |
| --- | --- |
| PHP 7.2／7.4／8.1／8.2／8.4／8.5 实际运行 | 三入口均实例化自定义类并调用子类方法；省略／null 类参数得到基类；字符串／文件失败 false、无效 DOM 节点 null |
| language-spec 全量 | 132/132，零跳过 |
| semantic 全量 | 44 文件、1123/1123，零跳过，48.24 秒 |
| 语义边界 | 子类替换、未知类字符串、默认参数、null、声明作用域别名、调用方同名类型与未绑定模板通过 |
| PHP 7.2／8.5 真实 stdio | 三入口未保存 Custom → Other → Custom → null 补全往返通过；两项通过，441 未选中，当前总量 443 |
| 隔离 Core Extension Host | 相同三入口与未保存往返、磁盘不变通过，退出 0 |
| 固定上游 SimpleXML 名称门禁 | 三个实际函数，未归类缺席／运行时缺席 0 |
| 100 次小样例预热语义补全 | P95 8.37 ms，最大 16.69 ms；非可见弹窗等待 |
| 构建、类型检查与相关 ESLint | 通过 |

最初全量有一项新测试错误地对 undefined 使用字符串匹配，修正断言后完整集合重新通过；没有放宽子类、作用域或候选准确性断言。结构化结果与当前源码／构建哈希见 [JSON](phpstorm-stubs-simplexml-factory-2026-10-02.json)。没有完整重跑当前 443 项 stdio，也没有宣称真人 WSL UI 已验收。未打包、提交、推送、发布或更新 Profile，长期路线图保持开放。
