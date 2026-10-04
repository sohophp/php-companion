# D49 解析事实拷贝成本

## 当前 CPU 证据与改动

在 `c8989f3b` 的生产 bundle 上重新采样同一 SHA-256、242692 字节、1500 注释夹具，100 轮交替输入。当前 profile 中两个 structuredClone 节点合计 self 1794.45 ms，仍是热点；profile 自带 P95 267.55 ms 不作为普通基线。没有继续已撤回的 readonly 遍历微调。

解析器保留同一文档事实缓存和语法树副本的生命周期。rawNames、constants、imports、typeReferences、errors、commentRanges、stringRanges 的记录只含标量字段，直接复制记录与数组；其余嵌套事实继续 structuredClone。泛型约束要求复制记录的所有字段为 string／number／boolean／undefined，未来增加嵌套字段会使构建失败，而非静默共享。返回事实仍允许调用者修改，不把 API 改为共享可变对象。

新增回归修改常量、导入、名称、注释／字符串／类型范围、错误数组、嵌套 attribute 与参数类型，释放返回树后连续两次核对完整缓存事实和树文本；保留增量编辑、legacy 恢复树及 URI 隔离的原测试。

## 测量范围

[结构化记录](completion-parser-fact-copy-2026-10-04.json)包含同字节输入的串行改前／改后各 100 轮普通测量：

| 指标 | 改前 | 改后 |
| --- | ---: | ---: |
| 编辑后立即补全 P50 | 229.39 ms | 192.55 ms |
| 编辑后立即补全 P95 | 282.25 ms | 239.01 ms |

每轮首项 __callStatic／__construct、另一侧旧候选缺席、不完整列表为零和磁盘不变均通过。普通测量无 profiler／显式 GC，不把历史 254.21 ms 或当前带 profiler 数字当作配对基线。一次初步普通运行与 parser 构建／测试重叠，明确排除；之后串行测量不重叠，不重复运行到绿色。第一次错误命令的路径校验和未显式传入 WASM 的初始化错误均保留在 /tmp 日志，未产生合格性能样本。

**239.01 ms 仍超过 150 ms；整体编辑性能门禁未通过。** 这是单组局部改善，不代表五轮、全部文件规模、内存、所有候选入口或真人 WSL 等待。

## 当前终态验证

- 解析器 3 文件／104 项通过，`/tmp/sophp-edit-clone-parser-qualified.log`；含完整事实修改后的缓存隔离、新源码与 URI、legacy 和树生命周期。
- 当前完整语义 85 文件／1588 项通过，64.81 秒，`/tmp/sophp-edit-clone-full-semantic.log`。
- 真实协议 2 文件／4 项通过，`/tmp/sophp-edit-clone-protocol.log`；覆盖 PHP 7.2／8.5 的注释密集魔术方法候选及 static 输入变化、构造器与别名注释。
- `/tmp/sophp-edit-clone-host.log` 隔离 Linux VS Code 1.140.0 C2 宿主退出 0，重复 Provider 查询、未保存 static 编辑、Undo 和精确当前候选通过，磁盘不变；此处不是可见弹窗等待或真人 UI。
- 当前 parser／language-server／生产 bundle 构建、定向 ESLint 与 diff 检查通过。ESLint 初次提示测试中未使用的解构树变量，增加树文本断言后通过，原失败日志保留。

自己的临时 Composer fixture 核对原 SHA-256 后清理；测量与 CPU 原始数据保留。此前完整 LSP 845 通过／1 条件跳过仍属 `4d52f320`；本批不重跑全量或改变旧边界。源码先保留同一分支，随后与 [D50](completion-prefix-scan-2026-10-04.md) 合为一次必要本地检查点；D50 当前完整语义与协议包含这份 parser 源码。不打包、推送或更新 Profile，goal active。
