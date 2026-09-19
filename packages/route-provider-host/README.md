# @php-companion/route-provider-host

为用户显式配置的路由 Provider 提供一次一进程的 JSON 主机。主机关闭 shell，限制运行时间、stdout 和 stderr；只有完整、身份与 generation 匹配的快照才会返回。进程隔离不是操作系统安全沙箱，只应配置可信命令。
