const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

let weekKey = "";
let summaryItems = [];
let selectedSlot = null;
let refreshTimer = null;

/* =========================
   공통
========================= */

function getParams() {
  return new URLSearchParams(location.search);
}

function getAccountId() {
  return getParams().get("accountId") || "";
}

function getMainName() {
  return getParams().get("mainName") || "";
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.textContent = value;
  }
}

function setMessage(message, isError = false) {
  const el = document.getElementById("pageMessage");
  if (!el) return;

  el.textContent = message || "";
  el.classList.toggle("error", isError);
}

function makeKey(day, time) {
  return `${day}__${time}`;
}

/* =========================
   데이터 로드
========================= */

async function loadWeekKey() {
  const data = await callApi({ action: "getCurrentWeekKey" });

  if (!data.ok) {
    throw new Error("주간 정보를 불러오지 못했습니다.");
  }

  weekKey = data.weekKey;
}

async function loadSummary() {
  const data = await callApi({
    action: "getAvailabilitySummary",
    weekKey
  });

  if (!data.ok) {
    throw new Error("요약 데이터를 불러오지 못했습니다.");
  }

  summaryItems = data.items || [];
}

/* =========================
   요약 계산
========================= */

function groupBySlot() {
  const map = new Map();

  summaryItems.forEach(item => {
    const key = makeKey(item.day, item.time_slot);

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(item);
  });

  return map;
}

function getUniqueAccountCount(items) {
  const set = new Set(items.map(i => i.account_id));
  return set.size;
}

function getHealerCount(items) {
  return items.filter(i => i.class === "치유성").length;
}

function getHighPowerCount(items) {
  return items.filter(i => {
    const power = Number(i.power_value || 0);
    return power >= 400;
  }).length;
}

function getStatusText(realCount, healerCount) {
  if (realCount >= 9) return "사람 많음";
  if (realCount >= 6 && healerCount > 0) return "추천";
  if (realCount >= 4) return "무난";
  return "부족";
}

/* =========================
   시간 목록 렌더
========================= */

function renderSummaryGrid() {
  const target = document.getElementById("summaryGrid");

  const map = groupBySlot();

  if (map.size === 0) {
    target.innerHTML = `<div class="availability-empty">데이터 없음</div>`;
    return;
  }

  const html = Array.from(map.entries()).map(([key, items]) => {
    const [day, time] = key.split("__");

    const realCount = getUniqueAccountCount(items);
    const healerCount = getHealerCount(items);

    const status = getStatusText(realCount, healerCount);

    return `
      <button class="party-slot-btn" data-key="${key}">
        <div class="party-slot-time">${day} ${time}</div>
        <div class="party-slot-meta">${realCount}명 · 치유 ${healerCount}</div>
        <div class="party-slot-status">${status}</div>
      </button>
    `;
  }).join("");

  target.innerHTML = html;

  bindSlotEvents();
}

/* =========================
   슬롯 선택
========================= */

function bindSlotEvents() {
  document.querySelectorAll(".party-slot-btn").forEach(btn => {
    btn.onclick = () => {
      selectedSlot = btn.dataset.key;

      document.querySelectorAll(".party-slot-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const [day, time] = selectedSlot.split("__");
      setText("statusTime", `${day} ${time}`);
    };
  });
}

/* =========================
   자동 조합
========================= */

async function autoMatch() {
  if (!selectedSlot) {
    setMessage("시간을 먼저 선택해주세요.", true);
    return;
  }

  const [day, time] = selectedSlot.split("__");

  try {
    setMessage("조합 계산 중입니다...");

    const data = await callApi({
      action: "getPartyComposition",
      weekKey,
      day,
      time_slot: time
    });

    if (!data.ok) {
      setMessage("조합을 불러오지 못했습니다.", true);
      return;
    }

    renderParty(data.party1, "party1List");
    renderParty(data.party2, "party2List");

    updateStatus(data);

    setMessage("조합이 반영되었습니다.");
  } catch (error) {
    console.error(error);
    setMessage("조합 처리 중 오류가 발생했습니다.", true);
  }
}

/* =========================
   파티 렌더
========================= */

function renderParty(list, targetId) {
  const target = document.getElementById(targetId);

  if (!list || list.length === 0) {
    target.innerHTML = `<div class="availability-empty">구성 없음</div>`;
    return;
  }

  target.innerHTML = list.map(item => {
    return `
      <div class="party-member">
        <div class="party-name">${item.character_name}</div>
        <div class="party-meta">${item.class} · ${item.power}</div>
      </div>
    `;
  }).join("");
}

/* =========================
   상태 업데이트
========================= */

function updateStatus(data) {
  setText("statusPicked", data.totalCount || 0);
  setText("status400", data.highPowerCount || 0);
  setText("statusParty2Heal", data.party2HasHeal ? "있음" : "없음");

  if (data.totalCount >= 8 && data.hasHeal) {
    setText("statusClear", "진행 가능");
  } else {
    setText("statusClear", "부족");
  }
}

/* =========================
   새로고침
========================= */

async function refreshPage(showMessage = true) {
  try {
    if (showMessage) {
      setMessage("상태를 다시 불러오는 중입니다...");
    }

    await loadSummary();
    renderSummaryGrid();

    if (showMessage) {
      setMessage("최신 상태로 반영되었습니다.");
    }
  } catch (error) {
    console.error(error);
    setMessage("새로고침 실패", true);
  }
}

/* =========================
   이벤트
========================= */

function bindEvents() {
  document.getElementById("autoMatchButton").onclick = autoMatch;
  document.getElementById("refreshButton").onclick = () => refreshPage(true);

  document.getElementById("backButton").onclick = () => {
    const params = getParams().toString();
    location.href = `main.html?${params}`;
  };
}

/* =========================
   초기화
========================= */

async function initPage() {
  try {
    setMessage("불러오는 중입니다...");

    await loadWeekKey();
    await loadSummary();

    renderSummaryGrid();

    setMessage("시간을 선택해주세요.");

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      refreshPage(false);
    }, 30000);

  } catch (error) {
    console.error(error);
    setMessage("화면을 불러오지 못했습니다.", true);
  }
}

bindEvents();
initPage();