// 페이지 진입 시 즉각적인 권한 검사 (비정상 접근 원천 차단)
if (sessionStorage.getItem("isAdmin") !== "true" || !getAdminCode()) {
  alert("세션이 만료되었거나 관리자 권한이 없습니다.\n다시 로그인해 주세요.");
  location.replace("index.html");
}

/**
 * 💡 [2순위: 상태 관리] 전역 변수를 State 객체로 묶어 예측 가능성 향상
 */
const State = {
  schedules: [],
  summaries: [],
  selectedDashboardDate: null
};

/**
 * 💡 [2순위: 패턴 일관성] 초기화 ➔ 이벤트 등록 ➔ 데이터 로드 ➔ 렌더링
 */
document.addEventListener('DOMContentLoaded', () => {
  initDateChips();
  initTimeChips();
  bindEvents();
  loadAdminSchedule();

  // 칩 스크롤 및 인디케이터 활성화 (안전하게 약간의 지연)
  setTimeout(() => {
    if (typeof setupAppleScroll === 'function') {
      setupAppleScroll('dateChipGroup', 'dateScrollInd');
      setupAppleScroll('timeChipGroup', 'timeScrollInd');
      setupAppleScroll('editDateChipGroup', 'editDateScrollInd');
      setupAppleScroll('editTimeChipGroup', 'editTimeScrollInd');
    }
  }, 100);
});

// 날짜 칩 자동 생성 로직 (오늘부터 14일)
function initDateChips() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  let html = "";
  
  for(let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayStr = days[d.getDay()];
    
    const dateVal = `${yyyy}-${mm}-${dd}`;
    const displayVal = `${mm}.${dd} (${dayStr})`;
    
    const isWeekend = (dayStr === '토' || dayStr === '일') ? 'color: var(--blue-1);' : '';
    const isSelected = i === 0 ? "selected" : "";
    
    const appleDisplay = `<span style="font-size:11px; opacity:0.6; font-weight:700; ${isWeekend}">${dayStr}</span><span style="font-size:16px; font-weight:900; margin-top:4px;">${dd}</span>`;
    html += `<button type="button" class="chip-btn date-chip ${isSelected}" data-date="${dateVal}" data-day="${dayStr}">${appleDisplay}</button>`;
  }
  
  // 1. 등록 폼용
  const group1 = getEl("dateChipGroup");
  if (group1) {
    group1.innerHTML = html;
    const firstBtn = group1.querySelector(".chip-btn");
    if (firstBtn) {
      getEl("dateInput").value = firstBtn.dataset.date;
      getEl("dayInput").value = firstBtn.dataset.day;
    }
    group1.addEventListener("click", e => {
       const btn = e.target.closest(".chip-btn");
       if(!btn) return;
       group1.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
       btn.classList.add("selected");
       getEl("dateInput").value = btn.dataset.date;
       getEl("dayInput").value = btn.dataset.day;
    });
  }

  // 2. 수정 모달용
  const group2 = getEl("editDateChipGroup");
  if (group2) {
    group2.innerHTML = html;
    group2.addEventListener("click", e => {
       const btn = e.target.closest(".chip-btn");
       if(!btn) return;
       group2.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
       btn.classList.add("selected");
       getEl("editDateInput").value = btn.dataset.date;
       getEl("editDayInput").value = btn.dataset.day;
    });
  }
}

// 시간 칩 동적 생성 로직 (09:00 ~ 24:00, 1시간(정각) 단위 복구)
function initTimeChips() {
  let html = "";
  for (let h = 9; h <= 24; h++) {
    let m = "00"; // 1시간 단위 강제
    
    let displayH = h;
    let ampm = "오전";
    if (h >= 12 && h < 24) { ampm = "오후"; displayH = h === 12 ? 12 : h - 12; }
    else if (h === 24) { ampm = "오전"; displayH = 12; }
    
    const valueH = h === 24 ? "00" : String(h).padStart(2, '0');
    const dateVal = `${valueH}:${m}`;
    const isSelected = h === 9 ? "selected" : "";
    
    const appleDisplay = `<span style="font-size:11px; font-weight:700;">${ampm}</span><span style="font-size:16px; font-weight:900; margin-top:4px;">${displayH}:${m}</span>`;
    html += `<button type="button" class="chip-btn date-chip ${isSelected}" data-value="${dateVal}">${appleDisplay}</button>`;
  }
  
  const group1 = getEl("timeChipGroup");
  if (group1) group1.innerHTML = html;
  const group2 = getEl("editTimeChipGroup");
  if (group2) group2.innerHTML = html;
}

// 달력 및 시간 입력창 변경 이벤트 연동
const calPicker = getEl("calendarPicker");
if (calPicker) {
  calPicker.onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    getEl("dateInput").value = val;
    getEl("dayInput").value = days[d.getDay()];
    document.querySelectorAll("#dateChipGroup .chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.date === val));
  };
}

const editCalPicker = getEl("editCalendarPicker");
if (editCalPicker) {
  editCalPicker.onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    getEl("editDateInput").value = val;
    getEl("editDayInput").value = days[d.getDay()];
    document.querySelectorAll("#editDateChipGroup .chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.date === val));
  };
}

