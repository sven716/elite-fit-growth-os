#!/usr/bin/env python3
"""Synchroniseer de bruikbare bedrijfsbronnen naar Growth OS.

Bronnen: Moneybird, Google Analytics, Google Agenda en Fathom. Alleen
geaggregeerde gegevens worden opgeslagen. Contact-, klant-, agenda- en
transcriptdetails worden niet gelogd of naar Growth OS gekopieerd.
"""

from __future__ import annotations

import base64
import datetime as dt
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

PROJECT_REF = os.getenv("GROWTH_OS_PROJECT_REF", "pqdqzmrrlxbwbedrmihz")
USER_ID = os.getenv("GROWTH_OS_USER_ID", "cfb57eb3-8efe-4372-9e9e-21bee4ea8009")
GA_PROPERTY = os.getenv("ELITE_FIT_GA_PROPERTY", "properties/526505294")
AMSTERDAM = ZoneInfo("Europe/Amsterdam")


def composio(tool: str, data: dict[str, Any], attempts: int = 3) -> dict[str, Any]:
    last = ""
    for attempt in range(attempts):
        proc = subprocess.run(
            ["composio", "execute", tool, "-d", json.dumps(data, ensure_ascii=False)],
            text=True,
            capture_output=True,
            timeout=300,
        )
        last = proc.stdout or proc.stderr
        try:
            result = json.loads(proc.stdout)
        except json.JSONDecodeError:
            result = {"successful": False, "error": last[:300]}
        if result.get("successful"):
            if result.get("storedInFile") and result.get("outputFilePath"):
                stored = json.loads(Path(result["outputFilePath"]).read_text())
                return stored.get("data") or {}
            return result.get("data") or {}
        if attempt + 1 < attempts:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"{tool} mislukt: {last[:500]}")


def b64_sql(value: str | None) -> str:
    if value is None:
        return "NULL"
    encoded = base64.b64encode(value.encode("utf-8")).decode("ascii")
    return f"convert_from(decode('{encoded}','base64'),'UTF8')"


def num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def parse_iso(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)


def euro(document: dict[str, Any]) -> float:
    return num(document.get("total_price_incl_tax_base") or document.get("total_price_incl_tax"))


