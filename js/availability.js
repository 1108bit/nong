const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

const DAYS = ["수", "목", "금", "토", "일"];
const TIMES = ["19:00", "20:00", "21:00", "22:00", "23:00"];

const selectedMap = new Set();
let characterItems = [];

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
  return document.getElementById("characterSelect").value || "";
}

function setMessage(message, isError = false) {
  const el = document.getElementById("saveMessage");
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

function renderGrid() {
  const grid = document.getElementById("timeGrid");
  const html = [];

  html.push(`<div class="cell head">시간</div>`);
  DAYS.forEach(day => {
    html.push(`<div class="cell head">${day}</div>`);
  });

  TIMES.forEach(time => {
    html.push(`<div class="cell time">${time}</div>`);

    DAYS.forEach(day => {
      const key = makeKey(day, time);
      const active = selectedMap.has(key) ? "active" : "";
      html.push(`
        <button
          type="button"
          class="slot-btn ${active}"
          data-day="${day}"
          data-time="${time}"
        >
          ${selectedMap.has(key) ? "가능" : "-"}
        </button>
      `);
    });
  });

  grid.innerHTML = html.join("");

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

      renderGrid();
    });
  });
}

function renderCharacterOptions(items) {
  const select = document.getElementById("characterSelect");

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

async function loadCharacters() {
  const accountId = getAccountId();
  if (!accountId) {
    location.href = "./index.html";
    return;
  }

  try {
    const data = await callApi({
      action: "getCharacters",
      accountId: accountId
    });

    if (!data.ok) {
      setMessage("캐릭터 불러오기 실패", true);
      return;
    }

    characterItems = data.items || [];
    renderCharacterOptions(characterItems);

    if (characterItems.length > 0) {
      await loadAvailability();
    } else {
      renderGrid();
    }
  } catch (error) {
    console.error(error);
    setMessage("캐릭터 불러오기 실패", true);
  }
}

async function loadAvailability() {
  const accountId = getAccountId();
  const characterName = getSelectedCharacterName();

  selectedMap.clear();

  if (!accountId || !characterName) {
    renderGrid();
    return;
  }

  try {
    const data = await callApi({
      action: "getAvailability",
      accountId,
      characterName
    });

    if (data.ok && Array.isArray(data.items)) {
      data.items.forEach(item => {
        if (item.day && item.time_slot) {
          selectedMap.add(makeKey(item.day, item.time_slot));
        }
      });
    }

    renderGrid();
  } catch (error) {
    console.error(error);
    renderGrid();
    setMessage("시간 정보 불러오기 실패", true);
  }
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

  const slotList = Array.from(selectedMap).map(key => {
    const [day, time] = key.split("|");
    return `${day}_${time}`;
  });

  try {
    setMessage("저장 중...");

    const data = await callApi({
      action: "saveAvailability",
      accountId,
      mainName,
      characterName,
      type,
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
  renderGrid();
  setMessage("선택 초기화 완료");
}

document.getElementById("characterSelect").addEventListener("change", loadAvailability);
document.getElementById("saveButton").addEventListener("click", saveAvailability);
document.getElementById("resetButton").addEventListener("click", resetSelection);
document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

renderGrid();
loadCharacters();