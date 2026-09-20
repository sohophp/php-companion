# 提升属性候选扫描收窄

日期：2026-09-20

功能提交：`64ea40ded42c22b9f9d4d193718b40e94c302a98`

## 问题

final class 的 private 提升属性只能在声明类内部作为属性访问，但构造参数名称仍可能从其他项目文件通过命名参数引用。此前有界查询虽然不再启动完整项目索引，却会把所有包含同名文本的文件送入完整语义解析。真实 Winstar 的 `$urlGenerator` 因此解析 231 个文件，安装 bundle 的首次 References 为 12.624 秒。

## 实现边界

- private 提升属性的 References、Prepare Rename 和 Rename 只把 `name:` 命名参数词法候选送入语义层，再以构造器签名精确排除无关参数。
- 候选识别允许空白、块注释、行注释和 `#` 注释出现在参数名与冒号之间；最终结果仍由 PHP parser 与唯一构造器身份决定。
- 项目候选扫描以最多 16 个文件并发预取无缓存源码，但按确定性文件顺序提交语义更新；默认完整索引和持久缓存仍使用原串行路径。
- 类型、函数、公开/受保护成员和普通属性继续使用原有符号候选规则。

## 验证

- `@php-companion/index` 22 项通过；并发预取回归证明 callback 顺序保持 `A.php`、`B.php`、`C.php`，非法并发值被拒绝。
- Language Server 5 个文件 191 项通过。冷启动 stdio 用例使用跨文件 `dependency /* named */ : new \\stdClass()`，只解析 1 个候选并返回源文件 2 处、消费者 1 处编辑。
- 根扩展 44 项、全仓 TypeScript、ESLint、24 个隔离组件 tarball 和四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心和独立 Symfony VSIX，完整运行以 0 退出。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过。

真实 `src/Bridge/AdminSecuritySubscriber.php::$urlGenerator` 探针只读取结果，不应用编辑：

| 运行产物 | References | Prepare Rename | Rename | 语义候选 | 编辑数 | 全量索引日志/进度 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 优化前安装 bundle | 12.624 s | 544.38 ms | 502.25 ms | 231 | 3 | 0 |
| 最终源码构建 | 5.239 s | 26.78 ms | 21.37 ms | 4 | 3 | 0 |
| 最终 WSL 安装 bundle | 5.729 s | 27.62 ms | 22.47 ms | 4 | 3 | 0 |

Prepare/Rename 复用 References 已建立的同名候选 generation。单独首先执行 F2 时也使用相同的命名参数扫描，不会回退完整项目索引。

同一 WSL 安装同时加载独立 Symfony service/event Provider 后，从 `final class AdminSecuritySubscriber` 声明执行不含声明自身的 References：首次用时 7.529 秒，精确返回 `config/symfony/services.yaml` 的 `App\\Bridge\\` resource 注册和类内 `KernelEvents::CONTROLLER` 订阅关系两项，全量索引日志为 0。这证明类声明 References 不是依靠核心伪造框架关系，缺少 `sohophp.php-companion-symfony` 时相应框架位置会明确不可用。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-64ea40de/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `88c477d00f9f4fb497722674da66229e24ced554b1b6035d55e478de36e07462` |
| `php-companion-symfony-0.4.5.vsix` | `9b497ac83f1b19046215b1f42ea056d03825755e949e8a90cdeef5efd0192e4a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `f5a443b5c6cf2858aedb816dbfbdbc6cf2f3647f28698503f7ede90c36921fe6` |
| `php-companion-recommended-pack-0.4.5.vsix` | `3ddb62bb41563d94a601847aff05da6b5ea8cd83e1ef925d1ccb3f191863c026` |

候选 Language Server 已通过临时文件和原子 `mv` 覆盖 WSL RockyLinux8 的 0.4.5 安装；构建输出与安装目标 SHA-256 均为 `9842e798887117c08d1e768d38293b01b99efa21989b2a3b3bbec8c3ec3ee66d`。Alpha Profile 须执行 Reload Window 才会启动该进程。
