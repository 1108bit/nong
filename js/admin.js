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

// 시간 칩 동적 생성 로직 (09:00 ~ 24:00, 30분 단위)
function initTimeChips() {
  let html = "";
  for (let h = 9; h <= 24; h++) {
    for (let m of ["00", "30"]) {
      if (h === 24 && m === "30") continue;
      
      let displayH = h;
      let ampm = "오전";
      if (h >= 12 && h < 24) { ampm = "오후"; displayH = h === 12 ? 12 : h - 12; }
      else if (h === 24) { ampm = "오전"; displayH = 12; }
      
      const valueH = h === 24 ? "00" : String(h).padStart(2, '0');
      const dateVal = `${valueH}:${m}`;
      const isSelected = dateVal === "21:00" ? "selected" : "";
      
      const appleDisplay = `<span style="font-size:11px; font-weight:700;">${ampm}</span><span style="font-size:16px; font-weight:900; margin-top:4px;">${displayH}:${m}</span>`;
      html += `<button type="button" class="chip-btn date-chip ${isSelected}" data-value="${dateVal}">${appleDisplay}</button>`;
    }
  }
  
  const group1 = getEl("timeChipGroup");
  if (group1) group1.innerHTML = html;
  const group2 = getEl("editTimeChipGroup");
  if (group2) group2.innerHTML = html;
}

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
      <div class="admin-list-row ${riskClass}">
        <div class="row-info-group" style="cursor: pointer;" onclick="openPartyDetail('${escapeHtml(i.date)}', '${escapeHtml(i.day)}', '${escapeHtml(timeFormatted)}')">
          <div class="row-time">
            <span class="row-date">${shortDate} (${i.day})</span>
            <span class="row-hhmm">${timeFormatted}</span>
          </div>
          <div class="participant-dots" title="인원: ${count}명">
            ${Array(8).fill(0).map((_, idx) => `<div class="dot ${idx < count ? 'filled' : ''}"></div>`).join('')}
          </div>
          <div class="dot ${hasHealer ? 'healer' : (count > 0 ? 'warn' : '')}" title="치유성: ${hasHealer ? 'O' : 'X'}" style="margin-left: 8px;"></div>
          ${i.note ? `<div class="row-note" title="${escapeHtml(i.note)}">${escapeHtml(i.note)}</div>` : ''}
        </div>
        <div class="row-action-group">
          <button class="icon-btn edit-btn" title="수정" data-date="${escapeHtml(i.date)}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(timeFormatted)}" data-note="${escapeHtml(i.note)}">✏️</button>
          <button class="icon-btn delete-btn" title="삭제" data-date="${escapeHtml(i.date)}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(timeFormatted)}">🗑️</button>
        </div>
      </div>
    `;
  }).join("");
  
  // 버튼 클릭 이벤트 리스너 추가
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => editSchedule(btn.dataset.date, btn.dataset.day, btn.dataset.time, btn.dataset.note);
  });
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => deleteSchedule(btn.dataset.date, btn.dataset.day, btn.dataset.time);
  });
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

function editSchedule(date, day, time, note) {
  getEl("dateInput").value = date;
  getEl("dayInput").value = day;
  getEl("timeSlotInput").value = time;
  getEl("noteInput").value = note;

  // 칩 시각적 연동
  const dateGroup = getEl("dateChipGroup");
  if (dateGroup) dateGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.date === date));
  
  const timeGroup = document.querySelector(`[data-target="timeSlotInput"]`);
  if (timeGroup) timeGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.value === time));

  window.scrollTo(0, 0);
}

getEl("timeSlotInput").addEventListener("input", (e) => {
   const timeGroup = document.querySelector(`[data-target="timeSlotInput"]`);
   if (timeGroup) timeGroup.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("selected", b.dataset.value === e.target.value));
});

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
  const sliders = document.querySelectorAll('.horizontal-scroll-chips');
  let isDown = false;
  let startX;
  let scrollLeft;

  sliders.forEach(slider => {
    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      isDraggingScroll = false;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2; // 스크롤 속도 배율
      if (Math.abs(walk) > 5) isDraggingScroll = true; // 5px 이상 드래그 시 클릭 무시용 트리거 작동
      slider.scrollLeft = scrollLeft - walk;
    });
    
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

// =========================
// 드래그 앤 드롭 함수 전역 노출
// =========================
window.handleDragStart = function(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
  setTimeout(() => { e.target.style.opacity = "0.4"; }, 0);
};
window.handleDragEnd = function(e) {
  e.target.style.opacity = "1";
};
window.handleDragOver = function(e) {
  e.preventDefault(); // 드롭 허용 (필수)
  const zone = e.target.closest('.drop-zone');
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
      zone.appendChild(draggableElement);
    }
  }
};

applyDragScroll();

syncScrollIndicator("dateChipGroup", "dateScrollInd");
syncScrollIndicator("timeChipGroup", "timeScrollInd");
syncScrollIndicator("editDateChipGroup", "editDateScrollInd");
syncScrollIndicator("editTimeChipGroup", "editTimeScrollInd");