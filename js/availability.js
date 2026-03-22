const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

let weekKey = "";
let characterItems = [];
let scheduleItems = [];
let summaryItems = [];
let selectedMap = new Set();
let refreshTimer = null;
let isSaving = false;

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

function getSelectedCharacterName() {
  const el = document.getElementById("characterSelect");
  return el ? el.value || "" : "";
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

function makeKey(day, time) {
  return `${day}__${time}`;
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderAvailabilitySkeleton() {
  const target = document.getElementById("availabilityList");
  if (!target) return;

  target.innerHTML = `
    <div class="skeleton-list">
      <div class="skeleton-block skeleton-card tall"></div>
      <div class="skeleton-block skeleton-card tall"></div>
      <div class="skeleton-block skeleton-card tall"></div>
    </div>
  `;
}

function applyTouchPopToAvailability() {
  document.querySelectorAll(".availability-item, .btn, .main-button").forEach(el => {
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

async function loadCharacters() {
  const accountId = getAccountId();

  if (!accountId) {
    location.href = "./index.html";
    return;
  }

  const data = await callApi({
    action: "getCharacters",
    accountId
  });

  if (!data.ok) {
    throw new Error(data.message || "캐릭터를 불러오지 못했습니다.");
  }

  characterItems = data.items || [];
  renderCharacterOptions();
}

async function loadRaidSchedule() {
  const data = await callApi({
    action: "getRaidSchedule",
    weekKey
  });

  if (!data.ok) {
    throw new Error(data.message || "일정을 불러오지 못했습니다.");
  }

  scheduleItems = data.items || [];
}

async function loadSummary() {
  const data = await callApi({
    action: "getAvailabilitySummary",
    weekKey
  });

  if (!data.ok) {
    throw new Error(data.message || "집계 데이터를 불러오지 못했습니다.");
  }

  summaryItems = data.items || [];
}

async function loadAvailability() {
  const accountId = getAccountId();
  const characterName = getSelectedCharacterName();

  selectedMap.clear();

  if (!accountId || !characterName || !weekKey) {
    updateSelectedCount();
    return;
  }

  const data = await callApi({
    action: "getAvailability",
    accountId,
    characterName,
    weekKey
  });

  if (!data.ok) {
    throw new Error(data.message || "선택한 시간을 불러오지 못했습니다.");
  }

  (data.items || []).forEach(item => {
    if (item.day && item.time_slot) {
      selectedMap.add(makeKey(item.day, item.time_slot));
    }
  });

  updateSelectedCount();
}

/* =========================
   캐릭터
========================= */

function renderCharacterOptions() {
  const select = document.getElementById("characterSelect");
  if (!select) return;

  if (!characterItems.length) {
    select.innerHTML = `<option value="">등록된 캐릭터 없음</option>`;
    setText("selectedCharacterText", "-");
    return;
  }

  select.innerHTML = characterItems.map(item => {
    const rawName = item.name || "";
    const name = escapeHtml(rawName);
    const type = escapeHtml(item.type || "-");
    const className = escapeHtml(item.className || "클래스 미입력");
    return `<option value="${escapeHtml(rawName)}">${name} (${type} / ${className})</option>`;
  }).join("");

  setText("selectedCharacterText", getSelectedCharacterName() || "-");
}

/* =========================
   요약 계산
========================= */

function getSummaryBySlot(day, timeSlot) {
  return summaryItems.filter(item => item.day === day && item.time_slot === timeSlot);
}

function getUniqueAccountCount(items) {
  const set = new Set(
    items.map(item => String(item.accountId || item.account_id || "").trim()).filter(Boolean)
  );
  return set.size;
}

function getHealerCount(items) {
  return items.filter(item => {
    const className = String(item.className || item.class_name || item.class || "").trim();
    return className === "치유성";
  }).length;
}

function getHighPowerCount(items) {
  return items.filter(item => {
    const powerValue = Number(item.powerValue || item.power_value || 0);
    const powerText = String(item.powerText || item.power_text || "");

    if (powerValue >= 400) return true;
    return powerText.includes("400");
  }).length;
}

function getStatusInfo(realCount, healerCount) {
  if (realCount >= 9) {
    return {
      text: "과밀",
      className: "crowded"
    };
  }

  if (realCount >= 6 && healerCount > 0) {
    return {
      text: "추천",
      className: "good"
    };
  }

  if (realCount >= 4) {
    return {
      text: "무난",
      className: "normal"
    };
  }

  return {
    text: "부족",
    className: "bad"
  };
}

function getBestTime() {
  const slotMap = new Map();

  scheduleItems.forEach(item => {
    const key = makeKey(item.day, item.time_slot);
    const slotItems = getSummaryBySlot(item.day, item.time_slot);
    const realCount = getUniqueAccountCount(slotItems);
    const healerCount = getHealerCount(slotItems);
    const highPowerCount = getHighPowerCount(slotItems);

    slotMap.set(key, {
      label: `${item.date || ""} ${item.day || ""} ${item.time_slot || ""}`.trim(),
      realCount,
      healerCount,
      highPowerCount
    });
  });

  const list = Array.from(slotMap.values());

  list.sort((a, b) => {
    const aRecommended = a.realCount >= 6 && a.healerCount > 0;
    const bRecommended = b.realCount >= 6 && b.healerCount > 0;

    if (aRecommended !== bRecommended) {
      return Number(bRecommended) - Number(aRecommended);
    }
    if (a.realCount !== b.realCount) return b.realCount - a.realCount;
    if (a.healerCount !== b.healerCount) return b.healerCount - a.healerCount;
    return b.highPowerCount - a.highPowerCount;
  });

  return list[0] || null;
}

function getWeakTime() {
  const slotMap = new Map();

  scheduleItems.forEach(item => {
    const key = makeKey(item.day, item.time_slot);
    const slotItems = getSummaryBySlot(item.day, item.time_slot);
    const realCount = getUniqueAccountCount(slotItems);
    const healerCount = getHealerCount(slotItems);

    slotMap.set(key, {
      label: `${item.date || ""} ${item.day || ""} ${item.time_slot || ""}`.trim(),
      realCount,
      healerCount
    });
  });

  const list = Array.from(slotMap.values());

  list.sort((a, b) => {
    if (a.realCount !== b.realCount) return a.realCount - b.realCount;
    return a.healerCount - b.healerCount;
  });

  return list[0] || null;
}

function renderSummaryCards() {
  const best = getBestTime();
  const weak = getWeakTime();

  if (best) {
    setText("bestTimeText", best.label || "-");
    setText(
      "bestTimeSub",
      `실인원 ${best.realCount}명 · 치유 ${best.healerCount} · 400+ ${best.highPowerCount}`
    );
  } else {
    setText("bestTimeText", "-");
    setText("bestTimeSub", "추천 시간 계산 불가");
  }

  if (weak) {
    setText("weakTimeText", weak.label || "-");
    setText("weakTimeSub", `실인원 ${weak.realCount}명 · 치유 ${weak.healerCount}`);
  } else {
    setText("weakTimeText", "-");
    setText("weakTimeSub", "부족 시간 계산 불가");
  }
}

/* =========================
   상단 표시
========================= */

function updateSelectedCount() {
  setText("selectedCountText", `${selectedMap.size}개`);
}

function updateTopInfo() {
  setText("mainNameText", getMainName() || "-");
  setText("selectedCharacterText", getSelectedCharacterName() || "-");
  updateSelectedCount();
}

/* =========================
   리스트 렌더
========================= */

function renderAvailabilityList() {
  const target = document.getElementById("availabilityList");
  if (!target) return;

  if (!scheduleItems.length) {
    target.innerHTML = `<div class="availability-empty">이번 주에 열린 일정이 없습니다.</div>`;
    return;
  }

  target.innerHTML = scheduleItems.map(item => {
    const slotItems = getSummaryBySlot(item.day, item.time_slot);
    const charCount = slotItems.length;
    const realCount = getUniqueAccountCount(slotItems);
    const healerCount = getHealerCount(slotItems);
    const highPowerCount = getHighPowerCount(slotItems);

    const key = makeKey(item.day, item.time_slot);
    const isSelected = selectedMap.has(key);
    const expectedCount = isSelected ? realCount : realCount + 1;

    const status = getStatusInfo(realCount, healerCount);

    const lines = [
      `<div class="availability-item-top">`,
      `<div>`,
      `<div class="availability-time">${escapeHtml(item.date || "")} ${escapeHtml(item.day || "")} ${escapeHtml(item.time_slot || "")}</div>`,
      `<div class="availability-meta">실인원 ${realCount}명 · 등록 ${charCount}개</div>`,
      `<div class="availability-meta">치유 ${healerCount} · 400+ ${highPowerCount}</div>`,
      `</div>`,
      `<div class="availability-status ${status.className}">${status.text}</div>`,
      `</div>`
    ];

    if (item.note) {
      lines.push(`<div class="availability-note">${escapeHtml(item.note)}</div>`);
    }

    if (isSelected) {
      lines.push(`<div class="availability-foot selected">선택됨 · 다시 누르면 해제</div>`);
    } else {
      lines.push(`<div class="availability-foot">선택 시 예상 실인원 ${expectedCount}명</div>`);
    }

    return `
      <button
        type="button"
        class="availability-item ${isSelected ? "active" : ""}"
        data-day="${escapeHtml(item.day || "")}"
        data-time="${escapeHtml(item.time_slot || "")}"
      >
        ${lines.join("")}
      </button>
    `;
  }).join("");

  bindSlotEvents();
  applyTouchPopToAvailability();
}

/* =========================
   저장
========================= */

async function saveAvailability() {
  const accountId = getAccountId();
  const mainName = getMainName();
  const characterName = getSelectedCharacterName();

  if (!accountId || !characterName) {
    setMessage("캐릭터를 먼저 선택해주세요.", true);
    return;
  }

  const character = characterItems.find(item => item.name === characterName);
  const type = character?.type || "";

  const slotList = scheduleItems
    .filter(item => selectedMap.has(makeKey(item.day, item.time_slot)))
    .map(item => ({
      date: item.date || "",
      day: item.day || "",
      time_slot: item.time_slot || ""
    }));

  try {
    isSaving = true;
    setMessage("저장 중입니다...", false, "loading");

    const data = await callApi({
      action: "saveAvailability",
      accountId,
      mainName,
      characterName,
      type,
      weekKey,
      slotList: JSON.stringify(slotList)
    });

    if (!data.ok) {
      setMessage(data.message || "저장하지 못했습니다.", true);
      return;
    }

    await loadSummary();
    updateTopInfo();
    renderSummaryCards();
    renderAvailabilityList();
    setMessage("저장되었습니다.", false, "success");
  } catch (error) {
    console.error(error);
    setMessage("저장 중 문제가 발생했습니다.", true);
  } finally {
    isSaving = false;
  }
}

/* =========================
   새로고침
========================= */

async function refreshPage(showMessage = true) {
  try {
    if (showMessage) {
      setMessage("최신 상태를 다시 불러오는 중입니다...", false, "loading");
    }

    await loadSummary();
    await loadAvailability();
    updateTopInfo();
    renderSummaryCards();
    renderAvailabilityList();

    if (showMessage) {
      setMessage("최신 상태로 반영되었습니다.", false, "success");
    }
  } catch (error) {
    console.error(error);
    setMessage("새로고침에 실패했습니다.", true);
  }
}

/* =========================
   이벤트
========================= */

function bindSlotEvents() {
  document.querySelectorAll(".availability-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (isSaving) return;

      const day = btn.dataset.day;
      const time = btn.dataset.time;
      const key = makeKey(day, time);

      if (selectedMap.has(key)) {
        selectedMap.delete(key);
      } else {
        selectedMap.add(key);
      }

      updateTopInfo();
      renderAvailabilityList();
      await saveAvailability();
    });
  });
}

function bindEvents() {
  document.getElementById("characterSelect").addEventListener("change", async () => {
    try {
      setText("selectedCharacterText", getSelectedCharacterName() || "-");
      setMessage("캐릭터 기준으로 다시 불러오는 중입니다...", false, "loading");
      await loadAvailability();
      updateTopInfo();
      renderSummaryCards();
      renderAvailabilityList();
      setMessage("불러왔습니다.", false, "success");
    } catch (error) {
      console.error(error);
      setMessage("캐릭터 정보를 반영하지 못했습니다.", true);
    }
  });

  document.getElementById("refreshButton").addEventListener("click", async () => {
    await refreshPage(true);
  });

  document.getElementById("backButton").addEventListener("click", () => {
    const mainName = encodeURIComponent(getMainName());
    const accountId = encodeURIComponent(getAccountId());
    location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
  });
}

/* =========================
   초기화
========================= */

async function initPage() {
  try {
    updateTopInfo();
    renderAvailabilitySkeleton();
    setMessage("불러오는 중입니다...", false, "loading");

    await loadWeekKey();
    await loadCharacters();
    await loadRaidSchedule();
    await loadSummary();
    await loadAvailability();

    updateTopInfo();
    renderSummaryCards();
    renderAvailabilityList();

    const best = getBestTime();
    const weak = getWeakTime();

    if (!scheduleItems.length) {
      setMessage("이번 주에 열린 일정이 없습니다.", false, "success");
    } else if (best && weak) {
      setMessage(`추천 시간 ${best.label} · 부족 시간 ${weak.label}`, false, "success");
    } else {
      setMessage("시간을 선택하면 바로 저장됩니다.", false, "success");
    }

    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {
      refreshPage(false);
    }, 30000);
  } catch (error) {
    console.error(error);
    setMessage(error.message || "화면을 불러오지 못했습니다.", true);
  }
}

bindEvents();
initPage();