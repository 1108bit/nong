// 페이지 진입 시 즉각적인 권한 검사 (비정상 접근 원천 차단)
if (sessionStorage.getItem("isAdmin") !== "true" || !getAdminCode()) {
  alert("관리자 권한이 필요합니다.");
  location.replace("index.html");
}

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

let allSchedules = [];
let allSummaries = [];
let selectedDashboardDate = null;

async function loadAdminSchedule() {
  const adminCode = getAdminCode();
  if (!adminCode) return movePage("index.html");
  
  // 마스터 계정이 아니면 보안 설정 카드 숨김
  if (getAccountId() !== 'MASTER_ADMIN') {
    const secCard = getEl("securitySettingsCard");
    if (secCard) secCard.style.display = "none";
  }

  const [scheduleData, summaryData] = await Promise.all([
    callApi({ action: "getRaidScheduleAdmin", adminCode }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  if (!scheduleData.ok) return movePage("index.html");
  if (!summaryData.ok) return alert("참여 현황을 가져오는데 실패했습니다.");

  allSchedules = scheduleData.items || [];
  allSummaries = summaryData.items || [];

  if (!selectedDashboardDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    selectedDashboardDate = `${yyyy}-${mm}-${dd}`;
  }

  renderCalendar();
  renderScheduleList(selectedDashboardDate);
}

function renderCalendar() {
  const calEl = getEl("miniCalendar");
  if (!calEl) return;
  
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  let html = "";
  
  let selectedIndex = 0; // 진행 바를 위한 인덱스 추적
  
  for(let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayStr = days[d.getDay()];
    const dateVal = `${yyyy}-${mm}-${dd}`;
    
    const isWeekend = (dayStr === '토' || dayStr === '일') ? 'color: var(--blue-1);' : '';
    const isActive = dateVal === selectedDashboardDate ? 'active' : '';
    if (isActive) selectedIndex = i; // 현재 선택된 날짜의 인덱스 저장
    const hasData = allSchedules.some(s => s.date === dateVal) ? 'has-data' : '';
    
    html += `
      <div class="cal-day-cell ${isActive} ${hasData}" data-date="${dateVal}" data-index="${i}">
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
      selectedDashboardDate = cell.dataset.date;
      
      // 클릭 시 인디케이터 부드럽게 이동
      if (progress) {
        const idx = parseInt(cell.dataset.index, 10);
        const percent = (idx / 13) * 100;
        progress.style.width = `${percent}%`;
      }
      
      renderScheduleList(selectedDashboardDate);
    });
  });
}

function renderScheduleList(dateStr) {
  const list = getEl("scheduleList");
  if (!list) return;
  
  const filtered = allSchedules.filter(s => s.date === dateStr);
  list.innerHTML = "";
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="admin-empty-state">📅 선택한 날짜에 등록된 일정이 없습니다.</div>`;
    return;
  }
  
  filtered.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  
  let html = "";
  filtered.forEach((i, idx) => {
    const participants = allSummaries.filter(s => s.date === i.date && s.time_slot === i.time_slot);
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
  if (summaryData.ok && summaryData.items) {
      const targetDate = getEl("dateInput").value;
      const targetTime = getEl("timeSlotInput").value;
      const sameSlotCount = summaryData.items.filter(s => s.date === targetDate && s.time_slot === targetTime).length;
      
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

  if(res.ok) { alert("저장되었습니다."); loadAdminSchedule(); }
  else { alert(res.message || "일정 저장에 실패했습니다."); }
}

async function deleteSchedule(date, day, time) {
  if(!confirm("정말 삭제하시겠습니까?")) return;
  const res = await callApi({ action: "deleteRaidSchedule", adminCode: getAdminCode(), date, day, timeSlot: time });
  if(res.ok) loadAdminSchedule();
  else alert(res.message || "삭제에 실패했습니다.");
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

    if (res.ok) {
       alert("일정이 성공적으로 수정되었습니다.");
       closeScheduleModal();
       loadAdminSchedule();
    } else {
       alert(res.message || "수정에 실패했습니다.");
    }
  }; 
}

getEl("saveButton").onclick = saveSchedule; 
getEl("checkSchemaButton").onclick = async () => {
  const res = await callApi({ action: "validateDatabaseSchema" });
  if (!res.ok) return alert(res.message || "검증에 실패했습니다.");

  if (res.isValid) { 
    alert("DB 스키마가 정상입니다.");
  } else {
    alert("DB 스키마 오류:\n" + (res.errors || []).join("\n"));
  }
};

const backBtn = getEl("backButton");
if (getAccountId() === "MASTER_ADMIN") {
  backBtn.textContent = "로그아웃";
  backBtn.onclick = () => {
    sessionStorage.clear();
    localStorage.removeItem("autoAccountId");
    localStorage.removeItem("autoMainName");
    localStorage.removeItem("autoIsAdmin");
    localStorage.removeItem("autoAdminCode");
    location.href = "index.html";
  };
} else {
  backBtn.onclick = () => movePage("main.html");
}

getEl("searchUserButton").onclick = async () => {
  const searchValue = getEl("userAccountIdInput").value.trim();
  if (!searchValue) return alert("유저 본캐명을 입력하세요.");
  
  const searchArea = getEl("userSearchResultArea");
  if (searchArea) searchArea.style.display = "block";
  getEl("userMessage").innerHTML = "검색 중입니다...";
  getEl("userCharacterList").innerHTML = "";
  
  await openUserCharacterManager(searchValue);
};

initDateChips();
initTimeChips();
loadAdminSchedule();

// 칩 생성 직후 스크롤 및 인디케이터 기능 활성화 (안전하게 0.1초 대기)
setTimeout(() => {
  setupAppleScroll('dateChipGroup', 'dateScrollInd');
  setupAppleScroll('timeChipGroup', 'timeScrollInd');
  setupAppleScroll('editDateChipGroup', 'editDateScrollInd');
  setupAppleScroll('editTimeChipGroup', 'editTimeScrollInd');
}, 100);


// 특정 유저의 캐릭터 정보를 불러와서 편집 모달 띄우기
async function openUserCharacterManager(searchValue) {
  const data = await callApi({ 
    action: "getCharacters", 
    accountId: searchValue 
  });
  
  if (!data.ok) {
    getEl("userMessage").textContent = data.message || "유저를 찾을 수 없습니다.";
    getEl("userCharacterList").innerHTML = "";
    return;
  }

  const targetAccountId = data.targetAccountId;
  const targetMainName = data.mainName;
  const roleText = data.adminYn === 'Y' 
    ? '<span class="availability-status crowded">👑 운영진</span>' 
    : '<span class="availability-status normal">👤 일반 유저</span>';
  const isMaster = getAccountId() === 'MASTER_ADMIN';
  const roleButtonHtml = isMaster ? `<button class="mini-btn" onclick="toggleUserAdmin('${targetAccountId}', '${searchValue}')">권한 변경</button>` : '';

  getEl("userMessage").innerHTML = `
    <div style="font-size: 15px; font-weight: 800; color: var(--text-main);">[ ${escapeHtml(targetMainName)} ] 님의 정보</div>
    <div style="margin-top: 6px; font-size: 13px; color: var(--text-sub);">
      현재 권한: <strong>${roleText}</strong> | 등록 캐릭터: ${data.items.length}개
    </div>
    <div style="margin-top: 12px; display: flex; gap: 8px;">
      ${roleButtonHtml}
      <button class="mini-btn danger" onclick="resetUserPassword('${targetAccountId}')">비밀번호 초기화</button>
    </div>
  `;

  const list = getEl("userCharacterList");
  list.innerHTML = data.items.map(c => `
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
 
  if (res.ok) {
    alert("수정되었습니다.");
    closeAdminModal();
    openUserCharacterManager(accountId); // 목록 새로고침
  } else {
    alert(res.message || "수정 실패");
  }
};

// 유저 운영진 권한 토글
async function toggleUserAdmin(targetAccountId, searchValue) {
  if(!confirm(`해당 유저의 운영진 권한을 변경하시겠습니까?`)) return;
  const res = await callApi({ action: "toggleAdminRole", adminCode: getAdminCode(), targetAccountId, callerAccountId: getAccountId() });
  alert(res.message);
  if (res.ok) openUserCharacterManager(searchValue || targetAccountId); // UI 갱신
}

// 유저 비밀번호 강제 초기화
async function resetUserPassword(targetAccountId) {
  if(!confirm(`[${targetAccountId}] 유저의 비밀번호를 '0000'으로 초기화하시겠습니까?`)) return;
  const res = await callApi({ action: "resetUserPasswordByAdmin", adminCode: getAdminCode(), targetAccountId });
  alert(res.message);
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

    alert(res.message); // 성공 또는 검증 실패(기존 코드 불일치 등) 메시지 출력
    
    if (res.ok) {
      sessionStorage.setItem("adminCode", newCode); 
      getEl("oldAdminCodeInput").value = "";
      getEl("newAdminCodeInput").value = "";
    }
  };
}

// =========================
// 애플 스타일 가로 스크롤 & 프로그레스 바 완결판
// =========================
let isDraggingScroll = false; // 드래그 클릭 방지용

function setupAppleScroll(scrollBoxId, indicatorId) {
  const slider = document.getElementById(scrollBoxId);
  const indicatorWrap = document.getElementById(indicatorId);
  if (!slider) return;
  
  const indicator = indicatorWrap ? indicatorWrap.querySelector('.scroll-indicator-dot') : null;

  let isDown = false;
  let startX;
  let scrollLeft;
  let velX = 0;
  let momentumID;

  // 1. 스크롤 위치에 따라 파란 바(프로그레스 게이지) 채우기
  const updateIndicator = () => {
    if (!indicator) return;
    const maxScroll = slider.scrollWidth - slider.clientWidth;
    if (maxScroll <= 0) {
      indicator.style.width = '0%';
      return;
    }
    const scrollPercent = (slider.scrollLeft / maxScroll) * 100;
    indicator.style.width = `${scrollPercent}%`; 
  };

  slider.addEventListener('scroll', updateIndicator);
  setTimeout(updateIndicator, 100);

  // 2. 마우스 휠 지원 (PC)
  slider.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      slider.scrollLeft += e.deltaY;
      cancelAnimationFrame(momentumID);
    }
  });

  // 3. 드래그 시작 (마우스)
  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    isDraggingScroll = false;
    slider.classList.add('grabbing'); // 커서 모양 변경
    slider.style.scrollSnapType = 'none'; // 드래그 중 스냅 해제
    slider.style.scrollBehavior = 'auto'; // 즉각적인 반응
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
    cancelAnimationFrame(momentumID);
  });

  // 4. 드래그 중
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 배율
    if (Math.abs(walk) > 5) isDraggingScroll = true; // 5px 이상 드래그 시 클릭 무시용 트리거 작동
    const prevScroll = slider.scrollLeft;
    slider.scrollLeft = scrollLeft - walk;
    velX = slider.scrollLeft - prevScroll; // 속도 계산
  });

  // 5. 드래그 종료 -> 관성 시작
  const handleMouseUp = () => {
    if (!isDown) return;
    isDown = false;
    slider.classList.remove('grabbing'); // 커서 모양 복구
    slider.style.scrollSnapType = 'x mandatory'; // 스냅 복구
    slider.style.scrollBehavior = 'smooth';
    beginMomentum();
  };

  slider.addEventListener('mouseup', handleMouseUp);
  slider.addEventListener('mouseleave', handleMouseUp);

  // 관성 스크롤 로직 (애플 스타일)
  function beginMomentum() {
    velX *= 0.95; // 부드럽게 멈추는 마찰력
    slider.scrollLeft += velX;
    if (Math.abs(velX) > 0.5) {
      momentumID = requestAnimationFrame(beginMomentum);
    }
  }
}

// 6. 칩 버튼 클릭 이벤트 위임 (단 한 번만 선언하여 중복 충돌 방지)
document.querySelectorAll('.chip-select-group').forEach(group => {
  group.addEventListener('click', e => {
    if (isDraggingScroll) { 
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
if (getEl("closePartyDetailBtn")) getEl("closePartyDetailBtn").onclick = closePartyDetailModal;

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
// 드래그 앤 드롭 함수 전역 노출
// =========================
window.handleDragStart = function(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
  e.target.classList.add("dragging");
};
window.handleDragEnd = function(e) {
  e.target.classList.remove("dragging");
  document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));
};
window.handleDragOver = function(e) {
  e.preventDefault(); // 드롭 허용 (필수)
  const zone = e.target.closest('.drop-zone');
  // 8명 정원 체크 (대기열은 제외)
  if (zone && zone.id !== "unassignedZone") {
    const count = zone.querySelectorAll('.character-card').length;
    if (count >= 8) {
      e.dataTransfer.dropEffect = "none";
      return; 
    }
  }
  if (zone) zone.classList.add('drag-over');
};
window.handleDragLeave = function(e) {
  const zone = e.target.closest('.drop-zone');
  if (zone) zone.classList.remove('drag-over');
};
window.handleDrop = function(e) {
  e.preventDefault();
  const zone = e.target.closest('.drop-zone');
  if (zone) {
    zone.classList.remove('drag-over');
    const id = e.dataTransfer.getData("text/plain");
    const draggableElement = document.getElementById(id);
    if (draggableElement) {
      if (zone.id !== "unassignedZone") {
        const count = zone.querySelectorAll('.character-card').length;
        if (count >= 8) {
          alert("이 파티는 8명 정원이 가득 찼습니다.");
          return;
        }
      }
      zone.appendChild(draggableElement);
      updatePartyCounts();
    }
  }
};

window.updatePartyCounts = function() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    const count = zone.querySelectorAll('.character-card').length;
    if (zone.id !== "unassignedZone") {
      if (count >= 8) zone.classList.add('full');
      else zone.classList.remove('full');
    }
    const title = zone.querySelector('.zone-title');
    if (title) {
      const partyName = title.textContent.split('(')[0].trim();
      title.textContent = count >= 8 ? `${partyName} (Full)` : `${partyName} (${count}명)`;
    }
  });
};

window.savePartyComposition = function() {
  const zones = document.querySelectorAll('.drop-zone:not(#unassignedZone)');
  const composition = {};
  zones.forEach((zone, index) => {
    const partyNum = index + 1;
    const members = Array.from(zone.querySelectorAll('.character-card')).map(c => c.dataset.name);
    composition[`party${partyNum}`] = members;
  });
  const title = getEl("partyDetailTitle").textContent;
  // 로컬 스토리지에 파티 정보 임시 저장 (페이지 새로고침 전까지 유지)
  localStorage.setItem(`party_comp_${title}`, JSON.stringify(composition));
  
  alert(`[${title}]\n현재 파티 구성이 성공적으로 임시 저장되었습니다.\n\n1파티: ${composition.party1.length}명\n2파티: ${composition.party2.length}명`);
  getEl('closePartyDetailBtn').click();
};

// =========================
// 파티 조율 에디터 렌더링 (모바일 완벽 대응 + 저장 기능)
// =========================
function renderPartyEditor(date, time) {
  const content = getEl("partyDetailContent");
  if (!content) return;

  // 해당 날짜/시간의 신청자 필터링 (allSummaries 데이터 활용)
  const participants = allSummaries.filter(s => s.date === date && s.time_slot === time);

  let waitingHtml = `<div class="waiting-list-title">신청자 대기열 (${participants.length}명)</div>`;

  if (participants.length === 0) {
    waitingHtml += `<div class="admin-empty-state" style="margin-top:20px;">해당 타임에 신청자가 없습니다.</div>`;
  } else {
    participants.forEach(p => {
      // 직업 아이콘 텍스트/이모지 매핑
      const classIconMap = {
        '검성': '⚔️', '수호성': '🛡️', '살성': '🗡️', '궁성': '🏹',
        '마도성': '🔥', '정령성': '💨', '치유성': '✨', '호법성': '📿'
      };
      const icon = classIconMap[p.className] || '👤';
      const typeBadge = p.type === '본캐' ? '<span class="chip chip-type main">본캐</span>' : '<span class="chip chip-type sub">부캐</span>';

      waitingHtml += `
        <div class="applicant-card draggable-char" id="char_${p.accountId}_${p.name}" data-name="${escapeHtml(p.name)}" data-class="${escapeHtml(p.className)}" data-power="${p.power}">
          <div class="applicant-info">
            <span class="drag-handle">⠿</span>
            <span style="font-size: 16px;">${icon}</span>
            <span class="applicant-name">${escapeHtml(p.name)}</span>
          </div>
          <div class="applicant-meta">
            ${typeBadge}
            <span class="applicant-power">${getPowerRange(p.power)}</span>
          </div>
        </div>
      `;
    });
  }

  // 우측 8개의 빈 슬롯 생성
  let slotsHtml = "";
  for (let i = 1; i <= 8; i++) {
    slotsHtml += `
      <div class="party-slot drop-zone" id="partySlot${i}">
        <span class="party-slot-num">${i}</span>
        <div class="empty-slot-text">비어있음</div>
      </div>
    `;
  }

  // 시너지 계산기 UI와 파티 저장 버튼 추가
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

  // 실시간 시너지 계산 함수
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

  // SortableJS 공통 옵션 (모바일 터치 딜레이 100ms 적용)
  const sortableOptions = {
    group: 'party',
    animation: 150,
    delay: 100, // 모바일에서 스크롤과 겹치지 않게 꾹 눌러야 드래그되도록 설정
    delayOnTouchOnly: true,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onAdd: updateSynergy,
    onRemove: updateSynergy
  };

  // 대기열 초기화
  Sortable.create(document.getElementById('waitingList'), sortableOptions);

  // 8개 슬롯 초기화 (1칸 1명 밀어내기 로직 적용)
  for (let i = 1; i <= 8; i++) {
    Sortable.create(document.getElementById(`partySlot${i}`), {
      ...sortableOptions,
      onAdd: function (evt) {
        const slot = evt.to;
        const cards = slot.querySelectorAll('.applicant-card');
        if (cards.length > 1) {
          // 새로 들어온 카드(evt.item) 말고 기존에 있던 카드를 대기열로 돌려보냄
          const oldCard = Array.from(cards).find(c => c !== evt.item);
          if (oldCard) document.getElementById('waitingList').appendChild(oldCard);
        }
        updateSynergy();
      }
    });
  }

  // 파티 구성 저장 이벤트
  document.getElementById('savePartyBtn').onclick = async () => {
    const btn = document.getElementById('savePartyBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "저장 중...";

    const partyData = [];
    for (let i = 1; i <= 8; i++) {
      const card = document.getElementById(`partySlot${i}`).querySelector('.applicant-card');
      partyData.push(card ? card.dataset.name : "");
    }

    // GitHub Pages 환경을 위한 callApi 규격 사용
    const res = await callApi({
      action: 'savePartyComposition',
      adminCode: getAdminCode(),
      date: date,
      timeSlot: time,
      partyList: JSON.stringify(partyData)
    });

    btn.disabled = false;
    btn.textContent = originalText;

    if (res.ok) {
      alert("파티 구성이 성공적으로 저장되었습니다!");
      closePartyDetailModal();
    } else {
      alert(res.message || "파티 구성 저장에 실패했습니다.");
    }
  };

  // 최초 로드 시 시너지 계산 1회 실행
  updateSynergy();
}