# Changelog

- Carry one validated optional project environment in framework-neutral provider requests so isolated integrations can select environment-specific static facts.

- Add validated optional container-parameter declaration facts so framework providers can publish identities and source ranges without exposing values.

- Add authoritative controller-context ownership and validated controller template context contributions.

## 0.1.0-alpha.1

- 建立 schema 1 的框架无关语义事实契约，覆盖方法、属性和字面量方法返回类型。
- 提供运行时校验和快照构造器，使消费者可按稳定 provider 身份原子替换事实。
- 增加一次性进程 Provider 的版本化请求/响应、可执行描述符及有界运行时校验契约。
- 增加框架中立服务容器、编译方法/属性参数、配置 URI、项目类型目录和打开文档快照契约。
- 增加框架中立事件订阅/派发事实、服务目录输入、有效公开方法/继承目录，以及权威事件所有权标志。
