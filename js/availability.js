/**
 * 💡 [2순위: 상태 관리] 전역 변수를 State 객체로 묶어 예측 가능성 향상
 */
const State = {
  schedules: [],
  summaries: [],
  selectedDate: 'ALL', // 기본값을 '전체'로 변경
  selectedMap: new Set(),
  filterMode: 'all', // 필터 상태 (all / my)
  isSaving: false // 💡 [레이스 컨디션 방어용] 저장 중 상태 플래그
};


/**
 * 💡 [2순위: 패턴 일관성] 초기화 ➔ 이벤트 등록 ➔ 데이터 로드 ➔ 렌더링
 */
document.addEventListener('DOMContentLoaded', () => {
  initDateChips();
  bindEvents();
  loadAvailabilityData();
});

async function loadAvailabilityData() {
  const accountId = getAccountId();
  const characterName = getMainName();
  const cacheKey = `cache_avail_${accountId}`;
  const cachedData = sessionStorage.getItem(cacheKey);

  initDateChips();

  if (cachedData) {
    // 💡 캐시된 데이터가 있으면 스켈레톤 없이 즉각 렌더링
    try {
      const parsed = JSON.parse(cachedData);
      State.schedules = parsed.schedules || [];
      State.summaries = parsed.summaries || [];
      State.selectedMap = new Set(parsed.selectedMap || []);
      updateDateChipsWithData();
      renderList();
    } catch(e) {}
  } else {
    const target = getEl("availabilityList");
    if (target) {
      target.innerHTML = `
        <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
        <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
      `;
    }
  }

  // 칩 스크롤 및 인디케이터 활성화
  setTimeout(() => {
    if (typeof setupAppleScroll === 'function') {
      setupAppleScroll('dateChipGroup', 'dateScrollInd');
    }
  }, 100);

  const [schedule, summaryData] = await Promise.all([
    callApi({ action: "getRaidSchedule" }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  // 💡 [1순위] 통신 규격 변경 대응 (res.success, res.data 사용)
  if (!schedule.success || !summaryData.success) return; 

  // 💡 [레이스 컨디션 방어] 사용자가 버튼을 눌러 저장 중일 때는, 백그라운드 통신이 완료되어도 옛날 데이터로 덮어씌우지 않음!
  if (State.isSaving) return;

  State.schedules = schedule.data.items || [];
  State.summaries = summaryData.data.items || [];
  
  State.selectedMap.clear();
  const mySelections = State.summaries.filter(s => String(s.account_id).trim() === String(accountId).trim());
  mySelections.forEach(s => State.selectedMap.add(`${s.date}__${s.time_slot}`));

  // 최신 데이터를 캐시에 저장
  sessionStorage.setItem(cacheKey, JSON.stringify({
    schedules: State.schedules,
    summaries: State.summaries,
    selectedMap: Array.from(State.selectedMap) // Set은 JSON 변환이 안되므로 Array로 변환
  }));

  updateDateChipsWithData();
  renderList();
}

function initDateChips() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  let html = "";
  
  // 맨 앞에 '전체 일정' 칩 고정 추가
  html += `<button type="button" class="chip-btn date-chip ${State.selectedDate === 'ALL' ? 'selected' : ''}" data-date="ALL"><span style="font-size:14px; font-weight:800; margin:auto;">전체<br>일정</span></button>`;
  
  for(let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayStr = days[d.getDay()];
    
    const dateVal = `${yyyy}-${mm}-${dd}`;
    
    const isWeekend = (dayStr === '토' || dayStr === '일') ? 'color: var(--blue-1);' : '';
    const isSelected = isSameDate(dateVal, State.selectedDate) ? "selected" : "";
    
    const appleDisplay = `<span style="font-size:11px; opacity:0.6; font-weight:700; ${isWeekend}">${dayStr}</span><span style="font-size:16px; font-weight:900; margin-top:4px;">${dd}</span>`;
    html += `<button type="button" class="chip-btn date-chip ${isSelected}" data-date="${dateVal}" data-day="${dayStr}">${appleDisplay}</button>`;
  }
  
  const group = getEl("dateChipGroup");
  if (group) group.innerHTML = html;
}

function bindEvents() {
  // 칩 스크롤 클릭 이벤트
  const dateChipGroup = getEl("dateChipGroup");
  if (dateChipGroup) {
    dateChipGroup.addEventListener("click", e => {
       if (window.isDraggingScroll) return;
       const btn = e.target.closest(".chip-btn");
       if(!btn) return;
       
       btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
       dateChipGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
       btn.classList.add("selected");
       State.selectedDate = btn.dataset.date; // State 업데이트
       renderList();
    });
  }

  // 필터 탭 클릭 이벤트 (전체 / 참여 중)
  const filterGroup = getEl("filterGroup");
  if (filterGroup) {
    filterGroup.addEventListener("click", e => {
      const btn = e.target.closest(".chip-btn");
      if (!btn) return;
      filterGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      State.filterMode = btn.dataset.filter;
      renderList();
    });
  }

  // 리스트 클릭 이벤트 (이벤트 위임)
  const listEl = getEl("availabilityList");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".availability-item");
      if (!btn) return;
      toggleTime(btn.dataset.date, btn.dataset.time);
    });
  }

  getEl("backButton").onclick = () => movePage("main.html");
}

