const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

let weekKey = "";
let summaryItems = [];
let selectedKey = "";

function getParams() {
  return new URLSearchParams(location.search);
}

function getMainName() {
  return getParams().get("mainName") || "";
}

function getAccountId() {
  return getParams().get("accountId") || "";
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

function makeKey(day, time) {
  return `${day}|${time}`;
}

function getCount(day, time) {
  return summaryItems.filter(item => item.day === day && item.time_slot === time).length;
}

function getMembers(day, time) {
  return summaryItems.filter(item => item.day === day && item.time_slot === time);
}

function setStatusValue(id, value, cls = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.className = "status-value" + (cls ? ` ${cls}` : "");
}

function renderMemberRow(item) {
  const roleBadge = item.isHealer ? "치유" : item.isBuffer ? "호법" : (item.type || "-");
  const powerText = item.powerValue || item.powerText || "-";

  return `
    <div class="member-item">
      <div>
        <div class="member-name">${item.characterName || item.character_name || "-"}</div>
        <div class="member-meta">
          ${(item.mainName || item.main_name || "-")} · ${(item.className || item.class_name || "-")} · ${powerText}
        </div>
      </div>
      <div class="member-badge">${roleBadge}</div>
    </div>
  `;
}

function renderEmptyParty(targetId, message) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = `
    <div class="member-item">
      <div>
        <div class="member-name">${message}</div>
        <div class="member-meta">조건에 맞는 인원이 없습니다</div>
      </div>
      <div class="member-badge">0명</div>
    </div>
  `;
}

function renderPartyBadges(targetId, party) {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!party) {
    target.innerHTML = "";
    return;
  }

  const html = [
    `<span class="mini-badge">${party.memberCount || 0}/4</span>`,
    `<span class="mini-badge ${party.healerYn === "Y" ? "good" : "warn"}">치유 ${party.healerYn || "N"}</span>`,
    `<span class="mini-badge ${party.bufferYn === "Y" ? "good" : ""}">호법 ${party.bufferYn || "N"}</span>`,
    `<span class="mini-badge ${Number(party.count400Plus || 0) > 0 ? "good" : ""}">400+ ${party.count400Plus || 0}</span>`,
    `<span class="mini-badge">점수 ${party.totalScore || 0}</span>`
  ];

  target.innerHTML = html.join("");
}

function renderDefaultSelectedInfo(day, time) {
  const members = getMembers(day, time);

  setStatusValue("statusTime", `${day} ${time}`);
  setStatusValue("statusClear", "선택됨");
  setStatusValue("statusPicked", String(members.length));
  setStatusValue("status400", "-");
  setStatusValue("statusParty2Heal", "-");

  document.getElementById("party1Badges").innerHTML = "";
  document.getElementById("party2Badges").innerHTML = "";

  const previewRows = members.slice(0, 4).map(item => renderMemberRow(item)).join("");

  document.getElementById("party1List").innerHTML = previewRows || `
    <div class="member-item">
      <div>
        <div class="member-name">가능 인원이 없습니다</div>
        <div class="member-meta">다른 시간대를 선택해주세요</div>
      </div>
      <div class="member-badge">0명</div>
    </div>
  `;

  document.getElementById("party2List").innerHTML = `
    <div class="member-item">
      <div>
        <div class="member-name">자동 추천 버튼을 눌러주세요</div>
        <div class="member-meta">1파티 / 2파티 자동 분배</div>
      </div>
      <div class="member-badge">대기</div>
    </div>
  `;
}

