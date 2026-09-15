# 原生 closure/arrow 变量调用契约验收

日期：2026-09-15。范围：直接赋给同一词法作用域局部变量的原生 closure/arrow，以及最多八层不可变直接变量别名。

## 行为契约

- Parser 为赋值右侧恰好是 closure/arrow 的表达式保存唯一 scope 身份、原生参数和返回声明；作为其他调用实参出现的闭包不会被误记为赋值来源。
- 唯一、非控制流且未重赋值或按引用逃逸的局部 closure/arrow 变量调用提供 Signature Help，保留参数名、默认值、variadic、引用和原生返回类型。
- 位置及具名调用共用普通调用校验：缺少必填参数发布 `php.argument.missing-required`，已证明不兼容的实参发布 `php.argument.type-mismatch`。
- 显式返回声明及可由既有闭包返回流完整证明的返回类型进入局部赋值、成员补全和 Definition；实参不兼容、mixed、void、never 或返回流未知时不传播结果。
- 最多八层未修改的直接变量别名可复用同一契约；重赋值、条件赋值、引用修改、动态工厂和包装调用保持 unknown。

## 自动验证

- Parser 回归验证 closure、arrow 与包装闭包的身份边界及返回声明。
- Semantic 回归验证具名 Signature Help、缺参、错参、显式及推断返回成员补全、不可变别名，以及重赋值、条件赋值和包装调用反例。
- 真实 stdio Language Server 回归通过独立服务器进程验证 Signature Help、稳定诊断代码、返回成员补全和别名。
- `pnpm check`：类型检查、ESLint、十六个组件 651 项与根扩展 35 项测试全部通过，共 686 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，Extension Host 退出码为 0。

跨平台 CI、私有 Alpha 候选及其 SHA-256 在功能提交后补录。

## 缓存边界

Parser 新增的赋值和 scope 字段进入持久语义快照，因此 semantic snapshot 升级到 schema 76，Language Server 持久缓存和基准缓存升到 v48；旧条目会安全回退源码重建。
