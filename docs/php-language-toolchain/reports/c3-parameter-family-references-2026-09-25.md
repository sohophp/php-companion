# 方法参数 References 与预览式 Rename 的同一编辑链

日期：2026-09-25。对象是独立临时 Composer 项目中的接口、两个实现类及一个 PHP 8 命名参数调用文件。

此前预览式 Rename 能更新四个文件中的方法参数、PHPDoc 和命名调用，但从参数声明执行 References 只返回当前文件的局部变量位置；从命名参数标签执行 References 则没有结果。根因是语义层把参数一律视为单文件变量，并且 References 的局部分支没有复用已具备的参数重命名定位结果。

现在参数 References 使用项目范围，并复用同一参数家族的声明、方法体、PHPDoc 与命名调用位置；普通局部变量仍只查询当前文件。关闭“包含声明”时，会去掉接口及实现类的参数声明。从调用处的命名参数标签也能反向查找同一组引用。

验证：语义包全套 334 项测试通过；隔离 VS Code 1.139.0 Linux C3 宿主从声明和命名调用两端查询四文件 References，然后验证预览、取消、应用和一次 Undo/Redo，退出码 0。完整 11 项 Open Source Pack 的同一 C3 宿主退出码 0。C1 六项编辑查询、未保存编辑、vendor 和多根宿主回归退出码 0；其中 12 次顺序暖 References 命令延迟中位数 8 ms，最大值 81 ms，该样本不代表冷项目。日志分别为 `/tmp/sophp-c3-parameter-references-both-host.log`、`/tmp/sophp-c3-parameter-references-pack.log` 与 `/tmp/sophp-parameter-references-c1-host.log`。

项目范围参数 References 在冷项目仍会受索引等待影响；这次短时独立项目与源码 Profile 不等于 10k 文件等待分布、WSL Remote 或已安装候选的验收。Change Signature 的参数增删和重排、类型生成文件的 Redo 仍开放。没有修改业务项目或打包 VSIX。