// 시간 입력창 정각 보정 및 칩 연동 로직
function syncTimeInputToChip(inputId, groupSelector) {
  const inputEl = getEl(inputId);
  if (inputEl) {
    inputEl.addEventListener("change", (e) => {
      if (!e.target.value) return;
      let [h, m] = e.target.value.split(":");
      m = "00"; // 1시간 단위 강제 정각 고정
      e.target.value = `${h}:${m}`;
      const timeGroup = getEl(groupSelector);
      if (timeGroup) {
        timeGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.value === `${h}:${m}`));
      }
    });
  }
}
syncTimeInputToChip("timeSlotInput", "timeChipGroup");
syncTimeInputToChip("editTimeSlotInput", "editTimeChipGroup");

// 구글 시트의 ISO 8601 시간 오차(1899-12-30T...)를 완벽히 필터링하는 함수
function formatDisplayTime(ts) {
  if (!ts) return "";
  if (ts.includes("T")) {
    const m = ts.match(/T(\d{2}:\d{2})/);
    if (m) return m[1];
  }
  return ts;
}

// ==========================================
// 날짜 표준화 및 완벽 비교 헬퍼 ("2026. 3. 8" -> "2026-03-08")
function normalizeDateStr(val) {
  if (!val) return '';
  let text = String(val).replace(/[\.\/]/g, '-').replace(/\s/g, '').trim();
  if (text.includes('-')) text = text.split('-').map(p => p.padStart(2, '0')).join('-');
  return text;
}
const isSameDate = (d1, d2) => normalizeDateStr(d1) === normalizeDateStr(d2);
// ==========================================

async function loadAdminSchedule() {
  const adminCode = getAdminCode();
  if (!adminCode) return movePage("index.html");
  
  // 마스터 계정이 아니면 보안 설정 카드 숨김
  if (getAccountId() !== 'MASTER_ADMIN') {
    const secCard = getEl("securitySettingsCard");
    if (secCard) secCard.style.display = "none";
  }

  // API 통신을 시작하기 전에 화면에 직관적인 로딩 스피너 표시
  const list = getEl("scheduleList");
  if (list) {
    list.innerHTML = `<div class="admin-empty-state" style="margin-top: 40px;"><span style="display:inline-block; font-size: 28px; margin-bottom: 12px; animation: spin 1s linear infinite;">⏳</span><br>일정 및 파티 데이터를 불러오는 중입니다...</div>`;
  }

  const [scheduleData, summaryData] = await Promise.all([
    callApi({ action: "getRaidScheduleAdmin", adminCode }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  // 💡 [1순위] 통신 규격 변경 대응 (res.success, res.data 사용)
  if (!scheduleData.success) return movePage("index.html");
  if (!summaryData.success) return; // 에러 메시지는 api.js에서 일괄 처리

  State.schedules = scheduleData.data.items || [];
  State.summaries = summaryData.data.items || [];

  if (!State.selectedDashboardDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    State.selectedDashboardDate = `${yyyy}-${mm}-${dd}`;
  }

  renderCalendar();
  renderScheduleList(State.selectedDashboardDate);
}

function renderCalendar() {
  const calEl = getEl("miniCalendar");
  if (!calEl) return;
  
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  let html = "";
  
  let selectedIndex = 0; // 진행 바를 위한 인덱스 추적

  // 1. 반복문 밖에서 날짜별 신청 인원수를 미리 계산하여 Map 형태로 저장 (수십 배 빠른 렌더링 성능)
  const countsByDate = State.summaries.reduce((acc, s) => {
    const cleanDate = normalizeDateStr(s.date);
    acc[cleanDate] = (acc[cleanDate] || 0) + 1;
    return acc;
  }, {});

  for(let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayStr = days[d.getDay()];
    const dateVal = `${yyyy}-${mm}-${dd}`;
    const cleanDateVal = normalizeDateStr(dateVal);
    
    const isWeekend = (dayStr === '토' || dayStr === '일') ? 'color: var(--blue-1);' : '';
    const isActive = isSameDate(dateVal, State.selectedDashboardDate) ? 'active' : '';
    if (isActive) selectedIndex = i; // 현재 선택된 날짜의 인덱스 저장
    const hasData = State.schedules.some(s => isSameDate(s.date, dateVal)) ? 'has-data' : '';
    
    // 2. 미리 계산해둔 객체에서 값만 쏙 뽑아오기 (데이터가 수천 개여도 렉 없음)
    const totalApplicants = countsByDate[cleanDateVal] || 0;
    
    let badgeHtml = "";
    let highlightClass = "";
    let dotClass = "";

    if (totalApplicants > 0) {
      badgeHtml = `<div class="applicant-badge">${totalApplicants}</div>`;
      dotClass = "has-applicants";
      if (totalApplicants >= 16) highlightClass = "high-demand"; // 2파티(16명) 이상 시 강조
    }
    
    html += `
      <div class="cal-day-cell ${isActive} ${hasData} ${dotClass} ${highlightClass}" data-date="${dateVal}" data-index="${i}">
        ${badgeHtml}
        <div class="cal-dow" style="${isWeekend}">${dayStr}</div>
        <div class="cal-date">${dd}</div>
      </div>
    `;
  }
  
  calEl.innerHTML = html;
  
  // 최초 로드 시 상단 파란색 인디케이터 게이지 채우기
  const progress = getEl("dashboardProgress");
  if (progress) {
    const percent = (selectedIndex / 13) * 100;
    progress.style.width = `${percent}%`;
  }
  
  calEl.querySelectorAll('.cal-day-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      calEl.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('active'));
      cell.classList.add('active');
      State.selectedDashboardDate = cell.dataset.date;
      
      // 클릭 시 인디케이터 부드럽게 이동
      if (progress) {
        const idx = parseInt(cell.dataset.index, 10);
        const percent = (idx / 13) * 100;
        progress.style.width = `${percent}%`;
      }
      
      renderScheduleList(State.selectedDashboardDate);
    });
  });
}

