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

功能提交：`d9b49bb`。

候选目录：`artifacts/php-companion-alpha-0.4.5-d9b49bbe/`。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `0c57176b650f87088b886ce5af86ca26b5f548fae5174a4f34b9b64e600588c1` |
| `php-companion-open-source-pack-0.4.5.vsix` | `02c31b8ef64f624c371f61ee7aab0f5e2b56a313d0068c63f5aebb280f5eed11` |
| `php-companion-recommended-pack-0.4.5.vsix` | `a6399f898d44b0aba29d3c80583b1432e5ac5aaa7bdebbe52d49dd8d0e086ebd` |

`sha256sum -c SHA256SUMS` 三项均为 OK。Winstar `bin/php-runtime` 确认为 PHP 8.5，CoreRepo `phpbin` 确认为 PHP 7.2；两个 Composer 项目的 WSL 确定性 Alpha 预检均通过。

核心 VSIX 已安装到 WSL RockyLinux8。安装目录与构建输出的哈希为：

- `dist/language-server.js`：`bb2bcfa2a3c0c6260274928a538ca31d61c76be6e16381e88fc5b8e75324a12e`
- `dist/extension.js`：`116c624e95589f504f6b30821db1aa830a586deb2982e0134a1de5f41705babd`

已安装 bundle 复用同一 v51 Winstar 缓存连续执行两次，索引分别为 12.328 秒和 12.903 秒；两次均返回 9 个 Controller context，并继续得到精确 `Language|null` 详情和 `getCode` 补全。安装后需要在 Alpha Profile 执行 `Developer: Reload Window`，让当前 Extension Host 切换到新 bundle。
