# Symfony 事件订阅 References（2026-09-16）

## 行为

对实现 `Symfony\\Component\\EventDispatcher\\EventSubscriberInterface` 的类，PHP Companion 会分析公开静态 `getSubscribedEvents()` 的直接返回数组或单一局部变量确定性构造：

- 从订阅类执行 Find All References，会额外显示每个可证明的事件键。
- 从公开实例监听方法执行 Find All References，会额外显示数组中的回调字符串。
- 支持字符串事件、静态类常量事件、直接回调、`[method, priority]` 和多个监听器数组。
- 只有回调可对应到同类公开非静态方法时才发布关系。

同一 References 链路现在也分析两类可静态证明的监听关系：

- 类级和方法级 `Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener`，包括字面量事件、`Event::class`、整数优先级、首个原生事件参数推断、类级 `on<EventName>` 派生和 `__invoke` 回退；方法级 attribute 不接受另行指定 method。
- `services.yaml` 中显式 `kernel.event_listener` 标签；event、method 和 priority 必须为静态值，标签可随确定性 resource 服务展开，类与方法 References 分别返回 event 和 method 的精确 YAML 范围。
- 新鲜 debug-container XML 中具体 service 的显式 `kernel.event_listener` 标签；XML 实体会解码为运行时事件身份，References 仍定位原始 event/method 属性范围，缺少字段或非法 priority 不发布。

监听类和方法 References 还会合并匹配事件的派发位置：

- 接受 `dispatch(new Event())`，以及第二参数或 `eventName:` 中的字面量字符串、`Event::class` 和类常量；位置参数与命名参数按 PHP 调用规则校验。
- 接受同一最内层代码块内最后由 `new EventClass(...)` 赋值、且到派发前未经使用或重赋值的局部事件变量；References 精确定位派发参数变量。参数、别名、分支外赋值和经过中间调用的变量保持 unknown。
- 语法事实只给出事件身份和范围，Language Server 必须再把方法唯一解析到 Symfony Contracts/Component EventDispatcher 接口或其子类型。
- 相同事件对象传给 Messenger `MessageBusInterface::dispatch()`、业务同名方法、动态接收者或变量事件时不会发布关系。

监听关系通过服务类的有效方法表验证回调：本类、父类或 Trait 提供的具体公开实例方法均可发布，并把方法 References 绑定到真实声明；Trait precedence、alias 和 visibility 复用 PHP 语义组合结果。已注册服务若可证明属于 `EventSubscriberInterface`，父类或 Trait 提供的具体公开静态 `getSubscribedEvents()` 也会发布其中的字面量事件、回调、优先级和多监听器。订阅数组可直接返回，也可通过一个局部变量完成静态初始化、字面量/显式类常量键追加并原样返回。跨宿主订阅事件常量按 PHP 调用语义绑定：`self` 使用静态方法组合宿主，`static` 使用实际注册 subscriber，`parent` 使用宿主直接父类；Trait `as public getSubscribedEvents` 可回溯非公开原静态方法。已注册服务从父类或 Trait 获得的有效方法还会保留方法级 `#[AsEventListener]`，事件和派发绑定到子服务，Attribute 范围绑定到真实声明；`as` alias 使用独立有效回调名并回溯原始 Trait 方法 Attribute。方法 Attribute 的 `self::class`/`parent::class` 按 PHP Reflection 分别使用声明类或 Trait 消费类上下文，`static::class` 保持非法/unknown。父类/Trait 类级 Attribute 不会由 PHP Reflection 或 Symfony 自动配置继承。private/static 回调、无法证明为公开静态具体方法的有效订阅提供者、缺失父类/Trait、动态键、其他语句、变量切换、动态 attribute 参数和分支返回保持未知。

Symfony 来源事实缓存同步升级为 `symfony-facts-v4`，恢复时会验证每条 YAML/编译容器监听事实及 event/method 范围；旧 v3 缓存自动重建。

## 查询性能

项目级方法、属性和常量 References 复用按名称候选扫描：读取 Composer 项目源码，但只解析包含目标名称的文件。冷查询不再为了单个成员引用启动完整语义索引；打开缓冲区仍优先于磁盘内容，扫描期间变化会按既有 epoch 规则重试。

Winstar 只读实测：