function renderScheduleList(dateStr) {
  const list = getEl("scheduleList");
  if (!list) return;
  
  const filtered = State.schedules.filter(s => isSameDate(s.date, dateStr));
  list.innerHTML = "";
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="admin-empty-state">📅 선택한 날짜에 등록된 일정이 없습니다.</div>`;
    return;
  }
  
  filtered.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  
  let html = "";
  filtered.forEach((i, idx) => {
    const participants = State.summaries.filter(s => isSameDate(s.date, i.date) && String(s.time_slot).trim() === String(i.time_slot).trim());
    const count = participants.length;
    const maxCount = 8;
    const progressPercent = Math.min(100, Math.round((count / maxCount) * 100));
    
    const hasHealer = participants.some(p => p.className === "치유성");
    const isRisk = count > 0 && (count < maxCount || !hasHealer); 
    const riskBorder = isRisk ? "border: 1px solid rgba(251, 113, 133, 0.4);" : "";
    const fillClass = hasHealer ? "" : "healer-missing";
    
    const timeFormatted = formatDisplayTime(i.time_slot);
    const title = i.note ? i.note : "레이드 일정";
    const animDelay = idx * 0.05;

    html += `
      <div class="slim-schedule-card" style="animation-delay: ${animDelay}s; ${riskBorder}">
        <div class="slim-time" style="cursor:pointer;" onclick="openPartyDetail('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}')">${timeFormatted}</div>
        <div class="slim-info" style="cursor:pointer;" onclick="openPartyDetail('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}')">
          <div class="slim-title">${escapeHtml(title)}</div>
          <div class="slim-progress-wrapper">
            <div class="slim-progress-bar">
              <div class="slim-progress-fill ${fillClass}" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="slim-count">${count}/${maxCount}</div>
          </div>
        </div>
        <div class="slim-actions">
          <button type="button" class="icon-btn edit-btn" title="수정" onclick="editSchedule('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}', '${escapeHtml(i.note)}')">✏️</button>
          <button type="button" class="icon-btn delete-btn" title="삭제" onclick="deleteSchedule('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}')">🗑️</button>
        </div>
      </div>
    `;
  });
  
  list.innerHTML = html;
}

async function saveSchedule() {
  const btn = getEl("saveButton");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> 저장 중...`;

  // 지능형 넘버링 (N차 파티 생성 로직)
  let targetNote = getEl("noteInput").value;
  const summaryData = await callApi({ action: "getAvailabilitySummary" });
  if (summaryData.success && summaryData.data.items) {
      const targetDate = getEl("dateInput").value;
      const targetTime = getEl("timeSlotInput").value;
      const sameSlotCount = summaryData.data.items.filter(s => s.date === targetDate && s.time_slot === targetTime).length;
      
      if (sameSlotCount >= 8) {
          const suffix = `(${Math.floor(sameSlotCount / 8) + 1})`;
          if (!targetNote.includes(suffix)) {
              targetNote = targetNote ? `${targetNote} ${suffix}` : suffix;
          }
      }
  }

  const res = await callApi({
    action: "saveRaidSchedule",
    adminCode: getAdminCode(),
    date: getEl("dateInput").value,
    day: getEl("dayInput").value,
    timeSlot: getEl("timeSlotInput").value,
    note: targetNote,
    openYn: "Y", status: "OPEN"
  });
  
  btn.disabled = false;
  btn.textContent = originalText;

  if(res.success) { alert("저장되었습니다."); loadAdminSchedule(); }
}

async function deleteSchedule(date, day, time) {
  if(!confirm("정말 삭제하시겠습니까?")) return;
  const res = await callApi({ action: "deleteRaidSchedule", adminCode: getAdminCode(), date, day, timeSlot: time });
  if(res.success) loadAdminSchedule();
}

// 가로 스크롤 컨테이너 내에서 선택된 칩으로 부드럽게 자동 스크롤하는 함수
function scrollToSelectedChip(containerId) {
  const container = getEl(containerId);
  if (!container) return;
  const selected = container.querySelector('.chip-btn.selected');
  if (selected) {
    const scrollLeft = selected.offsetLeft - container.clientWidth / 2 + selected.clientWidth / 2;
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }
}

