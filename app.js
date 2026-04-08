const TASKS = [
  {
    id: "sleep_before_23",
    name: "23:00 前入睡",
    desc: "保证作息稳定",
    reward: 40,
  },
  {
    id: "healthy_diet",
    name: "饮食健康",
    desc: "不暴饮暴食 + 控制糖分",
    reward: 40,
  },
  {
    id: "english_output",
    name: "英语输出练习",
    desc: "超过 10 分钟",
    reward: 30,
  },
  {
    id: "hardcore_tech",
    name: "硬核技术/算法钻研",
    desc: "超过 30 分钟",
    reward: 30,
  },
  {
    id: "portfolio_update",
    name: "作品集/自比应用更新",
    desc: "新增 10 行以上有效代码",
    reward: 30,
  },
  {
    id: "exercise",
    name: "运动",
    desc: "超过 20 分钟",
    reward: 20,
  },
  {
    id: "patience_practice",
    name: "耐心练习",
    desc: "刻意训练情绪与专注",
    reward: 10,
  },
];

const NORMAL_BOX_COST = 200;
const NORMAL_BOX_BASE = {
  white: 70,
  blue: 20,
  purple: 9,
  gold: 1,
};

const NORMAL_BOX_REWARDS = {
  white: 160,
  blue: 240,
  purple: 700,
  gold: 4000,
};

const WEEKLY_BOX = [
  { key: "normal", name: "普通", prob: 70, multiplier: 1.05 },
  { key: "rare", name: "稀有", prob: 20, multiplier: 1.2 },
  { key: "epic", name: "史诗", prob: 9, multiplier: 1.5 },
  { key: "legend", name: "传说", prob: 1, multiplier: 2 },
];

const SHOP_CATEGORIES = [
  {
    id: "entertainment",
    title: "娱乐消遣类",
    desc: "针对《王者荣耀》/ 别的游戏",
    items: [
      {
        id: "game_hour",
        name: "游戏权限 1 小时",
        dynamic: true,
        desc: "按当日累计阶梯计价：第1小时30，第2小时100，第3小时起300/小时",
      },
    ],
  },
  {
    id: "food",
    title: "口腹之欲类",
    desc: "人为制造稀缺感",
    items: [
      { id: "ice_cream", name: "冰淇淋", cost: 100 },
      { id: "bbq_fried", name: "烤肉/炸鸡等高热量食品", cost: 800 },
      { id: "black_pearl", name: "黑珍珠餐馆", cost: 6000 },
      { id: "michelin_3", name: "米其林三星", cost: 18000 },
    ],
  },
  {
    id: "assets",
    title: "硬核资产类",
    desc: "高价值兑换目标",
    items: [
      { id: "switch2", name: "Switch2", cost: 18000 },
      { id: "airpods_max2", name: "AirPods Max2", cost: 18000 },
      { id: "ipad_pro_13", name: "iPad Pro 13寸", cost: 40000 },
      { id: "trip_normal", name: "普通旅行", cost: 12000 },
      { id: "trip_luxury", name: "豪华旅行", cost: 24000 },
      { id: "trip_ultra", name: "超豪华旅行", cost: 48000 },
    ],
  },
];

const TASK_MAP = Object.fromEntries(TASKS.map((task) => [task.id, task]));
const SHOP_ITEM_MAP = Object.fromEntries(
  SHOP_CATEGORIES.flatMap((category) =>
    category.items.filter((item) => !item.dynamic).map((item) => [item.id, item]),
  ),
);

const STORAGE_KEY = "discipline_token_app_v1";

let state = loadState();
let selectedDate = todayKey();
let toastTimer = null;

