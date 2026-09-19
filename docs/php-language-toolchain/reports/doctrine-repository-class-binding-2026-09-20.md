# Doctrine `repositoryClass` 实体绑定验证

日期：2026-09-20

## 目标与边界

Doctrine 允许实体通过 `#[ORM\Entity(repositoryClass: Repository::class)]` 指定自定义 Repository。此前 PHP Companion 只从标准 `ServiceEntityRepository` 构造器的 `parent::__construct(..., Entity::class)` 建立实体绑定；继承普通 `Doctrine\ORM\EntityRepository` 的项目 Repository 因此无法获得稳定标准查询返回类型。

本增量把实体 Attribute 中可静态解析的字面量 `Repository::class` 作为第二种所有权证据。绑定唯一时：

- `find`、`findOneBy` 返回 `Entity|null`；
- `findAll`、`findBy` 返回 `array<int, Entity>`；
- 返回实体继续进入现有成员补全、Hover、Definition 和类型传播主链。

动态或冲突的 `repositoryClass`、非字面量表达式、自定义查询方法和运行时替换均不推断。分析不启动 EntityManager、项目 autoloader 或数据库连接。

## 自动化验证

- framework-doctrine 组件测试：3 项通过；新增普通 `EntityRepository` 子类反例边界与四个标准查询返回形状。
- Language Server：6 个测试文件、187 项通过；真实 stdio 流程同时验证 nullable `find()` 结果和 `findAll()` 迭代元素的实体成员补全。
- 持久项目事实缓存升级为 `semantic-v51`，避免升级后恢复缺少新 Doctrine 关系的 v50 快照。

## 真实 Winstar 证据

对 `/var/www/php/8.5/winstar2024` 只读扫描得到 7 个字面量绑定：

1. `HomePageRepository` → `HomePage`
2. `TagIntroEntityRepository` → `TagIntro`
3. `CompanyPageEntityRepository` → `CompanyPage`
4. `BlogPostCategoriesRepository` → `BlogPostCategories`
5. `BlogPostsEntityRepository` → `BlogPosts`
6. `LanguageRepository` → `Language`
7. `FreePagesRepository` → `FreePages`

使用真实 Composer 图和 Winstar 源码运行 stdio 探针：冷索引 63.543 秒，未变缓存热恢复 13.425 秒，两次均得到 9 个 Controller context。对 `LanguageRepository` 的查询返回：

```text
App\Modules\LocalLanguages\ORM\Repository\LanguageRepository::find(): App\Modules\LocalLanguages\ORM\Entity\Language|null
```

随后对结果调用成员补全可得到 `getCode`。这证明能力来自真实实体 Attribute，而不是测试夹具中的标准 Repository 构造器。

## 发布门禁

候选目录、SHA-256、Winstar/CoreRepo 预检、VSIX 安装哈希和已安装 bundle 探针将在候选构建后补录。
