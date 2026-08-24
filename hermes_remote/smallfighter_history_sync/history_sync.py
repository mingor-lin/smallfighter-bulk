#!/usr/bin/env python3
"""Create a SmallFlighter historical-data synchronization task.

The command is intentionally a small, deterministic HTTP client.  It does
not depend on an LLM or Apifox, and it never prints the two session cookies.
The default mode is ``preview``; ``execute`` requires an explicit confirmation
phrase and a successful session preflight before it creates a task.
"""

from __future__ import annotations

import argparse
from contextlib import contextmanager
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_CONFIG = "/home/ubuntu/.hermes/secrets/smallfighter-history-sync.json"
CONFIRM_PHRASE = "确认执行历史同步"
MAX_DATE_SPAN_DAYS = 93
COOKIE_VALUE_RE = re.compile(r"^[^;\r\n]+$")

# Values are taken from the media selector in SmallFlighter Admin.  Keep the
# map in source so the bot accepts the Chinese display name, the numeric ID,
# or the stable English code without making another network request.
MEDIA: tuple[tuple[int, str, str], ...] = (
    (10001, "GDT", "腾讯广告"),
    (10002, "BAIDU_INFO_FLOW", "百度信息流"),
    (10003, "BAIDU_SEARCH", "百度搜索"),
    (10004, "WECHAT", "微信广告"),
    (10005, "WEIBO", "超级粉丝通"),
    (10006, "TOUTIAO", "巨量引擎"),
    (10007, "NEW_WE_CHAT", "微信广告新版"),
    (10009, "KUAISHOU", "磁力引擎"),
    (10010, "IQY", "爱奇艺"),
    (10011, "QUTOUTIAO", "趣头条"),
    (10020, "HUICHUAN", "汇川"),
    (10021, "ZHIHU", "知乎"),
    (10022, "MEIYOU", "美柚"),
    (10023, "VIVO", "vivo"),
    (10024, "HUAWEI", "华为"),
    (10025, "XIAOMI", "小米"),
    (10026, "OPPO", "OPPO"),
    (10028, "XIAOHONGSHU", "小红书"),
    (10029, "YOUKU", "优酷"),
    (10030, "TEKAN", "特看"),
    (10031, "ZHONGXIAOLIULIANG", "中小流量"),
    (10032, "TUIA", "推啊"),
    (10033, "JZT", "京准通"),
    (10034, "HUICHUAN_SMART", "超级汇川"),
    (11006, "QIANCHUAN", "巨量千川"),
    (11009, "JINNIU", "磁力金牛"),
    (12006, "SUIXINTUI", "小店随心推"),
    (12009, "JUXING", "磁力聚星"),
    (13000, "UD", "阿里 Unidesk"),
    (13006, "DOUYIN", "抖音"),
    (13008, "BILIBILI", "B站"),
    (14006, "BENDITUI", "巨量本地推"),
    (100011, "GDT_NEW", "腾讯广告新版"),
    (100012, "GDT_SPIDER", "腾讯广告爬虫版"),
    (100021, "BAIDU_INFO_FLOW_SUB", "百度电商/智投"),
    (100062, "TOUTIAO2", "巨量引擎 2.0"),
    (100331, "JZT_TT", "京准通-头条"),
    (110062, "QIANCHUAN_QY", "巨量千川全域"),
    (110092, "JINNIU_SPIDER", "磁力金牛爬虫版"),
    (110093, "JINNIU_SPIDER_NEW", "磁力金牛标准版"),
    (110094, "JINNIU_API_NEW", "磁力金牛 API 新版"),
    (110095, "JINNIU_QZ", "磁力金牛全站"),
    (300001, "DAHANGHAI", "大航海"),
    (300002, "TAOTE", "淘特"),
    (300003, "TAOBAO", "淘宝"),
    (300004, "ZHIFUBAO", "支付宝"),
)


def _media_indexes() -> dict[str, tuple[int, str, str]]:
    result: dict[str, tuple[int, str, str]] = {}
    for item in MEDIA:
        adx_id, code, name = item
        for key in (str(adx_id), code.lower(), name.casefold()):
            result[key] = item
    return result