let els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  els = {
    coinChip: document.getElementById("coinChip"),
    todayProgressText: document.getElementById("todayProgressText"),
    todayProgressFill: document.getElementById("todayProgressFill"),
    todayRewardHint: document.getElementById("todayRewardHint"),
    activeBoostText: document.getElementById("activeBoostText"),
    activeBoostHint: document.getElementById("activeBoostHint"),
    checkinDate: document.getElementById("checkinDate"),
    taskGrid: document.getElementById("taskGrid"),
    purpleCounter: document.getElementById("purpleCounter"),
    goldCounter: document.getElementById("goldCounter"),
    normalProbList: document.getElementById("normalProbList"),
    normalResult: document.getElementById("normalResult"),
    weeklyStatus: document.getElementById("weeklyStatus"),
    weeklyResult: document.getElementById("weeklyResult"),
    boostList: document.getElementById("boostList"),
    shopContainer: document.getElementById("shopContainer"),
    historyList: document.getElementById("historyList"),
    importInput: document.getElementById("importInput"),
    toast: document.getElementById("toast"),
  };

  const today = todayKey();
  selectedDate = today;
  els.checkinDate.value = today;
  els.checkinDate.max = today;

  bindEvents();
  registerServiceWorker();
  renderAll();
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  els.checkinDate.addEventListener("change", (event) => {
    selectedDate = event.target.value || todayKey();
    renderTaskGrid();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) {
      return;
    }

    const action = trigger.dataset.action;

    if (action === "toggle-task") {
      toggleTask(trigger.dataset.taskId, selectedDate);
      return;
    }

    if (action === "open-normal-box") {
      openNormalBox();
      return;
    }

    if (action === "open-weekly-box") {
      openWeeklyBox();
      return;
    }

    if (action === "buy-item") {
      purchaseShopItem(trigger.dataset.itemId);
      return;
    }

    if (action === "buy-game-hour") {
      purchaseGameHour();
      return;
    }

    if (action === "export-data") {
      exportData();
      return;
    }

    if (action === "reset-data") {
      resetData();
    }
  });

  els.importInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      state = migrateState(parsed);
      saveState();
      renderAll();
      showToast("导入成功，数据已恢复");
    } catch (error) {
      showToast("导入失败：文件格式不正确");
    } finally {
      event.target.value = "";
    }
  });
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tab}`);
  });
}

function toggleTask(taskId, dateKey) {
  const task = TASK_MAP[taskId];
  if (!task) {
    return;
  }

  if (dateKey > todayKey()) {
    showToast("不能对未来日期打卡");
    return;
  }

  const dayRecord = ensureDayRecord(dateKey);
  const current = dayRecord[taskId];

  if (current && current.done) {
    const deducted = Number(current.rewarded || 0);
    dayRecord[taskId] = {
      done: false,
      rewarded: 0,
      updatedAt: new Date().toISOString(),
    };

    state.coins -= deducted;
    pushHistory({
      type: "checkin-revert",
      title: `撤销打卡：${task.name}`,
      delta: -deducted,
      dateKey,
      extra: { taskId },
    });

    showToast(`已撤销，扣除 ${deducted} 代币`);
  } else {
    const gain = gainCoins(task.reward, `打卡完成：${task.name}`, dateKey, { taskId });
    dayRecord[taskId] = {
      done: true,
      rewarded: gain.finalAmount,
      updatedAt: new Date().toISOString(),
    };

    showToast(`完成打卡 +${gain.finalAmount} 代币`);
  }

  saveAndRender();
}

function openNormalBox() {
  const dateKey = todayKey();
  if (!spendCoins(NORMAL_BOX_COST, "开启普通盲盒", dateKey)) {
    showToast("代币不足，无法开启普通盲盒");
    return;
  }

  const probabilities = getNormalProbabilities();
  const result = drawByProbability(probabilities);

  const rewardInfo = gainCoins(
    result.reward,
    `普通盲盒：${result.name}`,
    dateKey,
    {
      box: result.key,
      baseProbability: result.prob,
    },
  );

  state.normalBox.opened += 1;

  if (result.key === "white" || result.key === "blue") {
    state.normalBox.purpleCounter += 1;
  } else {
    state.normalBox.purpleCounter = 0;
  }

  if (result.key === "gold") {
    state.normalBox.goldCounter = 0;
  } else {
    state.normalBox.goldCounter += 1;
  }

  state.normalBox.logs.unshift({
    id: uid(),
    at: new Date().toISOString(),
    result: result.key,
    resultName: result.name,
    rewardBase: result.reward,
    rewardFinal: rewardInfo.finalAmount,
    probabilities: Object.fromEntries(
      probabilities.map((item) => [item.key, Number(item.prob.toFixed(2))]),
    ),
    countersAfter: {
      purpleCounter: state.normalBox.purpleCounter,
      goldCounter: state.normalBox.goldCounter,
    },
  });

  state.normalBox.logs = state.normalBox.logs.slice(0, 200);

  state.lastNormalResult = {
    name: result.name,
    reward: rewardInfo.finalAmount,
    time: new Date().toISOString(),
  };

  flashResult(
    els.normalResult,
    `开出【${result.name}】获得 ${rewardInfo.finalAmount} 代币`,
  );

  saveAndRender();
}

function openWeeklyBox() {
  const eligibleWeeks = getEligibleWeeks();
  if (!eligibleWeeks.length) {
    showToast("暂无可开启周盲盒（需要整周 7 天全完成）");
    return;
  }

  const sourceWeek = eligibleWeeks[0];
  const drawResult = drawByProbability(
    WEEKLY_BOX.map((item) => ({
      ...item,
      prob: item.prob,
    })),
  );

  state.weeklyBox.openedWeeks[sourceWeek.weekKey] = {
    openedAt: new Date().toISOString(),
    tier: drawResult.key,
    name: drawResult.name,
    multiplier: drawResult.multiplier,
  };

  const scheduledBoost = scheduleBoost(
    drawResult.multiplier,
    drawResult.name,
    sourceWeek.weekKey,
  );

  state.weeklyBox.logs.unshift({
    id: uid(),
    at: new Date().toISOString(),
    sourceWeek: sourceWeek.weekKey,
    sourceRange: `${sourceWeek.startDate} ~ ${sourceWeek.endDate}`,
    resultTier: drawResult.name,
    multiplier: drawResult.multiplier,
    scheduledStart: scheduledBoost.startDate,
    scheduledEnd: scheduledBoost.endDate,
  });

  state.weeklyBox.logs = state.weeklyBox.logs.slice(0, 100);

  pushHistory({
    type: "weekly-box",
    title: `周盲盒开奖：${drawResult.name}（${drawResult.multiplier}x）`,
    delta: 0,
    dateKey: todayKey(),
    extra: {
      sourceWeek: sourceWeek.weekKey,
      scheduledStart: scheduledBoost.startDate,
      scheduledEnd: scheduledBoost.endDate,
    },
  });

  state.lastWeeklyResult = {
    name: drawResult.name,
    multiplier: drawResult.multiplier,
    startDate: scheduledBoost.startDate,
    endDate: scheduledBoost.endDate,
  };

  flashResult(
    els.weeklyResult,
    `开出【${drawResult.name}】下个加成周倍率 ${drawResult.multiplier}x`,
  );

  showToast(
    `周盲盒已开启：${scheduledBoost.startDate} 至 ${scheduledBoost.endDate} 生效`,
  );

  saveAndRender();
}

function purchaseGameHour() {
  const dateKey = todayKey();
  const usedHours = Number(state.gameHoursByDate[dateKey] || 0);
  const cost = gameHourCost(usedHours);

  if (!spendCoins(cost, `商店兑换：游戏权限第 ${usedHours + 1} 小时`, dateKey)) {
    showToast("代币不足，无法兑换游戏权限");
    return;
  }

  state.gameHoursByDate[dateKey] = usedHours + 1;

  state.shopLogs.unshift({
    id: uid(),
    at: new Date().toISOString(),
    itemId: "game_hour",
    itemName: `游戏权限第 ${usedHours + 1} 小时`,
    cost,
  });

  state.shopLogs = state.shopLogs.slice(0, 200);
  showToast(`已兑换游戏权限 ${usedHours + 1} 小时，消耗 ${cost} 代币`);
  saveAndRender();
}

function purchaseShopItem(itemId) {
  const item = SHOP_ITEM_MAP[itemId];
  if (!item) {
    return;
  }

  if (!spendCoins(item.cost, `商店兑换：${item.name}`, todayKey(), { itemId })) {
    showToast("代币不足，无法兑换");
    return;
  }

  state.shopLogs.unshift({
    id: uid(),
    at: new Date().toISOString(),
    itemId,
    itemName: item.name,
    cost: item.cost,
  });

  state.shopLogs = state.shopLogs.slice(0, 200);
  showToast(`已兑换：${item.name}`);
  saveAndRender();
}

function renderAll() {
  renderOverview();
  renderTaskGrid();
  renderNormalBox();
  renderWeeklyBox();
  renderShop();
  renderHistory();
}

function renderOverview() {
  els.coinChip.textContent = `${formatSigned(state.coins)} 代币`;

  const today = todayKey();
  const completed = completedTasksCount(today);
  const total = TASKS.length;
  const percent = Math.round((completed / total) * 100);

  els.todayProgressText.textContent = `${completed} / ${total}`;
  els.todayProgressFill.style.width = `${percent}%`;

  const todayGain = totalRewardForDate(today);
  els.todayRewardHint.textContent = `今日打卡已获得 ${todayGain} 代币`;

  const boostToday = getBoostForDate(today);
  if (boostToday) {
    els.activeBoostText.textContent = `${boostToday.tier} ${boostToday.multiplier}x`;
    els.activeBoostHint.textContent = `${boostToday.startDate} ~ ${boostToday.endDate}`;
    return;
  }

  const nextBoost = nextUpcomingBoost(today);
  if (nextBoost) {
    els.activeBoostText.textContent = `待生效 ${nextBoost.multiplier}x`;
    els.activeBoostHint.textContent = `${nextBoost.startDate} 开始`;
  } else {
    els.activeBoostText.textContent = "无";
    els.activeBoostHint.textContent = "开周盲盒可获得下周收益倍率";
  }
}

function renderTaskGrid() {
  if (!selectedDate) {
    selectedDate = todayKey();
    els.checkinDate.value = selectedDate;
  }

  const today = todayKey();
  const isFuture = selectedDate > today;
  const day = state.checkins[selectedDate] || {};

  els.taskGrid.innerHTML = TASKS.map((task) => {
    const row = day[task.id];
    const done = Boolean(row && row.done);
    const rewarded = Number((row && row.rewarded) || 0);

    return `
      <article class="task-card">
        <h3 class="task-title">${task.name}</h3>
        <p class="task-reward">奖励：${task.reward} 代币</p>
        <p class="task-desc">${task.desc}</p>
        <button
          class="toggle-btn ${done ? "done" : "todo"}"
          data-action="toggle-task"
          data-task-id="${task.id}"
          ${isFuture ? "disabled" : ""}
        >
          ${done ? `已完成 (+${rewarded})` : "打卡完成"}
        </button>
      </article>
    `;
  }).join("");
}

function renderNormalBox() {
  els.purpleCounter.textContent = String(state.normalBox.purpleCounter);
  els.goldCounter.textContent = String(state.normalBox.goldCounter);

  const probabilities = getNormalProbabilities();
  els.normalProbList.innerHTML = probabilities
    .map(
      (item) => `
        <div class="prob-row">
          <div class="left">
            <span class="dot ${item.key}"></span>
            <span>${item.name}</span>
          </div>
          <div>${formatPercent(item.prob)} · 奖励 ${item.reward}</div>
        </div>
      `,
    )
    .join("");

  if (!state.lastNormalResult) {
    return;
  }

  const { name, reward } = state.lastNormalResult;
  els.normalResult.textContent = `最近一次：${name}（+${reward} 代币）`;
}

function renderWeeklyBox() {
  const eligible = getEligibleWeeks();
  if (eligible.length) {
    const next = eligible[0];
    els.weeklyStatus.innerHTML = `
      <p><strong>可开启周盲盒：</strong>共 ${eligible.length} 个待开启周期</p>
      <p>优先开启：${next.startDate} ~ ${next.endDate}</p>
      <p>开启后会把收益倍率排程到未来的完整自然周。</p>
    `;
  } else {
    const thisWeek = getWeekDates(startOfWeek(new Date()));
    const fullDays = thisWeek.filter((dayKey) => isAllTasksDone(dayKey)).length;

    els.weeklyStatus.innerHTML = `
      <p><strong>本周全勤天数：</strong>${fullDays} / 7</p>
      <p>满足整周 7 天全完成后，下一周盲盒才可开启。</p>
    `;
  }

  const boostItems = [...state.weeklyBox.boosts].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  if (!boostItems.length) {
    els.boostList.innerHTML = "<li>暂无排程</li>";
  } else {
    const today = todayKey();
    els.boostList.innerHTML = boostItems
      .map((boost) => {
        const status =
          today < boost.startDate
            ? "待生效"
            : today > boost.endDate
              ? "已结束"
              : "进行中";

        return `<li>${boost.startDate} ~ ${boost.endDate} · ${boost.tier} ${boost.multiplier}x（${status}）</li>`;
      })
      .join("");
  }

  if (!state.lastWeeklyResult) {
    return;
  }

  const last = state.lastWeeklyResult;
  els.weeklyResult.textContent = `最近一次：${last.name}（${last.multiplier}x），生效 ${last.startDate} ~ ${last.endDate}`;
}

function renderShop() {
  els.shopContainer.innerHTML = SHOP_CATEGORIES.map((category) => {
    const itemsHtml = category.items
      .map((item) => {
        if (item.dynamic) {
          const today = todayKey();
          const used = Number(state.gameHoursByDate[today] || 0);
          const cost = gameHourCost(used);
          return `
            <div class="shop-item">
              <div>
                <p class="item-title">${item.name}</p>
                <p class="item-sub">${item.desc}</p>
                <p class="item-sub">今日已兑 ${used} 小时，下一小时价格：${cost} 代币</p>
              </div>
              <div>
                <p class="item-price">${cost} 代币</p>
                <button class="item-buy" data-action="buy-game-hour">兑换</button>
              </div>
            </div>
          `;
        }

        return `
          <div class="shop-item">
            <div>
              <p class="item-title">${item.name}</p>
            </div>
            <div>
              <p class="item-price">${item.cost} 代币</p>
              <button class="item-buy" data-action="buy-item" data-item-id="${item.id}">兑换</button>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <article class="card shop-category">
        <div class="shop-head">
          <h3>${category.title}</h3>
          <p>${category.desc}</p>
        </div>
        <div class="shop-items">${itemsHtml}</div>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  const rows = state.history.slice(0, 80);

  if (!rows.length) {
    els.historyList.innerHTML = "<article class='log-item'><p class='log-title'>暂无记录</p></article>";
    return;
  }

  els.historyList.innerHTML = rows
    .map((row) => {
      const cls = row.delta > 0 ? "up" : row.delta < 0 ? "down" : "";
      const sign = row.delta > 0 ? `+${row.delta}` : String(row.delta);
      return `
        <article class="log-item">
          <div>
            <p class="log-title">${row.title}</p>
            <p class="log-meta">${row.dateKey || "-"} · ${formatTime(row.at)} · 余额 ${row.balance}</p>
          </div>
          <p class="log-delta ${cls}">${sign}</p>
        </article>
      `;
    })
    .join("");
}

