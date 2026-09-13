# PCRE 内建目录验收

日期：2026-09-11

## 实现范围

`@php-companion/language-spec` 现在按 PHP 7.2–8.5 生成 PCRE 的十一项主函数：`preg_filter`、`preg_grep`、`preg_last_error`、`preg_last_error_msg`、`preg_match`、`preg_match_all`、`preg_quote`、`preg_replace`、`preg_replace_callback`、`preg_replace_callback_array` 与 `preg_split`。

`preg_match`/`preg_match_all` 在 PHP 7 目录也显式保留 `int|false`；过滤、普通替换和 callback 替换按 subject 的字符串/数组类型选择关联返回。`preg_grep` 以 `array<TKey,TValue>|false` 保留原输入键和值，`preg_split` 保留失败值及 offset-capture 可能产生的二元组。

目录包含匹配排列、offset、未匹配 null、split、grep 和七项错误码的稳定 `PREG_*` 常量。`PCRE_VERSION*` 与 `PCRE_JIT_SUPPORT` 取决于实际编译环境，因此没有伪造固定值。

## 版本边界

- `PREG_UNMATCHED_AS_NULL` 从首个目标 PHP 7.2 起存在。
- `preg_replace_callback` 与 `preg_replace_callback_array` 的 `$flags` 参数从 PHP 7.4 起生成。
- `preg_last_error_msg()` 只在 PHP 8.0+ 目录生成。
- PHP 7 保留 PHPDoc 失败返回，PHP 8 使用运行时原生 Union 返回。

## 精准语义

重载排名现在依次优先精确 scalar literal、对应 primitive 和宽泛 Union，因此 Filter 的常量 literal 重载与 PCRE 的字符串 subject 重载能够同时保持唯一。静态 array shape 面对 `array<TKey,TValue>` 重载时优先结构匹配，并把字符串/整数键与值绑定到模板后传播调用结果；无法证明的动态容器保持 unknown。

## 验证

- PHP 7.2、7.4、8.1、8.2、8.4、8.5 Reflection 对照了函数参数、返回类型、callback flags 与完整 `PREG_*` 常量集合。
- PHP 官方手册核对了十一项函数、错误返回、subject 关联返回及版本变更。
- language-spec 18 项、Semantic 230 项及 Language Server 114 项完整测试通过。
- 九个目标版本生成 stub 均为 0 个解析错误。
- `pnpm check` 完整通过：十五个组件 504 项、根扩展 33 项，共 537 项测试；TypeScript、ESLint 和三份 VSIX 内容检查同时通过。
- 十五个组件 tarball 已从隔离消费者安装并验证；最终 VSIX 已在 VS Code 1.137.0 的纯净配置和 Open Source Profile 中通过。Open Source Profile 同时加载 TwigPlus、Symfony Language Tools、YAML、PHP Debug、PHPUnit、PHP CS Fixer 与 EditorConfig；Symfony Language Tools 在宿主关闭阶段输出已知 EPIPE/流已销毁日志，但功能断言与宿主进程均以 0 退出。

## 候选制品

| 制品 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `595b7f5b7afeecd8aaa9a0821e1fdeb1ae1629a7936d571ec63705deda636d5d` |
| `php-companion-open-source-pack-0.4.5.vsix` | `ae2d95c46d305071c8e1467b8279e3d497ec75fbec1368edf60d40808c5a3246` |
| `php-companion-recommended-pack-0.4.5.vsix` | `750417de0515dd7d7d2a216929bae3ead7cf3a60ff49e7f1141b592fe27aa484` |

官方依据记录于 `packages/language-spec/SOURCES.md`。公开 npm 与 VS Code Marketplace 发布未执行。
