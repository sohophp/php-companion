# 10 项 Open Source Pack 源码组合与 Symfony→Twig 编辑链

日期：2026-09-26。只使用独立临时 Composer 工作区和隔离 VS Code 1.139.1 Linux x64 Profile；未修改 Winstar 等业务项目，未生成 VSIX。

Core、Symfony、Open Source Pack 从当前仓库源码加载；TwigPlus 从 `/var/www/node/twig-plus/packages/vscode` 当前源码加载。隔离扩展目录只保留 Pack 的另外七个直接外部成员及 Apache 片段依赖：Red Hat YAML 1.24.0、XML 0.29.3、PHP Debug 1.40.1、PHP CS Fixer 扩展 0.3.21、EditorConfig 0.18.2、Apache Conf Snippets 1.4.0、PHP DocBlocker 2.7.0，以及 `mrmlnc.vscode-apache` 1.2.0。项目工具来自独立路径：PHP 8.5.9、PHP CS Fixer 3.91.2、PHPUnit 13.2.2。源码 Profile 入口新增可选 TwigPlus 开发路径，并在宿主断言实际加载路径，避免误用旧版已安装扩展。

完整 Open Source Profile 宿主先执行现有 PHP Definition/References、C2 未保存参数与联合数组形状反馈、Symfony YAML 服务、Twig/YAML/XML 格式化、PHP CS Fixer、EditorConfig、PHP Debug 和项目 PHPUnit CLI 链；随后附加命名 `render()`、`renderView()` 与独立 `#[Template]` 控制器的 Twig 变量补全、Definition、未保存改名、移除属性、Revert 与旧来源撤销。默认 `onDemand` 由 Pack manifest 提供。整轮 Extension Host 退出码 **0**，测试入口 `PHP_COMPANION_TEST_PROFILE_SOURCE=1 PHP_COMPANION_TEST_PROFILE_SYMFONY_CONTEXTS=1 node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js`，并提供隔离扩展目录、TwigPlus 源码目录及 PHP/格式化器/PHPUnit 路径环境变量。

启动仍输出 `[redhat.vscode-yaml]: Cannot register 'redhat.telemetry.enabled'`。隔离目录中 YAML 与 XML 扩展的 manifest 都声明该配置键，2026-09-24 既有 Pack 宿主日志也有相同提示；本轮 YAML/XML 格式化与完整宿主仍通过。该提示是两扩展共享设置键的组合噪声，不作为语言能力失败或消失的证据。

本结果证明当前源码在 10 项组合中可运行，不证明冻结 `15a5254` VSIX 已包含 Symfony/TwigPlus 新增量，也不代替真实 WSL Remote 的运行位置、可见弹窗和长会话验收。
