# SmallFlighter 历史数据同步脚本

## 用途

调用 SmallFlighter Admin 的 `POST /admin/dev/tool/data-diagnostic/history-sync`，创建历史数据同步任务。脚本默认只预览；只有 `execute` 搭配精确确认口令才会发起生产写入。

## 输入

- 媒体名称、媒体 ID 或英文编码；媒体映射来自数据诊断页面的媒体选择器。
- `REPORT` 或 `MATERIAL_REPORT`。
- 项目 ID、账号 ID 至少提供一项。
- 内部账号 ID 为正整数；`--external-id` 时账号 ID 按字符串处理。
- `YYYYMMDD` 日期，结束日期不能早于开始日期，日期差不超过 93 天。
- Hermes 云端私有配置中的 `_aproxySID` 和 `admin.sid`。

## 只读/写入性质

`list-media`、`preview`、`check-auth` 为只读；`execute` 会创建异步同步任务，属于生产外部写入，必须通过 `automation/script-registry.yaml` 的 SHA-256 审批，并带有 `确认执行历史同步` 确认口令。

## 示例

```text
python3 history_sync.py preview --media 巨量引擎 --report-type REPORT --project-id 131744 --start-date 20260824 --end-date 20260824
python3 history_sync.py execute --media 巨量引擎 --report-type REPORT --project-id 131744 --start-date 20260824 --end-date 20260824 --request-key <消息ID> --confirm 确认执行历史同步
```

## 回滚

接口创建的异步任务不能由本脚本撤销；回滚仅包括撤销运行脚本的 SHA-256 批准、停止 Hermes Skill 调用和恢复上一版脚本/配置。不要通过重复 POST 作为重试手段。

## 验收

```text
python3 -m py_compile history_sync.py
python3 history_sync.py list-media --json
python3 history_sync.py preview --media 10006 --report-type REPORT --project-id 131744 --start-date 20260824 --end-date 20260824 --json
```
