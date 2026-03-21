const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

const DAYS = ["수", "목", "금", "토", "일"];
const TIMES = ["19:00", "20:00", "21:00", "22:00", "23:00"];

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

function renderSummaryGrid() {
  const target = document.getElementById("summaryGrid");
  const html = [];

  html.push(`<div class="summary-head">시간</div>`);
  DAYS.forEach(day => {
    html.push(`<div class="summary-head">${day}</div>`);
  });

  TIMES.forEach(time => {
    html.push(`<div class="summary-time">${time}</div>`);

    DAYS.forEach(day => {
      const count = getCount(day, time);
      const key = makeKey(day, time);
      const active = selectedKey === key ? "active" : "";

      html.push(`
        <button class="summary-cell ${active}" data-day="${day}" data-time="${time}">
          <strong>${count}</strong>
          <span>가능</span>
        </button>
      `);
    });
  });

  target.innerHTML = html.join("");

  target.querySelectorAll(".summary-cell").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      const time = btn.dataset.time;
      selectedKey = makeKey(day, time);
      renderSummaryGrid();
      renderMemberList(day, time);
    });
  });
}

function renderMemberList(day, time) {
  const target = document.getElementById("memberList");
  const title = document.getElementById("detailTitle");
  const items = getMembers(day, time);

  title.textContent = `${day} ${time} 가능 인원 (${items.length})`;

  if (items.length === 0) {
    target.innerHTML = `
      <div class="member-item">
        <div>
          <div class="member-name">가능 인원이 없습니다</div>
          <div class="member-meta">다른 시간대를 확인해주세요</div>
        </div>
        <div class="member-badge">0명</div>
      </div>
    `;
    return;
  }

  target.innerHTML = items.map(item => `
    <div class="member-item">
      <div>
        <div class="member-name">${item.character_name}</div>
        <div class="member-meta">${item.main_name} · ${item.type || "-"}</div>
      </div>
      <div class="member-badge">${item.type || "-"}</div>
    </div>
  `).join("");
}

async function loadSummary() {
  try {
    const data = await callApi({ action: "getAvailabilitySummary" });

    if (!data.ok) return;

    summaryItems = data.items || [];
    renderSummaryGrid();
  } catch (error) {
    console.error(error);
  }
}

document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

loadSummary();