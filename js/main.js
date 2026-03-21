const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCharacters(items) {
  const target = document.getElementById("characterList");
  if (!target) return;

  if (!items || items.length === 0) {
    target.innerHTML = `
      <div class="character-empty">등록된 캐릭터 없음</div>
    `;
    return;
  }

  target.innerHTML = items.map(item => {
    const name = escapeHtml(item.character_name || "");
    const className = escapeHtml(item.class || "-");
    const power = escapeHtml(item.power || "-");
    const type = escapeHtml(item.type || "");
    const useYn = String(item.use_yn || "Y").toUpperCase();

    return `
      <div class="character-item">
        <div>
          <div class="character-name">${name}</div>
          <div class="character-meta">${className} · ${power} · ${type}</div>
        </div>
        <div class="character-badge ${useYn === "Y" ? "on" : "off"}">
          ${useYn === "Y" ? "사용" : "미사용"}
        </div>
      </div>
    `;
  }).join("");
}

function calculateSummary(summaryItems) {
  const map = {};

  (summaryItems || []).forEach(item => {
    const key = `${item.day || ""} ${item.time_slot || ""}`.trim();

    if (!key) return;

    if (!map[key]) {
      map[key] = {
        accounts: new Set(),
        heal: 0
      };
    }

    map[key].accounts.add(item.account_id);

    if (item.class === "치유성") {
      map[key].heal += 1;
    }
  });

  let best = null;
  let weak = null;

  Object.entries(map).forEach(([key, val]) => {
    const count = val.accounts.size;

    if (count >= 6 && val.heal > 0) {
      if (!best || count > best.count) {
        best = { key, count };
      }
    }

    if (count < 4) {
      if (!weak || count < weak.count) {
        weak = { key, count };
      }
    }
  });

  return { best, weak };
}

async function loadMain() {
  const accountId = getAccountId();

  if (!accountId) {
    location.href = "index.html";
    return;
  }

  try {
    const data = await callApi({
      action: "getMainData",
      accountId
    });

    if (!data.ok) {
      alert(data.message || "메인 정보를 불러오지 못했습니다.");
      return;
    }

    setText("accountMainName", data.mainName || getMainName() || "-");
    setText("characterCount", data.characters ? data.characters.length : 0);
    setText("selectedCount", `${data.selectedCount || 0}개`);
    setText("weeklyRunCount", `${data.weeklyRunCount || 0} / 2`);

    renderCharacters(data.characters || []);

    const summary = calculateSummary(data.summary || []);

    if (summary.best) {
      setText("bestTimeText", `${summary.best.key} (${summary.best.count}명)`);
    } else {
      setText("bestTimeText", "추천 없음");
    }

    if (summary.weak) {
      setText("weakTimeText", `${summary.weak.key} (${summary.weak.count}명)`);
    } else {
      setText("weakTimeText", "부족 없음");
    }
  } catch (error) {
    console.error(error);
    alert("메인 화면 로드 중 오류가 발생했습니다.");
  }
}

function movePage(url) {
  const params = getParams().toString();
  location.href = `${url}?${params}`;
}

function bindEvents() {
  const goAvailabilityButton = document.getElementById("goAvailabilityButton");
  const goPartyButton = document.getElementById("goPartyButton");
  const goHistoryButton = document.getElementById("goHistoryButton");
  const goAdminButton = document.getElementById("goAdminButton");
  const logoutButton = document.getElementById("logoutButton");
  const addCharacterButton = document.getElementById("addCharacterButton");

  if (goAvailabilityButton) {
    goAvailabilityButton.onclick = () => movePage("availability.html");
  }

  if (goPartyButton) {
    goPartyButton.onclick = () => movePage("party.html");
  }

  if (goHistoryButton) {
    goHistoryButton.onclick = () => movePage("history.html");
  }

  if (goAdminButton) {
    goAdminButton.onclick = () => movePage("admin-login.html");
  }

  if (logoutButton) {
    logoutButton.onclick = () => {
      location.href = "index.html";
    };
  }

  if (addCharacterButton) {
    addCharacterButton.onclick = () => {
      alert("캐릭터 추가 기능은 다음 단계에서 연결됩니다.");
    };
  }
}

loadMain();
bindEvents();