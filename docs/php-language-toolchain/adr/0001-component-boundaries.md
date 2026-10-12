# ADR 0001：组件通过公开接口保持单向依赖

状态：记录现有实现；组件源码门禁独立验证，不表示全部架构验收完成。

parser/phpdoc/project/type-system 提供基础事实；index 管理索引与依赖；semantic 消费这些事实并产生类型和诊断；language-server 适配协议；VS Code 层负责编辑器行为。框架与 Provider 使用独立协议，不让 semantic 依赖具体框架，也不让 index 反向依赖 semantic。

独立 `@php-companion/*` 包使用 `workspace:^` 声明组件依赖，通过公开 exports 导入，禁止跨包相对路径和未声明的运行时依赖。testkit 不进入产品运行时；type-system 不直接导入 IO 模块。静态依赖不能形成环，无法静态确定的模块路径不能作为已验证依赖通过。

执行依据是 [组件源码门禁](../reports/component-dependency-manifest-guard-2026-10-09.md)：实际24组件/200源码文件/511导入与21项控制。门禁接入 typecheck；独立 tarball 消费、适配层与运行时 API 继续由各自验收证明。

[架构](../architecture.md)和[数据合同基线](../data-contracts.md)分别说明所有权与具体字段。该决定固化已有方向，不把所有待办组件或平台宣称为完成。