function ensureDayRecord(dateKey) {
  if (!state.checkins[dateKey]) {
    state.checkins[dateKey] = {};
  }
  return state.checkins[dateKey];
}

function completedTasksCount(dateKey) {
  const day = state.checkins[dateKey] || {};
  return TASKS.filter((task) => day[task.id] && day[task.id].done).length;
}

function totalRewardForDate(dateKey) {
  const day = state.checkins[dateKey] || {};
  return TASKS.reduce((sum, task) => {
    const record = day[task.id];
    if (!record || !record.done) {
      return sum;
    }
    return sum + Number(record.rewarded || 0);
  }, 0);
}

function isAllTasksDone(dateKey) {
  const day = state.checkins[dateKey] || {};
  return TASKS.every((task) => day[task.id] && day[task.id].done);
}

function getNormalProbabilities() {
  const purpleBonus = Math.max(0, state.normalBox.purpleCounter - 9) * 10;
  const goldBonus = Math.max(0, state.normalBox.goldCounter - 59) * 2;

  let purple = NORMAL_BOX_BASE.purple + purpleBonus;
  let gold = NORMAL_BOX_BASE.gold + goldBonus;
  let white = NORMAL_BOX_BASE.white;
  let blue = NORMAL_BOX_BASE.blue;

  if (purple + gold >= 100) {
    const totalSpecial = purple + gold;
    purple = (purple / totalSpecial) * 100;
    gold = 100 - purple;
    white = 0;
    blue = 0;
  } else {
    const residual = 100 - purple - gold;
    white = residual * (NORMAL_BOX_BASE.white / (NORMAL_BOX_BASE.white + NORMAL_BOX_BASE.blue));
    blue = residual * (NORMAL_BOX_BASE.blue / (NORMAL_BOX_BASE.white + NORMAL_BOX_BASE.blue));
  }

  return [
    { key: "white", name: "白盒", prob: white, reward: NORMAL_BOX_REWARDS.white },
    { key: "blue", name: "蓝盒", prob: blue, reward: NORMAL_BOX_REWARDS.blue },
    { key: "purple", name: "紫盒", prob: purple, reward: NORMAL_BOX_REWARDS.purple },
    { key: "gold", name: "金盒", prob: gold, reward: NORMAL_BOX_REWARDS.gold },
  ];
}

