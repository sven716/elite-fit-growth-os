#!/usr/bin/env python3
"""Synchroniseer Instagram-prestaties en GHL-funnel naar Growth OS.

De scriptuitvoer bevat alleen aantallen. Namen, e-mails en andere leadgegevens
worden uitsluitend tijdelijk in het proces gebruikt en niet gelogd of in de
marketingtabellen opgeslagen.
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
from typing import Any

PROJECT_REF = os.getenv("GROWTH_OS_PROJECT_REF", "pqdqzmrrlxbwbedrmihz")
USER_ID = os.getenv("GROWTH_OS_USER_ID", "cfb57eb3-8efe-4372-9e9e-21bee4ea8009")


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
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            payload = {"successful": False, "error": last[:300]}
        if payload.get("successful"):
            return payload.get("data") or {}
        if attempt + 1 < attempts:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"{tool} mislukt: {last[:500]}")


def b64_sql(value: str | None) -> str:
    if value is None:
        return "NULL"
    encoded = base64.b64encode(value.encode("utf-8")).decode("ascii")
    return f"convert_from(decode('{encoded}','base64'),'UTF8')"


def sql_num(value: Any) -> str:
    return "NULL" if value is None else str(int(value))


def parse_time(value: Any) -> dt.datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        if number > 10_000_000_000:
            number /= 1000
        return dt.datetime.fromtimestamp(number, tz=dt.timezone.utc)
    text = str(value).replace("Z", "+00:00")
    if re.fullmatch(r"\d+", text):
        return parse_time(int(text))
    try:
        parsed = dt.datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)


def nested_data(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data")
    return data if isinstance(data, dict) else payload


def fetch_instagram_media(since: dt.datetime) -> list[dict[str, Any]]:
    account = composio(
        "INSTAGRAM_GET_USER_INFO",
        {"ig_user_id": "me", "fields": "id,username,account_type,media_count"},
    )
    ig_user_id = str(account["id"])
    fields = (
        "id,caption,media_type,media_product_type,permalink,timestamp,"
        "thumbnail_url,media_url,like_count,comments_count"
    )
    def load_pages(use_server_since: bool) -> list[dict[str, Any]]:
        loaded: list[dict[str, Any]] = []
        after: str | None = None
        while True:
            request: dict[str, Any] = {
                "ig_user_id": ig_user_id,
                "limit": 100,
                "fields": fields,
            }
            if use_server_since:
                request["since"] = int(since.timestamp())
            if after:
                request["after"] = after
            payload = composio("INSTAGRAM_GET_IG_USER_MEDIA", request)
            page = payload.get("data") if isinstance(payload.get("data"), list) else []
            loaded.extend(page)
            if not use_server_since and page:
                timestamps = [parse_time(row.get("timestamp")) for row in page]
                known = [value for value in timestamps if value]
                if known and min(known) < since:
                    break
            after = ((payload.get("paging") or {}).get("cursors") or {}).get("after")
            if not after or not page:
                break
        return loaded

    rows = load_pages(use_server_since=True)
    # De Graph-wrapper retourneert op sommige verbindingen leeg bij since/until.
    # Val dan terug op cursorpaginering en filter lokaal.
    if not rows:
        rows = [
            row
            for row in load_pages(use_server_since=False)
            if (parse_time(row.get("timestamp")) or since) >= since
        ]

    # Actieve Stories staan niet altijd in de gewone medialijst.
    try:
        stories_payload = composio(
            "INSTAGRAM_GET_IG_USER_STORIES",
            {
                "ig_user_id": ig_user_id,
                "limit": 100,
                "fields": fields,
            },
        )
        stories = stories_payload.get("data") if isinstance(stories_payload.get("data"), list) else []
        for row in stories:
            row["media_product_type"] = "STORIES"
        rows.extend(stories)
    except Exception:
        # Geen actieve Stories of ontbrekende scope mag de post-sync niet blokkeren.
        pass

    return list({str(row.get("id")): row for row in rows if row.get("id")}.values())


def metric_value(item: dict[str, Any]) -> Any:
    values = item.get("values") or []
    if values and isinstance(values[0], dict):
        value = values[0].get("value")
        if isinstance(value, (int, float)):
            return value
    total = item.get("total_value")
    if isinstance(total, dict) and isinstance(total.get("value"), (int, float)):
        return total["value"]
    return None


def fetch_insights(media: dict[str, Any]) -> dict[str, Any]:
    media_id = str(media["id"])
    product = str(media.get("media_product_type") or "").upper()
    metrics = ["views", "reach", "saved", "likes", "comments", "shares", "total_interactions"]
    if product == "REELS":
        metrics += ["ig_reels_video_view_total_time", "ig_reels_avg_watch_time"]
    if "STOR" in product:
        metrics += ["replies", "navigation", "follows", "profile_activity"]
    try:
        payload = composio(
            "INSTAGRAM_GET_IG_MEDIA_INSIGHTS",
            {"ig_media_id": media_id, "metric": metrics, "period": "lifetime"},
            attempts=2,
        )
    except Exception:
        # Probeer de universele set zodat één incompatibele metriek niet alles breekt.
        try:
            payload = composio(
                "INSTAGRAM_GET_IG_MEDIA_INSIGHTS",
                {
                    "ig_media_id": media_id,
                    "metric": ["views", "reach", "saved", "likes", "comments", "shares", "total_interactions"],
                    "period": "lifetime",
                },
                attempts=1,
            )
        except Exception:
            return {}
    entries = payload.get("data") if isinstance(payload.get("data"), list) else []
    return {str(item.get("name")): metric_value(item) for item in entries}


TRIGGER_RE = re.compile(
    r"(?:reageer|comment|stuur|typ)(?:\s+met)?\s+[\"'‘’]?([A-ZÀ-ÖØ-Þ0-9_-]{3,30})",
    re.IGNORECASE,
)


def trigger_from_caption(caption: str | None) -> str | None:
    if not caption:
        return None
    match = TRIGGER_RE.search(caption)
    return match.group(1).upper() if match else None


def fetch_pipelines() -> tuple[dict[str, str], set[str], set[str], set[str]]:
    payload = nested_data(composio("HIGHLEVEL_MCP_OPPORTUNITIES_GET_PIPELINES", {}))
    stage_names: dict[str, str] = {}
    booked: set[str] = set()
    held: set[str] = set()
    won: set[str] = set()
    for pipeline in payload.get("pipelines") or []:
        for stage in pipeline.get("stages") or []:
            stage_id = str(stage.get("id") or "")
            name = str(stage.get("name") or "")
            lower = name.lower()
            stage_names[stage_id] = name
            if any(word in lower for word in ("geboekt", "afspraak", "booked", "ingepland")):
                booked.add(stage_id)
            if any(word in lower for word in ("gevoerd", "gehad", "held", "gesproken")):
                held.add(stage_id)
            if any(word in lower for word in ("closed won", "gewonnen", "klant", "customer")):
                won.add(stage_id)
    return stage_names, booked, held, won


def fetch_opportunities(start: dt.date, end: dt.date) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    page = 1
    while True:
        payload = nested_data(
            composio(
                "HIGHLEVEL_MCP_OPPORTUNITIES_SEARCH_OPPORTUNITY",
                {
                    "query_limit": 5,
                    "query_page": page,
                    "query_status": "all",
                    "query_date": start.strftime("%m-%d-%Y"),
                    "query_endDate": end.strftime("%m-%d-%Y"),
                },
            )
        )
        batch = payload.get("opportunities") or []
        rows.extend(batch)
        meta = payload.get("meta") or {}
        if not batch or not meta.get("nextPage"):
            break
        page = int(meta["nextPage"])
    return rows


def fetch_contacts(start: dt.datetime, max_pages: int = 50) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start_after: int | None = None
    start_after_id: str | None = None
    for _ in range(max_pages):
        request: dict[str, Any] = {"query_limit": 15}
        if start_after is not None:
            request["query_startAfter"] = start_after
        if start_after_id:
            request["query_startAfterId"] = start_after_id
        payload = nested_data(composio("HIGHLEVEL_MCP_CONTACTS_GET_CONTACTS", request))
        batch = payload.get("contacts") or []
        if not batch:
            break
        for contact in batch:
            added = parse_time(contact.get("dateAdded"))
            if added and added >= start:
                rows.append(contact)
        oldest = min((parse_time(row.get("dateAdded")) for row in batch), default=None)
        if oldest and oldest < start:
            break
        meta = payload.get("meta") or {}
        start_after = meta.get("startAfter")
        start_after_id = meta.get("startAfterId")
        if start_after is None or not start_after_id:
            break
    return rows


def attribution_text(opportunity: dict[str, Any]) -> str:
    parts = [str(opportunity.get("source") or "")]
    for attr in opportunity.get("attributions") or []:
        for key in ("utmContent", "utmKeyword", "utmCampaign", "medium", "url", "pageUrl"):
            if attr.get(key):
                parts.append(str(attr[key]))
    return " ".join(parts).upper()


def exact_trigger_match(trigger: str, opportunity: dict[str, Any]) -> bool:
    text = attribution_text(opportunity)
    return re.search(rf"(?<![A-Z0-9]){re.escape(trigger.upper())}(?![A-Z0-9])", text) is not None


def build_sql(
    media_rows: list[dict[str, Any]],
    insights: dict[str, dict[str, Any]],
    opportunities: list[dict[str, Any]],
    contacts: list[dict[str, Any]],
    start: dt.date,
    end: dt.date,
    booked_stages: set[str],
    held_stages: set[str],
    won_stages: set[str],
) -> str:
    statements: list[str] = []
    for media in media_rows:
        media_id = str(media["id"])
        metric = insights.get(media_id, {})
        trigger = trigger_from_caption(media.get("caption"))
        matched = [opp for opp in opportunities if trigger and exact_trigger_match(trigger, opp)]
        conversion_known = bool(matched)
        booked = sum(str(opp.get("pipelineStageId") or "") in booked_stages for opp in matched)
        held = sum(str(opp.get("pipelineStageId") or "") in held_stages for opp in matched)
        won = sum(
            str(opp.get("status") or "").lower() == "won"
            or str(opp.get("pipelineStageId") or "") in won_stages
            for opp in matched
        )
        email_leads = sum(bool((opp.get("contact") or {}).get("email")) for opp in matched)
        product = str(media.get("media_product_type") or ("STORIES" if media.get("media_type") == "STORY" else ""))
        navigation = metric.get("navigation")
        navigation_sql = b64_sql(json.dumps(navigation)) + "::jsonb" if navigation is not None else "NULL"
        values = [
            f"'{USER_ID}'::uuid",
            b64_sql(media_id),
            b64_sql(media.get("caption")),
            b64_sql(media.get("media_type")),
            b64_sql(product),
            b64_sql(media.get("permalink")),
            b64_sql(media.get("thumbnail_url") or media.get("media_url")),
            f"'{media.get('timestamp')}'::timestamptz",
            sql_num(metric.get("views")),
            sql_num(metric.get("reach")),
            sql_num(metric.get("likes", media.get("like_count"))),
            sql_num(metric.get("comments", media.get("comments_count"))),
            sql_num(metric.get("saved")),
            sql_num(metric.get("shares")),
            sql_num(metric.get("total_interactions")),
            sql_num(metric.get("ig_reels_video_view_total_time")),
            sql_num(metric.get("ig_reels_avg_watch_time")),
            sql_num(metric.get("replies")),
            sql_num(metric.get("follows")),
            sql_num(metric.get("profile_activity")),
            navigation_sql,
            b64_sql(trigger),
            sql_num(len(matched) if conversion_known else None),
            sql_num(email_leads if conversion_known else None),
            sql_num(booked if conversion_known else None),
            sql_num(held if conversion_known else None),
            sql_num(won if conversion_known else None),
        ]
        statements.append(
            "INSERT INTO public.instagram_media_performance "
            "(user_id,external_media_id,caption,media_type,media_product_type,permalink,thumbnail_url,published_at,"
            "views,reach,likes,comments,saved,shares,total_interactions,total_watch_time_ms,avg_watch_time_ms,"
            "replies,follows,profile_visits,navigation,trigger_key,leads,email_leads,booked_calls,held_calls,won_customers) VALUES ("
            + ",".join(values)
            + ") ON CONFLICT (user_id,external_media_id) DO UPDATE SET "
            "caption=excluded.caption,media_type=excluded.media_type,media_product_type=excluded.media_product_type,"
            "permalink=excluded.permalink,thumbnail_url=excluded.thumbnail_url,published_at=excluded.published_at,"
            "views=COALESCE(excluded.views,instagram_media_performance.views),"
            "reach=COALESCE(excluded.reach,instagram_media_performance.reach),"
            "likes=COALESCE(excluded.likes,instagram_media_performance.likes),"
            "comments=COALESCE(excluded.comments,instagram_media_performance.comments),"
            "saved=COALESCE(excluded.saved,instagram_media_performance.saved),"
            "shares=COALESCE(excluded.shares,instagram_media_performance.shares),"
            "total_interactions=COALESCE(excluded.total_interactions,instagram_media_performance.total_interactions),"
            "total_watch_time_ms=COALESCE(excluded.total_watch_time_ms,instagram_media_performance.total_watch_time_ms),"
            "avg_watch_time_ms=COALESCE(excluded.avg_watch_time_ms,instagram_media_performance.avg_watch_time_ms),"
            "replies=COALESCE(excluded.replies,instagram_media_performance.replies),"
            "follows=COALESCE(excluded.follows,instagram_media_performance.follows),"
            "profile_visits=COALESCE(excluded.profile_visits,instagram_media_performance.profile_visits),"
            "navigation=COALESCE(excluded.navigation,instagram_media_performance.navigation),"
            "trigger_key=COALESCE(excluded.trigger_key,instagram_media_performance.trigger_key),"
            "leads=COALESCE(excluded.leads,instagram_media_performance.leads),"
            "email_leads=COALESCE(excluded.email_leads,instagram_media_performance.email_leads),"
            "booked_calls=COALESCE(excluded.booked_calls,instagram_media_performance.booked_calls),"
            "held_calls=COALESCE(excluded.held_calls,instagram_media_performance.held_calls),"
            "won_customers=COALESCE(excluded.won_customers,instagram_media_performance.won_customers),"
            "last_synced_at=now();"
        )

    contacts_with_email = sum(bool(c.get("email")) for c in contacts)
    contacts_with_source = sum(bool(c.get("source")) for c in contacts)
    instagram_contacts = sum("instagram" in str(c.get("source") or "").lower() for c in contacts)
    open_opps = sum(str(o.get("status") or "").lower() == "open" for o in opportunities)
    won_opps = sum(
        str(o.get("status") or "").lower() == "won"
        or str(o.get("pipelineStageId") or "") in won_stages
        for o in opportunities
    )
    booked_calls = sum(str(o.get("pipelineStageId") or "") in booked_stages for o in opportunities)
    held_calls = sum(str(o.get("pipelineStageId") or "") in held_stages for o in opportunities)
    attributed = sum(bool(attribution_text(o).strip()) for o in opportunities)
    statements.append(
        "INSERT INTO public.marketing_funnel_snapshots "
        "(user_id,snapshot_date,period_start,period_end,contacts_total,contacts_with_email,contacts_with_source,"
        "instagram_sourced_contacts,opportunities_total,open_opportunities,won_opportunities,booked_calls,held_calls,"
        "confirmed_customer_starts,attributed_opportunities,unattributed_opportunities,last_synced_at) VALUES ("
        f"'{USER_ID}'::uuid,current_date,'{start.isoformat()}'::date,'{end.isoformat()}'::date,"
        f"{len(contacts)},{contacts_with_email},{contacts_with_source},{instagram_contacts},{len(opportunities)},"
        f"{open_opps},{won_opps},{booked_calls},{held_calls},"
        f"(SELECT count(*) FROM public.clients WHERE user_id='{USER_ID}'::uuid AND start_date BETWEEN '{start.isoformat()}'::date AND '{end.isoformat()}'::date),"
        f"{attributed},{len(opportunities)-attributed},now()) "
        "ON CONFLICT (user_id,snapshot_date,period_start,period_end) DO UPDATE SET "
        "contacts_total=excluded.contacts_total,contacts_with_email=excluded.contacts_with_email,"
        "contacts_with_source=excluded.contacts_with_source,instagram_sourced_contacts=excluded.instagram_sourced_contacts,"
        "opportunities_total=excluded.opportunities_total,open_opportunities=excluded.open_opportunities,"
        "won_opportunities=excluded.won_opportunities,booked_calls=excluded.booked_calls,held_calls=excluded.held_calls,"
        "confirmed_customer_starts=excluded.confirmed_customer_starts,attributed_opportunities=excluded.attributed_opportunities,"
        "unattributed_opportunities=excluded.unattributed_opportunities,last_synced_at=now();"
    )
    return "\n".join(statements)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90, help="Aantal dagen Instagramhistorie")
    args = parser.parse_args()

    now = dt.datetime.now(dt.timezone.utc)
    media_since = now - dt.timedelta(days=args.days)
    period_start = now.date().replace(day=1)
    period_end = now.date()

    media = fetch_instagram_media(media_since)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        result = list(pool.map(fetch_insights, media))
    insights = {str(row["id"]): metric for row, metric in zip(media, result)}

    _, booked_stages, held_stages, won_stages = fetch_pipelines()
    opportunities = fetch_opportunities(period_start, period_end)
    contacts = fetch_contacts(dt.datetime.combine(period_start, dt.time.min, tzinfo=dt.timezone.utc))

    sql = build_sql(
        media,
        insights,
        opportunities,
        contacts,
        period_start,
        period_end,
        booked_stages,
        held_stages,
        won_stages,
    )
    composio(
        "SUPABASE_BETA_RUN_SQL_QUERY",
        {"ref": PROJECT_REF, "query": sql, "read_only": False},
        attempts=2,
    )
    print(
        json.dumps(
            {
                "status": "ok",
                "instagram_items": len(media),
                "ghl_contacts_in_period": len(contacts),
                "ghl_opportunities_in_period": len(opportunities),
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
            }
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)[:500]}))
        raise
