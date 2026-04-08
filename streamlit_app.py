import json
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import streamlit as st

try:
    from zoneinfo import ZoneInfo

    APP_TZ = ZoneInfo("Asia/Shanghai")
except Exception:
    APP_TZ = timezone(timedelta(hours=8))

TASKS = [
    {
        "id": "sleep_before_23",
        "name": "23:00 前入睡",
        "desc": "保证作息稳定",
        "reward": 40,
    },
    {
        "id": "healthy_diet",
        "name": "饮食健康",
        "desc": "不暴饮暴食 + 控制糖分",
        "reward": 40,
    },
    {
        "id": "english_output",
        "name": "英语输出练习",
        "desc": "超过 10 分钟",
        "reward": 30,
    },
    {
        "id": "hardcore_tech",
        "name": "硬核技术/算法钻研",
        "desc": "超过 30 分钟",
        "reward": 30,
    },
    {
        "id": "portfolio_update",
        "name": "作品集/自比应用更新",
        "desc": "新增 10 行以上有效代码",
        "reward": 30,
    },
    {
        "id": "exercise",
        "name": "运动",
        "desc": "超过 20 分钟",
        "reward": 20,
    },
    {
        "id": "patience_practice",
        "name": "耐心练习",
        "desc": "刻意训练情绪与专注",
        "reward": 10,
    },
]
TASK_MAP = {task["id"]: task for task in TASKS}

NORMAL_BOX_COST = 200
NORMAL_BOX_BASE = {"white": 70, "blue": 20, "purple": 9, "gold": 1}
NORMAL_BOX_REWARDS = {"white": 160, "blue": 240, "purple": 700, "gold": 4000}

WEEKLY_BOX = [
    {"key": "normal", "name": "普通", "prob": 70, "multiplier": 1.05},
    {"key": "rare", "name": "稀有", "prob": 20, "multiplier": 1.2},
    {"key": "epic", "name": "史诗", "prob": 9, "multiplier": 1.5},
    {"key": "legend", "name": "传说", "prob": 1, "multiplier": 2},
]

SHOP_CATEGORIES = [
    {
        "id": "entertainment",
        "title": "娱乐消遣类",
        "desc": "针对《王者荣耀》/ 别的游戏",
        "items": [
            {
                "id": "game_hour",
                "name": "游戏权限 1 小时",
                "dynamic": True,
                "desc": "按当日累计阶梯计价：第1小时30，第2小时100，第3小时起300/小时",
            }
        ],
    },
    {
        "id": "food",
        "title": "口腹之欲类",
        "desc": "人为制造稀缺感",
        "items": [
            {"id": "ice_cream", "name": "冰淇淋", "cost": 100},
            {"id": "bbq_fried", "name": "烤肉/炸鸡等高热量食品", "cost": 800},
            {"id": "black_pearl", "name": "黑珍珠餐馆", "cost": 6000},
            {"id": "michelin_3", "name": "米其林三星", "cost": 18000},
        ],
    },
    {
        "id": "assets",
        "title": "硬核资产类",
        "desc": "高价值兑换目标",
        "items": [
            {"id": "switch2", "name": "Switch2", "cost": 18000},
            {"id": "airpods_max2", "name": "AirPods Max2", "cost": 18000},
            {"id": "ipad_pro_13", "name": "iPad Pro 13寸", "cost": 40000},
            {"id": "trip_normal", "name": "普通旅行", "cost": 12000},
            {"id": "trip_luxury", "name": "豪华旅行", "cost": 24000},
            {"id": "trip_ultra", "name": "超豪华旅行", "cost": 48000},
        ],
    },
]

SHOP_ITEM_MAP = {
    item["id"]: item
    for category in SHOP_CATEGORIES
    for item in category["items"]
    if not item.get("dynamic")
}

DATA_DIR = Path("data")
DATA_FILE = DATA_DIR / "state.json"


def now_dt() -> datetime:
    return datetime.now(APP_TZ)


def now_iso() -> str:
    return now_dt().isoformat(timespec="seconds")


def today_date() -> date:
    return now_dt().date()


def today_key() -> str:
    return today_date().isoformat()


def parse_date_key(key: str) -> date:
    return date.fromisoformat(key)


def start_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


def add_days(d: date, days: int) -> date:
    return d + timedelta(days=days)


