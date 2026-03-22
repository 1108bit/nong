async function loadAdminSchedule() {
  const adminCode = getAdminCode();
  if (!adminCode) return movePage("admin-login.html");

  const [scheduleData, summaryData] = await Promise.all([
    callApi({ action: "getRaidScheduleAdmin", adminCode }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  if (!scheduleData.ok) return movePage("admin-login.html");
  if (!summaryData.ok) return alert("참여 현황을 가져오는데 실패했습니다.");

  const list = getEl("scheduleList");
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
  const res = await callApi({
    action: "saveRaidSchedule",
    adminCode: getAdminCode(),
    date: getEl("dateInput").value,
    day: getEl("dayInput").value,
    timeSlot: getEl("timeSlotInput").value,
    note: getEl("noteInput").value,
    openYn: "Y", status: "OPEN"
  });
  if(res.ok) { alert("저장되었습니다."); loadAdminSchedule(); }
}

async function deleteSchedule(date, day, time) {
  if(!confirm("정말 삭제하시겠습니까?")) return;
  const res = await callApi({ action: "deleteRaidSchedule", adminCode: getAdminCode(), date, day, timeSlot: time });
  if(res.ok) loadAdminSchedule();
}

function editSchedule(date, day, time, note) {
  getEl("dateInput").value = date;
  getEl("dayInput").value = day;
  getEl("timeSlotInput").value = time;
  getEl("noteInput").value = note;
  window.scrollTo(0, 0);
}

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
  const targetAccountId = getEl("userAccountIdInput").value.trim();
  if (!targetAccountId) return alert("계정 ID를 입력하세요.");
  await openUserCharacterManager(targetAccountId);
};

loadAdminSchedule();

// 특정 유저의 캐릭터 정보를 불러와서 편집 모달 띄우기
async function openUserCharacterManager(targetAccountId) {
  const data = await callApi({ 
    action: "getCharacters", 
    accountId: targetAccountId 
  });
  
  if (!data.ok) {
    getEl("userMessage").textContent = "유저를 찾을 수 없습니다.";
    getEl("userCharacterList").innerHTML = "";
    return;
  }

  const roleText = data.adminYn === 'Y' ? '<span style="color:var(--gold-1)">👑 운영진</span>' : '일반 유저';
  getEl("userMessage").innerHTML = `
    ${targetAccountId}의 캐릭터 목록 (${data.items.length}개) <br>
    현재 권한: <strong>${roleText}</strong>
    <div style="margin-top: 8px; display: flex; gap: 8px;">
      <button class="mini-btn" onclick="toggleUserAdmin('${targetAccountId}')">권한 변경</button>
      <button class="mini-btn danger" onclick="resetUserPassword('${targetAccountId}')">비밀번호 초기화</button>
    </div>
  `;

  const list = getEl("userCharacterList");
  list.innerHTML = data.items.map(c => `
    <div class="character-card">
      <div class="character-card-top">
        <div class="character-info">
          <div class="character-name">${escapeHtml(c.name)}</div>
          <span class="chip chip-type">${escapeHtml(c.type)}</span>
          <span class="chip chip-class ${escapeHtml(c.className)}">${escapeHtml(c.className)}</span>
        </div>
        <div class="character-actions">
          <button class="character-edit-btn" onclick="editUserCharacter('${escapeHtml(targetAccountId)}', '${escapeHtml(c.name)}', '${escapeHtml(c.className)}', '${escapeHtml(c.type)}', '${escapeHtml(c.power)}')">편집</button>
        </div>
      </div>
      <div class="character-card-center">
        <div class="character-power-label">전투력 구간</div>
        <div class="character-power">${getPowerRange(c.power)}</div>
      </div>
    </div>
  `).join("");
}

// 유저 캐릭터 편집 모달 열기
function editUserCharacter(accountId, originalName, className, type, power) {
  getEl("adminModalAccountId").value = accountId;
  getEl("adminModalOriginalName").value = originalName;
  getEl("adminModalCharacterName").value = originalName;
  getEl("adminModalCharacterClass").value = className;
  getEl("adminModalCharacterType").value = type;
  getEl("adminModalCharacterPower").value = power;

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
async function toggleUserAdmin(targetAccountId) {
  if(!confirm(`[${targetAccountId}] 계정의 운영진 권한을 변경하시겠습니까?`)) return;
  const res = await callApi({ action: "toggleAdminRole", adminCode: getAdminCode(), targetAccountId });
  alert(res.message);
  if (res.ok) openUserCharacterManager(targetAccountId); // UI 갱신
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
      newAdminCode: newCode
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