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

  getEl("userMessage").textContent = `${targetAccountId}의 캐릭터 목록 (${data.items.length}개)`;

  const list = getEl("userCharacterList");
  list.innerHTML = data.items.map(c => `
    <div class="character-card">
      <div class="character-left">
        <div class="character-name">${escapeHtml(c.name)}</div>
        <div class="character-sub">
          <span class="chip chip-class ${escapeHtml(c.className)}">${escapeHtml(c.className)}</span>
          <span class="chip chip-type">${escapeHtml(c.type)}</span>
        </div>
      </div>
      <div class="character-right">
        <div class="character-power">${getPowerRange(c.power)}</div>
        <div class="character-actions">
          <button class="character-edit-btn" onclick="editUserCharacter('${escapeHtml(targetAccountId)}', '${escapeHtml(c.name)}', '${escapeHtml(c.className)}', '${escapeHtml(c.type)}', '${escapeHtml(c.power)}')">편집</button>
        </div>
      </div>
    </div>
  `).join("");
}

// 유저 캐릭터 편집 모달 (간단한 prompt 사용)
function editUserCharacter(accountId, originalName, className, type, power) {
  const newName = prompt("캐릭터 이름", originalName);
  if (!newName) return;

  const newClass = prompt("직업", className);
  if (!newClass) return;

  const newType = prompt("타입 (본캐/부캐)", type);
  if (!newType) return;

  const newPower = prompt("전투력", power);
  if (!newPower) return;

  // updateCharacterByAdmin 호출
  callApi({
    action: "updateCharacterByAdmin",
    adminCode: getAdminCode(),
    targetAccountId: accountId,
    originalName: originalName,
    newName: newName,
    newClass: newClass,
    newType: newType,
    newPower: newPower
  }).then(res => {
    if (res.ok) {
      alert("수정되었습니다.");
      openUserCharacterManager(accountId); // 목록 새로고침
    } else {
      alert(res.message || "수정 실패");
    }
  });
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