# 声明级 F2 类型重命名验收

日期：2026-09-14。范围：在 PHP `class`、`interface`、`trait`、`enum` 声明上发起 F2，将类型名、Composer PSR-4 文件名及已证明引用作为一次可撤销编辑提交。

## 已实现行为

- 自研 Language Server 仍向独立 LSP 客户端提供标准 `renameProvider`，并按旧 URI 文本编辑在前、`RenameFile` 在后的顺序返回 `documentChanges`。
- VS Code 扩展使用自己的 Rename Provider 转换该计划。声明文件的文本编辑通过 `onWillRenameFiles` 加入同一次文件操作，外部 import、原生类型位置、PHPDoc 与静态访问由主 `WorkspaceEdit` 更新。
- 规范 PSR-4 文件会随主类型改名，例如 `ExportContract.php` → `ReportContract.php`；声明文本与文件名保持一致。
- 显式 import alias 保持稳定；普通字符串、大小写不同的 Enum case 和非规范重复声明不进入编辑。
- 同一 PSR-4 命名空间中的纯文件名变化不再触发 Safe Move 的 namespace/引用规划。这样 F2 的 Undo/Redo 不会被 Safe Move 作为另一项移动再次拦截；跨目录、跨 namespace 或跨 PSR-4 边界的移动仍执行原有预检。

## 真实编辑器覆盖

隔离 VS Code 1.137.0 打包宿主从四种声明分别执行 F2，并逐项检查：

| 声明 | 跨文件证据 | 保留项 |
| --- | --- | --- |
| class | 构造、原生类型、PHPDoc、显式 alias 的 import 路径和规范文件名 | alias 本身、普通字符串、非规范重复声明 |
| interface | import、`implements`、PHPDoc、返回类型和规范文件名 | 普通字符串 |
| trait | import、Trait use、`class-string<T>`、`T::class` 和规范文件名 | 普通字符串 |
| enum | import、PHPDoc、返回类型、case/factory 静态访问和规范文件名 | 普通字符串、大小写不同的 case |

四种场景均验证应用后新文件和声明存在，随后以一次 Undo 恢复旧文件、声明及消费者，再以一次 Redo 恢复完整新状态。保留的宿主日志记录四次扩展 `onWillRenameFiles` 附加编辑，未出现 `unknown error`、`Cannot move PHP types` 或 Provider failure。

## 验证

```bash
pnpm check
pnpm verify:packages
pnpm test:extension
pnpm test:extension:intelephense
PHP_COMPANION_TEST_LOG_DIR=/tmp/php-companion-f2-logs-20260914-0323 \
  node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js
```

结果：

- `pnpm check` 通过：十五个组件 590 项、根扩展 33 项测试通过；其中 semantic 244 项、Language Server 152 项。
- 十五个组件 tarball 从仓库外消费者安装、导入并运行通过。
- 源码开发 Extension Host、安装 Intelephense 时的兼容 Extension Host，以及最终主 VSIX 的隔离打包 Extension Host 均以退出码 0 完成。
- TypeScript、ESLint、三个 VSIX 构建和 VSIX 内容校验通过。

本地候选 SHA-256：

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `185ec0b2294dd05a2d85aee1d814c1af797176bc2960011f369ffb0907c3a7bf` |
| `php-companion-open-source-pack-0.4.5.vsix` | `a6a204e16001d394baab7e326ee125e01ea4eb2bffb6cc62e4a03bb19c1c3d2f` |
| `php-companion-recommended-pack-0.4.5.vsix` | `294d4bab43517286b78d15eb0b57351e9a72c7abf7cc1d36f991147e636b629c` |

## 边界

以上新行为已在 Linux x64 本地宿主封板。最终提交仍须通过 Linux、Windows、macOS CI 后才能扩展为跨平台证据。公开 npm 和 VS Code Marketplace 发布没有执行。
