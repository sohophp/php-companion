# 包声明与源码导入使用同一组件分层守卫

原门禁只在源码导入时检查 semantic/index 与编辑器分层。比如 semantic/package.json 已把 framework-symfony 放进 dependencies，但源码尚未导入它，检查仍会通过。现在运行时依赖声明和实际导入共用同一组分层规则，声明时即可拒绝；开发工具依赖和独立 semantic-provider 契约的合法路径保持。

新增三个 manifest-only 反例：semantic→framework、index→framework、普通组件→vscode。修正前原18项通过、新3项失败；修正后21项全部通过，原案例身份完整保留。两个真实CLI成功/失败退出码控制仍通过，范围ESLint通过。当前24组件、200源码文件、511导入零越界。

门禁继续通过原 typecheck 入口执行。只修改工程检查脚本、控制测试和说明，正常JS/WASM资产逐项哈希保持，继续绑定[当前完整LSP及Linux编辑器验证](commented-return-normal-qualification-2026-10-09.md)；没有重新构建或重跑这批已完成验证。

[机器记录](component-dependency-manifest-guard-2026-10-09.json)绑定修正前失败、修正后通过与源码/运行时哈希。P0其余数据合同、迁移及全部原范围继续，未提交、推送、打包或更新Profile。
