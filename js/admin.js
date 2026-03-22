async function loadAdminSchedule() {
  const adminCode = getAdminCode();
  if (!adminCode) return movePage("admin-login.html");

  const data = await callApi({ action: "getRaidScheduleAdmin", adminCode });
  if (!data.ok) return movePage("admin-login.html");

  const list = getEl("scheduleList");
  list.innerHTML = data.items.map(i => `
    <div class="admin-card-item">
      <div class="admin-card-top">
        <div class="admin-card-time">${i.date} (${i.day}) ${i.time_slot}</div>
        <div class="admin-status-chip ${i.open_yn === 'Y' ? 'open' : 'closed'}">${i.open_yn === 'Y' ? '열림' : '닫힘'}</div>
      </div>
      <div class="admin-card-note">${escapeHtml(i.note)}</div>
      <div class="admin-card-actions">
        <button class="mini-btn edit-btn" data-date="${escapeHtml(i.date)}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}" data-note="${escapeHtml(i.note)}">수정</button>
        <button class="mini-btn danger delete-btn" data-date="${escapeHtml(i.date)}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">삭제</button>
      </div>
    </div>
  `).join("");
  
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

loadAdminSchedule();