# 索引源码校验和复用验收

日期：2026-09-20。范围：复用 Composer 源码索引已经计算的 SHA-256，避免 Language Server 冷写入同一源码时再次 JSON 编码和哈希，同时保持缓存载荷恢复校验。

## 实现与完整性

- `@php-companion/index` 的 `IndexedSource` 和缓存恢复元数据现在携带扫描器对原始源码计算的 SHA-256。哈希与传给 `onSource` 的源码来自同一次读取。
- Language Server 冷写入只在磁盘源码与有效编辑内容相同时复用该哈希；打开且未保存的文档继续不写入以磁盘元数据为键的缓存。
- 持久记录使用原始源码字节的 SHA-256，缓存 wrapper 升至 schema 6，Language Server 版本升至 `semantic-v54`。旧 v53/schema 5 记录不会被误读，会保守重建一次。
- 热恢复仍对缓存内嵌源码重新计算 SHA-256，并继续分别验证声明、文件实现、每条 callable、派生层、Doctrine 事实和 envelope。错误但格式合法的预计算哈希会在恢复时被拒绝；预计算值格式不合法会在构造时抛出 `RangeError`。
- `@php-companion/index` 与 `@php-companion/language-server` 均记录 patch Changeset，可独立发布。功能提交为 `875ae43`。

## 基准

真实 Winstar project-only 冷/热可靠性基准连续运行两次：

| 轮次 | 冷索引 | 热恢复 | 文件 |
| --- | ---: | ---: | ---: |
| 1 | 46.816 s | 6.386 s | 2,275 |
| 2 | 46.816 s | 5.531 s | 2,275 |

两次均索引 9,528,897 bytes，冷启动缓存命中 0，热启动恢复 2,275/2,275，项目索引完整且无警告。上一候选同脚本为冷 47.172 秒、热 6.025 秒；冷索引稳定减少 0.356 秒（0.75%），与被移除的重复源码哈希成本相符。热恢复平均为 5.959 秒；恢复端仍保留内嵌源码重新哈希，不把单轮波动解释为算法收益。

10,000 文件持久缓存门禁结果：冷 18.343 秒、热 6.011 秒，热恢复 10,000/10,000，19,999 条 callable 实现记录；一次聚焦查询只加载 3 个文件，派生层和 callable 单条损坏均只重建 1 个文件。合成冷时间相对上一轮存在正常波动，因此不据此声明额外提升。

## 验证与候选

- index 27 项测试、Language Server 196 项完整测试及 2 项缓存专项测试通过；类型检查、相关 ESLint 和 `git diff --check` 通过。
- 24 个组件 tarball 完成仓库外安装/导入验证。
- 四份 VSIX 内容验证通过；VS Code 1.138.0 隔离 Profile 同时加载核心和独立 Symfony VSIX，打包 Extension Host 退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过，见 [Winstar JSON](alpha-preflight-winstar-source-checksum.json) 和 [CoreRepo JSON](alpha-preflight-corerepo-source-checksum.json)。

候选目录 `artifacts/php-companion-alpha-0.4.5-875ae43d/` 绑定完整提交 `875ae43d1292149e42741bf6745a4b96b49f2141`：

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `6eda8ba10c031d5dc134ea4ec038d4abcc5c54a9ad64ef637719c0c478895c7b` |
| `php-companion-symfony-0.4.5.vsix` | `a9af0dd2d3c7d65f8c89586cf00797b9f6d94ae3c4b8f5d602600f9c33940f9d` |
| `php-companion-open-source-pack-0.4.5.vsix` | `2a94909121b0b9ecad12bada835ee00813a8fe314042e45546b39c98e509e79d` |
| `php-companion-recommended-pack-0.4.5.vsix` | `910ab64813a0ce6f347d6e1a2d4a422984c1d5c9ea7be861c2485aed4c7c8456` |

核心与 Symfony VSIX 已覆盖安装到 WSL。已安装 Language Server 与构建输出 SHA-256 均为 `9d71108da37b06cb6c175078046d06fe629474e04ba44628196ba709fb628938`；Symfony extension bundle 均为 `1bb5d069e0214174d04c3555647676653956b2a290a8ac8dd8b4cf4c628b751a`。旧进程 `1896332` 终止后新进程 `1927080` 自动启动。

公开 npm/Marketplace 发布、Windows 客户端连接 WSL Remote 的人工归属检查，以及 Winstar/CoreRepo 各两小时真实编辑会话仍未执行。
