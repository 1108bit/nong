const adminCode = getParams().get("adminCode");

async function loadAdminSchedule() {
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
        <button class="mini-btn" onclick="editSchedule('${i.date}','${i.day}','${i.time_slot}','${i.note}')">수정</button>
        <button class="mini-btn danger" onclick="deleteSchedule('${i.date}','${i.day}','${i.time_slot}')">삭제</button>
      </div>
    </div>
  `).join("");
}

async function saveSchedule() {
  const res = await callApi({
    action: "saveRaidSchedule",
    adminCode,
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
  const res = await callApi({ action: "deleteRaidSchedule", adminCode, date, day, timeSlot: time });
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
getEl("backButton").onclick = () => movePage("main.html");

loadAdminSchedule();