function getEligibleWeeks() {
  const currentWeekKey = formatDate(startOfWeek(new Date()));

  const candidateWeekKeys = new Set(
    Object.keys(state.checkins)
      .map((dateKey) => formatDate(startOfWeek(parseDateKey(dateKey))))
      .filter((weekKey) => weekKey < currentWeekKey),
  );

  const candidates = [...candidateWeekKeys]
    .filter((weekKey) => !state.weeklyBox.openedWeeks[weekKey])
    .map((weekKey) => {
      const start = parseDateKey(weekKey);
      const days = getWeekDates(start);
      const done = days.every((day) => isAllTasksDone(day));
      return {
        weekKey,
        startDate: days[0],
        endDate: days[6],
        done,
      };
    })
    .filter((week) => week.done)
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

  return candidates;
}

function scheduleBoost(multiplier, tier, sourceWeekKey) {
  let startDate = addDays(startOfWeek(new Date()), 7);

  const sortedBoosts = [...state.weeklyBox.boosts].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  sortedBoosts.forEach((boost) => {
    if (boost.endDate >= formatDate(startDate)) {
      const candidate = addDays(parseDateKey(boost.endDate), 1);
      if (candidate > startDate) {
        startDate = candidate;
      }
    }
  });

  startDate = startOfWeek(startDate);
  const endDate = addDays(startDate, 6);

  const boost = {
    id: uid(),
    multiplier,
    tier,
    sourceWeekKey,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    createdAt: new Date().toISOString(),
  };

  state.weeklyBox.boosts.push(boost);
  return boost;
}

