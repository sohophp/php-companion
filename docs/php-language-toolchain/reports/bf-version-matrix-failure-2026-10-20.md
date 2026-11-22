# bf9613d5版本／模式矩阵终态：7通过／2失败

2026-10-20。[原矩阵39359865811](https://github.com/sohophp/php-companion/actions/runs/39359865811)已failure。Linux与macOS各三模式、Windows onDemand作业成功；Windows progressive与experimental失败。完整原始日志及终态元数据已归档，未将部分通过算作全矩阵完成。

两失败作业的后续诊断产物上传也失败，原artifact列表中没有这两组文件。原catch仅把异常写入state.json，日志只见cohortQualified=false，缺少具体异常，因此不能推断是热查询预算、协议、生命周期或外部运行器原因。[机器记录](bf-version-matrix-failure-2026-10-20.json)保留原进度、完整日志摘要及产物清单。

53e85c8d只补失败时直接输出error、最后案例和末尾报告／stderr；原所有预算、数量、版本、模式、生命周期判断及成功路径不变。最新运行另列，未对原失败做静默重跑或改判。普通矩阵、原复杂500/150ms、真人与最终检查均保持各自范围。
