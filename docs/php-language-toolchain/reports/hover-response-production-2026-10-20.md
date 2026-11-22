# 正式安装模式的旧Hover响应修复

2026-10-20。本地提交`a7e9166a`（独立分支`work/stable-hover-guard-20261020`），基于`71c7b40f`。当前来源文档编辑、关闭或查询取消后，客户端丢弃在途Hover响应；未变化的响应原样返回。普通与计时路径都使用同一守卫。原工作区客户端源码与冻结基线不同，修复留在独立工作树，未覆盖。

## 已执行并通过

- 最终提交上完整根单元155项，零失败/零跳过；六项新增定向案例覆盖保持、编辑、关闭、取消、拒绝启动和错误传播。正常构建、最终类型检查、Lint及编辑器测试编译通过。
- 新Core及复用的同源码Symfony/Pack三包通过既有VSIX验证；Core SHA-256为`38292610ad32b4807f15a6134c6c4bfe6c0a2ed67b1ddc42fb7e9523bd77ba77`。七个服务器运行资产与71c7逐字相同，只有客户端extension.js变化。3710个最终源码输入与干净提交保持。
- 全新隔离目录中，三个产品原VSIX及九份原冻结外部载荷的本地VSIX均经正式CLI安装；后者不是Marketplace下载证明。39产品文件与包一致，package.json仅增加VS Code安装元数据。
- VS Code1.142、YAML2.0.0、PHP Debug1.40.2的原完整12成员套件退出0，93.59秒；7391个冻结输入、25符号链接和安装独立审计通过。原50/30轮反馈P95为92/101ms，满足150ms；最大198/704ms原样保留。
- PHP/Twig格式化、失败恢复、保存撤销、Symfony上下文刷新、真实Xdebug及PHPUnit0→1→0通过。真实旧Hover响应已生成后被外部传输适配器暂存；服务器实际确认消费文件版本2，再原样释放同一响应，客户端拒绝旧结果，随后新结果及恢复通过。原套件、断言和期限保持，服务器testMode始终false并实际拒绝Test专用钩子。
- 产品从安装目录加载，开发路径只指向中性测试入口；实际进程参数、实际服务器和清理证据一致。显示服务、所属进程及临时项目已删除。内部Test模式生命周期计数不可用，报告使用实际启动/进程/传输观察，不伪造内部状态；退出时服务器已消失，未捕获的服务器独立退出码保持null。

## 失败记录与资格边界

[修复前同一原断言的真实失败](runtime-file-guard-production-gate-2026-10-20.md)及原字节摘要保留。新工作树首次类型检查先于依赖构建而退出2；首次Lint发现两处显式返回类型遗漏，修正后最终检查通过，最后重新执行155项完整根单元。

候选目录：`/var/www/node/php-companion-hover-guard-20261020/artifacts/php-companion-alpha-0.4.13-a7e9166a`。日常Alpha Profile未更新；本地提交尚未推送或发布。当前CI、macOS完整矩阵、真人WSL及多小时使用待验；复杂Controller原500/150ms预算仍失败，完整稳定版目标未完成。实际YAML/PHP Debug组合的Linux资格与全平台冻结表分别保留。

证据：[机器报告](hover-response-production-2026-10-20.json)、[原完整终态](../../../.vscode-test/hover-response-production-2026-10-20/state.json)、[独立安装审计](../../../.vscode-test/hover-response-production-2026-10-20/installed-audit.json)、[最终根单元](../../../.vscode-test/hover-response-production-2026-10-20/final-root-tests.json)。