function getBoostForDate(dateKey) {
  return (
    state.weeklyBox.boosts.find(
      (boost) => dateKey >= boost.startDate && dateKey <= boost.endDate,
    ) || null
  );
}

function nextUpcomingBoost(dateKey) {
  return (
    [...state.weeklyBox.boosts]
      .filter((boost) => boost.startDate > dateKey)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null
  );
}

function gainCoins(baseAmount, title, dateKey = todayKey(), extra = {}) {
  const boost = getBoostForDate(dateKey);
  const multiplier = boost ? boost.multiplier : 1;
  const finalAmount = Math.round(baseAmount * multiplier);

  state.coins += finalAmount;

  pushHistory({
    type: "gain",
    title,
    delta: finalAmount,
    dateKey,
    extra: {
      ...extra,
      baseAmount,
      multiplier,
      boostTier: boost ? boost.tier : null,
    },
  });

  return {
    finalAmount,
    multiplier,
  };
}

function spendCoins(amount, title, dateKey = todayKey(), extra = {}) {
  if (state.coins < amount) {
    return false;
  }

  state.coins -= amount;

  pushHistory({
    type: "spend",
    title,
    delta: -amount,
    dateKey,
    extra,
  });

  return true;
}

function pushHistory(entry) {
  state.history.unshift({
    id: uid(),
    at: new Date().toISOString(),
    ...entry,
    balance: state.coins,
  });

  state.history = state.history.slice(0, 500);
}

