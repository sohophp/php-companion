# 类型补全与自动导入排序验收

日期：2026-09-10。范围：PHP 类型补全候选的语义排序以及 VS Code LSP 顺序保持。

## 排序规则

1. 当前命名空间类型和已经导入的类型不需要新增编辑，排在自动导入候选之前。
2. 自动导入候选按与当前 namespace 的共同前缀段数降序排列。
3. 共同前缀相同时，按双方 namespace 到共同前缀的总距离升序排列。
4. 显示名称和完整 FQCN 提供稳定决胜顺序。

Language Server 按 semantic 的最终顺序生成单调 `sortText`。每个候选仍以 FQCN 作为 detail；需要导入的候选携带由统一 `importInsertion` 生成的 `additionalTextEdits`，已可见候选不产生重复 import。

## 精准边界

排序只使用可由当前索引证明的 namespace 和导入事实，不根据使用频率、未采集的历史或目录名称猜测。相同短类名可以同时显示，通过 FQCN 和各自准确 import 编辑区分；已有可见名称冲突继续由原有门禁抑制。

## 自动化证据

- semantic 全量：227/227；专项断言当前 namespace、已导入别名、相邻 namespace、同顶层远端和无共同前缀候选的完整顺序及 import 标记。
- language-server 全量：107/107；真实 stdio Composer 项目断言候选顺序、FQCN detail、`sortText` 和 `additionalTextEdits`。

- 仓库级 `pnpm check` 通过：十五个组件 489/489、根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建和内容检查同时通过。
- `pnpm verify:packages` 验证十五个组件 tarball 可在仓库外隔离消费者中安装运行。
- 同一主 VSIX 依次通过纯净 VS Code 1.137.0 和 Open Source Profile Extension Host，退出码均为 0，中间未重新打包。版本元数据网络查询超时后使用并校验已安装的 1.137.0，不影响宿主结果。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 与 VS Code Marketplace 发布未执行。
