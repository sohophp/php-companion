# @php-companion/framework-doctrine

Doctrine ORM 的静态事实组件，不启动 EntityManager、项目 autoloader 或数据库连接。Alpha 精准子集识别 `Doctrine\ORM\Mapping` 属性实体、具名关联目标，以及标准 `ServiceEntityRepository` 构造函数中的 `Entity::class`。声明类型可证明时，关联属性事实保留 visibility/nullability；to-many 返回实际声明的 `array`、`iterable` 或 Collection 泛型容器，不猜测未声明的运行时集合。

已证明 repository 实体后，`repositoryMethodReturnType` 为 `find`/`findOneBy` 返回 `Entity|null`，为 `findAll`/`findBy` 返回 `array<int, Entity>`。动态 target、动态 repository 构造或其他自定义查询保持未知。