def get_week_dates(week_start: date) -> list[str]:
    return [add_days(week_start, i).isoformat() for i in range(7)]


def format_percent(value: float) -> str:
    if value >= 10:
        return f"{value:.1f}%"
    return f"{value:.2f}%"


def game_hour_cost(used_hours: int) -> int:
    if used_hours <= 0:
        return 30
    if used_hours == 1:
        return 100
    return 300


def default_state() -> dict[str, Any]:
    return {
        "coins": 0,
        "checkins": {},
        "normal_box": {
            "purple_counter": 0,
            "gold_counter": 0,
            "opened": 0,
            "logs": [],
        },
        "weekly_box": {
            "opened_weeks": {},
            "boosts": [],
            "logs": [],
        },
        "game_hours_by_date": {},
        "shop_logs": [],
        "history": [],
        "last_normal_result": None,
        "last_weekly_result": None,
    }


def migrate_state(raw: Any) -> dict[str, Any]:
    base = default_state()
    if not isinstance(raw, dict):
        return base

    state = base | raw

    state["normal_box"] = base["normal_box"] | raw.get("normal_box", {})

    raw_weekly = raw.get("weekly_box", {}) if isinstance(raw.get("weekly_box"), dict) else {}
    state["weekly_box"] = base["weekly_box"] | raw_weekly
    state["weekly_box"]["opened_weeks"] = (
        base["weekly_box"]["opened_weeks"]
        | (raw_weekly.get("opened_weeks", {}) if isinstance(raw_weekly.get("opened_weeks"), dict) else {})
    )
    state["weekly_box"]["boosts"] = raw_weekly.get("boosts", []) if isinstance(raw_weekly.get("boosts"), list) else []
    state["weekly_box"]["logs"] = raw_weekly.get("logs", []) if isinstance(raw_weekly.get("logs"), list) else []

    raw_checkins = raw.get("checkins", {}) if isinstance(raw.get("checkins"), dict) else {}
    normalized_checkins: dict[str, dict[str, dict[str, Any]]] = {}
    for day_key, row in raw_checkins.items():
        if not isinstance(row, dict):
            continue

        normalized_checkins[day_key] = {}
        for task_id, value in row.items():
            if task_id not in TASK_MAP:
                continue

            if isinstance(value, bool):
                normalized_checkins[day_key][task_id] = {
                    "done": value,
                    "rewarded": TASK_MAP[task_id]["reward"] if value else 0,
                    "updated_at": None,
                }
            elif isinstance(value, (int, float)):
                normalized_checkins[day_key][task_id] = {
                    "done": value > 0,
                    "rewarded": int(value),
                    "updated_at": None,
                }
            elif isinstance(value, dict):
                normalized_checkins[day_key][task_id] = {
                    "done": bool(value.get("done")),
                    "rewarded": int(value.get("rewarded", 0)),
                    "updated_at": value.get("updated_at"),
                }

    state["checkins"] = normalized_checkins
    state["coins"] = int(state.get("coins", 0))

    if not isinstance(state.get("game_hours_by_date"), dict):
        state["game_hours_by_date"] = {}
    if not isinstance(state.get("shop_logs"), list):
        state["shop_logs"] = []
    if not isinstance(state.get("history"), list):
        state["history"] = []

    return state


def load_state() -> dict[str, Any]:
    if not DATA_FILE.exists():
        return default_state()

    try:
        raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return default_state()

    return migrate_state(raw)


