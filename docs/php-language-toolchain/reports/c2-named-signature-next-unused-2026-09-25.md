# C2 命名实参后高亮下一个未填写参数

日期：2026-09-25。独立 PHP 夹具，未修改业务项目或打包 VSIX。

复现：`configure(string $host, int $port, bool $tls)` 的调用输入到 `configure(tls: true, ` 时，原 Signature Help 仅按逗号序号高亮 `$port`，但 `$host` 是第一个尚未填写的参数。`configure(host: 'local', tls: true, ` 则应高亮 `$port`。输入 `fi` 等唯一参数名前缀时，也应高亮它匹配的参数，而不是逗号所在的位置。

修复：参数上下文按已输入的位置实参和命名实参标记被占用的参数；当前已写出的名称优先，其次选择唯一匹配的名称前缀，再选择第一个未占用参数。无剩余参数时把高亮限制在签名参数范围内。补全使用的命名实参集合与签名高亮由同一段上下文继续产生。

随后复核补全发现相邻缺口：`configure('local', ` 已经通过位置实参填写 `$host`，原补全仍建议 `host:`；`configure('local', tls: true, ` 也仍建议 `host:`。现在参数上下文把此前位置实参对应的参数名一并交给补全过滤：前者只建议 `port:` 和 `tls:`，后者只建议 `port:`。命名实参填过的参数仍按原规则排除；未保存地改变调用形态后，列表立即按新内容更新。

验证：语义测试 388/388，覆盖先填末尾参数、两个命名参数、位置参数后接命名参数，以及既有的嵌套调用；真实 stdio 在 PHP 8.5 `onDemand` 下完成未保存调用修改前后的高亮校验；VS Code 1.139.0 Linux x64 隔离 C2 源码宿主通过 `vscode.executeSignatureHelpProvider` 看到正确的 `$host` 高亮，整段 C2 宿主退出码 0。相关 TypeScript、ESLint 与 `git diff --check` 通过。安装 VSIX、WSL Remote 和持续使用仍属于 C4 验收。

补全过滤增量再次通过语义测试 388/388、真实 stdio 的三种调用形态及版本 1→2→3 变更、VS Code `vscode.executeCompletionItemProvider` 的未保存混合实参场景；C2 源码宿主整段退出码 0。该次只重建 Core bundle，没有生成 VSIX。

当前 10 项 Open Source Pack 的隔离源码 Profile 随后加入同一编辑器操作：`profileNamed(third: true, ` 高亮 `$first`，只补全 `first:`、`second:`；未保存地改为 `profileNamed(1, third: true, ` 后高亮 `$second`，只补全 `second:`。Core、Symfony、Pack 从当前源码加载，八个外部直接成员使用现有冻结 Profile 版本，Apache 语法扩展作为片段扩展依赖加载；PHP 8.5、项目 PHPUnit CLI 与 PHP CS Fixer 使用独立工具目录。完整源码组合宿主退出码 0，原始日志 `/tmp/sophp-pack-10-c2-named-integration-20260925.log`。这证明本次补全修复在隔离的完整成员组合中仍可用；它不是安装 VSIX、WSL Remote 或人工长期使用验收。
