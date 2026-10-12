# 编辑器激活首次结果计时

从原正常扩展 `activate` 调用开始计时，激活 Promise 完成后立即打开生成项目的消费者文档，分别执行一次公开 Completion、Hover、Definition 查询并验证内容。采用已验证的原项目生成器；每轮核对实际 PHP 文件数、使用全新的工作区与用户目录，记录真实宿主/服务器 PID，结束后核对退出及夹具清理。

当前支持 Linux Core 和显式提供的源码扩展组合，PHP 目标从显式给定的真实 PHP 7.2–8.5 CLI 检出；默认 onDemand、1k/10k/50k 各五轮。可用 `--modes onDemand,progressive,experimental` 依次测量三种启用索引的模式，每种模式使用独立工作区。工具支持某项参数不等于该组合已取得验收，实际执行范围以报告为准。参数必须显式给定已有 VS Code Linux executable、PHP CLI 与新的输出目录。不会下载、安装、更新日常 Profile 或覆盖旧结果。Linux 运行需要 Python 3、Xvfb、xauth 和 xset；显示进程使用独立认证并核对自身命令身份后退出。

可选 `--profile /path/to/profile.json` 使用 schema 1 配置：`extensionsDirectory` 指向已有安装扩展目录，`developmentPaths` 是额外源码扩展目录数组；相对路径基于配置文件所在目录。每轮把安装扩展复制到新的隔离目录并逐项核对内容，正常启动时允许它们加载；源码扩展保持原路径。配置、扩展源码、实际链接目标及依赖加入输入摘要。拒绝重复扩展 ID 或额外 Core。首次查询之后核对组合中每个扩展的 ID、版本、加载路径并记录自然激活状态和宿主子进程，结束后核对退出。不会提前激活合作扩展或增加 PHP 查询；未由 PHP 工作区触发的扩展可能仍未激活，组合存在与首次 PHP 查询正确不代表其全部功能已验收。原 main 时钟、查询内容、断言和预算保持。

源码扩展输入摘要排除 `.git`、`.vscode-test`、`.vscode-test-results` 目录及历史 `.vsix`，保留实际运行文件、源码和依赖；已有安装扩展目录完整核对。旧编辑器下载与旧测试归档不参与当前源码扩展运行，不重复读取它们。报告记录此输入范围，首次查询的计时和校验不受影响。

组合场景在新建的隔离用户配置中关闭编辑器与扩展的自动更新及更新检查，宿主内核对实际配置值。每轮退出后再次核对八项已有安装扩展（或配置所提供的实际清单）的目录与原运行文件摘要，允许编辑器维护自己的根目录索引元数据。首次查询成功的原始响应与进程身份在组合清单校验前单独保留，后续版本或路径不符仍失败。不会修改来源扩展目录或日常用户配置。

从仓库根运行，例如使用本项目已经验证的运行环境：

```bash
node scripts/benchmark-editor-activation.mjs \
  --editor .vscode-test/vscode-linux-x64-1.140.0/code \
  --php /opt/remi/php85/root/usr/bin/php \
  --output .vscode-test/editor-activation-new \
  --python /home/jason/.pyenv/versions/3.11.9/bin/python3
```

单轮检查可追加 `--files 1000 --rounds 1`；该结果不替代默认五轮矩阵。不同 CLI 分别使用新的输出目录；PHP wrapper 与其 `PHP_BINARY` 指向的实际 executable 都记录摘要。输出与宿主证明核对实际 PHP 目标、配置的 CLI 和索引模式。`off` 关闭索引，不属于此工具要求跨文件首次结果的三种模式。`--help` 显示参数。`--editor` 指向 Linux VS Code 下载/安装目录中的实际 executable，同目录需有 `resources/app/package.json`。

输出目录保留 `result.json`、输入摘要、每轮首结果/部分失败、stdout/stderr、原始宿主日志及自有显示进程记录。发生首个功能、实际进程身份、运行资产或夹具失败时停止并保留结果；不自动重跑。冷索引原预算仅随记录保留，不把它重新定义为激活 SLO，也不混入热查询 P95 指标。

显示未通过认证、编辑器工作进程尚未启动时，也会先保留显示失败与实际进程清理证据；缺少 driver 文件不会覆盖原显示错误。此类失败没有首次 PHP 查询结果，已通过的先前轮次仍保留，整个预定矩阵保持失败。

自有显示进程在原五秒启动窗口内等待非空的实际 argv，并核对 executable 与进程启动 tick；通过独立认证后才启动测量子进程。终止前再次核对同一身份。身份不符时保留实际 PID、认证目录与失败记录；不会把空的启动期 `/proc/cmdline` 固定成身份，也不删除仍有活动进程使用的认证目录。

Linux 下可独立运行显示生命周期控制，不启动编辑器：

```bash
python3 scripts/benchmark-editor-activation/verify-owned-display.py \
  --evidence .vscode-test/display-empty-start-new --expect new-pass
python3 scripts/benchmark-editor-activation/verify-owned-display.py \
  --evidence .vscode-test/display-mismatch-new --expect cleanup-rejected
```

控制使用真实 Xvfb/xauth/xset，只注入一次空的初始身份读取；第二种另注入终止前的身份不符，确认终止守卫拒绝并保留资源。验证器保留直接创建的 Popen 句柄，最后独立核对真实身份并回收其自有显示进程及认证目录；这两项不替代编辑器矩阵。

测量通过隔离的 `package.json.main` 包装器调用原逐字不变的正常 bundle，并把测试宿主 context 代理为 Production context，向宿主返回原激活 Promise 与 API。该包装与代理在结果中明确标记；没有修改正常源码或运行资产，没有查询预热、结果轮询重试或强制 GC。结果属于该隔离场景的观测，不替代完整扩展组合、其它模式/版本/平台、自然 UI、全量索引、真实 WSL 或长期项目会话的验收。

原 15 次观测及前置失败见 [Linux 首结果报告](../../docs/php-language-toolchain/reports/linux-production-context-activation-first-results-2026-10-10.md)。