function gameHourCost(usedHours) {
  if (usedHours <= 0) {
    return 30;
  }
  if (usedHours === 1) {
    return 100;
  }
  return 300;
}

function drawByProbability(items) {
  const roll = Math.random() * 100;
  let cursor = 0;
  for (const item of items) {
    cursor += item.prob;
    if (roll < cursor) {
      return item;
    }
  }
  return items[items.length - 1];
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1700);
}

function flashResult(el, text) {
  el.textContent = text;
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function saveAndRender() {
  saveState();
  renderAll();
}

function exportData() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `discipline-token-backup-${todayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("数据已导出");
}

function resetData() {
  const accepted = window.confirm("确认重置所有数据？该操作不可撤销。");
  if (!accepted) {
    return;
  }

  state = defaultState();
  selectedDate = todayKey();
  els.checkinDate.value = selectedDate;
  saveState();
  renderAll();
  showToast("已重置");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {
    // 忽略离线缓存注册失败
  });
}

function defaultState() {
  return {
    coins: 0,
    checkins: {},
    normalBox: {
      purpleCounter: 0,
      goldCounter: 0,
      opened: 0,
      logs: [],
    },
    weeklyBox: {
      openedWeeks: {},
      boosts: [],
      logs: [],
    },
    gameHoursByDate: {},
    shopLogs: [],
    history: [],
    lastNormalResult: null,
    lastWeeklyResult: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    return defaultState();
  }
}

function migrateState(raw) {
  const base = defaultState();
  const next = {
    ...base,
    ...raw,
    normalBox: {
      ...base.normalBox,
      ...(raw && raw.normalBox),
    },
    weeklyBox: {
      ...base.weeklyBox,
      ...(raw && raw.weeklyBox),
      openedWeeks: {
        ...base.weeklyBox.openedWeeks,
        ...((raw && raw.weeklyBox && raw.weeklyBox.openedWeeks) || {}),
      },
      boosts: Array.isArray(raw && raw.weeklyBox && raw.weeklyBox.boosts)
        ? raw.weeklyBox.boosts
        : [],
      logs: Array.isArray(raw && raw.weeklyBox && raw.weeklyBox.logs)
        ? raw.weeklyBox.logs
        : [],
    },
    checkins: normalizeCheckins(raw && raw.checkins),
    gameHoursByDate:
      raw && raw.gameHoursByDate && typeof raw.gameHoursByDate === "object"
        ? raw.gameHoursByDate
        : {},
    shopLogs: Array.isArray(raw && raw.shopLogs) ? raw.shopLogs : [],
    history: Array.isArray(raw && raw.history) ? raw.history : [],
  };

  next.coins = Number.isFinite(Number(next.coins)) ? Number(next.coins) : 0;
  next.normalBox.purpleCounter = Number(next.normalBox.purpleCounter || 0);
  next.normalBox.goldCounter = Number(next.normalBox.goldCounter || 0);
  next.normalBox.opened = Number(next.normalBox.opened || 0);

  return next;
}

function normalizeCheckins(rawCheckins) {
  if (!rawCheckins || typeof rawCheckins !== "object") {
    return {};
  }

  const normalized = {};

  Object.entries(rawCheckins).forEach(([dateKey, day]) => {
    if (!day || typeof day !== "object") {
      return;
    }

    normalized[dateKey] = {};

    Object.entries(day).forEach(([taskId, value]) => {
      if (!TASK_MAP[taskId]) {
        return;
      }

      if (typeof value === "boolean") {
        normalized[dateKey][taskId] = {
          done: value,
          rewarded: value ? TASK_MAP[taskId].reward : 0,
          updatedAt: null,
        };
        return;
      }

      if (typeof value === "number") {
        normalized[dateKey][taskId] = {
          done: value > 0,
          rewarded: value,
          updatedAt: null,
        };
        return;
      }

      normalized[dateKey][taskId] = {
        done: Boolean(value.done),
        rewarded: Number(value.rewarded || 0),
        updatedAt: value.updatedAt || null,
      };
    });
  });

  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(isoString) {
  if (!isoString) {
    return "--:--";
  }
  const date = new Date(isoString);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayKey() {
  return formatDate(new Date());
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  const weekday = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - weekday);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekDates(weekStartDate) {
  return Array.from({ length: 7 }, (_, index) =>
    formatDate(addDays(weekStartDate, index)),
  );
}

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatPercent(value) {
  if (value >= 10) {
    return `${value.toFixed(1)}%`;
  }
  return `${value.toFixed(2)}%`;
}

function formatSigned(value) {
  return value > 0 ? `+${value}` : String(value);
}