def save_state(state: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def push_history(state: dict[str, Any], title: str, delta: int, date_key: str, event_type: str, extra: dict[str, Any] | None = None) -> None:
    state["history"].insert(
        0,
        {
            "id": f"{int(now_dt().timestamp() * 1000)}_{random.randint(1000, 9999)}",
            "at": now_iso(),
            "title": title,
            "delta": delta,
            "date_key": date_key,
            "event_type": event_type,
            "extra": extra or {},
            "balance": state["coins"],
        },
    )
    state["history"] = state["history"][:500]


def ensure_day_record(state: dict[str, Any], date_key: str) -> dict[str, Any]:
    if date_key not in state["checkins"]:
        state["checkins"][date_key] = {}
    return state["checkins"][date_key]


def completed_tasks_count(state: dict[str, Any], date_key: str) -> int:
    day = state["checkins"].get(date_key, {})
    return sum(1 for task in TASKS if day.get(task["id"], {}).get("done"))


def total_reward_for_date(state: dict[str, Any], date_key: str) -> int:
    day = state["checkins"].get(date_key, {})
    return sum(int(day.get(task["id"], {}).get("rewarded", 0)) for task in TASKS if day.get(task["id"], {}).get("done"))


def is_all_tasks_done(state: dict[str, Any], date_key: str) -> bool:
    day = state["checkins"].get(date_key, {})
    return all(day.get(task["id"], {}).get("done") for task in TASKS)


def get_boost_for_date(state: dict[str, Any], date_key: str) -> dict[str, Any] | None:
    for boost in state["weekly_box"].get("boosts", []):
        if boost["start_date"] <= date_key <= boost["end_date"]:
            return boost
    return None


def next_upcoming_boost(state: dict[str, Any], date_key: str) -> dict[str, Any] | None:
    upcoming = sorted(
        [b for b in state["weekly_box"].get("boosts", []) if b["start_date"] > date_key],
        key=lambda x: x["start_date"],
    )
    return upcoming[0] if upcoming else None


def gain_coins(state: dict[str, Any], base_amount: int, title: str, date_key: str, event_type: str, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    boost = get_boost_for_date(state, date_key)
    multiplier = float(boost["multiplier"]) if boost else 1.0
    final_amount = int(round(base_amount * multiplier))

    state["coins"] += final_amount
    push_history(
        state,
        title=title,
        delta=final_amount,
        date_key=date_key,
        event_type=event_type,
        extra={
            **(extra or {}),
            "base_amount": base_amount,
            "multiplier": multiplier,
            "boost_tier": boost["tier"] if boost else None,
        },
    )

    return {"final_amount": final_amount, "multiplier": multiplier}


def spend_coins(state: dict[str, Any], amount: int, title: str, date_key: str, event_type: str, extra: dict[str, Any] | None = None) -> bool:
    if state["coins"] < amount:
        return False

    state["coins"] -= amount
    push_history(
        state,
        title=title,
        delta=-amount,
        date_key=date_key,
        event_type=event_type,
        extra=extra,
    )
    return True


def draw_by_probability(items: list[dict[str, Any]]) -> dict[str, Any]:
    roll = random.random() * 100
    cursor = 0.0
    for item in items:
        cursor += float(item["prob"])
        if roll < cursor:
            return item
    return items[-1]


def get_normal_probabilities(state: dict[str, Any]) -> list[dict[str, Any]]:
    purple_counter = int(state["normal_box"].get("purple_counter", 0))
    gold_counter = int(state["normal_box"].get("gold_counter", 0))

    # 对齐你的示例：第11次开盒开始吃到紫保底，第61次开盒开始吃到金保底。
    purple_bonus = max(0, purple_counter - 9) * 10
    gold_bonus = max(0, gold_counter - 59) * 2

    purple = NORMAL_BOX_BASE["purple"] + purple_bonus
    gold = NORMAL_BOX_BASE["gold"] + gold_bonus
    white = NORMAL_BOX_BASE["white"]
    blue = NORMAL_BOX_BASE["blue"]

    if purple + gold >= 100:
        total_special = purple + gold
        purple = (purple / total_special) * 100
        gold = 100 - purple
        white = 0
        blue = 0
    else:
        residual = 100 - purple - gold
        white = residual * (NORMAL_BOX_BASE["white"] / (NORMAL_BOX_BASE["white"] + NORMAL_BOX_BASE["blue"]))
        blue = residual * (NORMAL_BOX_BASE["blue"] / (NORMAL_BOX_BASE["white"] + NORMAL_BOX_BASE["blue"]))

    return [
        {"key": "white", "name": "白盒", "prob": white, "reward": NORMAL_BOX_REWARDS["white"]},
        {"key": "blue", "name": "蓝盒", "prob": blue, "reward": NORMAL_BOX_REWARDS["blue"]},
        {"key": "purple", "name": "紫盒", "prob": purple, "reward": NORMAL_BOX_REWARDS["purple"]},
        {"key": "gold", "name": "金盒", "prob": gold, "reward": NORMAL_BOX_REWARDS["gold"]},
    ]


def get_eligible_weeks(state: dict[str, Any]) -> list[dict[str, str]]:
    current_week_key = start_of_week(today_date()).isoformat()

    candidate_week_keys: set[str] = set()
    for date_key in state["checkins"].keys():
        week_key = start_of_week(parse_date_key(date_key)).isoformat()
        if week_key < current_week_key:
            candidate_week_keys.add(week_key)

    eligible = []
    for week_key in sorted(candidate_week_keys):
        if week_key in state["weekly_box"].get("opened_weeks", {}):
            continue

        week_start = parse_date_key(week_key)
        day_keys = get_week_dates(week_start)
        if all(is_all_tasks_done(state, key) for key in day_keys):
            eligible.append(
                {
                    "week_key": week_key,
                    "start_date": day_keys[0],
                    "end_date": day_keys[-1],
                }
            )

    return eligible


def schedule_boost(state: dict[str, Any], multiplier: float, tier: str, source_week_key: str) -> dict[str, Any]:
    start_date = start_of_week(today_date()) + timedelta(days=7)

    boosts = sorted(state["weekly_box"].get("boosts", []), key=lambda x: x["start_date"])
    for boost in boosts:
        if boost["end_date"] >= start_date.isoformat():
            candidate = parse_date_key(boost["end_date"]) + timedelta(days=1)
            if candidate > start_date:
                start_date = candidate

    start_date = start_of_week(start_date)
    end_date = start_date + timedelta(days=6)

    boost_record = {
        "id": f"boost_{int(now_dt().timestamp() * 1000)}_{random.randint(100, 999)}",
        "multiplier": multiplier,
        "tier": tier,
        "source_week_key": source_week_key,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "created_at": now_iso(),
    }

    state["weekly_box"]["boosts"].append(boost_record)
    return boost_record


def open_normal_box(state: dict[str, Any]) -> str:
    date_key = today_key()
    if not spend_coins(state, NORMAL_BOX_COST, "开启普通盲盒", date_key, "box_spend"):
        return "代币不足，无法开启普通盲盒。"

    probabilities = get_normal_probabilities(state)
    result = draw_by_probability(probabilities)

    reward_info = gain_coins(
        state,
        base_amount=int(result["reward"]),
        title=f"普通盲盒：{result['name']}",
        date_key=date_key,
        event_type="box_reward",
        extra={"box": result["key"], "prob": float(result["prob"])},
    )

    state["normal_box"]["opened"] += 1

    if result["key"] in {"white", "blue"}:
        state["normal_box"]["purple_counter"] += 1
    else:
        state["normal_box"]["purple_counter"] = 0

    if result["key"] == "gold":
        state["normal_box"]["gold_counter"] = 0
    else:
        state["normal_box"]["gold_counter"] += 1

    state["normal_box"]["logs"].insert(
        0,
        {
            "at": now_iso(),
            "result": result["key"],
            "result_name": result["name"],
            "reward_base": int(result["reward"]),
            "reward_final": reward_info["final_amount"],
            "probs": {row["key"]: round(float(row["prob"]), 2) for row in probabilities},
            "counters_after": {
                "purple_counter": state["normal_box"]["purple_counter"],
                "gold_counter": state["normal_box"]["gold_counter"],
            },
        },
    )
    state["normal_box"]["logs"] = state["normal_box"]["logs"][:200]

    state["last_normal_result"] = {
        "name": result["name"],
        "reward": reward_info["final_amount"],
        "time": now_iso(),
    }

    return f"开出【{result['name']}】获得 {reward_info['final_amount']} 代币。"


def open_weekly_box(state: dict[str, Any]) -> str:
    eligible = get_eligible_weeks(state)
    if not eligible:
        return "暂无可开启周盲盒（需要整周7天全完成）。"

    source_week = eligible[0]
    draw = draw_by_probability(WEEKLY_BOX)

    state["weekly_box"]["opened_weeks"][source_week["week_key"]] = {
        "opened_at": now_iso(),
        "tier": draw["key"],
        "name": draw["name"],
        "multiplier": float(draw["multiplier"]),
    }

    boost = schedule_boost(
        state,
        multiplier=float(draw["multiplier"]),
        tier=draw["name"],
        source_week_key=source_week["week_key"],
    )

    state["weekly_box"]["logs"].insert(
        0,
        {
            "at": now_iso(),
            "source_week": source_week["week_key"],
            "source_range": f"{source_week['start_date']} ~ {source_week['end_date']}",
            "result_tier": draw["name"],
            "multiplier": float(draw["multiplier"]),
            "scheduled_start": boost["start_date"],
            "scheduled_end": boost["end_date"],
        },
    )
    state["weekly_box"]["logs"] = state["weekly_box"]["logs"][:100]

    push_history(
        state,
        title=f"周盲盒开奖：{draw['name']}（{draw['multiplier']}x）",
        delta=0,
        date_key=today_key(),
        event_type="weekly_box",
        extra={
            "source_week": source_week["week_key"],
            "scheduled_start": boost["start_date"],
            "scheduled_end": boost["end_date"],
        },
    )

    state["last_weekly_result"] = {
        "name": draw["name"],
        "multiplier": float(draw["multiplier"]),
        "start_date": boost["start_date"],
        "end_date": boost["end_date"],
    }

    return (
        f"开出【{draw['name']}】倍率 {draw['multiplier']}x，"
        f"生效周：{boost['start_date']} ~ {boost['end_date']}。"
    )


def toggle_task(state: dict[str, Any], task_id: str, date_key: str) -> str:
    task = TASK_MAP[task_id]
    if date_key > today_key():
        return "不能对未来日期打卡。"

    day_record = ensure_day_record(state, date_key)
    current = day_record.get(task_id, {})

    if current.get("done"):
        deducted = int(current.get("rewarded", 0))
        day_record[task_id] = {
            "done": False,
            "rewarded": 0,
            "updated_at": now_iso(),
        }
        state["coins"] -= deducted
        push_history(
            state,
            title=f"撤销打卡：{task['name']}",
            delta=-deducted,
            date_key=date_key,
            event_type="checkin_revert",
            extra={"task_id": task_id},
        )
        return f"已撤销打卡，扣除 {deducted} 代币。"

    reward = gain_coins(
        state,
        base_amount=int(task["reward"]),
        title=f"打卡完成：{task['name']}",
        date_key=date_key,
        event_type="checkin",
        extra={"task_id": task_id},
    )
    day_record[task_id] = {
        "done": True,
        "rewarded": reward["final_amount"],
        "updated_at": now_iso(),
    }
    return f"完成打卡 +{reward['final_amount']} 代币。"


def purchase_game_hour(state: dict[str, Any]) -> str:
    date_key = today_key()
    used = int(state["game_hours_by_date"].get(date_key, 0))
    cost = game_hour_cost(used)

    if not spend_coins(state, cost, f"商店兑换：游戏权限第 {used + 1} 小时", date_key, "shop_spend"):
        return "代币不足，无法兑换游戏权限。"

    state["game_hours_by_date"][date_key] = used + 1
    state["shop_logs"].insert(
        0,
        {
            "at": now_iso(),
            "item_id": "game_hour",
            "item_name": f"游戏权限第 {used + 1} 小时",
            "cost": cost,
        },
    )
    state["shop_logs"] = state["shop_logs"][:200]
    return f"已兑换游戏权限第 {used + 1} 小时，消耗 {cost} 代币。"


def purchase_item(state: dict[str, Any], item_id: str) -> str:
    item = SHOP_ITEM_MAP[item_id]
    if not spend_coins(state, int(item["cost"]), f"商店兑换：{item['name']}", today_key(), "shop_spend"):
        return "代币不足，无法兑换。"

    state["shop_logs"].insert(
        0,
        {
            "at": now_iso(),
            "item_id": item_id,
            "item_name": item["name"],
            "cost": int(item["cost"]),
        },
    )
    state["shop_logs"] = state["shop_logs"][:200]
    return f"已兑换：{item['name']}。"


def set_flash(message: str) -> None:
    st.session_state["flash_message"] = message


def show_flash() -> None:
    message = st.session_state.pop("flash_message", None)
    if message:
        st.success(message)


def persist_and_rerun(state: dict[str, Any], message: str) -> None:
    save_state(state)
    set_flash(message)
    st.rerun()


st.set_page_config(page_title="自律代币局 · Streamlit", page_icon="🪙", layout="wide")

st.markdown(
    """
<style>
[data-testid="stAppViewContainer"] {
  background:
    radial-gradient(circle at 12% 8%, #fff3d6 0, transparent 35%),
    radial-gradient(circle at 88% 10%, #ffe8dd 0, transparent 28%),
    linear-gradient(165deg, #fef8ea, #f6ecde);
}
h1, h2, h3 {
  letter-spacing: 0.01em;
}
.card {
  border: 1px solid rgba(55, 70, 95, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 14px;
}
.small-muted {
  color: #5f6e80;
  font-size: 0.92rem;
}
.coin-chip {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  background: linear-gradient(140deg, #fff5d4, #ffd68e);
  color: #6a4c12;
  font-weight: 700;
}
</style>
""",
    unsafe_allow_html=True,
)

if "app_state" not in st.session_state:
    st.session_state["app_state"] = load_state()

state = st.session_state["app_state"]

show_flash()

st.markdown("## 自律代币局 · Streamlit 版")
st.caption("每日打卡 / 盲盒保底 / 周收益倍率 / 商店兑换")

current_today = today_key()
current_boost = get_boost_for_date(state, current_today)
next_boost = next_upcoming_boost(state, current_today)

metric_cols = st.columns(4)
metric_cols[0].metric("当前代币", f"{state['coins']}")
metric_cols[1].metric("今日进度", f"{completed_tasks_count(state, current_today)} / {len(TASKS)}")
metric_cols[2].metric("今日打卡收入", f"{total_reward_for_date(state, current_today)}")
if current_boost:
    metric_cols[3].metric("当前周加成", f"{current_boost['multiplier']}x")
elif next_boost:
    metric_cols[3].metric("下个加成", f"{next_boost['multiplier']}x")
else:
    metric_cols[3].metric("当前周加成", "无")

progress = completed_tasks_count(state, current_today) / len(TASKS)
st.progress(progress, text=f"今日完成度 {int(progress * 100)}%")

checkin_tab, blindbox_tab, shop_tab, history_tab = st.tabs([
    "每日打卡",
    "盲盒系统",
    "代币商店",
    "记录与数据",
])

with checkin_tab:
    st.subheader("每日打卡")

    selected = st.date_input(
        "选择日期",
        value=st.session_state.get("selected_checkin_date", today_date()),
        max_value=today_date(),
        key="selected_checkin_date",
    )
    selected_key = selected.isoformat()

    day_row = state["checkins"].get(selected_key, {})
    is_future = selected_key > today_key()

    for idx in range(0, len(TASKS), 2):
        row_cols = st.columns(2)
        for offset, col in enumerate(row_cols):
            task_index = idx + offset
            if task_index >= len(TASKS):
                continue
            task = TASKS[task_index]

            with col:
                with st.container(border=True):
                    st.markdown(f"**{task['name']}**")
                    st.caption(task["desc"])
                    st.write(f"奖励：`{task['reward']}` 代币")

                    task_record = day_row.get(task["id"], {})
                    done = bool(task_record.get("done"))
                    rewarded = int(task_record.get("rewarded", 0))

                    label = f"✅ 已完成 (+{rewarded})" if done else f"打卡完成 (+{task['reward']})"
                    if st.button(
                        label,
                        key=f"task_btn_{selected_key}_{task['id']}",
                        use_container_width=True,
                        disabled=is_future,
                    ):
                        msg = toggle_task(state, task["id"], selected_key)
                        persist_and_rerun(state, msg)

with blindbox_tab:
    left, right = st.columns(2)

    with left:
        st.subheader("普通盲盒")
        st.caption("每次消耗 200 代币")

        st.write(f"紫盒计数器：`{state['normal_box']['purple_counter']}`")
        st.write(f"金盒计数器：`{state['normal_box']['gold_counter']}`")

        probs = get_normal_probabilities(state)
        st.write("当前概率：")
        for row in probs:
            st.markdown(f"- **{row['name']}**：{format_percent(float(row['prob']))}，奖励 {row['reward']} 代币")

        if st.button("开启普通盲盒", key="open_normal_box", use_container_width=True):
            msg = open_normal_box(state)
            persist_and_rerun(state, msg)

        if state.get("last_normal_result"):
            last = state["last_normal_result"]
            st.info(f"最近一次：{last['name']}（+{last['reward']}）")

    with right:
        st.subheader("每周盲盒")
        st.caption("整周 7 天全项目完成后可开启")

        eligible = get_eligible_weeks(state)
        if eligible:
            next_week = eligible[0]
            st.success(
                f"可开启 {len(eligible)} 个周盲盒。\n\n"
                f"优先周：{next_week['start_date']} ~ {next_week['end_date']}"
            )
        else:
            this_week_days = get_week_dates(start_of_week(today_date()))
            full_days = sum(1 for d in this_week_days if is_all_tasks_done(state, d))
            st.warning(f"本周全勤天数：{full_days}/7")

        if st.button("开启周盲盒", key="open_weekly_box", use_container_width=True):
            msg = open_weekly_box(state)
            persist_and_rerun(state, msg)

        st.write("已排程收益加成：")
        boosts = sorted(state["weekly_box"].get("boosts", []), key=lambda x: x["start_date"])
        if not boosts:
            st.caption("暂无排程")
        else:
            for b in boosts:
                status = "待生效"
                if b["start_date"] <= today_key() <= b["end_date"]:
                    status = "进行中"
                elif today_key() > b["end_date"]:
                    status = "已结束"
                st.markdown(
                    f"- {b['start_date']} ~ {b['end_date']} · {b['tier']} {b['multiplier']}x（{status}）"
                )

        if state.get("last_weekly_result"):
            last_w = state["last_weekly_result"]
            st.info(
                f"最近一次：{last_w['name']}（{last_w['multiplier']}x），"
                f"生效 {last_w['start_date']} ~ {last_w['end_date']}"
            )

with shop_tab:
    st.subheader("代币商店")

    for category in SHOP_CATEGORIES:
        with st.container(border=True):
            st.markdown(f"### {category['title']}")
            st.caption(category["desc"])

            for item in category["items"]:
                if item.get("dynamic"):
                    used = int(state["game_hours_by_date"].get(today_key(), 0))
                    cost = game_hour_cost(used)
                    col_a, col_b = st.columns([4, 1])
                    with col_a:
                        st.markdown(f"**{item['name']}**")
                        st.caption(item["desc"])
                        st.caption(f"今日已兑 {used} 小时，下一小时价格 {cost} 代币")
                    with col_b:
                        st.write(f"{cost} 代币")
                        if st.button("兑换", key=f"shop_dynamic_{category['id']}"):
                            msg = purchase_game_hour(state)
                            persist_and_rerun(state, msg)
                else:
                    col_a, col_b = st.columns([4, 1])
                    with col_a:
                        st.markdown(f"**{item['name']}**")
                    with col_b:
                        st.write(f"{item['cost']} 代币")
                        if st.button("兑换", key=f"shop_{item['id']}"):
                            msg = purchase_item(state, item["id"])
                            persist_and_rerun(state, msg)

with history_tab:
    st.subheader("记录与数据")

    data_cols = st.columns([1, 1, 2])
    export_payload = json.dumps(state, ensure_ascii=False, indent=2)
    data_cols[0].download_button(
        "导出数据",
        data=export_payload,
        file_name=f"discipline-token-backup-{today_key()}.json",
        mime="application/json",
        use_container_width=True,
    )

    uploaded = data_cols[1].file_uploader("导入数据", type=["json"], label_visibility="collapsed")
    if uploaded is not None and data_cols[1].button("应用导入", use_container_width=True):
        try:
            imported = json.loads(uploaded.read().decode("utf-8"))
            st.session_state["app_state"] = migrate_state(imported)
            save_state(st.session_state["app_state"])
            set_flash("导入成功，数据已恢复。")
            st.rerun()
        except Exception:
            st.error("导入失败：JSON 格式不正确。")

    reset_confirm = data_cols[2].checkbox("我确认重置所有数据（不可撤销）", key="reset_confirm")
    if data_cols[2].button("重置全部数据", disabled=not reset_confirm):
        st.session_state["app_state"] = default_state()
        save_state(st.session_state["app_state"])
        set_flash("已重置全部数据。")
        st.rerun()

    st.markdown("---")
    st.markdown("#### 最近记录")

    if not state["history"]:
        st.caption("暂无记录")
    else:
        for row in state["history"][:120]:
            delta = int(row.get("delta", 0))
            sign = f"+{delta}" if delta > 0 else str(delta)
            timestamp = row.get("at", "")
            date_key = row.get("date_key", "-")
            st.markdown(
                f"- **{row.get('title', '-') }**  \\n"
                f"  `{date_key}` · `{timestamp}` · 变动 `{sign}` · 余额 `{row.get('balance', 0)}`"
            )

st.caption("说明：本应用按周一到周日计算周全勤；周盲盒奖励会排程到未来完整自然周生效。")
