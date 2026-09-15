# Monorepo 与独立组件发布

状态：十六个当前组件已通过 K01–K06 的本地发布边界验收；公开 npm 发布仍须在候选版按实际版本重跑并获得单独授权。首发不要求全部包公开发布，但边界从开始设计。

## 布局与交付边界

根目录统一锁文件、任务入口与共享开发配置，packages 下按 architecture.md 划分组件。每包拥有 package.json、src、测试、README、许可证与发布清单。第一阶段只落地必要包，不创建空包。

TwigPlus 保留原仓库，通过公开契约/包版本协作，不搬入 PHP monorepo，也不依赖本机绝对路径。现有两个扩展包保留独立打包能力。

| 组件 | 独立消费方式与约束 |
| --- | --- |
| runtime-probe | 直接执行可信 PHP CLI 并返回验证后的运行时事实；无 shell、无项目启动，具有时间与输出边界 |
| parser | 输入文本返回语法结构，WASM 随包交付，明确初始化/销毁 API，不依赖 VS Code |
| phpdoc | 输入注释返回类型 AST，不要求索引或服务器 |
| language-spec | 按 PHP 版本查询规则和内建数据，附来源及许可 |
| type-system | 类型构造、兼容、替换、合并，无 IO 或框架依赖 |
| project / index | 项目解析与索引查询，明确 Node 环境，IO 可注入 |
| semantic-provider | 框架无关 schema 1 事实契约及校验，无 parser、semantic 或编辑器依赖 |
| semantic-provider-host | 显式可信可执行文件的一次性进程主机；限制时间/输出并校验响应，不承诺 OS 沙箱 |
| semantic | 快照/索引查询接口，可供 CLI 或其他编辑器消费，无需启动 LSP |
| refactor | 返回带版本编辑计划，由消费者应用，不直接改写工作区 |
| language-server | npm bin 提供 stdio PHP LS，可由非 VS Code 客户端启动 |
| framework-* | 经公开扩展接口注册，不强制进入 PHP 核心依赖树 |
| interop | 协议类型、校验、协商，不导入双方内部 AST |
| vscode | VSIX 使用构建后的核心，保留公开扩展 ID |
| testkit | 按需独立发布测试辅助，不进入产品运行依赖 |

独立发布允许依赖其他已声明包，但安装不能依赖源码 checkout、根 node_modules、未发布私有包或仓库路径别名。

## 公开 API 和依赖

- package exports 与生成的 TypeScript declarations 明确支持的入口；按需求声明 Node/module 格式，不提前承诺所有浏览器与 CJS/ESM 组合。
- 禁止跨包深层导入 src/dist、相对路径越界、隐含根配置和本机绝对路径。
- workspace 协议仅用于开发；真实 tarball 中使用可安装的版本范围。
- WASM、stubs、schema 从包内解析，不依赖进程工作目录。
- 优先暴露自己的稳定查询结构；若公开第三方 parser 对象，明确绑定版本和兼容责任。
- 框架包以 peerDependencies 或明确扩展接口版本表达兼容性；缺失插件不影响核心 PHP。
- 依赖图无环，静态检查禁止未声明依赖，消费者测试防止 hoisting 掩盖缺陷。

## 版本与发布

使用 Changesets 管理包版本、变更记录与受影响包。包独立版本化；首次紧密耦合的核心可协调同批发布，但不要求所有组件永久同号。interop 另有消息 schema 版本。

根 workspace 为 private；未具备交付条件的包保持 private。拟发布组件依赖的包必须可获取：一并发布或合法完整地随产物打包，不能发布引用不可获取内部依赖的组件。

CI 按依赖图检查受影响包；发布候选执行全量集成、包内容审计和仓库外消费者测试。按依赖顺序准备发布，VSIX 记录实际核心版本及第三方许可。公开 npm/Marketplace 发布和推送标签仍单独确认。

## 私有 Alpha 候选

在干净提交上运行 `pnpm candidate:alpha`。命令先重新构建三个 VSIX 并执行内容验证，再把主扩展、Open Source Pack 和 Recommended Pack 复制到 `artifacts/php-companion-alpha-<version>-<commit>/`。候选目录包含 `candidate.json`、`SHA256SUMS` 和中文安装说明；清单冻结源码提交、运行平台、每个 VSIX 的扩展 ID、版本、大小与 SHA-256，以及通过组合门禁和被拒绝的第三方扩展版本。

候选组装器拒绝脏工作树和三个 VSIX 版本不一致。`artifacts/` 为本地交付目录，不提交二进制。命令只生成可审核的私有安装包，不创建 Git tag，不发布 npm 包，也不上传 VS Code Marketplace。具体试用流程见 [Alpha 候选试用](alpha-candidate.md)。

## 独立安装验收 K01–K06

- [x] K01：拟发布包有公开 API、真实使用例、环境要求、许可证、changelog、files/exports 清单。
- [x] K02：真实 pack tarball 在仓库外临时目录安装，验证声明和运行时导入，不借用源码 symlink。
- [x] K03：依赖包也通过 tarball/临时 registry 获取，无 workspace/file/link 残留和未声明依赖。
- [x] K04：parser 从任意工作目录加载 WASM；LS 实际 bin/stdio 完成初始化与 PHP 文档符号查询；库包执行最小真实消费样例。
- [x] K05：VSIX 资源、核心版本和命令兼容通过；打包 VSIX 的隔离 Extension Host 用例独立于 npm 包测试执行。
- [x] K06：发布脚本拒绝依赖环、缺失 typed ESM export、非 `workspace:^` 内部依赖和打包后残留 workspace 范围；TypeScript、Changesets 和 changelog 同步验证。

R1 核心完整包即执行这些检查，不必等到公开发布。后续组件成熟时采用相同门槛；“以后可以拆”不计作组件化完成。
