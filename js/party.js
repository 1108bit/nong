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

function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  return fetch(url).then(res => res.json());
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.textContent = value;
  }
}

function setMessage(message, isError = false, mode = "loading") {
  const el = document.getElementById("pageMessage");
  if (!el) return;

  el.textContent = message || "";
  el.classList.remove("loading", "success", "error");

  if (isError) {
    el.classList.add("error");
  } else {
    el.classList.add(mode);
  }
}

function makeKey(day, time) {
  return `${day}__${time}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function renderPartySkeleton() {
  const target = document.getElementById("summaryGrid");
  if (!target) return;

  target.innerHTML = `
    <div class="skeleton-list">
      <div class="skeleton-block skeleton-card"></div>
      <div class="skeleton-block skeleton-card"></div>
      <div class="skeleton-block skeleton-card"></div>
    </div>
  `;
}

function applyTouchPopToParty() {
  document.querySelectorAll(".party-slot-btn, .party-member-card, .btn").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.remove("touch-pop");
      void el.offsetWidth;
      el.classList.add("touch-pop");
    });
  });
}

/* =========================
   데이터 로드
========================= */

async function loadWeekKey() {
  const data = await callApi({ action: "getCurrentWeekKey" });

  if (!data.ok || !data.weekKey) {
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
  const set = new Set(
    items.map(item => String(item.account_id || item.accountId || "").trim()).filter(Boolean)
  );
  return set.size;
}

function getHealerCount(items) {
  return items.filter(item => {
    const className = String(item.class || item.class_name || item.className || "").trim();
    return className === "치유성";
  }).length;
}

function getHighPowerCount(items) {
  return items.filter(item => {
    const power = Number(item.power_value || item.powerValue || item.power || 0);
    return power >= 400;
  }).length;
}

function getStatusInfo(realCount, healerCount) {
  if (realCount >= 9) {
    return { text: "과밀", className: "crowded" };
  }
  if (realCount >= 6 && healerCount > 0) {
    return { text: "추천", className: "good" };
  }
  if (realCount >= 4) {
    return { text: "무난", className: "normal" };
  }
  return { text: "부족", className: "bad" };
}

function getSlotLabel(key) {
  const [day, time] = key.split("__");
  return `${day} ${time}`;
}

/* =========================
   시간 카드 렌더
========================= */

function renderSummaryGrid() {
  const target = document.getElementById("summaryGrid");
  const map = groupBySlot();

  if (map.size === 0) {
    target.innerHTML = `<div class="availability-empty">이번 주 집계 데이터가 없습니다.</div>`;
    return;
  }

  const html = Array.from(map.entries()).map(([key, items]) => {
    const [day, time] = key.split("__");
    const realCount = getUniqueAccountCount(items);
    const healerCount = getHealerCount(items);
    const highPowerCount = getHighPowerCount(items);
    const status = getStatusInfo(realCount, healerCount);
    const activeClass = selectedSlot === key ? "active" : "";

    return `
      <button type="button" class="party-slot-btn ${activeClass}" data-key="${escapeHtml(key)}">
        <div class="party-slot-top">
          <div>
            <div class="party-slot-time">${escapeHtml(day)} ${escapeHtml(time)}</div>
            <div class="party-slot-meta">실인원 ${realCount}명 · 치유 ${healerCount} · 400+ ${highPowerCount}</div>
          </div>
          <div class="availability-status ${status.className}">${status.text}</div>
        </div>
        <div class="party-slot-foot">
          ${selectedSlot === key ? "선택됨 · 아래 버튼으로 조합 계산" : "눌러서 이 시간 조합 확인"}
        </div>
      </button>
    `;
  }).join("");

  target.innerHTML = html;
  bindSlotEvents();
  applyTouchPopToParty();
}

/* =========================
   슬롯 선택
========================= */

function bindSlotEvents() {
  document.querySelectorAll(".party-slot-btn").forEach(btn => {
    btn.onclick = () => {
      selectedSlot = btn.dataset.key;
      renderSummaryGrid();

      setText("statusTime", getSlotLabel(selectedSlot));
      setText("statusDesc", "지금 조합 보기 버튼으로 파티를 계산할 수 있습니다.");

      clearPartyResultOnly();
      setMessage(`${getSlotLabel(selectedSlot)} 선택됨`, false, "success");
    };
  });
}

function clearPartyResultOnly() {
  document.getElementById("party1List").innerHTML = `<div class="availability-empty">조합 계산 전입니다.</div>`;
  document.getElementById("party2List").innerHTML = `<div class="availability-empty">조합 계산 전입니다.</div>`;
  document.getElementById("party1Badges").innerHTML = "";
  document.getElementById("party2Badges").innerHTML = "";

  setText("statusClear", "-");
  setText("statusPicked", "0");
  setText("status400", "0");
  setText("statusHeal", "0");
  setText("statusParty2Heal", "-");
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
    setMessage("조합 계산 중입니다...", false, "loading");

    const data = await callApi({
      action: "getPartyComposition",
      weekKey,
      day,
      time_slot: time
    });

    if (!data.ok) {
      setMessage(data.message || "조합을 불러오지 못했습니다.", true);
      return;
    }

    renderParty(data.party1 || [], "party1List");
    renderParty(data.party2 || [], "party2List");

    renderPartyBadges("party1Badges", data.party1 || []);
    renderPartyBadges("party2Badges", data.party2 || []);

    updateStatus(data);
    setMessage("조합이 반영되었습니다.", false, "success");
  } catch (error) {
    console.error(error);
    setMessage("조합 처리 중 오류가 발생했습니다.", true);
  }
}

/* =========================
   파티 렌더
========================= */

function getRoleClass(className) {
  const healers = ["치유성"];
  const support = ["호법성"];
  const tanks = ["수호성"];
  const melee = ["검성", "살성"];
  const ranged = ["궁성", "마도성", "정령성"];

  if (healers.includes(className)) return "heal";
  if (support.includes(className)) return "support";
  if (tanks.includes(className)) return "tank";
  if (melee.includes(className)) return "melee";
  if (ranged.includes(className)) return "ranged";
  return "normal";
}

function renderParty(list, targetId) {
  const target = document.getElementById(targetId);

  if (!list || list.length === 0) {
    target.innerHTML = `<div class="availability-empty">구성 없음</div>`;
    return;
  }

  target.innerHTML = list.map(item => {
    const name = escapeHtml(item.character_name || item.name || "-");
    const className = escapeHtml(item.class || item.className || "-");
    const power = formatNumber(item.power || item.power_value || item.powerValue || 0);
    const roleClass = getRoleClass(item.class || item.className || "");

    return `
      <div class="party-member-card">
        <div class="party-member-left">
          <div class="party-name">${name}</div>
          <div class="party-member-chips">
            <span class="party-chip ${roleClass}">${className}</span>
          </div>
        </div>

        <div class="party-member-right">
          <div class="party-power">${power}</div>
          <div class="party-power-label">전투력</div>
        </div>
      </div>
    `;
  }).join("");

  applyTouchPopToParty();
}

function renderPartyBadges(targetId, list) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const total = list.length;
  const healer = getHealerCount(list);
  const highPower = getHighPowerCount(list);

  const badges = [
    `<span class="party-stat-chip">인원 ${total}</span>`,
    `<span class="party-stat-chip">치유 ${healer}</span>`,
    `<span class="party-stat-chip">400+ ${highPower}</span>`
  ];

  target.innerHTML = badges.join("");
}

/* =========================
   상태 업데이트
========================= */

function updateStatus(data) {
  const totalCount = Number(data.totalCount || 0);
  const highPowerCount = Number(data.highPowerCount || 0);
  const hasHeal = Boolean(data.hasHeal);
  const party2HasHeal = Boolean(data.party2HasHeal);
  const party1 = data.party1 || [];
  const party2 = data.party2 || [];
  const totalHeal = getHealerCount([...party1, ...party2]);

  setText("statusPicked", totalCount);
  setText("status400", highPowerCount);
  setText("statusHeal", totalHeal);
  setText("statusParty2Heal", party2HasHeal ? "있음" : "없음");

  if (totalCount >= 8 && hasHeal) {
    setText("statusClear", "진행 가능");
    setText("statusDesc", "인원과 치유 구성이 확보된 편입니다.");
  } else if (totalCount >= 6) {
    setText("statusClear", "조건부 가능");
    setText("statusDesc", "진행은 가능하지만 보강이 있으면 더 좋습니다.");
  } else {
    setText("statusClear", "부족");
    setText("statusDesc", "추가 인원 확보가 필요합니다.");
  }
}

/* =========================
   새로고침
========================= */

async function refreshPage(showMessage = true) {
  try {
    if (showMessage) {
      setMessage("상태를 다시 불러오는 중입니다...", false, "loading");
    }

    await loadSummary();
    renderSummaryGrid();

    if (showMessage) {
      setMessage("최신 상태로 반영되었습니다.", false, "success");
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
    renderPartySkeleton();
    setMessage("불러오는 중입니다...", false, "loading");

    await loadWeekKey();
    await loadSummary();

    renderSummaryGrid();
    clearPartyResultOnly();

    setMessage("시간을 선택해주세요.", false, "success");

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