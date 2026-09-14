# @php-companion/runtime-probe

通过受限的一次性 PHP CLI 进程读取实际版本、SAPI、已加载扩展和 INI 文件来源。探测使用参数数组直接执行可执行文件，不经过 shell；默认限制为 3 秒和 128 KiB 输出。调用方只能在探测成功且版本与项目目标一致时，把扩展缺失解释为运行时事实；失败、超时、畸形输出和版本不匹配均应保持 unknown。

组件不读取项目代码、不加载 Composer autoloader，也不启动 Symfony Kernel。它适合由 VS Code Extension Host 在本地、WSL、SSH 或 Dev Container 所在环境中调用，并可独立发布。
