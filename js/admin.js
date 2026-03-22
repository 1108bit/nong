// 날짜 칩 자동 생성 로직 (오늘부터 14일)
function initDateChips() {
  const group = getEl("dateChipGroup");
  if (!group) return;
  
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
    
    html += `<button type="button" class="chip-btn ${isSelected}" data-date="${dateVal}" data-day="${dayStr}" style="white-space: nowrap; ${isWeekend}">${displayVal}</button>`;
    
    if (i === 0) {
        getEl("dateInput").value = dateVal;
        getEl("dayInput").value = dayStr;
    }
  }
  group.innerHTML = html;
  
  group.addEventListener("click", e => {
     const btn = e.target.closest(".chip-btn");
     if(!btn) return;
     getEl("dateInput").value = btn.dataset.date;
     getEl("dayInput").value = btn.dataset.day;
  });
}

async function loadAdminSchedule() {
  const adminCode = getAdminCode();
  if (!adminCode) return movePage("admin-login.html");
  
  // 마스터 계정이 아니면 보안 설정 카드 숨김
  if (getAccountId() !== 'MASTER_ADMIN') {
    const secCard = getEl("securitySettingsCard");
    if (secCard) secCard.style.display = "none";
  }

  const [scheduleData, summaryData] = await Promise.all([
    callApi({ action: "getRaidScheduleAdmin", adminCode }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  if (!scheduleData.ok) return movePage("admin-login.html");
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
    const isRisk = count < 8 || !hasHealer;
    const riskClass = isRisk ? "admin-card-risk" : "";

    return `
      <div class="admin-card-item ${riskClass}">
        <div class="admin-card-top">
          <div class="admin-card-time">${i.date} (${i.day}) ${i.time_slot}</div>
          <div class="admin-status-chip ${i.open_yn === 'Y' ? 'open' : 'closed'}">${i.open_yn === 'Y' ? '열림' : '닫힘'}</div>
        </div>
        <div class="admin-card-note">
          인원: <strong style="color:${count < 8 ? '#fb7185' : '#a7f3d0'}">${count}명</strong> |
          치유성: ${hasHealer ? "✅" : "❌"}
        </div>
        <div class="admin-card-note">${escapeHtml(i.note)}</div>
        <div class="admin-card-actions">
          <button class="mini-btn edit-btn" data-date="${escapeHtml(i.date)}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}" data-note="${escapeHtml(i.note)}">수정</button>
          <button class="mini-btn danger delete-btn" data-date="${escapeHtml(i.date)}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">삭제</button>
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
  btn.textContent = "저장 중...";

  const res = await callApi({
    action: "saveRaidSchedule",
    adminCode: getAdminCode(),
    date: getEl("dateInput").value,
    day: getEl("dayInput").value,
    timeSlot: getEl("timeSlotInput").value,
    note: getEl("noteInput").value,
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
getEl("refreshButton").onclick = loadAdminSchedule;
getEl("checkSchemaButton").onclick = async () => {
  const res = await callApi({ action: "validateDatabaseSchema" });
  if (!res.ok) return alert(res.message || "검증에 실패했습니다.");

  if (res.isValid) {
    alert("DB 스키마가 정상입니다.");
  } else {
    alert("DB 스키마 오류:\n" + (res.errors || []).join("\n"));
  }
};
getEl("backButton").onclick = () => movePage("main.html");

getEl("searchUserButton").onclick = async () => {
  const searchValue = getEl("userAccountIdInput").value.trim();
  if (!searchValue) return alert("유저 본캐명을 입력하세요.");
  await openUserCharacterManager(searchValue);
};

initDateChips();
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
  const roleText = data.adminYn === 'Y' ? '<span style="color:var(--gold-1)">👑 운영진</span>' : '일반 유저';
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

// 칩 버튼 클릭 이벤트 위임 (관리자용)
document.querySelectorAll('.chip-select-group').forEach(group => {
    group.addEventListener('click', e => {
        const btn = e.target.closest('.chip-btn');
        if (!btn || btn.disabled) return;
        
        group.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        const hiddenId = group.dataset.target;
        if (hiddenId) getEl(hiddenId).value = btn.dataset.value;
    });
});

// 동적으로 생성된 HTML(innerHTML)의 인라인 이벤트를 위한 전역 스코프 노출
window.toggleUserAdmin = toggleUserAdmin;
window.resetUserPassword = resetUserPassword;
window.editUserCharacter = editUserCharacter;