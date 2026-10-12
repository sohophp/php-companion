# 组件依赖源码门禁

新增 `scripts/check-component-boundaries.mjs`，通过包 manifest 与 TypeScript AST 检查组件单向依赖。`pnpm check:component-boundaries` 已进入 `typecheck`；`pnpm test:component-boundaries` 可独立执行门禁正反例，不构建或打包产品。

当前24个组件、200个源码文件、511处模块导入全部通过。18项控制测试包括合法公开根/子路径、类型与动态字面量导入、共享独立契约；15类拒绝条件覆盖未声明/不存在/错误版本的依赖、环、跨包相对路径、私有或未导出的入口、分层反向依赖、编辑器/testkit污染、直接IO、计算模块路径与重复组件身份；两个真实CLI子进程分别验证退出0/1与机器报告。范围ESLint通过。

脚本仅审计 `@php-companion/*` 组件源码，不等于整个适配层、发布tarball、运行时API、数据契约、缓存版本、ADR或迁移验收。P0总条目及全部原目标保持未完成。

本变更等待完整LSP与Linux编辑器流水线终态、进程退出后才写入仓库；不修改运行时源码、构建资产或日用Profile，不提交、推送或打包。正常生产资产逐项哈希保持；前一流水线的结果单独记录，不由本门禁推导。

[机器记录](component-dependency-gate-2026-10-09.json)保存命令、结果、源码与资产哈希。