function updateDateChipsWithData() {
  const group = getEl("dateChipGroup");
  if (!group) return;
  
  let firstDataDate = null;

  group.querySelectorAll(".chip-btn").forEach(btn => {
    const dateVal = btn.dataset.date;
    const hasData = State.schedules.some(s => isSameDate(s.date, dateVal));
    if (hasData) {
      btn.style.border = "1px solid rgba(67, 217, 255, 0.4)";
      btn.style.background = "rgba(67, 217, 255, 0.05)";
      if (!firstDataDate) firstDataDate = dateVal;
    }
  });
  
  // 현재 선택된 날짜에 일정이 없고, 일정이 있는 첫 날짜가 존재하면 자동 스크롤/선택 이동
  const currentHasData = State.selectedDate === 'ALL' || State.schedules.some(s => isSameDate(s.date, State.selectedDate));
  if (State.selectedDate !== 'ALL' && !currentHasData && firstDataDate) {
    const targetBtn = group.querySelector(`.chip-btn[data-date="${firstDataDate}"]`);
    if (targetBtn) {
      group.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
      targetBtn.classList.add("selected");
      State.selectedDate = firstDataDate;
      targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
}

function renderList() {
  const target = getEl("availabilityList");
  let filteredItems = State.schedules;
  
  // 1. 날짜 필터링
  if (State.selectedDate !== 'ALL') {
    filteredItems = filteredItems.filter(s => isSameDate(s.date, State.selectedDate));
  }

  // 2. '참여 중' 탭 필터링
  if (State.filterMode === 'my') {
    filteredItems = filteredItems.filter(s => State.selectedMap.has(`${s.date}__${s.time_slot}`));
  }
  
  if (filteredItems.length === 0) {
    target.innerHTML = `<div class="availability-empty">${State.filterMode === 'my' ? '참여 중인 일정이 없습니다.' : '선택한 날짜에 등록된 일정이 없습니다.'}</div>`;
    return;
  }

  // 날짜순 -> 시간순 정렬
  filteredItems.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time_slot.localeCompare(b.time_slot);
  });

  let html = "";
  let currentDate = null;

  filteredItems.forEach(i => {
    if (currentDate !== i.date) {
      currentDate = i.date;
      const shortDate = i.date && i.date.length >= 10 ? i.date.substring(5).replace('-', '.') : i.date;
      html += `
        <div style="display: flex; align-items: center; gap: 10px; margin: 24px 0 12px 4px;">
          <div style="font-size: 15px; font-weight: 800; color: var(--cyan-2); letter-spacing: -0.02em; white-space: nowrap;">📅 ${shortDate} (${escapeHtml(i.day)})</div>
          <div style="height: 1px; flex: 1; background: linear-gradient(90deg, rgba(67, 217, 255, 0.25), transparent);"></div>
        </div>
      `;
    }

    const key = `${i.date}__${i.time_slot}`;
    const isSelected = State.selectedMap.has(key);
    const participantsCount = State.summaries.filter(s => isSameDate(s.date, i.date) && s.time_slot === i.time_slot).length;

    html += `
      <button class="availability-item ${isSelected ? 'active' : ''}" data-date="${i.date}" data-time="${escapeHtml(i.time_slot)}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="row-time" style="flex-direction:row; align-items:center; width:auto; gap:6px;">
            <span class="row-hhmm" style="font-size:18px; font-weight:900;">${escapeHtml(i.time_slot)}</span>
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
  });
  
  target.innerHTML = html;
  
  applyTouchPop();
}

async function toggleTime(date, time) {
  const key = `${date}__${time}`;
  const scheduleItem = State.schedules.find(s => s.date === date && s.time_slot === time);
  if (!scheduleItem) return;
  const targetWeekKey = scheduleItem.week_key;
  
  // 1. 낙관적 UI 업데이트 (API 응답을 기다리지 않고 화면부터 즉각 변경)
  const btn = document.querySelector(`.availability-item[data-date="${date}"][data-time="${time}"]`);
  if (State.selectedMap.has(key)) {
    State.selectedMap.delete(key);
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

      // 💡 [캐시 정합성 맞춤] 취소(delete) 시: 캐시 배열에서 내 정보를 찾아서 '삭제'
      const idx = State.summaries.findIndex(s => s.account_id === getAccountId() && s.date === date && s.time_slot === time);
      if (idx !== -1) State.summaries.splice(idx, 1);
    }
  } else {
    State.selectedMap.add(key);
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
      
      // 💡 [캐시 정합성 맞춤] 참여(add) 시: 캐시 배열에 내 정보를 '추가'
      State.summaries.push({ account_id: getAccountId(), date: date, time_slot: time, className: "검성", power_value: 0 }); // 최소한의 기본 포맷 유지
    }
  }

  // 현재 클릭한 일정과 '같은 주차(week_key)'에 속한 항목들만 안전하게 분리해서 모아줌
  const slotsForThisWeek = [];
  for (const selKey of State.selectedMap) {
    const [d, t] = selKey.split("__");
    const sItem = State.schedules.find(s => s.date === d && s.time_slot === t);
    if (sItem && sItem.week_key === targetWeekKey) {
      slotsForThisWeek.push({ day: sItem.day, time_slot: t });
    }
  }

  // 💡 [SWR 캐시 동기화] 변경된 상태를 즉시 캐시에 저장하여 나갔다 들어와도 깜빡임 없음
  sessionStorage.setItem(`cache_avail_${getAccountId()}`, JSON.stringify({
    schedules: State.schedules,
    summaries: State.summaries,
    selectedMap: Array.from(State.selectedMap)
  }));

  // 2. 백그라운드에서 서버 동기화 (await 없이 백그라운드 실행)
  callApi({
    action: "saveAvailability",
    accountId: getAccountId(),
    mainName: getMainName(),
    characterName: getMainName(),
    type: "본캐",
    weekKey: targetWeekKey,
    slotList: JSON.stringify(slotsForThisWeek)
  }).then(res => {
    State.isSaving = false; // 저장 상태 OFF (백그라운드 동기화 허용)
    
    // 💡 1순위: 에러 알림은 api.js에서 띄워주므로, 여기서는 데이터 롤백만 수행하면 끝!
    if (!res.success) {
      loadAvailabilityData(); 
    }
  });
}