function renderAutoMatchResult(data) {
  const party1 = data.party1 || {};
  const party2 = data.party2 || {};

  setStatusValue("statusTime", `${data.day} ${data.timeSlot}`);
  setStatusValue(
    "statusClear",
    data.clearLevel || "-",
    data.clearLevel === "안정" ? "good" :
    data.clearLevel === "가능" || data.clearLevel === "도전" || data.clearLevel === "주의" ? "warn" : "bad"
  );
  setStatusValue("statusPicked", String(data.totalPicked || 0), (data.totalPicked || 0) >= 8 ? "good" : "warn");
  setStatusValue(
    "status400",
    String(data.conditions?.count400Plus || 0),
    (data.conditions?.count400Plus || 0) >= 2 ? "good" : "warn"
  );
  setStatusValue(
    "statusParty2Heal",
    data.conditions?.hasParty2HealerYn || "N",
    data.conditions?.hasParty2HealerYn === "Y" ? "good" : "bad"
  );

  renderPartyBadges("party1Badges", party1);
  renderPartyBadges("party2Badges", party2);

  if (party1.members && party1.members.length > 0) {
    document.getElementById("party1List").innerHTML = party1.members.map(renderMemberRow).join("");
  } else {
    renderEmptyParty("party1List", "1파티 추천 인원이 없습니다");
  }

  if (party2.members && party2.members.length > 0) {
    document.getElementById("party2List").innerHTML = party2.members.map(renderMemberRow).join("");
  } else {
    renderEmptyParty("party2List", "2파티 추천 인원이 없습니다");
  }
}

function renderSummaryGrid() {
  const target = document.getElementById("summaryGrid");
  if (!target) return;

  if (!summaryItems.length) {
    target.style.display = "block";
    target.innerHTML = `
      <div style="
        padding:18px;
        border-radius:16px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.08);
        color:#cbd5e1;
        text-align:center;
      ">
        현재 집계할 수 있는 일정이 없습니다
      </div>
    `;
    return;
  }

  const scheduleMap = new Map();

  summaryItems.forEach(item => {
    const key = makeKey(item.day, item.time_slot);
    if (!scheduleMap.has(key)) {
      scheduleMap.set(key, {
        date: item.date || "",
        day: item.day || "",
        time_slot: item.time_slot || "",
        note: item.note || ""
      });
    }
  });

  const scheduleList = Array.from(scheduleMap.values()).sort((a, b) => {
    const dateA = String(a.date || "");
    const dateB = String(b.date || "");
    if (dateA !== dateB) return dateA.localeCompare(dateB, "ko");
    return String(a.time_slot || "").localeCompare(String(b.time_slot || ""), "ko");
  });

  target.style.display = "grid";
  target.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  target.style.gap = "10px";

  target.innerHTML = scheduleList.map(item => {
    const key = makeKey(item.day, item.time_slot);
    const count = getCount(item.day, item.time_slot);
    const active = selectedKey === key ? "active" : "";

    return `
      <button class="summary-cell ${active}" data-day="${item.day}" data-time="${item.time_slot}" style="min-height:84px;">
        <strong>${count}</strong>
        <span>${item.date || ""} ${item.day} ${item.time_slot}</span>
      </button>
    `;
  }).join("");

  target.querySelectorAll(".summary-cell").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      const time = btn.dataset.time;
      selectedKey = makeKey(day, time);
      renderSummaryGrid();
      renderDefaultSelectedInfo(day, time);
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

async function loadSummary() {
  const data = await callApi({
    action: "getAvailabilitySummary",
    weekKey
  });

  if (!data.ok) {
    throw new Error(data.message || "집계 불러오기 실패");
  }

  summaryItems = data.items || [];
  renderSummaryGrid();
}

async function runAutoMatch() {
  if (!selectedKey) {
    alert("먼저 시간대를 선택해주세요.");
    return;
  }

  const [day, timeSlot] = selectedKey.split("|");

  try {
    const data = await callApi({
      action: "getPartyAutoMatch",
      day,
      timeSlot,
      weekKey
    });

    if (!data.ok) {
      alert(data.message || "자동 추천 실패");
      return;
    }

    renderAutoMatchResult(data);
  } catch (error) {
    console.error(error);
    alert("자동 추천 실패");
  }
}

async function initPage() {
  try {
    await loadWeekKey();
    await loadSummary();
  } catch (error) {
    console.error(error);
    alert(error.message || "초기 로딩 실패");
  }
}

document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

document.getElementById("autoMatchButton").addEventListener("click", runAutoMatch);

initPage();