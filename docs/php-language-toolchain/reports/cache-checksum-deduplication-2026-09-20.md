# 持久缓存校验和去重

日期：2026-09-20

功能提交：`597be764e050141b768ffb4bd4826faa084d83af`

## 问题与实现

真实 Winstar 冷索引 CPU Profile 显示，持久缓存已经分别为源码、声明、文件级实现、每个 callable 实现、派生层和 Doctrine 事实计算 SHA-256，随后又把完整语义载荷序列化一次计算 envelope 校验和。后一次遍历不增加独立覆盖范围。

缓存 schema 5 改为对完整的分层校验和清单计算 envelope SHA-256：

- 每一层仍直接根据真实内容重新计算并验证；任意源码、声明、实现、callable、派生层或 Doctrine 事实变化都会拒绝缓存。
- envelope 校验和继续保护校验和清单本身；新增回归明确篡改 envelope 值并验证拒绝。
- Language Server 缓存版本升至 `semantic-v53`，旧 schema 4/v52 缓存不会被误读，而是保守重建。
- 不再为 envelope 第二次遍历和 JSON 序列化完整语义载荷。

## 性能与准确性

10,000 文件持久索引基准：

| 指标 | schema 4 | schema 5 | 变化 |
| --- | ---: | ---: | ---: |
| 冷索引 | 19.188 秒 | 18.251 秒 | -4.9% |
| 热恢复文件 | 10,000/10,000 | 10,000/10,000 | 不变 |
| callable 记录 | 19,999 | 19,999 | 不变 |
| 聚焦查询水合文件 | 3 | 3 | 不变 |
| 损坏层/记录重建 | 各 1 文件 | 各 1 文件 | 不变 |

真实 Winstar 项目文件基准使用相同 2,275 个文件、9,528,897 字节、类型目录和 20 个 References 抽样：

- 上一提交两次平均：47.766 秒。
- schema 5 两次为 46.649 秒、44.764 秒，平均 45.707 秒，再下降 4.3%。
- 相对最初脱离快照的 49.143 秒平均值，两个连续增量累计下降约 7.0%。
- 每次均得到 2,289 个类型和 117 个抽样引用位置。

单独使用真实 Winstar 持久目录执行冷/热可靠性探针，结果为 47.171 秒与 6.093 秒，热启动恢复 2,275/2,275 个文件。

## 回归与候选

- Language Server 5 个测试文件、196 项在同一次完整运行中全部通过。
- 首次完整运行有一个 nested Composer stdio 用例在 5.5 秒窗口超时；该用例随后单独通过，第二次完整 196 项运行也通过，没有产品断言差异。
- 相关 TypeScript/ESLint、24 个隔离 tarball 和四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；机器结果见 [Winstar JSON](alpha-preflight-winstar-cache-checksum.json) 与 [CoreRepo JSON](alpha-preflight-corerepo-cache-checksum.json)。

候选目录：`artifacts/php-companion-alpha-0.4.5-597be764/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `8e4c669ef784025e3986dece8a6dba7ed10a1543e1d50ec07ee320b266a39b05` |
| `php-companion-symfony-0.4.5.vsix` | `44941860c9a6001a26ebbe9982e7427f02aca05f61ba5c55dadf24d3b6af16c7` |
| `php-companion-open-source-pack-0.4.5.vsix` | `10d58976e7c033ddda6a6b4b1a6cc2c014f9fb65b986be52d6c364f9c8d334d6` |
| `php-companion-recommended-pack-0.4.5.vsix` | `89dc6dc8bc15f2950b4d45e12d6db3d99de361a8ddaf0dfc1978b613d1bb1c0a` |

核心与独立 Symfony 候选已覆盖安装到 WSL RockyLinux8。候选包与安装目录中的 `dist/language-server.js` SHA-256 均为 `731a66affbd0ee99c4abc00c3e89d9708db752c0befbe5a77101307e677a2285`；旧进程终止后，VS Code Extension Host 已自动启动新语言服务器进程。
