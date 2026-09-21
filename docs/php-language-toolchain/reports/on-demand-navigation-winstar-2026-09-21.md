# Winstar 按需导航与引用复核

日期：2026-09-21

## 验证范围

使用当前构建的 Language Server 真实 stdio 进程、`onDemand` 模式和独立 Symfony 扩展的 service/event Provider 描述符，对 Winstar PHP 8.5 项目的 `src/Bridge/AdminSecuritySubscriber.php` 连续执行冷进程与热缓存进程查询。审计脚本只读取项目文件；F2 请求只检查返回的 WorkspaceEdit，不应用编辑。临时索引缓存在退出时删除。

复跑：

```bash
node scripts/audit-real-on-demand-navigation.mjs /var/www/php/8.5/winstar2024
```

| 查询 | 冷进程 | 热进程 | 核对结果 |
| --- | ---: | ---: | --- |
| 类声明 References | 9.185 秒 | 5.030 秒 | 精确 2 处：`config/symfony/services.yaml:42`、`src/Bridge/AdminSecuritySubscriber.php:32` |
| 类声明 Definition | 11 毫秒 | 14 毫秒 | 返回声明 `src/Bridge/AdminSecuritySubscriber.php:20` |
| `$urlGenerator` References | 3.078 秒 | 2.942 秒 | 声明及使用共 3 处：24、51、58 行 |
| `$urlGenerator` Prepare Rename / Rename | 38 / 28 毫秒 | 26 / 22 毫秒 | 可重命名，返回 3 处编辑 |

两轮均未发出 `Indexing PHP symbols` 进度或 `[index:…] start` 全量索引日志。脚本对位置和编辑数执行精确断言，结果 `passed: true`。这说明当前代码在这些具体请求上没有复现早期“F2/References 一直在 Indexing”的行为；它不证明用户的 VS Code WSL Alpha Profile 已加载同一候选，也不替代多小时交互编辑、文件移动和扩展冲突验收。类引用中的 Symfony 服务/事件关系来自独立扩展，通用 PHP 声明和属性身份仍由核心判定。

加入精确位置断言后又独立复跑一次，仍为 `passed: true`；类 References 冷/热约 9.974/5.185 秒，属性 References 约 3.351/2.910 秒，全部位置与编辑数一致，全量索引事件仍为零。上述耗时是单次观测，不作为性能分位数承诺。

当前候选仍为 `artifacts/php-companion-alpha-0.4.5-a557e434/`；本次只增加审计脚本与报告，未改变产品 VSIX。下一步在实际 Alpha Profile 复核 Extension Host 的扩展所有权、默认索引模式、Reload 后的相同三项操作和 Safe Move；若 Profile 与真实 LSP 审计不一致，应先收集 PHP Companion Output 与已启用 PHP Provider 列表，再定位接线或设置差异。
