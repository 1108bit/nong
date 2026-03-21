const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

let weekKey = "";
let scheduleItems = [];
let characterItems = [];
const selectedMap = new Set();

function getParams() {
  return new URLSearchParams(location.search);
}

function getMainName() {
  return getParams().get("mainName") || "";
}

function getAccountId() {
  return getParams().get("accountId") || "";
}

function getSelectedCharacterName() {
  const el = document.getElementById("characterSelect");
  return el ? el.value || "" : "";
}

function setMessage(message, isError = false) {
  const el = document.getElementById("saveMessage");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("error", isError);
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

function makeKey(day, time) {
  return `${day}|${time}`;
}

function renderCharacterOptions(items) {
  const select = document.getElementById("characterSelect");
  if (!select) return;

  if (!items || items.length === 0) {
    select.innerHTML = `<option value="">등록된 캐릭터 없음</option>`;
    return;
  }

  select.innerHTML = items.map(item => {
    const typeText = item.type || "-";
    const classText = item.className || "클래스 미입력";
    return `<option value="${item.name}">${item.name} (${typeText} / ${classText})</option>`;
  }).join("");
}

function renderScheduleGrid() {
  const grid = document.getElementById("timeGrid");
  if (!grid) return;

  if (!scheduleItems.length) {
    grid.style.display = "block";
    grid.innerHTML = `
      <div style="
        padding:18px;
        border-radius:16px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.08);
        color:#cbd5e1;
        text-align:center;
      ">
        현재 열려있는 일정이 없습니다
      </div>
    `;
    return;
  }

  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  grid.style.gap = "10px";

  grid.innerHTML = scheduleItems.map(item => {
    const key = makeKey(item.day, item.time_slot);
    const active = selectedMap.has(key);

    return `
      <button
        type="button"
        class="slot-btn ${active ? "active" : ""}"
        data-day="${item.day}"
        data-time="${item.time_slot}"
        style="min-height:72px; display:flex; flex-direction:column; gap:4px;"
      >
        <strong>${item.date || ""} ${item.day}</strong>
        <span>${item.time_slot}</span>
        <small style="opacity:${item.note ? "0.9" : "0.5"};">${item.note || "-"}</small>
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".slot-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      const time = btn.dataset.time;
      const key = makeKey(day, time);

      if (selectedMap.has(key)) {
        selectedMap.delete(key);
      } else {
        selectedMap.add(key);
      }

      renderScheduleGrid();
    });
  });
}

async function loadWeekKey() {
  const data = await callApi({ action: "getCurrentWeekKey" });

  if (!data.ok || !data.weekKey) {
    throw new Error("주간 키 불러오기 실패");
  }

  weekKey = data.weekKey;
}

async function loadRaidSchedule() {
  const data = await callApi({
    action: "getRaidSchedule",
    weekKey
  });

  if (!data.ok) {
    throw new Error(data.message || "일정 불러오기 실패");
  }

  scheduleItems = data.items || [];
  renderScheduleGrid();
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
    throw new Error(data.message || "캐릭터 불러오기 실패");
  }

  characterItems = data.items || [];
  renderCharacterOptions(characterItems);
}

async function loadAvailability() {
  const accountId = getAccountId();
  const characterName = getSelectedCharacterName();

  selectedMap.clear();

  if (!accountId || !characterName || !weekKey) {
    renderScheduleGrid();
    return;
  }

  const data = await callApi({
    action: "getAvailability",
    accountId,
    characterName,
    weekKey
  });

  if (!data.ok) {
    throw new Error(data.message || "참여 가능 시간 불러오기 실패");
  }

  const items = data.items || [];
  items.forEach(item => {
    if (item.day && item.time_slot) {
      selectedMap.add(makeKey(item.day, item.time_slot));
    }
  });

  renderScheduleGrid();
}

async function saveAvailability() {
  const accountId = getAccountId();
  const mainName = getMainName();
  const characterName = getSelectedCharacterName();

  if (!accountId || !characterName) {
    setMessage("캐릭터를 선택해주세요", true);
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
    setMessage("저장 중...");

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
      setMessage(data.message || "저장 실패", true);
      return;
    }

    setMessage("저장 완료");
  } catch (error) {
    console.error(error);
    setMessage("저장 실패", true);
  }
}

function resetSelection() {
  selectedMap.clear();
  renderScheduleGrid();
  setMessage("선택 초기화 완료");
}

async function initPage() {
  try {
    await loadWeekKey();
    await loadRaidSchedule();
    await loadCharacters();

    if (characterItems.length > 0) {
      await loadAvailability();
    } else {
      renderScheduleGrid();
    }
  } catch (error) {
    console.error(error);
    setMessage(error.message || "초기 로딩 실패", true);
  }
}

document.getElementById("characterSelect").addEventListener("change", async () => {
  try {
    await loadAvailability();
  } catch (error) {
    console.error(error);
    setMessage("시간 정보 불러오기 실패", true);
  }
});

document.getElementById("saveButton").addEventListener("click", saveAvailability);
document.getElementById("resetButton").addEventListener("click", resetSelection);
document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

initPage();