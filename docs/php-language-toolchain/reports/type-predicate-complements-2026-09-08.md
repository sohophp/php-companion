# 类型谓词补集路径验收

日期：2026-09-08。范围：全局内建类型谓词在可证明为假的控制流路径中，对有限 Union 执行精确成员排除。

## 已完成

- `!is_*` 的真分支记录否定谓词事实，普通 else 记录原条件的假事实。
- 无 else 且主体必然终止的 guard，把原条件为假的事实限定到同块继续路径。
- `A || B` 确定为假的路径同时记录 A、B 为假，并连续排除同一变量的多个已证明类型。
- elseif 分支同时继承全部前置条件为假和当前条件为真的事实；最终 else 继承全部条件为假。若各已匹配分支都终止，同样的假事实进入同块继续路径。
- 参数或具体局部值的直接、安全局部副本可消费相同事实；mixed 副本只在正谓词路径形成具体类型。分支内对局部变量重新赋值后，旧谓词事实立即失效。
- 既有严格非空、`instanceof` 和反向 `instanceof` 事实已进入同一实参类型流：nullable 参数移除 null，有限对象 Union 选择或排除已证明成员，较宽父类型可在正向分支精化为已解析子类型。
- 每个事实仍保存原始函数名；只有名称解析到同名全局内建函数时才生效。
- 有限 Union 只排除与谓词目标明确兼容的成员。`mixed` 的补集无法由当前类型代数表达，因此保持 unknown，不产生伪精度诊断。
- Semantic snapshot 升至 schema 39，使缺少否定标记的旧缓存原子失效。

## 精准边界

- 真合取可以分别证明每个原子为真，假析取可以分别证明每个原子为假。
- 假合取和真析取不能确定单个原子的真假，因此不生成补集事实。
- 当前不尝试表示一般对象类型的开放世界补集。
- 动态 mixed 数组写入不因局部别名支持而提升成可诊断的具体数组类型。

## 验证结果

- `pnpm typecheck` 与最终 `pnpm lint && pnpm test` 退出码 0：15 个组件共 403 项测试、根包 30 项测试通过。其中 Parser 44、Semantic 186、Language Server 75 项。
- 两个谓词 fixture 均通过 PHP 8.5 语法检查，`git diff --check` 通过。
- `pnpm verify:packages` 在隔离消费者环境验证 15 个可独立发布组件 tarball；`pnpm package` 和 `pnpm verify:vsix` 均退出 0。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `e70f1aaaf5bbdc4c9c637a95f642e9769c4ee31178778a3d8aaee8977a35e953`。
- 打包产物在隔离 Profile 的 VS Code 1.136.1 Extension Host 中退出 0。宿主冻结参数及局部副本的谓词诊断，并验证严格非空、正反 `instanceof` 与局部非空副本，合计十七条精确控制流诊断。
- 宿主日志位于 `/tmp/php-native-flow-vscode-logs-20260908-2241`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed 或 uncaught 错误。启动器在线查询 VS Code 版本时发生一次外部网络 ETIMEDOUT，随后按设计使用已安装且完成校验的 1.136.1，宿主测试本身退出 0。