- `AdminSecuritySubscriber` 类 References：派发增量后首次约 7.69 秒，返回服务 resource 注册和 `KernelEvents::CONTROLLER` 事件订阅两项；热查询约 32 毫秒。
- `onKernelController` 方法 References：优化前基线约 50.02 秒；派发增量后首次约 6.88 秒，返回 `getSubscribedEvents()` 中的回调字符串；热查询约 31 毫秒。
- Winstar 当前四个 `dispatch()` 都属于 Messenger message bus；语义接收者门禁将其全部排除，没有产生 Symfony EventDispatcher 假引用。

## 验证

- framework-symfony 覆盖直接监听器、优先级、多监听器、动态事件、私有方法和非 subscriber 反例。
- Language Server 冷启动 stdio 回归同时验证服务注册、类事件关系、方法回调关系，且没有启动完整 `[index:]` 扫描。
- framework-symfony 新增 attribute 与 YAML 标签正反例；Language Server 冷启动回归确认 subscriber、attribute、有效 YAML 标签同时出现，无效 method 标签被排除。
- framework-symfony 新增直接构造、显式事件名、类常量、命名参数、动态变量与非法调用反例；Language Server 同时验证 EventDispatcher 正例和 Messenger 同名反例。
- framework-symfony 新增同块直接构造局部变量正例，以及参数变量和中间调用暴露反例；真实 stdio 确认监听类/方法 References 返回 `$event` 派发参数。
- 编译容器回归覆盖 XML 实体、负优先级、缺失 method 反例，并在冷启动 References 中同时验证编译 service 注册、event 与 method 范围。
- 有效方法回归覆盖父类、Trait、未载入外部接口、缺失父类、private 和 static 边界；真实冷启动 stdio 同时验证 subscriber、YAML 和编译容器从父类/Trait 方法与子服务类双向进入 References。
- 继承订阅提供者回归覆盖父类/Trait 字面量 map、优先级、`self/static/parent` 精确宿主、Trait 可见性 alias、缺失绑定拒绝和 EventSubscriberInterface 语义门禁；真实 stdio 从父类/Trait 回调与实际子服务类双向验证引用。
- 确定性局部数组回归覆盖静态初始化、追加、显式类常量、动态键整段拒绝；真实 stdio 的直接 subscriber 使用同一路径。
- 继承/Trait 方法 Attribute 回归覆盖显式类事件、字面量、优先级、相对类名拒绝及已注册消费门禁；真实 stdio 同时验证父类、Trait、子服务类和匹配 dispatch。
- PHP 8.5 Reflection 对照和 semantic/stdin 回归覆盖 Trait 原方法与 alias 同时保留 Attribute；alias 调用返回 Attribute 位置及匹配派发。
- PHP 8.5 Reflection 对照覆盖父类/Trait 方法 `self` 与 `parent` 的四种绑定和非法 `static`；framework/stdin 回归使用唯一直接父类结果验证事件关系。
- PHP 8.5 静态调用对照覆盖继承/Trait subscriber map 的 `self/static/parent`，Symfony 源码确认编译阶段按实际 service class 调用 `getSubscribedEvents()`；Reflection 与最小 AttributeAutoconfigurationPass 容器确认父类/Trait 类级 Attribute 不继承。
- framework-symfony 28 项和 semantic 268 项测试通过。
- Language Server 最新完整套件 6 个测试文件、185 项测试通过，耗时 217.81 秒。
- 根级 TypeScript、ESLint 和 39 项扩展单元测试通过。
- 16 个 monorepo 组件 tarball 从隔离消费者安装验证通过。
- 三份 0.4.5 VSIX 已完成打包并通过 `verify:vsix` 内容检查。

## Alpha 候选

- 功能提交：`bea062225e03850aac25e6735a2ac3d5c6da71ff`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-bea06222/`。
- 核心 VSIX SHA-256：`e10550e96a8825220b5ecd0f44544825f6ba97ed176f8e362acbe47f3efe7f30`。
- Open Source Pack SHA-256：`62770d3cba25c05f285eb8c3861fb951f89b02b496067e797417d7e9bbce0d84`。
- Recommended Pack SHA-256：`748976eae1dcebf681da0979b9f7c13d4f858593394a52594d06c6ef6ea66a3b`。
- 当前 Remote CLI 安装通道此前已确认挂起；由于版本仍为 0.4.5 且客户端 `extension.js` 未变化，候选 `language-server.js` 已原子覆盖到现有 WSL RockyLinux8 扩展目录。安装目录与候选 bundle SHA-256 均为 `f18e6e8405f408ab61c260c5b6bc381a9cadbc606b350960a211876404b2ee3f`。须 Reload Window 后加载新进程。
