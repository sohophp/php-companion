# SPL Observer / Subject 内建报告

日期：2026-09-13。范围：完成 PHP 7.2–8.5 的 `SplObserver` 与 `SplSubject` 接口、版本边界和真实编辑器验证。

## 已完成

- `SplObserver::update(SplSubject)` 与 `SplSubject::attach(SplObserver)`、`detach(SplObserver)`、`notify()` 进入共享版本化规格。
- PHP 7.2 保留运行时旧 arginfo 暴露的 `$SplSubject` / `$SplObserver` 参数名，PHP 7.4 起切换为 `$subject` / `$observer`。
- PHP 8.0 官方 stub 仍无返回类型；PHP 8.1 起四个接口方法具有 tentative `void`。PHPDoc 在所有目标版本保留确定的 `void` 语义返回。
- 自研语言服务器提供接口成员 Signature Help、类型与方法 Definition；最终打包宿主验证同一行为。

## 依据

公开接口依据 PHP 官方 [`SplObserver`](https://www.php.net/manual/en/class.splobserver.php) 与 [`SplSubject`](https://www.php.net/manual/en/class.splsubject.php)。PHP 8.0 与 PHP 8.1 边界另核对官方 php-src 的 [`PHP-8.0` stub](https://github.com/php/php-src/blob/PHP-8.0/ext/spl/spl_observer.stub.php) 和 [`PHP-8.1` stub](https://github.com/php/php-src/blob/PHP-8.1/ext/spl/spl_observer.stub.php)。

`/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 逐版本核对接口、方法、参数名、参数类型和 tentative return；本机缺少 PHP 8.0，因此该边界以 PHP 官方 8.0 源码分支补证。

## 验证

- language-spec：40/40；language-server：136/136。仓库总门禁中十五个组件共 550 项、根扩展 33 项，共 583 项测试通过；TypeScript、ESLint、PHP fixture lint 与 Extension Host TypeScript 编译通过。
- 十五个真实组件 tarball 均从隔离消费者安装并验证；主扩展、Open Source Pack 与 Recommended Pack 三份 VSIX 的内容检查通过。
- VS Code 1.137.0 纯净宿主通过；含 EditorConfig、PHP CS Fixer、PHPUnit、YAML、TwigPlus、Symfony Language Tools 0.20.0 与 PHP Debug 的 Open Source Profile 通过。第三方目录运行前后 1,370 个文件的 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`457c3bdea5f5af1dda7aecb42467eec6217dcd8463c4c35b6f5b786528f86ca8`。
- Open Source Pack VSIX SHA-256：`1bdb5ebbc53d28b7edec1631c82b0951d6f096102cf769dd6a70481db55b9060`。
- Recommended Pack VSIX SHA-256：`99da2fc35cf58ac6d5d8b757cd6cbe351ba1a9023b1eb83860aa0722871afe64`。

## 边界

这两个接口只定义通知协议，不规定 observer 的存储、调用顺序、异常处理或生命周期；静态规格不推断具体 subject 实现的运行时行为。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