def list_moneybird_sales(admin_id: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for page in range(1, 21):
        payload = composio(
            "MONEYBIRD_LIST_SALES_INVOICES",
            {
                "administration_id": admin_id,
                "filter": "period=current_year",
                "page": page,
                "per_page": 100,
            },
        )
        batch = payload.get("details") or []
        rows.extend(batch)
        if len(batch) < 100:
            break
    return rows


def list_moneybird_purchases(admin_id: str) -> list[dict[str, Any]]:
    """Composio biedt momenteel geen inkoopfacturenlijst; gebruik bestaande veilige tokenroute."""
    token_path = Path.home() / ".elite-fit" / "moneybird-token"
    if not token_path.exists():
        return []
    token = token_path.read_text().strip()
    rows: list[dict[str, Any]] = []
    for page in range(1, 21):
        params = urllib.parse.urlencode({"page": page, "per_page": 100, "filter": "period:this_year"})
        request = urllib.request.Request(
            f"https://moneybird.com/api/v2/{admin_id}/documents/purchase_invoices.json?{params}",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < 100:
            break
    return rows


def finance_values(
    invoices: list[dict[str, Any]], purchases: list[dict[str, Any]], start: dt.date, end: dt.date
) -> dict[str, Any]:
    def in_range(value: str | None) -> bool:
        if not value:
            return False
        try:
            day = dt.date.fromisoformat(value[:10])
        except ValueError:
            return False
        return start <= day <= end

    sales = [invoice for invoice in invoices if in_range(invoice.get("invoice_date"))]
    costs = [purchase for purchase in purchases if in_range(purchase.get("date"))]
    invoiced = sum(euro(invoice) for invoice in sales if invoice.get("state") != "draft")
    paid = sum(euro(invoice) for invoice in sales if invoice.get("state") == "paid")
    expenses = sum(euro(purchase) for purchase in costs)
    outstanding = sum(num(invoice.get("total_unpaid_base") or invoice.get("total_unpaid")) for invoice in sales)
    late = [invoice for invoice in sales if str(invoice.get("state") or "").lower() == "late"]
    overdue = sum(num(invoice.get("total_unpaid_base") or invoice.get("total_unpaid")) for invoice in late)
    margin = paid - expenses
    return {
        "invoiced": round(invoiced, 2),
        "paid": round(paid, 2),
        "expenses": round(expenses, 2),
        "outstanding": round(outstanding, 2),
        "overdue": round(overdue, 2),
        "margin": round(margin, 2),
        "margin_percentage": round((margin / paid) * 100, 2) if paid else None,
        "sales_count": len(sales),
        "purchase_count": len(costs),
        "overdue_count": len(late),
    }


def ga_report(dimensions: list[str], metrics: list[str], start: dt.date, end: dt.date) -> dict[str, Any]:
    return composio(
        "GOOGLE_ANALYTICS_RUN_REPORT",
        {
            "property": GA_PROPERTY,
            "dateRanges": [{"startDate": start.isoformat(), "endDate": end.isoformat()}],
            "dimensions": [{"name": value} for value in dimensions],
            "metrics": [{"name": value} for value in metrics],
            "limit": 1000,
        },
    )


def parse_ga_rows(report: dict[str, Any]) -> list[dict[str, Any]]:
    dimension_names = [item.get("name") for item in report.get("dimensionHeaders") or []]
    metric_names = [item.get("name") for item in report.get("metricHeaders") or []]
    rows: list[dict[str, Any]] = []
    for row in report.get("rows") or []:
        parsed: dict[str, Any] = {}
        for key, value in zip(dimension_names, row.get("dimensionValues") or []):
            parsed[str(key)] = value.get("value")
        for key, value in zip(metric_names, row.get("metricValues") or []):
            parsed[str(key)] = num(value.get("value"))
        rows.append(parsed)
    return rows


def ga_data(start: dt.date, end: dt.date) -> tuple[dict[str, int], list[dict[str, Any]], list[dict[str, Any]]]:
    channel_metrics = ["sessions", "activeUsers", "newUsers", "engagedSessions", "screenPageViews", "eventCount"]
    channels = parse_ga_rows(ga_report(["sessionDefaultChannelGroup"], channel_metrics, start, end))
    events = parse_ga_rows(ga_report(["eventName"], ["eventCount"], start, end))
    totals = {metric: int(sum(row.get(metric, 0) for row in channels)) for metric in channel_metrics}
    event_map = {str(row.get("eventName")): int(row.get("eventCount", 0)) for row in events}
    totals["cta_clicks"] = event_map.get("cta_click", 0)
    totals["generate_leads"] = event_map.get("generate_lead", 0)
    return totals, channels, events


def calendar_items(start: dt.datetime, end: dt.datetime) -> list[dict[str, Any]]:
    payload = composio(
        "GOOGLECALENDAR_EVENTS_LIST",
        {
            "calendarId": "primary",
            "timeMin": start.isoformat(),
            "timeMax": end.isoformat(),
            "timeZone": "Europe/Amsterdam",
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": 2500,
            "fields": "items(id,status,summary,start,end,eventType),nextPageToken",
        },
    )
    return payload.get("items") or []


def event_time(event: dict[str, Any], key: str) -> dt.datetime | None:
    block = event.get(key) or {}
    value = block.get("dateTime")
    return parse_iso(value)


def calendar_aggregate(events: list[dict[str, Any]]) -> dict[str, int]:
    result = {
        "events": 0,
        "business": 0,
        "strategy": 0,
        "coaching": 0,
        "group": 0,
        "focus": 0,
        "minutes": 0,
    }
    for event in events:
        if event.get("status") == "cancelled":
            continue
        summary = str(event.get("summary") or "").lower()
        start = event_time(event, "start")
        end = event_time(event, "end")
        minutes = max(0, int((end - start).total_seconds() / 60)) if start and end else 0
        result["events"] += 1
        strategy = any(word in summary for word in ("strategiegesprek", "strategy call", "intakegesprek"))
        coaching = any(word in summary for word in ("coaching", "check-in", "check in", "klantcall", "client call"))
        group = any(word in summary for word in ("team call", "teamcall", "groepscall", "community call"))
        focus = event.get("eventType") == "focusTime" or any(word in summary for word in ("deep work", "focusblok", "focus block"))
        business = strategy or coaching or group or focus or any(
            word in summary for word in ("elite fit", "marketing", "sales", "content", "operations", "opname", "meeting")
        )
        result["strategy"] += int(strategy)
        result["coaching"] += int(coaching)
        result["group"] += int(group)
        result["focus"] += int(focus)
        result["business"] += int(business)
        if business:
            result["minutes"] += minutes
    return result


def fathom_count(start: dt.datetime, end: dt.datetime) -> tuple[int, int]:
    payload = composio(
        "FATHOM_LIST_MEETINGS",
        {
            "created_after": start.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "created_before": end.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "include_summary": False,
            "include_transcript": False,
            "include_crm_matches": True,
            "include_action_items": True,
        },
    )
    items = payload.get("items") or []
    matched = sum(bool(item.get("crm_matches")) for item in items)
    return len(items), matched


def sync_status_sql(source: str, status: str, count: int, message: str | None = None) -> str:
    return (
        "INSERT INTO public.integration_sync_status "
        "(user_id,source,status,last_started_at,last_completed_at,record_count,message) VALUES ("
        f"'{USER_ID}'::uuid,{b64_sql(source)},{b64_sql(status)},now(),now(),{count},{b64_sql(message)}) "
        "ON CONFLICT (user_id,source) DO UPDATE SET status=excluded.status,last_started_at=excluded.last_started_at,"
        "last_completed_at=excluded.last_completed_at,record_count=excluded.record_count,message=excluded.message;"
    )


def build_sql(now: dt.datetime) -> tuple[str, dict[str, Any]]:
    today = now.date()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)
    next_month = (month_start.replace(day=28) + dt.timedelta(days=4)).replace(day=1)

    admins = composio("MONEYBIRD_LIST_ADMINISTRATIONS", {}).get("details") or []
    if not admins:
        raise RuntimeError("Geen Moneybird-administratie bereikbaar")
    admin_id = str(admins[0]["id"])
    invoices = list_moneybird_sales(admin_id)
    purchases = list_moneybird_purchases(admin_id)
    finance_month = finance_values(invoices, purchases, month_start, today)
    finance_year = finance_values(invoices, purchases, year_start, today)

    ga_totals, channels, events = ga_data(month_start, today)

    month_events = calendar_items(
        dt.datetime.combine(month_start, dt.time.min, tzinfo=AMSTERDAM),
        dt.datetime.combine(next_month, dt.time.min, tzinfo=AMSTERDAM),
    )
    upcoming_events = calendar_items(now.astimezone(AMSTERDAM), now.astimezone(AMSTERDAM) + dt.timedelta(days=7))
    calendar_month = calendar_aggregate(month_events)
    calendar_upcoming = calendar_aggregate(upcoming_events)
    fathom_meetings, fathom_matches = fathom_count(
        dt.datetime.combine(month_start, dt.time.min, tzinfo=AMSTERDAM),
        dt.datetime.combine(next_month, dt.time.min, tzinfo=AMSTERDAM),
    )

    statements: list[str] = []
    for start, values in ((month_start, finance_month), (year_start, finance_year)):
        statements.append(
            "INSERT INTO public.finance_snapshots "
            "(user_id,snapshot_date,period_start,period_end,revenue_invoiced,revenue_paid,expenses,outstanding,overdue,margin,margin_percentage,sales_invoice_count,purchase_invoice_count,overdue_count,last_synced_at) VALUES ("
            f"'{USER_ID}'::uuid,current_date,'{start}'::date,'{today}'::date,{values['invoiced']},{values['paid']},{values['expenses']},{values['outstanding']},{values['overdue']},{values['margin']},"
            f"{'NULL' if values['margin_percentage'] is None else values['margin_percentage']},{values['sales_count']},{values['purchase_count']},{values['overdue_count']},now()) "
            "ON CONFLICT (user_id,snapshot_date,period_start,period_end) DO UPDATE SET revenue_invoiced=excluded.revenue_invoiced,revenue_paid=excluded.revenue_paid,expenses=excluded.expenses,outstanding=excluded.outstanding,overdue=excluded.overdue,margin=excluded.margin,margin_percentage=excluded.margin_percentage,sales_invoice_count=excluded.sales_invoice_count,purchase_invoice_count=excluded.purchase_invoice_count,overdue_count=excluded.overdue_count,last_synced_at=now();"
        )

    statements.append(
        "INSERT INTO public.website_snapshots "
        "(user_id,snapshot_date,period_start,period_end,sessions,active_users,new_users,engaged_sessions,page_views,event_count,cta_clicks,generate_leads,last_synced_at) VALUES ("
        f"'{USER_ID}'::uuid,current_date,'{month_start}'::date,'{today}'::date,{ga_totals['sessions']},{ga_totals['activeUsers']},{ga_totals['newUsers']},{ga_totals['engagedSessions']},{ga_totals['screenPageViews']},{ga_totals['eventCount']},{ga_totals['cta_clicks']},{ga_totals['generate_leads']},now()) "
        "ON CONFLICT (user_id,snapshot_date,period_start,period_end) DO UPDATE SET sessions=excluded.sessions,active_users=excluded.active_users,new_users=excluded.new_users,engaged_sessions=excluded.engaged_sessions,page_views=excluded.page_views,event_count=excluded.event_count,cta_clicks=excluded.cta_clicks,generate_leads=excluded.generate_leads,last_synced_at=now();"
    )
    for row in channels:
        statements.append(
            "INSERT INTO public.website_breakdowns (user_id,snapshot_date,period_start,period_end,dimension_type,dimension_value,sessions,active_users,new_users,engaged_sessions,page_views,event_count,last_synced_at) VALUES ("
            f"'{USER_ID}'::uuid,current_date,'{month_start}'::date,'{today}'::date,'kanaal',{b64_sql(str(row.get('sessionDefaultChannelGroup') or 'Onbekend'))},{int(row.get('sessions',0))},{int(row.get('activeUsers',0))},{int(row.get('newUsers',0))},{int(row.get('engagedSessions',0))},{int(row.get('screenPageViews',0))},{int(row.get('eventCount',0))},now()) "
            "ON CONFLICT (user_id,snapshot_date,period_start,period_end,dimension_type,dimension_value) DO UPDATE SET sessions=excluded.sessions,active_users=excluded.active_users,new_users=excluded.new_users,engaged_sessions=excluded.engaged_sessions,page_views=excluded.page_views,event_count=excluded.event_count,last_synced_at=now();"
        )
    for row in events:
        statements.append(
            "INSERT INTO public.website_breakdowns (user_id,snapshot_date,period_start,period_end,dimension_type,dimension_value,event_count,last_synced_at) VALUES ("
            f"'{USER_ID}'::uuid,current_date,'{month_start}'::date,'{today}'::date,'event',{b64_sql(str(row.get('eventName') or 'onbekend'))},{int(row.get('eventCount',0))},now()) "
            "ON CONFLICT (user_id,snapshot_date,period_start,period_end,dimension_type,dimension_value) DO UPDATE SET event_count=excluded.event_count,last_synced_at=now();"
        )

    statements.append(
        "INSERT INTO public.operations_snapshots "
        "(user_id,snapshot_date,period_start,period_end,calendar_events,business_meetings,strategy_calls,coaching_calls,group_calls,focus_blocks,meeting_minutes,upcoming_7d_events,upcoming_7d_meeting_minutes,fathom_meetings,fathom_crm_matches,last_synced_at) VALUES ("
        f"'{USER_ID}'::uuid,current_date,'{month_start}'::date,'{today}'::date,{calendar_month['events']},{calendar_month['business']},{calendar_month['strategy']},{calendar_month['coaching']},{calendar_month['group']},{calendar_month['focus']},{calendar_month['minutes']},{calendar_upcoming['business']},{calendar_upcoming['minutes']},{fathom_meetings},{fathom_matches},now()) "
        "ON CONFLICT (user_id,snapshot_date,period_start,period_end) DO UPDATE SET calendar_events=excluded.calendar_events,business_meetings=excluded.business_meetings,strategy_calls=excluded.strategy_calls,coaching_calls=excluded.coaching_calls,group_calls=excluded.group_calls,focus_blocks=excluded.focus_blocks,meeting_minutes=excluded.meeting_minutes,upcoming_7d_events=excluded.upcoming_7d_events,upcoming_7d_meeting_minutes=excluded.upcoming_7d_meeting_minutes,fathom_meetings=excluded.fathom_meetings,fathom_crm_matches=excluded.fathom_crm_matches,last_synced_at=now();"
    )

    statements.append(
        "INSERT INTO public.metrics (user_id,source,metric,period,value,synced_at) VALUES "
        f"('{USER_ID}'::uuid,'moneybird','omzet','{today.strftime('%Y-%m')}',{finance_month['invoiced']},now()),"
        f"('{USER_ID}'::uuid,'moneybird','omzet','{today.year}',{finance_year['invoiced']},now()) "
        "ON CONFLICT (user_id,source,metric,period) DO UPDATE SET value=excluded.value,synced_at=excluded.synced_at;"
    )

    statements.extend(
        [
            sync_status_sql("moneybird", "ok", len(invoices) + len(purchases)),
            sync_status_sql("google_analytics", "ok", int(ga_totals["sessions"])),
            sync_status_sql("google_calendar", "ok", len(month_events)),
            sync_status_sql("fathom", "ok" if fathom_meetings else "gedeeltelijk", fathom_meetings, None if fathom_meetings else "Geen recente Fathom-calls gevonden"),
        ]
    )

    summary = {
        "moneybird_sales": len(invoices),
        "moneybird_purchases": len(purchases),
        "ga_sessions": int(ga_totals["sessions"]),
        "calendar_events": len(month_events),
        "fathom_meetings": fathom_meetings,
    }
    return "\n".join(statements), summary


def main() -> int:
    now = dt.datetime.now(dt.timezone.utc)
    sql, summary = build_sql(now)
    composio("SUPABASE_BETA_RUN_SQL_QUERY", {"ref": PROJECT_REF, "query": sql, "read_only": False}, attempts=2)
    print(json.dumps({"status": "ok", **summary}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)[:500]}))
        raise