MEDIA_INDEX = _media_indexes()


class UserInputError(ValueError):
    """An input/configuration error that should not be retried."""


class RemoteCallError(RuntimeError):
    """A remote HTTP or response validation failure."""


def fail(message: str, exit_code: int = 1) -> int:
    print(f"❌ {message}", file=sys.stderr)
    return exit_code


def parse_positive_int(value: str, label: str) -> int:
    if not re.fullmatch(r"[1-9][0-9]*", str(value)):
        raise UserInputError(f"{label} 必须是正整数")
    return int(value)


def parse_date(value: str, label: str) -> dt.date:
    if not re.fullmatch(r"[0-9]{8}", value):
        raise UserInputError(f"{label} 必须使用 YYYYMMDD")
    try:
        return dt.datetime.strptime(value, "%Y%m%d").date()
    except ValueError as exc:
        raise UserInputError(f"{label} 不是有效日期") from exc


def parse_accounts(raw_values: Iterable[str], external: bool) -> list[int | str]:
    raw = " ".join(value for value in raw_values if value)
    tokens = [value for value in re.split(r"[\s,，]+", raw.strip()) if value]
    if external:
        if any("\r" in value or "\n" in value for value in tokens):
            raise UserInputError("外部账号 ID 包含非法换行")
        return tokens
    result: list[int] = []
    for value in tokens:
        result.append(parse_positive_int(value, "内部账号 ID"))
    return result


def resolve_media(value: str) -> tuple[int, str, str]:
    key = value.strip().casefold()
    item = MEDIA_INDEX.get(key)
    if item is None:
        raise UserInputError(f"不支持的媒体：{value}；可传媒体名称、ID 或英文编码")
    return item


def load_config(path: str) -> dict[str, Any]:
    config_path = Path(path).expanduser()
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise UserInputError(f"私有配置不存在：{config_path}") from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise UserInputError(f"私有配置不可读：{exc}") from exc
    if not isinstance(config, dict):
        raise UserInputError("私有配置必须是 JSON 对象")

    base_url = str(config.get("base_url") or "").rstrip("/")
    if not (base_url.startswith("http://") or base_url.startswith("https://")):
        raise UserInputError("base_url 必须以 http:// 或 https:// 开头")
    cookies = config.get("cookies")
    if not isinstance(cookies, dict):
        raise UserInputError("私有配置缺少 cookies 对象")
    aproxy_sid = str(cookies.get("_aproxySID") or "")
    admin_sid = str(cookies.get("admin.sid") or "")
    for label, value in (("_aproxySID", aproxy_sid), ("admin.sid", admin_sid)):
        if not value or not COOKIE_VALUE_RE.fullmatch(value):
            raise UserInputError(f"Cookie {label} 缺失或包含非法字符")

    timeout = config.get("timeout_seconds", 30)
    if not isinstance(timeout, (int, float)) or timeout <= 0 or timeout > 300:
        raise UserInputError("timeout_seconds 必须在 1 到 300 秒之间")
    dedupe_file = str(
        config.get("dedupe_file")
        or "/home/ubuntu/.hermes/state/smallfighter-history-sync.json"
    )
    return {
        "base_url": base_url,
        "aproxy_sid": aproxy_sid,
        "admin_sid": admin_sid,
        "timeout_seconds": float(timeout),
        "dedupe_file": dedupe_file,
    }


def build_payload(args: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any]]:
    media_id, media_code, media_name = resolve_media(args.media)
    report_type = args.report_type.upper()
    if report_type not in {"REPORT", "MATERIAL_REPORT"}:
        raise UserInputError("report_type 只支持 REPORT 或 MATERIAL_REPORT")
    start = parse_date(args.start_date, "开始日期")
    end = parse_date(args.end_date, "结束日期")
    date_span = (end - start).days
    if date_span < 0:
        raise UserInputError("结束日期不能早于开始日期")
    if date_span > MAX_DATE_SPAN_DAYS:
        raise UserInputError("日期范围不能超过 93 天")
    project_id = (
        parse_positive_int(str(args.project_id), "项目 ID")
        if args.project_id is not None
        else None
    )
    accounts = parse_accounts(args.account_ids, bool(args.external_id))
    if project_id is None and not accounts:
        raise UserInputError("项目 ID 和账号 ID 至少填写一项")

    payload = {
        "adxId": media_id,
        "reportType": report_type,
        "projectId": project_id,
        "accountIds": accounts,
        "isExternalId": bool(args.external_id),
        "startDate": int(args.start_date),
        "endDate": int(args.end_date),
    }
    display = {
        "media": {"id": media_id, "code": media_code, "name": media_name},
        "reportType": report_type,
        "projectId": project_id,
        "accountIds": accounts,
        "isExternalId": bool(args.external_id),
        "startDate": args.start_date,
        "endDate": args.end_date,
    }
    return payload, display


