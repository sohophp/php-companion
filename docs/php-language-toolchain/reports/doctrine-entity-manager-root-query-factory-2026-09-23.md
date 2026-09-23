# Doctrine EntityManager 单根 QueryBuilder 工厂

日期：2026-09-23

## 真实场景

Winstar 的 `UrlRedirectService::listQuery()` 声明原生 `Doctrine\\ORM\\QueryBuilder` 返回类型，并从 `EntityManagerInterface::createQueryBuilder()->from(UrlRedirects::class, 'r')` 建立查询。此前项目 QueryBuilder 工厂只识别 `getRepository(Entity::class)->createQueryBuilder('alias')`，因此该方法丢失实体泛型。

本轮支持本类中已声明为 `EntityManagerInterface` 或 `ObjectManager` 的属性，通过 `createQueryBuilder()` 建立一个字面量实体根。允许一次 `from(Entity::class, 'alias')`，以及可选且与根别名完全一致的 `select('alias')`。直接返回链和首条语句赋给唯一局部 builder、追加普通条件后原样返回复用同一安全边界。

## 拒绝边界

- 动态实体类或动态根别名。
- 标量、部分或与根别名不一致的 `select()`，以及任何 `addSelect()`。
- 多个 `from()`、`delete()`、`update()`。
- 条件初始化、重赋值、局部别名、引用、闭包捕获或把 builder 传给未知调用。
- DBAL QueryBuilder；接收者属性必须静态解析为 Doctrine ORM/Persistence manager。

调用方后续执行 `select/from/delete/update` 时，现有语义事实仍会撤销实体泛型。组件不执行 DQL、EntityManager、项目 autoloader 或数据库连接。

## 验证

- Parser 以 AST 绑定事实记录双参数链式调用的第一位类字面量与第二位字符串字面量，避免从原始表达式文本猜测；75 项通过。
- `framework-doctrine` 覆盖直接返回、唯一局部 builder、匹配根选择，以及动态实体/别名、标量选择、多根、附加选择等反例。
- Language Server 项目事实测试覆盖缓存往返、`QueryBuilder<Entity> -> Query<Entity> -> getResult()` 成员补全，以及后续 `select()` 撤销泛型。
- Winstar `src` 下 1,794 个 PHP 文件只读扫描得到 11 个精确项目 QueryBuilder 工厂；新增的单根 manager 工厂只有 `UrlRedirectService::listQuery()`，实体为 `UrlRedirects`。DBAL 查询未进入结果。
- `pnpm check` 完整通过；其中 `framework-doctrine` 6 项、Semantic 300 项、Language Server 261 项通过且 1 项跳过、仓库根测试 46 项通过。
- Core、Symfony、Open Source Pack 和 Recommended Pack 四份 0.4.5 VSIX 均完成打包并通过内容校验。

候选目录、SHA-256 和真实项目确定性预检将在功能提交后补记；现有 `81580890` 人工试用候选保持不变。
