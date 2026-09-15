# 基础类型代数验收

日期：2026-09-15。范围：P4 的共享基础类型表示、规范化、显示与兼容关系。

## 组件边界

`@php-companion/type-system` 不读取源码、文件系统或编辑器状态。parser、PHPDoc、semantic、framework 与 Language Server 通过同一公开类型结构传递事实，避免各功能分别解释 Union、nullable 或集合类型。组件可单独打包发布。

公开代数覆盖：

- primitive：bool、int、float、string、array、object、callable、iterable、resource、null、void、never、mixed；
- named、string/int/float/bool literal、开放或有界整数区间、class-string；
- keyed/non-empty array、list/non-empty-list、sealed/open array shape；
- generic、Callable、Union、Intersection，以及由 Union 与 Intersection 组合的 DNF；
- 带原因的 unknown，与 PHP 显式 mixed 分开表示。

## 精确性规则

- Union 递归扁平化、按稳定 identity 去重和排序；never 被其他成员吸收，任一 mixed 吸收整个 Union，空 Union 得到 never。
- Intersection 递归扁平化、去重和稳定排序；显示 DNF 时为交集分支保留括号。
- `compatibility()` 返回 `yes | no | unknown`。缺少继承、泛型替换、命名对象 iterable/callable 证明或超过递归预算时返回 unknown，不猜测成功或失败。
- never 可赋给任意目标；任意来源可赋给 mixed；mixed 不能作为已证明的窄类型。unknown 可安全流向 mixed，但对 null、标量或对象等窄目标保持 unknown。
- literal、整数区间、null、void 维持不同身份；nullable 由普通类型与 null 的规范 Union 表示。
- 泛型参数使用声明的协变、逆变或不变规则；不同泛型基类必须提供明确父级参数替换。Callable 参数逆变、返回协变，并保留 optional、variadic 与 by-reference 契约。
- 默认最多执行 256 次递归关系比较，调用方可收紧预算；耗尽时返回 unknown。

## 验证

`packages/type-system/test/type-system.test.ts` 的 18 项测试覆盖上述表示和关系，包括新增的 mixed/unknown/never/void/null 顶部、底部与无返回边界。执行结果：

```text
pnpm --dir packages/type-system test       # 18 passed
pnpm --dir packages/type-system typecheck  # passed
```

本项关闭共享基础代数，不代表 P4 的全部名称绑定、内建成员目录和调用传播已经完成；这些消费者必须继续用同一代数，并在无法证明时保留 unknown。