def cookie_header(config: dict[str, Any]) -> str:
    return f"_aproxySID={config['aproxy_sid']}; admin.sid={config['admin_sid']}"


def request_json(
    url: str,
    config: dict[str, Any],
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any]]:
    encoded = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "Cookie": cookie_header(config),
    }
    if encoded is not None:
        headers["Content-Type"] = "application/json"
    request = Request(url, data=encoded, headers=headers, method=method)
    try:
        with urlopen(request, timeout=config["timeout_seconds"]) as response:
            status = int(response.status)
            text = response.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")[:2000]
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"message": text[:200]}
        return int(exc.code), parsed if isinstance(parsed, dict) else {"message": str(parsed)}
    except (URLError, TimeoutError, OSError) as exc:
        raise RemoteCallError(f"请求失败：{exc}") from exc
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RemoteCallError(f"HTTP {status}，响应不是有效 JSON") from exc
    if not isinstance(parsed, dict):
        raise RemoteCallError(f"HTTP {status}，响应 JSON 不是对象")
    return status, parsed


def session_preflight(config: dict[str, Any]) -> dict[str, Any]:
    status, response = request_json(
        config["base_url"] + "/admin/api/auth/session",
        config,
    )
    data = response.get("data")
    if status != 200 or response.get("code") not in (0, "0") or not (
        isinstance(data, dict) and data.get("status") is True
    ):
        message = str(response.get("message") or response.get("msg") or "登录态无效")[:200]
        raise RemoteCallError(f"会话校验失败（HTTP {status}）：{message}")
    return {"httpStatus": status, "code": response.get("code"), "authenticated": True}


def response_error(status: int, response: dict[str, Any]) -> str:
    message = str(response.get("message") or response.get("msg") or "接口返回失败")[:200]
    return f"HTTP {status}，code={response.get('code')}，{message}"


