const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

let mainDataCache = null;
let isAddingCharacter = false;

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

  if (!items || items.length === 0) {
    target.innerHTML = `
      <div class="character-empty">
        등록된 캐릭터가 없습니다
      </div>
    `;
    return;
  }

  target.innerHTML = items.map(item => {
    const name = escapeHtml(item.name || "");
    const className = escapeHtml(item.className || "-");
    const type = escapeHtml(item.type || "-");
    const power = Number(item.powerValue || 0).toLocaleString();

    const useYn = item.useYn === "Y";

    return `
      <div class="character-card">
        
        <div class="character-left">
          <div class="character-name">${name}</div>
          
          <div class="character-sub">
            <span class="chip chip-class">${className}</span>
            <span class="chip chip-type">${type}</span>
          </div>
        </div>

        <div class="character-right">
          <div class="character-power">${power}</div>
          <div class="character-state ${useYn ? "on" : "off"}">
            ${useYn ? "사용중" : "미사용"}
          </div>
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

    mainDataCache = data;

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
  const goAdminButton = document.getElementById("goAdminButton");
  const logoutButton = document.getElementById("logoutButton");
  const addCharacterButton = document.getElementById("addCharacterButton");

  const bottomAvailabilityButton = document.getElementById("bottomAvailabilityButton");
  const bottomPartyButton = document.getElementById("bottomPartyButton");
  const bottomAddCharacterButton = document.getElementById("bottomAddCharacterButton");

  const closeCharacterModalButton = document.getElementById("closeCharacterModalButton");
  const cancelCharacterButton = document.getElementById("cancelCharacterButton");
  const submitCharacterButton = document.getElementById("submitCharacterButton");
  const characterModal = document.getElementById("characterModal");

  if (goAvailabilityButton) {
    goAvailabilityButton.onclick = () => movePage("availability.html");
  }

  if (goPartyButton) {
    goPartyButton.onclick = () => movePage("party.html");
  }

  if (goAdminButton) {
    goAdminButton.onclick = () => movePage("admin-login.html");
  }

  if (bottomAvailabilityButton) {
    bottomAvailabilityButton.onclick = () => movePage("availability.html");
  }

  if (bottomPartyButton) {
    bottomPartyButton.onclick = () => movePage("party.html");
  }

  if (logoutButton) {
    logoutButton.onclick = () => {
      location.href = "index.html";
    };
  }

  if (addCharacterButton) {
    addCharacterButton.onclick = openCharacterModal;
  }

  if (bottomAddCharacterButton) {
    bottomAddCharacterButton.onclick = openCharacterModal;
  }

  if (closeCharacterModalButton) {
    closeCharacterModalButton.onclick = closeCharacterModal;
  }

  if (cancelCharacterButton) {
    cancelCharacterButton.onclick = closeCharacterModal;
  }

  if (submitCharacterButton) {
    submitCharacterButton.onclick = submitCharacter;
  }

  if (characterModal) {
    characterModal.addEventListener("click", (event) => {
      if (event.target === characterModal) {
        closeCharacterModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCharacterModal();
    }

    if (event.key === "Enter" && document.body.classList.contains("modal-open")) {
      submitCharacter();
    }
  });
}

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCharacterModal();
    }

    if (event.key === "Enter" && document.body.classList.contains("modal-open")) {
      submitCharacter();
    }
  });
}

function closeCharacterModal() {
  const modal = getEl("characterModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.classList.remove("modal-open");

  getEl("modalCharacterName").value = "";
  getEl("modalCharacterClass").value = "";
  getEl("modalCharacterType").value = "부캐";
  getEl("modalCharacterPower").value = "";

  setModalMessage("입력 후 등록 버튼 눌러주세요.");
}

async function submitCharacter() {
  if (isAddingCharacter) return;

  const accountId = getAccountId();
  const name = getEl("modalCharacterName")?.value?.trim() || "";
  const className = getEl("modalCharacterClass")?.value?.trim() || "";
  const type = getEl("modalCharacterType")?.value?.trim() || "부캐";
  const power = getEl("modalCharacterPower")?.value?.trim() || "";

  if (!accountId) {
    setModalMessage("계정 정보가 없습니다.", true);
    return;
  }

  if (!name) {
    setModalMessage("캐릭터명을 입력해주세요.", true);
    return;
  }

  if (!className) {
    setModalMessage("클래스를 선택해주세요.", true);
    return;
  }

  try {
    isAddingCharacter = true;
    setModalMessage("등록 중입니다...");

    const data = await callApi({
      action: "addCharacter",
      accountId,
      name,
      className,
      type,
      power
    });

    if (!data.ok) {
      setModalMessage(data.message || "등록하지 못했습니다.", true);
      return;
    }

    setModalMessage("등록되었습니다.");

    await loadMain();

    setTimeout(() => {
      closeCharacterModal();
    }, 300);
  } catch (error) {
    console.error(error);
    setModalMessage("등록 중 오류가 발생했습니다.", true);
  } finally {
    isAddingCharacter = false;
  }
}

loadMain();
bindEvents();
renderCharacterSkeleton();

function setPageMessageState(el, type = "loading") {
  if (!el) return;
  el.classList.remove("loading", "success", "error");
  el.classList.add(type);
}

function applyTouchPop(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener("click", () => {
      el.classList.remove("touch-pop");
      void el.offsetWidth;
      el.classList.add("touch-pop");
    });
  });
}

function renderCharacterSkeleton() {
  const target = document.getElementById("characterList");
  if (!target) return;

  target.innerHTML = `
    <div class="skeleton-list">
      <div class="skeleton-block skeleton-card"></div>
      <div class="skeleton-block skeleton-card"></div>
      <div class="skeleton-block skeleton-card"></div>
    </div>
  `;
}

applyTouchPop(".character-card, .btn, .main-button, .bottom-action-btn");