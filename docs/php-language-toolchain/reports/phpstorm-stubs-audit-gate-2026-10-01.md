# phpstorm-stubs 覆盖门禁复查

后续纠正：原六项 PostgreSQL 条件构建分类已细分为两项正式条件声明与四项在核对的 PHP 官方源码中缺席的上游差异，见 [条件声明记录](phpstorm-stubs-pgsql-conditional-2026-10-01.md)。下文六项与模拟 pipeline 负例记录保留当时执行范围，不代表这四项 API 已获认可。

日期：2026-10-01。固定上游修订：`e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`。

当前源码已有版本化内置声明和生成目录；本轮补齐审计脚本的失败信号，没有替换声明来源或升级上游修订。

## 修改

- `scripts/audit-phpstorm-stubs.mjs` 复用同步脚本的固定修订校验，拒绝其它 Git HEAD。
- 增加 `--check`：存在未归类上游名称或目标运行时已导出但声明缺席的函数时，保留完整 JSON，退出码为 1；默认报告模式继续输出报告。
- 六个本机未导出的 PostgreSQL 条件构建 API 单列为 `auditedBuildDependent`，不混同于不存在的 API。它们的运行时签名仍待具备相应 libpq 能力的 PHP 核验；若目标运行时实际导出且 SoPHP 未覆盖，门禁仍失败。

`pg_close_stmt` 要求 libpq 17 以上，见 [PHP 官方手册](https://www.php.net/manual/en/function.pg-close-stmt.php)。其余条件构建项及本机快照来源见 [PostgreSQL 接入记录](phpstorm-stubs-pgsql-catalog-2026-10-01.md)。

## 本轮验证

| 检查 | 结果 |
| --- | --- |
| 固定上游 49 个目录、PHP 8.5 运行时覆盖 | 退出码 0；上游 2,064 个函数名称条目，48 个加载模块共 1,881 个运行时函数；未归类缺席 0，运行时缺席 0 |
| PHP 8.5 有效公开成员审计 | 退出码 0；6,731 个成员，缺失类型 0；一项 `WeakReference::__construct` 的刻意限制保持原样 |
| PostgreSQL 生成目录复核 | 退出码 0；127 个函数名、81 个常量名、四个运行时快照一致 |
| language-spec 全量 | 128/128 通过；构建通过 |
| 不同 Git 修订 | 正确拒绝，退出码 1 |
| 尚未接入的 Xdebug 目录 | `--check` 正确失败，退出码 1 |
| 模拟具备 pipeline API 的运行时 | 已归类条件构建项仍因 runtimeUncovered 失败，退出码 1；这只是门禁负例，不是该 API 的运行时验收 |
| 脚本 ESLint、git diff --check | 通过 |

复现覆盖门禁（先构建 parser 与 language-spec，SOURCE 指向固定修订的上游 Git 仓库）：

```sh
node scripts/audit-phpstorm-stubs.mjs --source "$SOURCE" --php php85 --check \
  Core standard curl dom exif fileinfo gd iconv imagick intl json mbstring mysqli \
  openssl PDO SimpleXML sqlite3 xml yaml zip libxml redis sodium hash date session \
  sockets zlib ctype filter bcmath calendar bz2 gettext tokenizer ftp readline pcntl \
  pgsql xsl igbinary msgpack apcu posix shmop sysvmsg sysvsem sysvshm mcrypt
node scripts/audit-phpstorm-runtime-members.mjs 8.5 php85 --effective
```

本机 PHP 8.5 未加载 BCMath；该模块只有上游名称审计，本轮不声称其运行时验收。覆盖检查只证明名称和公开成员，不证明全部签名类型、其它平台或真实 WSL 补全弹窗。未打包、提交、推送或更新 Profile。

## 当前源码复验（2026-10-01）

在 PostgreSQL 条件声明修正后的源码上重新执行上述 49 目录覆盖门禁，退出码 0；未归类缺席与本机 PHP 8.5 运行时函数缺席均为 0。公开成员门禁再次退出码 0，检查 6,731 项，缺失类型 0；仍只有刻意不提供直接构造的 `WeakReference::__construct`。

语言声明全量测试现在为 **129/129 通过**，包含条件 PostgreSQL API 的版本与实际导出过滤。固定上游 PostgreSQL 生成复核通过：127 个函数名、81 个常量名、四份运行时快照一致。

这一复验不代表全部 PHP 版本、平台、扩展构建或真实 WSL 编辑器已验收。没有例行打包、Git 提交或 Profile 更新。
