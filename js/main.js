const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

function getParams() {
  return new URLSearchParams(location.search);
}

function getMainName() {
  const params = getParams();
  return params.get("mainName") || "";
}

const goAdminButton = document.getElementById("goAdminButton");
if (goAdminButton) {
  goAdminButton.addEventListener("click", () => {
    const mainName = encodeURIComponent(getMainName());
    const accountId = encodeURIComponent(getAccountId());
    location.href = `./admin.html?mainName=${mainName}&accountId=${accountId}`;
  });
}

function getAccountId() {
  const params = getParams();
  return params.get("accountId") || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.textContent = value;
  }
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

async function initMainText() {
  try {
    const data = await callApi({ action: "init" });

    if (!data.ok) return;

    const text = data.text || {};

    setText("mainTitle", text.main_title);
    setText("mainDesc", text.main_desc);
    setText("sectionMyInfo", text.section_my_info);
    setText("sectionCharacter", text.section_character);
    setText("sectionHistory", text.section_history);
    setText("sectionQuickMenu", text.section_quick_menu);
  } catch (error) {
    console.error(error);
  }
}

function renderCharacters(items) {
  const target = document.getElementById("characterList");

  if (!items || items.length === 0) {
    target.innerHTML = `
      <div class="character-item">
        <div>
          <div class="character-name">등록된 캐릭터가 없습니다</div>
          <div class="character-meta">우측 버튼으로 캐릭터를 추가해주세요</div>
        </div>
        <div class="character-badge off">비어있음</div>
      </div>
    `;
    return;
  }

  target.innerHTML = items.map((item) => {
    const typeText = item.type || "-";
    const classText = item.className || "클래스 미입력";
    const powerText = item.powerValue || item.powerText || "-";
    const isUse = String(item.useYn || "").toUpperCase() === "Y";
    const badgeClass = isUse ? "character-badge" : "character-badge off";
    const badgeText = isUse ? "참여" : "대기";

    return `
      <div class="character-item">
        <div>
          <div class="character-name">${escapeHtml(item.name)}</div>
          <div class="character-meta">${escapeHtml(classText)} · ${escapeHtml(powerText)} · ${escapeHtml(typeText)}</div>
        </div>
        <div class="${badgeClass}">${badgeText}</div>
      </div>
    `;
  }).join("");
}

async function loadMainData() {
  const accountId = getAccountId();

  if (!accountId) return;

  try {
    const data = await callApi({
      action: "getMainData",
      accountId: accountId
    });

    if (!data.ok) return;

    const items = data.items || [];
    renderCharacters(items);

    document.getElementById("characterCount").textContent = String(data.count ?? items.length ?? 0);
    document.getElementById("weeklyRunCount").textContent = data.weeklyCount || "0 / 2";
  } catch (error) {
    console.error(error);
  }
}

async function addCharacter() {
  const accountId = getAccountId();

  if (!accountId) {
    alert("계정이 없습니다. 다시 로그인해주세요.");
    return;
  }

  const name = prompt("캐릭터명을 입력해주세요");
  if (!name || !name.trim()) return;

  const className = prompt("클래스를 입력해주세요 (예: 수호성, 치유성)") || "";
  const powerValue = prompt("전투력값을 숫자로만 입력해주세요 (예: 150, 365)") || "";
  const type = prompt("본캐 또는 부캐를 입력해주세요", "부캐") || "부캐";

  try {
    const data = await callApi({
      action: "addCharacter",
      accountId: accountId,
      name: name.trim(),
      class: className.trim(),
      powerValue: powerValue.trim(),
      type: type.trim()
    });

    if (!data.ok) {
      alert(data.message || "등록 실패");
      return;
    }

    alert("등록 완료");
    await loadMainData();
  } catch (error) {
    console.error(error);
    alert("서버 오류. 다시 시도해주세요.");
  }
}

function initMainPage() {
  const mainName = getMainName();

  if (!mainName) {
    location.href = "./index.html";
    return;
  }

  document.getElementById("accountMainName").textContent = mainName;
  document.getElementById("characterCount").textContent = "0";
  document.getElementById("weeklyRunCount").textContent = "0 / 2";
}

document.getElementById("logoutButton").addEventListener("click", () => {
  location.href = "./index.html";
});

document.getElementById("addCharacterButton").addEventListener("click", addCharacter);

document.getElementById("goAvailabilityButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./availability.html?mainName=${mainName}&accountId=${accountId}`;
});

document.getElementById("goPartyButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./party.html?mainName=${mainName}&accountId=${accountId}`;
});

document.getElementById("goHistoryButton").addEventListener("click", () => {
  alert("내 기록 보기 기능은 다음 단계에서 연결 예정");
});

initMainPage();
initMainText();
loadMainData();