def post_sync(config: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    status, response = request_json(
        config["base_url"] + "/admin/dev/tool/data-diagnostic/history-sync",
        config,
        method="POST",
        body=payload,
    )
    data = response.get("data")
    if status not in {200, 201} or response.get("code") not in (0, "0") or not (
        isinstance(data, dict) and data.get("published") is True
    ):
        raise RemoteCallError(f"历史同步任务创建失败：{response_error(status, response)}")
    return {
        "httpStatus": status,
        "code": response.get("code"),
        "published": True,
        "taskId": data.get("taskId"),
        "validAccountIds": data.get("validAccountIds"),
        "payload": data.get("payload"),
    }


def payload_fingerprint(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )
    return hashlib.sha256(encoded).hexdigest()


def read_dedupe(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def save_dedupe(path: Path, records: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(records, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


@contextmanager
def dedupe_lock(config: dict[str, Any]):
    """Serialize lookup + POST + write so two bot retries cannot race."""
    path = Path(config["dedupe_file"]).expanduser()
    lock_path = Path(f"{path}.lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.parent.chmod(0o700)
    with lock_path.open("a+", encoding="utf-8") as lock:
        os.chmod(lock_path, 0o600)
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


@contextmanager
def _no_lock():
    yield


def dedupe_lookup(config: dict[str, Any], request_key: str, fingerprint: str) -> dict[str, Any] | None:
    if not request_key:
        return None
    path = Path(config["dedupe_file"]).expanduser()
    records = read_dedupe(path)
    record = records.get(request_key)
    if not isinstance(record, dict):
        return None
    if record.get("fingerprint") != fingerprint:
        raise UserInputError("request_key 已用于另一组参数，拒绝复用")
    try:
        created_at = float(record.get("createdAt", 0))
    except (TypeError, ValueError):
        return None
    if time.time() - created_at > 24 * 60 * 60:
        return None
    return record.get("result") if isinstance(record.get("result"), dict) else None


def dedupe_store(config: dict[str, Any], request_key: str, fingerprint: str, result: dict[str, Any]) -> None:
    if not request_key:
        return
    path = Path(config["dedupe_file"]).expanduser()
    records = read_dedupe(path)
    now = time.time()
    retained: dict[str, Any] = {}
    for key, value in records.items():
        if not isinstance(value, dict):
            continue
        try:
            created_at = float(value.get("createdAt", 0) or 0)
        except (TypeError, ValueError):
            continue
        if now - created_at <= 24 * 60 * 60:
            retained[key] = value
    records = retained
    records[request_key] = {"createdAt": now, "fingerprint": fingerprint, "result": result}
    save_dedupe(path, records)


def output(value: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(value, ensure_ascii=False, separators=(",", ":")))
        return
    print(json.dumps(value, ensure_ascii=False, indent=2))


def command_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="买量小飞机历史数据同步")
    parser.add_argument("--config", default=os.environ.get("SF_HISTORY_SYNC_CONFIG", DEFAULT_CONFIG))
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list-media", help="列出可用媒体")
    list_parser.add_argument("--json", action="store_true", dest="as_json")

    auth_parser = subparsers.add_parser("check-auth", help="检查 SmallFlighter 登录态")
    auth_parser.add_argument("--json", action="store_true", dest="as_json")

    for name in ("preview", "execute"):
        item = subparsers.add_parser(name, help="预览或创建历史同步任务")
        item.add_argument("--media", required=True, help="媒体名称、ID 或英文编码")
        item.add_argument("--report-type", default="REPORT", dest="report_type")
        item.add_argument("--project-id", dest="project_id")
        item.add_argument("--account-id", action="append", default=[], dest="account_ids")
        item.add_argument("--account-ids", action="append", default=[], dest="account_ids")
        item.add_argument("--external-id", action="store_true")
        item.add_argument("--start-date", required=True)
        item.add_argument("--end-date", required=True)
        item.add_argument("--request-key", default="")
        item.add_argument("--confirm", default="")
        item.add_argument("--json", action="store_true", dest="as_json")
    return parser


def run(args: argparse.Namespace) -> int:
    if args.command == "list-media":
        values = [{"id": item[0], "code": item[1], "name": item[2]} for item in MEDIA]
        output({"media": values}, args.as_json)
        return 0

    try:
        config = load_config(args.config)
        if args.command == "check-auth":
            result = session_preflight(config)
            output(result, args.as_json)
            return 0

        payload, display = build_payload(args)
        result: dict[str, Any] = {"mode": args.command, "request": display, "payload": payload}
        if args.command == "preview":
            result["willExecute"] = False
            output(result, args.as_json)
            return 0

        if args.confirm != CONFIRM_PHRASE:
            raise UserInputError(f"execute 必须提供确认口令：{CONFIRM_PHRASE}")
        if args.request_key and (
            len(args.request_key) > 200 or "\r" in args.request_key or "\n" in args.request_key
        ):
            raise UserInputError("request_key 过长或包含换行")
        fingerprint = payload_fingerprint(payload)
        with dedupe_lock(config) if args.request_key else _no_lock():
            existing = dedupe_lookup(config, args.request_key, fingerprint)
            if existing is not None:
                output({**result, "deduplicated": True, "result": existing}, args.as_json)
                return 0

            result["session"] = session_preflight(config)
            created = post_sync(config, payload)
            dedupe_store(config, args.request_key, fingerprint, created)
        output({**result, "deduplicated": False, "result": created}, args.as_json)
        return 0
    except UserInputError as exc:
        return fail(str(exc), 2)
    except RemoteCallError as exc:
        return fail(str(exc), 1)


def main() -> int:
    parser = command_parser()
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        return int(exc.code)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
