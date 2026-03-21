const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

/* =========================
   파라미터
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

/* =========================
   API
========================= */

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

/* =========================
   텍스트
========================= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

/* =========================
   캐릭터 렌더
========================= */

function renderCharacters(items) {
  const target = document.getElementById("characterList");

  if (!items || items.length === 0) {
    target.innerHTML = `
      <div class="character-empty">등록된 캐릭터 없음</div>
    `;
    return;
  }

  target.innerHTML = items.map(item => {
    return `
      <div class="character-item">
        <div>
          <div class="character-name">${item.character_name}</div>
          <div class="character-meta">
            ${item.class} · ${item.power || "-"} · ${item.type || ""}
          </div>
        </div>
        <div class="character-badge ${item.use_yn === "Y" ? "on" : "off"}">
          ${item.use_yn === "Y" ? "사용" : "미사용"}
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   요약 계산
========================= */

function calculateSummary(summaryItems) {
  const map = {};

  summaryItems.forEach(item => {
    const key = `${item.day} ${item.time_slot}`;

    if (!map[key]) {
      map[key] = {
        accounts: new Set(),
        heal: 0
      };
    }

    map[key].accounts.add(item.account_id);

    if (item.class === "치유성") {
      map[key].heal++;
    }
  });

  let best = null;
  let weak = null;

  Object.entries(map).forEach(([key, val]) => {
    const count = val.accounts.size;

    // 추천 기준
    if (count >= 6 && val.heal > 0) {
      if (!best || count > best.count) {
        best = { key, count };
      }
    }

    // 부족 기준
    if (count < 4) {
      if (!weak || count < weak.count) {
        weak = { key, count };
      }
    }
  });

  return {
    best,
    weak
  };
}

/* =========================
   메인 데이터 로드
========================= */

async function loadMain() {
  const accountId = getAccountId();

  const data = await callApi({
    action: "getMainData",
    accountId
  });

  if (!data.ok) return;

  // 이름
  setText("accountMainName", data.mainName);

  // 캐릭터
  renderCharacters(data.characters);

  setText("characterCount", data.characters.length);

  // 선택 개수
  setText("selectedCount", `${data.selectedCount || 0}개`);

  // 참여 횟수
  setText("weeklyRunCount", `${data.weeklyRunCount || 0} / 2`);

  // 요약
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
}

/* =========================
   이동
========================= */

function movePage(url) {
  const params = getParams().toString();
  location.href = `${url}?${params}`;
}

/* =========================
   이벤트
========================= */

function bindEvents() {
  document.getElementById("goAvailabilityButton").onclick = () => movePage("availability.html");
  document.getElementById("goPartyButton").onclick = () => movePage("party.html");
  document.getElementById("goHistoryButton").onclick = () => movePage("history.html");
  document.getElementById("goAdminButton").onclick = () => movePage("admin-login.html");

  document.getElementById("logoutButton").onclick = () => {
    location.href = "index.html";
  };

  document.getElementById("addCharacterButton").onclick = () => {
    alert("추후 입력폼으로 교체 예정");
  };
}

/* =========================
   초기 실행
========================= */

loadMain();
bindEvents();