function editSchedule(date, day, time, note) {
  // 원본 데이터 저장 (날짜/시간 변경 시 기존 일정 삭제용)
  getEl("editOriginalDate").value = date;
  getEl("editOriginalDay").value = day;
  getEl("editOriginalTime").value = time;

  getEl("editDateInput").value = date;
  getEl("editDayInput").value = day;
  getEl("editTimeSlotInput").value = time;
  getEl("editNoteInput").value = note;

  const editCal = getEl("editCalendarPicker");
  if (editCal) editCal.value = date;

  // 칩 시각적 연동
  // [추가할 코드] 상단 안내 문구 업데이트
  const infoText = `${date} [${time}] 일정을 수정 중입니다.`;
  const infoElement = document.getElementById('editScheduleInfo');
  if (infoElement) {
    infoElement.innerText = infoText;
  }

  const dateGroup = getEl("editDateChipGroup");
  if (dateGroup) {
    dateGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.date === date));
  }
  
  const timeGroup = getEl("editTimeChipGroup");
  if (timeGroup) {
    timeGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.value === time));
  }

  getEl("scheduleModal").classList.add("show");
  document.body.classList.add("modal-open");
  
  // 모달이 열릴 때 스크롤 너비 재계산(인디케이터 위치 갱신)
  setTimeout(() => {
    getEl("editDateChipGroup")?.dispatchEvent(new Event('scroll'));
    getEl("editTimeChipGroup")?.dispatchEvent(new Event('scroll'));
    scrollToSelectedChip("editDateChipGroup");
    scrollToSelectedChip("editTimeChipGroup");
  }, 10);
}

function closeScheduleModal() {
  getEl("scheduleModal").classList.remove("show");
  document.body.classList.remove("modal-open");
}
if(getEl("closeScheduleModalBtn")) getEl("closeScheduleModalBtn").onclick = closeScheduleModal;
if(getEl("cancelScheduleModalBtn")) getEl("cancelScheduleModalBtn").onclick = closeScheduleModal;

