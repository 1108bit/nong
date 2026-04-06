let selectedMap = new Set();
let allSchedules = [];
let allSummaries = [];
let selectedDate = null;

// 날짜 표준화 헬퍼 (2026. 3. 8 -> 2026-03-08)
function normalizeDateStr(val) {
  if (!val) return '';
  let text = String(val).replace(/[\.\/]/g, '-').replace(/\s/g, '').trim();
  if (text.includes('-')) text = text.split('-').map(p => p.padStart(2, '0')).join('-');
  return text;
}
const isSameDate = (d1, d2) => normalizeDateStr(d1) === normalizeDateStr(d2);

async function initAvailability() {
  const accountId = getAccountId();
  const characterName = getMainName();

  // 로딩 중 스켈레톤 UI 표시
  const target = getEl("availabilityList");
  if (target) {
    target.innerHTML = `
      <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
      <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
      <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
    `;
  }

  initDateChips();

  // 칩 스크롤 및 인디케이터 활성화
  setTimeout(() => {
    if (typeof setupAppleScroll === 'function') {
      setupAppleScroll('dateChipGroup', 'dateScrollInd');
    }
  }, 100);

  const [schedule, mySelection, summaryData] = await Promise.all([
    callApi({ action: "getRaidSchedule" }),
    callApi({ action: "getAvailability", accountId, characterName }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  selectedMap.clear();
  mySelection.items?.forEach(i => selectedMap.add(`${i.day}__${i.time_slot}`));
  
  allSchedules = schedule.items || [];
  allSummaries = summaryData.items || [];
  
  updateDateChipsWithData();
  renderList();
}

function initDateChips() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  let html = "";
  
  if (!selectedDate) {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    selectedDate = `${yyyy}-${mm}-${dd}`;
  }
  
  for(let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayStr = days[d.getDay()];
    
    const dateVal = `${yyyy}-${mm}-${dd}`;
    
    const isWeekend = (dayStr === '토' || dayStr === '일') ? 'color: var(--blue-1);' : '';
    const isSelected = isSameDate(dateVal, selectedDate) ? "selected" : "";
    
    const appleDisplay = `<span style="font-size:11px; opacity:0.6; font-weight:700; ${isWeekend}">${dayStr}</span><span style="font-size:16px; font-weight:900; margin-top:4px;">${dd}</span>`;
    html += `<button type="button" class="chip-btn date-chip ${isSelected}" data-date="${dateVal}" data-day="${dayStr}">${appleDisplay}</button>`;
  }
  
  const group = getEl("dateChipGroup");
  if (group) group.innerHTML = html;
}

// 칩 이벤트 위임
const dateChipGroup = getEl("dateChipGroup");
if (dateChipGroup) {
  dateChipGroup.addEventListener("click", e => {
     if (window.isDraggingScroll) return; // 드래그 중 클릭 방지
     const btn = e.target.closest(".chip-btn");
     if(!btn) return;
     
     btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

     dateChipGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
     btn.classList.add("selected");
     selectedDate = btn.dataset.date;
     renderList();
  });
}

function updateDateChipsWithData() {
  const group = getEl("dateChipGroup");
  if (!group) return;
  
  let firstDataDate = null;

  group.querySelectorAll(".chip-btn").forEach(btn => {
    const dateVal = btn.dataset.date;
    const hasData = allSchedules.some(s => isSameDate(s.date, dateVal));
    if (hasData) {
      btn.style.border = "1px solid rgba(67, 217, 255, 0.4)";
      btn.style.background = "rgba(67, 217, 255, 0.05)";
      if (!firstDataDate) firstDataDate = dateVal;
    }
  });
  
  // 현재 선택된 날짜에 일정이 없고, 일정이 있는 첫 날짜가 존재하면 자동 스크롤/선택 이동
  const currentHasData = allSchedules.some(s => isSameDate(s.date, selectedDate));
  if (!currentHasData && firstDataDate) {
    const targetBtn = group.querySelector(`.chip-btn[data-date="${firstDataDate}"]`);
    if (targetBtn) {
      group.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
      targetBtn.classList.add("selected");
      selectedDate = firstDataDate;
      targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
}

function renderList() {
  const target = getEl("availabilityList");
  const filteredItems = allSchedules.filter(s => isSameDate(s.date, selectedDate));
  
  if (filteredItems.length === 0) {
    target.innerHTML = `<div class="availability-empty">선택한 날짜에 등록된 일정이 없습니다.</div>`;
    return;
  }

  // 시간순 정렬
  filteredItems.sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  target.innerHTML = filteredItems.map(i => {
    const key = `${i.day}__${i.time_slot}`;
    const isSelected = selectedMap.has(key);
    const shortDate = i.date && i.date.length >= 10 ? i.date.substring(5).replace('-', '.') : i.date;
    
    const participantsCount = allSummaries.filter(s => isSameDate(s.date, i.date) && s.time_slot === i.time_slot).length;

    return `
      <button class="availability-item ${isSelected ? 'active' : ''}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="row-time" style="flex-direction:row; align-items:center; width:auto; gap:6px;">
            <span class="row-date">${shortDate} (${escapeHtml(i.day)})</span>
            <span class="row-hhmm">${escapeHtml(i.time_slot)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="participant-count" style="font-size:12px; font-weight:600; color:var(--text-sub); display:flex; align-items:center; gap:4px;">
              <span class="ui-dot ${participantsCount >= 8 ? 'green' : 'gold'}"></span>${participantsCount}명 참여
            </span>
            <span class="status-text" style="font-size:13px; font-weight:800; color: ${isSelected ? 'var(--cyan-1)' : 'var(--text-muted)'};">${isSelected ? '✓ 참여' : '미선택'}</span>
          </div>
        </div>
        ${i.note ? `<div class="row-note" style="margin-top:6px; max-width:100%; white-space:normal;">${escapeHtml(i.note)}</div>` : ''}
      </button>
    `;
  }).join("");
  
  applyTouchPop();
}

// 이벤트 위임(Event Delegation)을 통한 리스너 최적화
getEl("availabilityList").addEventListener("click", (e) => {
  const btn = e.target.closest(".availability-item");
  if (!btn) return;
  toggleTime(btn.dataset.day, btn.dataset.time);
});

async function toggleTime(day, time) {
  const key = `${day}__${time}`;
  
  // 1. 낙관적 UI 업데이트 (API 응답을 기다리지 않고 화면부터 즉각 변경)
  const btn = document.querySelector(`.availability-item[data-day="${day}"][data-time="${time}"]`);
  if (selectedMap.has(key)) {
    selectedMap.delete(key);
    if (btn) {
      btn.classList.remove("active");
      btn.querySelector(".status-text").innerHTML = "미선택";
      btn.querySelector(".status-text").style.color = "var(--text-muted)";
      
      const countEl = btn.querySelector(".participant-count");
      if (countEl) {
        let currentCount = parseInt(countEl.textContent.replace(/[^0-9]/g, '')) || 0;
        currentCount = Math.max(0, currentCount - 1);
        countEl.innerHTML = `<span class="ui-dot ${currentCount >= 8 ? 'green' : 'gold'}"></span>${currentCount}명 참여`;
      }
    }
  } else {
    selectedMap.add(key);
    if (btn) {
      btn.classList.add("active");
      btn.querySelector(".status-text").innerHTML = "✓ 참여";
      btn.querySelector(".status-text").style.color = "var(--cyan-1)";

      const countEl = btn.querySelector(".participant-count");
      if (countEl) {
        let currentCount = parseInt(countEl.textContent.replace(/[^0-9]/g, '')) || 0;
        currentCount += 1;
        countEl.innerHTML = `<span class="ui-dot ${currentCount >= 8 ? 'green' : 'gold'}"></span>${currentCount}명 참여`;
      }
    }
  }

  const slotList = Array.from(selectedMap).map(s => {
    const [d, t] = s.split("__");
    return { day: d, time_slot: t };
  });

  // 2. 백그라운드에서 서버 동기화 (await 없이 백그라운드 실행)
  callApi({
    action: "saveAvailability",
    accountId: getAccountId(),
    mainName: getMainName(),
    characterName: getMainName(),
    type: "본캐",
    slotList: JSON.stringify(slotList)
  }).then(res => {
    // 3. 실패했을 경우에만 경고 후 원래 상태로 복구
    if (!res.ok) {
      alert("저장에 실패했습니다. 상태를 다시 동기화합니다.");
      initAvailability(); 
    }
  });
}

getEl("backButton").onclick = () => movePage("main.html");
initAvailability();