# Symfony PHP 路由入口与 Controller 导航

日期：2026-09-25。范围为 SoPHP 的独立 Symfony 路由 Provider、协议、Language Server 与 Symfony 扩展；未修改业务项目，也未打包 VSIX。

## 变更

- 静态路由 Provider 现在读取约定入口 `config/routes.php`，包括打开但未保存的 PHP 文档快照；入口路径进入文件变化证据。之前只有 `config/routes.yaml` 和 `config/routes.yml` 作为约定根，纯 PHP 配置项目会漏掉路由。Symfony 7.4 [Routing 文档](https://symfony.com/doc/7.4/routing.html)给出 `config/routes.php` 和 `RoutingConfigurator` 的常用写法。
- `->controller([BlogController::class, 'list'])`、直接 `Class::class` 以及可精确定位的 FQCN 字符串现在产生 Controller 来源事实。导入别名保留源码短名称和规范类名；动态 Controller、被 `defaults(['_controller' => ...])` 改写的来源不生成错误关联。
- Route Provider 协议增加可选 `classSourceName`，用于校验 PHP 别名的源码范围，同时保留规范 `className` 给语义查询。旧提供者不需要新增字段。
- 独立 SoPHP Symfony 扩展注册 PHP 路由 Controller Definition；从类别名或方法名字串请求时，Language Server 以当前打开文档版本及权威路由事实定位类或公开实例方法，来源不一致时不返回旧落点。

## 验证范围

独立 Provider 临时 Composer 项目验证纯 PHP 根、嵌套 YAML 导入、未保存路径修改及协议接受别名来源；Framework Symfony 验证别名、FQCN、invokable、动态与覆盖来源；真实 stdio 验证打开 `routes.php` 中的类和方法跳转，以及编辑后旧请求被拒绝。Route Provider 3/3、Framework Symfony 60/60、静态路由 Provider 9/9、独立 Symfony 扩展 10/10，三包和 Language Server TypeScript 构建、相关 ESLint 与差异检查通过。

完整 Language Server stdio 文件随后 **168 通过、1 跳过**，退出码 0；日志 `/tmp/sophp-php-routes-stdio-full-20260925.log`。这覆盖本轮新增场景及同文件中既有路由、服务与普通 PHP 请求回归，不代表其它平台的安装候选验收。

完整回归后又加了请求前的轻量范围判断：普通 PHP 文档若没有 `RoutingConfigurator` 与 `->controller(...)`，不会为这项 Definition 读取路由快照；独立 stdio 场景补了普通 Controller 文件返回空结果，目标场景在最后改动后重跑通过。此轻量调整没有再次运行 168 项完整套件。

隔离 VS Code C3 源码宿主随后打开独立 Composer 项目中的 `config/routes.php`，实际调用 `vscode.executeDefinitionProvider`，分别从 `Target::class` 的类别名和 `'view'` 方法名字串到达 Controller 声明；宿主退出码 0，日志 `/tmp/sophp-c3-php-route-definition-20260925.log`。这验证了独立 Symfony 扩展的 Definition 注册和 VS Code 命令链，仍不等于已安装 VSIX 的人工 Ctrl+点击验收。

当前 10 项 Open Source Pack 的完整 C3 源码宿主也执行了同一路由导航，并继续完成后续 Symfony 服务 Rename、XML 磁盘变化保护及整组编辑操作；最终退出码 0，日志 `/tmp/sophp-c3-pack10-php-route-retry-20260925.log`。首次组合运行在路由断言通过后，紧接着的 YAML Rename 首次命令收到 VS Code `Canceled`，整体退出码 1；测试现只对该瞬时取消重试，非取消异常仍抛出，100 次内无有效结果仍会失败。重跑通过说明本次组合序列完成，不把首次失败隐藏为通过，也不代表所有事件排列均已覆盖。

这是静态、可证明的来源导航。自定义 loader 的运行时路由需要权威运行时 Provider；安装候选、WSL Remote 和 R4 的完整编辑体验仍未由本轮测试证明。
