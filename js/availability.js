/**
 * 💡 [2순위: 상태 관리] 전역 변수를 State 객체로 묶어 예측 가능성 향상
 */
const State = {
  schedules: [],
  summaries: [],
  selectedDate: 'ALL', // 기본값을 '전체'로 변경
  selectedMap: new Set(),
  originalSelectedMap: new Set(), // 💡 원본 데이터 비교용
  filterMode: 'all', // 필터 상태 (all / my)
  isSaving: false, // 💡 [레이스 컨디션 방어용] 저장 중 상태 플래그
  hasChanges: false // 💡 변경사항 존재 여부
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
      State.originalSelectedMap = new Set(parsed.selectedMap || []); // 캐시 불러올 때 원본도 동일하게 세팅
      updateDateChipsWithData();
      renderList();
      updateSaveButtonVisibility(); // 버튼 숨김 처리
    } catch(e) {}
  } else {
    const target = getEl("availabilityList");
    if (target) {
      target.innerHTML = `
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
  State.originalSelectedMap.clear(); // 원본 초기화
  const mySelections = State.summaries.filter(s => String(s.account_id).trim() === String(accountId).trim());
  mySelections.forEach(s => {
    State.selectedMap.add(`${s.date}__${s.time_slot}`);
    State.originalSelectedMap.add(`${s.date}__${s.time_slot}`);
  });

  // 최신 데이터를 캐시에 저장
  sessionStorage.setItem(cacheKey, JSON.stringify({
    schedules: State.schedules,
    summaries: State.summaries,
    selectedMap: Array.from(State.selectedMap) // Set은 JSON 변환이 안되므로 Array로 변환
  }));

  updateDateChipsWithData();
  renderList();
  updateSaveButtonVisibility();
}

function initDateChips() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  let html = "";
  
  // 맨 앞에 '전체 일정' 칩 고정 추가
  html += `<button type="button" class="chip-btn date-chip ${State.selectedDate === 'ALL' ? 'selected' : ''}" data-date="ALL"><span style="font-size:14px; font-weight:800; margin:auto;">전체<br>일정</span></button>`;
  
  for(let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayStr = days[d.getDay()];
    
    const dateVal = `${yyyy}-${mm}-${dd}`;
    
    let isWeekend = '';
    if (dayStr === '토') isWeekend = 'color: var(--blue-1);';
    else if (dayStr === '일') isWeekend = 'color: var(--red-1);';
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

  getEl("backButton").onclick = async () => {
    if (State.hasChanges) {
      if (!(await uiConfirm("저장하지 않은 일정이 있습니다.\n변경사항을 버리고 나가시겠습니까?"))) return;
    }
    movePage("main.html");
  };
}

function updateDateChipsWithData() {
  const group = getEl("dateChipGroup");
  if (!group) return;
  
  let firstDataDate = null;

  group.querySelectorAll(".chip-btn").forEach(btn => {
    const dateVal = btn.dataset.date;
    const hasData = State.schedules.some(s => isSameDate(s.date, dateVal));
    
    btn.classList.toggle("has-data", hasData); // 💡 인라인 스타일 대신 CSS 클래스로 깔끔하게 제어
    if (hasData && !firstDataDate) firstDataDate = dateVal;
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
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 7);
  const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;

  // 1. 날짜 필터링
  if (State.selectedDate !== 'ALL') {
    filteredItems = filteredItems.filter(s => isSameDate(s.date, State.selectedDate));
  } else {
    // 💡 '전체 일정' 선택 시 오늘부터 +7일(총 8일)까지만 표시되도록 제한
    filteredItems = filteredItems.filter(s => s.date >= todayStr && s.date <= maxDateStr);
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
            <span class="row-hhmm" style="font-size:18px; font-weight:700; font-variant-numeric: tabular-nums;">${escapeHtml(i.time_slot)}</span>
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

  // 💡 [SWR 캐시 동기화] 변경된 상태를 즉시 캐시에 저장하여 나갔다 들어와도 깜빡임 없음
  sessionStorage.setItem(`cache_avail_${getAccountId()}`, JSON.stringify({
    schedules: State.schedules,
    summaries: State.summaries,
    selectedMap: Array.from(State.selectedMap)
  }));

  // 💡 [UX 개편] 자동 저장 대신, 변경사항이 생기면 '저장하기' 버튼을 띄우도록 처리
  updateSaveButtonVisibility();
}

// =========================
// 수동 저장(확정) 로직
// =========================
function updateSaveButtonVisibility() {
  let diffFound = false;
  if (State.selectedMap.size !== State.originalSelectedMap.size) {
    diffFound = true;
  } else {
    for (let val of State.selectedMap) {
      if (!State.originalSelectedMap.has(val)) {
        diffFound = true;
        break;
      }
    }
  }
  State.hasChanges = diffFound;

  let btn = document.getElementById("floatingSaveBtn");
  if (diffFound) {
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "floatingSaveBtn";
      btn.className = "touch-pop";
      // 💡 [Apple HIG 스타일] 투명한 유리 질감(Glassmorphism)과 둥근 알약(Pill) 디자인 적용
      btn.style.cssText = `
        position: fixed; bottom: max(32px, env(safe-area-inset-bottom, 32px)); right: 20px;
        transform: translateY(40px) scale(0.9); opacity: 0;
        width: max-content; padding: 0 20px; min-height: 52px;
        z-index: 50; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; /* 💡 팝업창 위로 올라오는 현상 방지 */
        border-radius: 999px; background: rgba(10, 132, 255, 0.85); border: none;
        backdrop-filter: blur(24px) saturate(150%); -webkit-backdrop-filter: blur(24px) saturate(150%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 16px 32px rgba(0, 0, 0, 0.4);
        color: #fff; display: flex; align-items: center; justify-content: center; gap: 6px;
        transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1); cursor: pointer;
      `;
      btn.innerHTML = "💾 변경사항 저장하기";
      btn.onclick = saveAllChanges;
      document.body.appendChild(btn);
    }
    btn.style.display = "flex";
    void btn.offsetWidth; // 💡 애니메이션 트리거를 위한 Reflow 강제 발생
    btn.style.opacity = "1";
    btn.style.transform = "translateY(0) scale(1)";
  } else {
    if (btn) {
      btn.style.opacity = "0";
      btn.style.transform = "translateY(40px) scale(0.9)";
      // 💡 애니메이션이 끝난 후 화면에서 부드럽게 숨김 처리
      setTimeout(() => { if (!State.hasChanges) btn.style.display = "none"; }, 400);
    }
  }
}

async function saveAllChanges() {
  if (State.isSaving) return;
  State.isSaving = true;
  
  const btn = document.getElementById("floatingSaveBtn");
  if (btn) {
    btn.innerHTML = '<span class="spinner-icon"></span> 저장 중...';
    btn.style.pointerEvents = "none"; // 💡 더블 클릭 방지 처리
  }

  // 변경사항이 발생한 모든 주차(week_key) 수집
  const affectedWeekKeys = new Set();
  const addWeeksFromMap = (map) => {
    for (const key of map) {
      const [d, t] = key.split("__");
      const sItem = State.schedules.find(s => s.date === d && s.time_slot === t);
      if (sItem && sItem.week_key) affectedWeekKeys.add(sItem.week_key);
    }
  };
  
  addWeeksFromMap(State.selectedMap);
  addWeeksFromMap(State.originalSelectedMap);
  
  let hasError = false;
  
  // 영향을 받은 주차별로 묶어서 일괄 전송
  for (const weekKey of affectedWeekKeys) {
     const slotsForThisWeek = [];
     for (const selKey of State.selectedMap) {
       const [d, t] = selKey.split("__");
       const sItem = State.schedules.find(s => s.date === d && s.time_slot === t);
       if (sItem && sItem.week_key === weekKey) {
         slotsForThisWeek.push({ day: sItem.day, time_slot: t });
       }
     }
     
     const res = await callApi({
        action: "saveAvailability",
        accountId: getAccountId(),
        mainName: getMainName(),
        characterName: getMainName(),
        type: "본캐", 
        weekKey: weekKey,
        slotList: JSON.stringify(slotsForThisWeek),
        showLoading: false // 플로팅 버튼 자체 스피너 사용
     });
     
     if (!res.success) hasError = true;
  }
  
  State.isSaving = false;
  if (btn) {
    btn.innerHTML = "💾 변경사항 저장하기";
    btn.style.pointerEvents = "auto";
  }
  
  if (!hasError) {
     await uiAlert("일정이 성공적으로 저장되었습니다.");
     State.originalSelectedMap = new Set(State.selectedMap);
     // 💡 [캐시 무효화] 메인 화면으로 돌아갔을 때 '내 레이드 일정'이 즉시 최신화되도록 기존 메인 캐시 삭제
     sessionStorage.removeItem(`cache_main_${getAccountId()}`);
     updateSaveButtonVisibility();
     loadAvailabilityData(); // 서버의 최신 정보와 화면을 최종 동기화
  } else {
     await uiAlert("일부 데이터를 저장하는데 실패했습니다. 다시 시도해주세요.");
  }
}