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

  const list = getEl("scheduleList");
  
  if (!scheduleData.items || scheduleData.items.length === 0) {
    list.innerHTML = `<div class="admin-empty-state">📅 등록된 일정이 없습니다.<br>위에서 새 일정을 등록해 주세요.</div>`;
    return;
  }
  
  list.innerHTML = scheduleData.items.map(i => {
    const participants = summaryData.items.filter(s => s.day === i.day && s.time_slot === i.time_slot);
    const count = participants.length;
    const hasHealer = participants.some(p => p.className === "치유성");
    
    // 1명이라도 참여했는데 8명 미만이거나 치유성이 없을 때만 Risk(빨간 테두리) 표시
    const isRisk = count > 0 && (count < 8 || !hasHealer); 
    const riskClass = isRisk ? "risk" : "";
    const timeFormatted = formatDisplayTime(i.time_slot);
    const shortDate = i.date && i.date.length >= 10 ? i.date.substring(5).replace('-', '.') : i.date;

    return `
      <div class="admin-card-item ${riskClass}">
        <div class="info-area" onclick="openPartyDetail('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}')">
          <div class="row-time">
            <span class="row-date">${shortDate} (${i.day})</span>
            <span class="row-hhmm">${timeFormatted}</span>
          </div>
          <div class="status-indicator">
            <div class="participant-dots" title="인원: ${count}명">
              ${Array(8).fill(0).map((_, idx) => `<div class="dot ${idx < count ? 'filled' : ''}"></div>`).join('')}
            </div>
            <div class="healer-dot ${hasHealer ? '' : 'off'}" title="치유성: ${hasHealer ? 'O' : 'X'}"></div>
            ${i.note ? `<div class="row-note" title="${escapeHtml(i.note)}">${escapeHtml(i.note)}</div>` : ''}
          </div>
        </div>
        <div class="action-area">
          <button type="button" class="icon-btn edit-btn" title="수정" onclick="editSchedule('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}', '${escapeHtml(i.note)}')">✏️</button>
          <button type="button" class="icon-btn delete-btn" title="삭제" onclick="deleteSchedule('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}')">🗑️</button>
        </div>
      </div>
    `;
  }).join("");
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
    btn.textContent = "수정 완료하기";

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

// 드래그 클릭 판별용 상태 변수
let isDraggingScroll = false;

// 마우스 드래그로 가로 스크롤을 구현하는 애플 스타일 로직
function applyDragScroll() {
  // 가로 스크롤 영역 전체를 타겟팅 (일정/시간 영역 누락 문제 해결!)
  const sliders = document.querySelectorAll('.horizontal-scroll-chips, .chip-select-group, #dateChipGroup, #timeChipGroup, #editDateChipGroup, #editTimeChipGroup');

  sliders.forEach(slider => {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      isDraggingScroll = false;
      startX = e.pageX - slider.offsetLeft;
      startY = e.pageY - slider.offsetTop;
      scrollLeft = slider.scrollLeft;
      // 마우스 드래그 중에는 스크롤 스냅을 꺼서 부드럽게 움직이도록 함
      slider.style.setProperty('scroll-snap-type', 'none', 'important');
      slider.style.setProperty('scroll-behavior', 'smooth', 'important');
      slider.style.setProperty('scroll-behavior', 'auto', 'important');
    });
    slider.addEventListener('mouseleave', () => { 
      isDown = false; 
      slider.style.removeProperty('scroll-snap-type'); 
      slider.style.removeProperty('scroll-behavior');
    });
    slider.addEventListener('mouseup', () => { 
      isDown = false; 
      slider.style.removeProperty('scroll-snap-type'); 
      slider.style.removeProperty('scroll-behavior');
    });
    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();

            // Calculate the distance the mouse has moved in both X and Y directions
            const x = e.pageX - slider.offsetLeft;
            const y = e.pageY - slider.offsetTop;
            const walkX = (x - startX) * 2; // Scroll speed multiplier for X direction

            // Only trigger horizontal drag if the horizontal movement is significantly larger than vertical
            if (Math.abs(walkX) > 5 ) {
                slider.scrollLeft = scrollLeft - walkX;
            }
    });
    
    // 마우스 휠(세로 스크롤) 작동 시 가로 스크롤로 변환
    slider.addEventListener('wheel', (e) => {
      // 세로 휠 굴림을 가로 이동으로 변환 (자석 스냅과 부드럽게 연동)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        slider.scrollBy({
          left: e.deltaY > 0 ? 150 : -150, // 마우스 휠 한 틱당 이동량
          behavior: 'smooth'
        });
      }
    }, { passive: false });

    // 드래그가 끝났을 때 원치 않게 칩이 클릭되는 현상 방지
    slider.addEventListener('click', (e) => {
      if (isDraggingScroll) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
}

// 칩 버튼 클릭 이벤트 위임 (관리자용)
document.querySelectorAll('.chip-select-group').forEach(group => {
  group.addEventListener('click', e => {
    if (isDraggingScroll) return; // 드래그 중엔 클릭 무시
        const btn = e.target.closest('.chip-btn');
        if (!btn || btn.disabled) return;
        
        group.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        const hiddenId = group.dataset.target;
        if (hiddenId) getEl(hiddenId).value = btn.dataset.value;
    });
});

// 스크롤 인디케이터 동기화 로직
function syncScrollIndicator(scrollBoxId, indicatorId) {
  const box = getEl(scrollBoxId);
  const ind = getEl(indicatorId);
  if (!box || !ind) return;
  const dot = ind.querySelector('.scroll-indicator-dot');
  if (!dot) return;

  const updateDot = () => {
    const maxScroll = box.scrollWidth - box.clientWidth;
    if (maxScroll <= 0) {
      dot.style.transform = `translateX(0px)`;
      return;
    }
    const ratio = box.scrollLeft / maxScroll;
    const moveX = ratio * (ind.clientWidth - dot.clientWidth);
    dot.style.transform = `translateX(${moveX}px)`;
  };
  box.addEventListener('scroll', updateDot);
  setTimeout(updateDot, 100);
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

applyDragScroll();

syncScrollIndicator("dateChipGroup", "dateScrollInd");
syncScrollIndicator("timeChipGroup", "timeScrollInd");
syncScrollIndicator("editDateChipGroup", "editDateScrollInd");
syncScrollIndicator("editTimeChipGroup", "editTimeScrollInd");