// 일정 수정 완료 로직
if(getEl("submitScheduleModalBtn")) {
  getEl("submitScheduleModalBtn").onclick = async () => {
    const btn = getEl("submitScheduleModalBtn");
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> 처리 중...`;

    const oDate = getEl("editOriginalDate").value;
    const oDay = getEl("editOriginalDay").value;
    const oTime = getEl("editOriginalTime").value;
    const nDate = getEl("editDateInput").value;
    const nDay = getEl("editDayInput").value;
    const nTime = getEl("editTimeSlotInput").value;
    const nNote = getEl("editNoteInput").value;

    // 일자나 시간이 변경된 경우 기존 데이터를 지우고 새 데이터를 생성하여 덮어씌움 방지
    if (oDate !== nDate || oTime !== nTime) {
        await callApi({ action: "deleteRaidSchedule", adminCode: getAdminCode(), date: oDate, day: oDay, timeSlot: oTime });
    }

    const res = await callApi({
      action: "saveRaidSchedule", adminCode: getAdminCode(),
      date: nDate, day: nDay, timeSlot: nTime, note: nNote, openYn: "Y", status: "OPEN"
    });

    btn.disabled = false;
    btn.textContent = "완료";

    if (res.success) {
       alert("일정이 성공적으로 수정되었습니다.");
       closeScheduleModal();
       loadAdminSchedule();
    }
  }; 
}

  const searchArea = getEl("userSearchResultArea");
  if (searchArea) searchArea.style.display = "block";
  getEl("userMessage").innerHTML = "검색 중입니다...";
  getEl("userCharacterList").innerHTML = "";
  
  await openUserCharacterManager(searchValue);
};


// 특정 유저의 캐릭터 정보를 불러와서 편집 모달 띄우기
async function openUserCharacterManager(searchValue) {
  const data = await callApi({ 
    action: "getCharacters", 
    accountId: searchValue 
  });
  
  if (!data.success) {
    getEl("userMessage").textContent = data.message || "유저를 찾을 수 없습니다.";
    getEl("userCharacterList").innerHTML = "";
    return;
  }

  const targetAccountId = data.data.targetAccountId;
  const targetMainName = data.data.mainName;
  const roleText = data.data.adminYn === 'Y' 
    ? '<span class="availability-status crowded">👑 운영진</span>' 
    : '<span class="availability-status normal">👤 일반 유저</span>';
  const isMaster = getAccountId() === 'MASTER_ADMIN';
  const roleButtonHtml = isMaster ? `<button class="mini-btn" onclick="toggleUserAdmin('${targetAccountId}', '${searchValue}')">권한 변경</button>` : '';

  getEl("userMessage").innerHTML = `
    <div style="font-size: 15px; font-weight: 800; color: var(--text-main);">[ ${escapeHtml(targetMainName)} ] 님의 정보</div>
    <div style="margin-top: 6px; font-size: 13px; color: var(--text-sub);">
      현재 권한: <strong>${roleText}</strong> | 등록 캐릭터: ${data.data.items.length}개
    </div>
    <div style="margin-top: 12px; display: flex; gap: 8px;">
      ${roleButtonHtml}
      <button class="mini-btn danger" onclick="resetUserPassword('${targetAccountId}')">비밀번호 초기화</button>
    </div>
  `;

  const list = getEl("userCharacterList");
  list.innerHTML = data.data.items.map(c => `
    <div class="character-card">
      <div class="character-left">
        <div class="character-name">${escapeHtml(c.name)}</div>
        <div class="character-sub">
          <span class="chip chip-class ${escapeHtml(c.className)}">${escapeHtml(c.className)}</span>
          <span class="chip chip-type">${escapeHtml(c.type)}</span>
          <div class="character-power" style="margin-left: 4px;">${getPowerRange(c.power)}</div>
        </div>
      </div>
      <div class="character-right">
        <div class="character-actions">
          <button class="character-edit-btn user-char-edit-btn" title="편집" data-acc="${escapeHtml(targetAccountId)}" data-name="${escapeHtml(c.name)}" data-class="${escapeHtml(c.className)}" data-type="${escapeHtml(c.type)}" data-power="${escapeHtml(c.power)}">✎</button>
        </div>
      </div>
    </div>
  `).join("");
  
  list.querySelectorAll(".user-char-edit-btn").forEach(btn => {
    btn.onclick = () => editUserCharacter(btn.dataset.acc, btn.dataset.name, btn.dataset.class, btn.dataset.type, btn.dataset.power);
  });
}

// 유저 캐릭터 편집 모달 열기
function editUserCharacter(accountId, originalName, className, type, power) {
  getEl("adminModalAccountId").value = accountId;
  getEl("adminModalOriginalName").value = originalName;
  getEl("adminModalCharacterName").value = originalName;
  getEl("adminModalCharacterClass").value = className;
  document.querySelectorAll(`[data-target="adminModalCharacterClass"] .chip-btn`).forEach(b => {
      b.classList.toggle("selected", b.dataset.value === className);
  });
  getEl("adminModalCharacterType").value = type;
  document.querySelectorAll(`[data-target="adminModalCharacterType"] .chip-btn`).forEach(b => {
      b.classList.toggle("selected", b.dataset.value === type);
  });
  getEl("adminModalCharacterPower").value = power;
  document.querySelectorAll(`[data-target="adminModalCharacterPower"] .chip-btn`).forEach(b => {
      b.classList.toggle("selected", b.dataset.value == power);
  });

  getEl("adminCharacterModal").classList.add("show");
  document.body.classList.add("modal-open");
  
  // 모달이 열릴 때 스크롤 너비 재계산(인디케이터 위치 갱신)
  setTimeout(() => {
    getEl("editDateChipGroup")?.dispatchEvent(new Event('scroll'));
    getEl("editTimeChipGroup")?.dispatchEvent(new Event('scroll'));
  }, 10);
}

function closeAdminModal() {
  getEl("adminCharacterModal").classList.remove("show");
  document.body.classList.remove("modal-open");
}

getEl("closeAdminModalButton").onclick = closeAdminModal;
getEl("cancelAdminModalButton").onclick = closeAdminModal;

// 모달에서 '수정하기' 버튼 클릭 시
getEl("submitAdminCharacterButton").onclick = async () => {
  const btn = getEl("submitAdminCharacterButton");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "처리 중...";

  const accountId = getEl("adminModalAccountId").value;
  const originalName = getEl("adminModalOriginalName").value;
  const newName = getEl("adminModalCharacterName").value.trim();
  const newClass = getEl("adminModalCharacterClass").value;
  const newType = getEl("adminModalCharacterType").value;
  const newPower = getEl("adminModalCharacterPower").value;

  if (!newName) {
    btn.disabled = false;
    btn.textContent = originalText;
    return alert("캐릭터 이름을 입력하세요.");
  }

  const res = await callApi({
    action: "updateCharacterByAdmin",
    adminCode: getAdminCode(),
    targetAccountId: accountId,
    originalName: originalName,
    newName: newName,
    newClass: newClass,
    newType: newType,
    newPower: newPower
  });

  btn.disabled = false;
  btn.textContent = originalText;
 
  if (res.success) {
    alert("수정되었습니다.");
    closeAdminModal();
    openUserCharacterManager(accountId); // 목록 새로고침
  }
};

// 유저 운영진 권한 토글
async function toggleUserAdmin(targetAccountId, searchValue) {
  if(!confirm(`해당 유저의 운영진 권한을 변경하시겠습니까?`)) return;
  const res = await callApi({ action: "toggleAdminRole", adminCode: getAdminCode(), targetAccountId, callerAccountId: getAccountId() });
  if (res.success) alert(res.message);
  if (res.success) openUserCharacterManager(searchValue || targetAccountId); // UI 갱신
}

// 유저 비밀번호 강제 초기화
async function resetUserPassword(targetAccountId) {
  if(!confirm(`[${targetAccountId}] 유저의 비밀번호를 '0000'으로 초기화하시겠습니까?`)) return;
  const res = await callApi({ action: "resetUserPasswordByAdmin", adminCode: getAdminCode(), targetAccountId });
  if (res.success) alert(res.message);
}

// =========================
// 보안 설정: 관리자 코드 변경 로직
// =========================
const changeAdminCodeBtn = getEl("changeAdminCodeButton");
if (changeAdminCodeBtn) {
  changeAdminCodeBtn.onclick = async () => {
    const oldCode = getEl("oldAdminCodeInput").value.trim();
    const newCode = getEl("newAdminCodeInput").value.trim();
    
    if (!oldCode) return alert("현재 관리자 코드를 입력해주세요.");
    if (!newCode) return alert("새 관리자 코드를 입력해주세요.");
    if (!confirm("관리자 코드를 변경하시겠습니까?")) return;

    changeAdminCodeBtn.disabled = true;
    changeAdminCodeBtn.textContent = "변경 중...";

    const res = await callApi({
      action: "updateAdminCodeSetting",
      adminCode: oldCode, // 기존 세션값 대신 사용자가 직접 입력한 '현재 코드'를 검증용으로 전송
      newAdminCode: newCode,
      callerAccountId: getAccountId()
    });

    changeAdminCodeBtn.disabled = false;
    changeAdminCodeBtn.textContent = "코드 변경";

    if (res.success) alert(res.message); 
    
    if (res.success) {
      sessionStorage.setItem("adminCode", newCode); 
      getEl("oldAdminCodeInput").value = "";
      getEl("newAdminCodeInput").value = "";
    }
  };
}

// =========================
// 6. 칩 버튼 클릭 이벤트 위임 (단 한 번만 선언하여 중복 충돌 방지)
document.querySelectorAll('.chip-select-group').forEach(group => {
  group.addEventListener('click', e => {
    if (window.isDraggingScroll) { 
      e.preventDefault();
      e.stopPropagation();
      return; // 드래그 중엔 클릭 무시
    }
    const btn = e.target.closest('.chip-btn');
    if (!btn || btn.disabled) return;
    
    // 아이템 클릭 시 화면 중앙으로 스르륵 이동
    btn.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });

    group.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    // 숨겨진 input 연동 로직
    const hiddenId = group.dataset.target;
    if (hiddenId) {
      const hiddenEl = document.getElementById(hiddenId);
      if (hiddenEl) hiddenEl.value = btn.dataset.value || btn.dataset.date;
    }
  }, true);
});

// =========================
// 파티 상세 구성 모달 열기/닫기 로직 (복구됨)
// =========================
function closePartyDetailModal() {
  const modal = getEl("partyDetailModal");
  if (modal) modal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

async function openPartyDetail(date, day, time) {
  const modal = getEl("partyDetailModal");
  const title = getEl("partyDetailTitle");
  const content = getEl("partyDetailContent");
  
  if (title) title.textContent = `${date} (${day}) ${time} 파티 구성`;
  if (content) content.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--cyan-2);"><span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> 데이터를 불러오는 중...</div>`;
  
  if (modal) modal.classList.add("show");
  document.body.classList.add("modal-open");

  // 약간의 딜레이 후 렌더링 (자연스러운 모달 팝업 연출)
  setTimeout(() => {
    renderPartyEditor(date, time);
  }, 50);
}

// 동적으로 생성된 HTML(innerHTML)의 인라인 이벤트를 위한 전역 스코프 함수 노출
window.toggleUserAdmin = toggleUserAdmin;
window.resetUserPassword = resetUserPassword;
window.editUserCharacter = editUserCharacter;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;
window.openPartyDetail = openPartyDetail;

// =========================
// 파티 조율 에디터 렌더링 (모바일 완벽 대응 + 저장 기능)
// =========================
function renderPartyEditor(date, time) {
  const content = getEl("partyDetailContent");
  if (!content) return;

  let participants = State.summaries.filter(s => s.date === date && s.time_slot === time);

  // 1. 직업 우선순위 정렬 (수호/검성(1) > 살/궁(2) > 마/정(3) > 호법(4) > 치유(5) + 같은 직업 내 전투력 내림차순)
  const classPriority = {
    '수호성': 1, '검성': 1,
    '살성': 2, '궁성': 2,
    '마도성': 3, '정령성': 3,
    '호법성': 4,
    '치유성': 5
  };

  participants.sort((a, b) => {
    const pA = classPriority[a.className] || 99;
    const pB = classPriority[b.className] || 99;
    if (pA !== pB) return pA - pB;
    return (parseInt(b.power, 10) || 0) - (parseInt(a.power, 10) || 0);
  });

  // 2. 치유성 1명일 경우 자동 배치 로직 (8번 슬롯)
  const healers = participants.filter(p => p.className === '치유성');
  let autoPlacedHealerId = null;
  let slot8Data = null;
  
  if (healers.length === 1) {
    slot8Data = healers[0];
    autoPlacedHealerId = slot8Data.account_id;
  }

  // 3. 저장된 파티 데이터 및 이번 주차 중복 참여자 데이터 수집
  const targetSchedule = State.schedules.find(s => isSameDate(s.date, date) && String(s.time_slot).trim() === String(time).trim());
  const savedParty = targetSchedule && targetSchedule.partyList ? targetSchedule.partyList : [];
  const currentWeekKey = targetSchedule ? targetSchedule.week_key : null;
  let waitingList = [...participants]; // 슬롯에 배치될 인원은 여기서 뺄 예정

  const alreadyPlacedNames = new Set();
  if (currentWeekKey) {
    State.schedules.forEach(s => {
      if (isSameDate(s.week_key, currentWeekKey) && !(isSameDate(s.date, date) && String(s.time_slot).trim() === String(time).trim())) {
        if (Array.isArray(s.partyList)) {
          s.partyList.forEach(name => {
            if (name) alreadyPlacedNames.add(name.trim());
          });
        }
      }
    });
  }

  // 카드 생성 헬퍼 함수
  const createCardHtml = (p, isPlaced = false) => {
    const typeBadge = p.type === '본캐' ? '<span class="chip chip-type main">본캐</span>' : '<span class="chip chip-type sub">부캐</span>';
    const classBadge = `<span class="chip chip-class ${escapeHtml(p.className)}">${escapeHtml(p.className)}</span>`;
    const placedClass = isPlaced ? 'already-placed' : 'draggable-char';

    return `
      <div class="applicant-card ${placedClass}" id="char_${p.account_id}_${p.character_name}" data-name="${escapeHtml(p.character_name)}" data-class="${escapeHtml(p.className)}" data-power="${p.power}">
        <div class="applicant-info">
          <span class="drag-handle">⠿</span>
          <span class="applicant-name">${escapeHtml(p.character_name)}</span>
        </div>
        <div class="applicant-meta">
          <div style="display: flex; gap: 4px; margin-bottom: 4px; align-items: center; justify-content: flex-end;">
            ${classBadge}
            ${typeBadge}
          </div>
          <span class="applicant-power">${getPowerRange(p.power)}</span>
        </div>
      </div>
    `;
  };

  // 4. 우측 8개의 슬롯 생성 및 불러오기 배치
  let slotsHtml = "";
  for (let i = 1; i <= 8; i++) {
    let slotContent = `<div class="empty-slot-text">비어있음</div>`;
    const savedName = savedParty[i - 1]; // 시트에 저장된 해당 슬롯의 닉네임
    let matchedParticipant = null;

    if (savedName) {
      // 저장된 이름이 있으면 대기열에서 빼서 슬롯에 배치
      const idx = waitingList.findIndex(p => p.character_name.trim() === savedName.trim());
      if (idx !== -1) matchedParticipant = waitingList.splice(idx, 1)[0];
    } else if (!savedParty.some(n => n) && i === 8 && slot8Data) {
      // 저장된 파티가 아예 없고(최초 렌더링), 치유성이 딱 1명이면 8번 슬롯 자동 배치
      const idx = waitingList.findIndex(p => p.account_id === autoPlacedHealerId);
      if (idx !== -1) matchedParticipant = waitingList.splice(idx, 1)[0];
    }

    if (matchedParticipant) {
      slotContent = createCardHtml(matchedParticipant, alreadyPlacedNames.has(matchedParticipant.name));
    }

    slotsHtml += `
      <div class="party-slot drop-zone" id="partySlot${i}">
        <span class="party-slot-num">${i}</span>
        ${slotContent}
      </div>
    `;
  }

  // 5. 대기열 HTML 생성 (슬롯에 들어간 인원을 제외한 나머지)
  let waitingHtml = `<div class="waiting-list-title">신청자 대기열 (${waitingList.length}명)</div>`;
  if (waitingList.length === 0) {
    waitingHtml += `<div class="admin-empty-state" style="margin-top:20px;">대기열이 비어있습니다.</div>`;
  } else {
    waitingList.forEach(p => { waitingHtml += createCardHtml(p, alreadyPlacedNames.has(p.character_name)); });
  }

  // 6. 전체 에디터 UI 렌더링
  content.innerHTML = `
    <div class="synergy-board" id="synergyBoard">
      <div class="synergy-stat">평균 전투력 <span id="avgPower">0K</span></div>
      <div class="synergy-stat">직업 분포 <span id="classDist">탱커 0 | 서폿 0 | 딜러 0</span></div>
    </div>
    <div id="partyEditor">
      <div id="waitingList" class="drop-zone">
        ${waitingHtml}
      </div>
      <div id="partyContainer">
        ${slotsHtml}
      </div>
    </div>
    <div class="admin-action-row" style="margin-top: 16px;">
      <button class="btn btn-primary" id="savePartyBtn" style="width: 100%;">파티 구성 저장</button>
    </div>
  `;

  // 6. 실시간 시너지 계산 함수
  const updateSynergy = () => {
    let totalPower = 0, count = 0;
    let roles = { tank: 0, heal: 0, dps: 0 };

    for (let i = 1; i <= 8; i++) {
      const card = document.getElementById(`partySlot${i}`).querySelector('.applicant-card');
      if (card) {
        count++;
        totalPower += parseInt(card.dataset.power, 10) || 0;
        const cls = card.dataset.class;
        if (['수호성', '검성'].includes(cls)) roles.tank++;
        else if (['치유성', '호법성'].includes(cls)) roles.heal++;
        else roles.dps++;
      }
    }
    const avg = count > 0 ? Math.floor(totalPower / count) : 0;
    document.getElementById('avgPower').textContent = `${avg}K`;
    document.getElementById('classDist').textContent = `탱커 ${roles.tank} | 힐러(서폿) ${roles.heal} | 딜러 ${roles.dps}`;
  };

  // 7. SortableJS 활성화 (모바일 터치 딜레이 적용)
  const sortableOptions = {
    group: 'party',
    animation: 150,
    delay: 100, // 모바일에서 꾹 눌러야 드래그
    delayOnTouchOnly: true,
    filter: '.already-placed', // 중복 참여자 드래그 방지
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onAdd: updateSynergy,
    onRemove: updateSynergy
  };

  Sortable.create(document.getElementById('waitingList'), sortableOptions);

  for (let i = 1; i <= 8; i++) {
    Sortable.create(document.getElementById(`partySlot${i}`), {
      ...sortableOptions,
      onAdd: function (evt) {
        const slot = evt.to;
        const cards = slot.querySelectorAll('.applicant-card');
        if (cards.length > 1) {
          // 1칸 1명 밀어내기: 기존 카드를 대기열로 되돌림
          const oldCard = Array.from(cards).find(c => c !== evt.item);
          if (oldCard) document.getElementById('waitingList').appendChild(oldCard);
        }
        updateSynergy();
      }
    });
  }

  // 8. 파티 저장 기능 연동
  document.getElementById('savePartyBtn').onclick = async () => {
    const btn = document.getElementById('savePartyBtn');

    const partyData = [];
    let hasDuplicated = false;

    for (let i = 1; i <= 8; i++) {
      const card = document.getElementById(`partySlot${i}`).querySelector('.applicant-card');
      if (card) {
        const charName = card.dataset.name;
        partyData.push(charName);
        if (alreadyPlacedNames.has(charName)) hasDuplicated = true;
      } else {
        partyData.push("");
      }
    }

    if (hasDuplicated) {
      if (!confirm("⚠️ 주의: 이번 주 다른 일정에 이미 참여한 캐릭터가 포함되어 있습니다.\n\n정말 이대로 저장하시겠습니까?")) {
        return;
      }
    }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "저장 중...";

    const res = await callApi({
      action: 'savePartyComposition',
      adminCode: getAdminCode(),
      date: date,
      timeSlot: time,
      partyList: JSON.stringify(partyData)
    });

    btn.disabled = false;
    btn.textContent = originalText;

    if (res.success) {
      alert("파티 구성이 성공적으로 저장되었습니다!");
      closePartyDetailModal();
    }
  };

  updateSynergy();
}

// 💡 [2순위: 패턴 일관성] 관리자 페이지의 모든 이벤트 리스너를 한 곳에서 관리
function bindEvents() {
  if(getEl("saveButton")) getEl("saveButton").onclick = saveSchedule; 
  
  if(getEl("checkSchemaButton")) getEl("checkSchemaButton").onclick = async () => {
    const res = await callApi({ action: "validateDatabaseSchema" });
    if (!res.success) return; // 에러 알림은 api.js가 담당
    if (res.data.isValid) { alert("DB 스키마가 정상입니다."); }
    else { alert("DB 스키마 오류:\n" + (res.data.errors || []).join("\n")); }
  };

  const backBtn = getEl("backButton");
  if (backBtn) {
    if (getAccountId() === "MASTER_ADMIN") {
      backBtn.textContent = "로그아웃";
      backBtn.onclick = () => {
        sessionStorage.clear();
        localStorage.removeItem("autoAccountId"); localStorage.removeItem("autoMainName");
        localStorage.removeItem("autoIsAdmin"); localStorage.removeItem("autoAdminCode");
        location.href = "index.html";
      };
    } else { backBtn.onclick = () => movePage("main.html"); }
  }

  if(getEl("searchUserButton")) getEl("searchUserButton").onclick = async () => {
    const searchValue = getEl("userAccountIdInput").value.trim();
    if (!searchValue) return alert("유저 본캐명을 입력하세요.");
    const searchArea = getEl("userSearchResultArea");
    if (searchArea) searchArea.style.display = "block";
    getEl("userMessage").innerHTML = "검색 중입니다...";
    getEl("userCharacterList").innerHTML = "";
    await openUserCharacterManager(searchValue);
  };

  if(getEl("closeAdminModalButton")) getEl("closeAdminModalButton").onclick = closeAdminModal;
  if(getEl("cancelAdminModalButton")) getEl("cancelAdminModalButton").onclick = closeAdminModal;
  if(getEl("closePartyDetailBtn")) getEl("closePartyDetailBtn").onclick = closePartyDetailModal;
}