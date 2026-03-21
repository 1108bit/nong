const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

function getParams() {
  return new URLSearchParams(location.search);
}

function getMainName() {
  return getParams().get("mainName") || "";
}

function getAccountId() {
  return getParams().get("accountId") || "";
}

function getAdminCode() {
  return getParams().get("adminCode") || "";
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

function setMessage(message, isError = false) {
  const el = document.getElementById("adminMessage");
  if (!el) return;

  el.textContent = message || "";
  el.classList.toggle("error", isError);
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadWeekKey() {
  const data = await callApi({ action: "getCurrentWeekKey" });

  if (!data.ok || !data.weekKey) {
    throw new Error("주간 정보를 불러오지 못했습니다.");
  }

  setValue("weekKeyInput", data.weekKey);
}

function updateSummary(items) {
  const openCount = (items || []).filter(item => String(item.open_yn || "").toUpperCase() === "Y").length;
  const finalCount = (items || []).filter(item => String(item.status || "").toUpperCase() === "FINAL").length;

  document.getElementById("openCountText").textContent = `${openCount}개`;
  document.getElementById("finalCountText").textContent = `${finalCount}개`;
}

function fillForm(item) {
  setValue("weekKeyInput", item.week_key || "");
  setValue("dateInput", item.date || "");
  setValue("dayInput", item.day || "");
  setValue("timeSlotInput", item.time_slot || "");
  setValue("openYnInput", item.open_yn || "Y");
  setValue("statusInput", item.status || "OPEN");
  setValue("noteInput", item.note || "");
  setValue("sortInput", item.sort || "");
}

function renderScheduleList(items) {
  const target = document.getElementById("scheduleList");

  if (!items || !items.length) {
    target.innerHTML = `<div class="availability-empty">등록된 일정이 없습니다.</div>`;
    updateSummary([]);
    return;
  }

  updateSummary(items);

  target.innerHTML = items.map(item => {
    const openText = String(item.open_yn || "").toUpperCase() === "Y" ? "열림" : "닫힘";
    const status = escapeHtml(item.status || "OPEN");

    return `
      <div class="admin-item">
        <div class="admin-item-main">
          <div class="admin-item-title">${escapeHtml(item.date || "")} ${escapeHtml(item.day || "")} ${escapeHtml(item.time_slot || "")}</div>
          <div class="admin-item-meta">${openText} · ${status} · ${escapeHtml(item.note || "-")}</div>
        </div>

        <div class="admin-item-actions">
          <button
            class="mini-btn edit-btn"
            data-week="${escapeHtml(item.week_key || "")}"
            data-date="${escapeHtml(item.date || "")}"
            data-day="${escapeHtml(item.day || "")}"
            data-time="${escapeHtml(item.time_slot || "")}"
            data-open="${escapeHtml(item.open_yn || "Y")}"
            data-status="${escapeHtml(item.status || "OPEN")}"
            data-note="${escapeHtml(item.note || "")}"
            data-sort="${escapeHtml(item.sort || "")}"
          >
            수정
          </button>

          <button
            class="mini-btn delete-btn"
            data-week="${escapeHtml(item.week_key || "")}"
            data-date="${escapeHtml(item.date || "")}"
            data-day="${escapeHtml(item.day || "")}"
            data-time="${escapeHtml(item.time_slot || "")}"
          >
            삭제
          </button>
        </div>
      </div>
    `;
  }).join("");

  bindListEvents();
}

function bindListEvents() {
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      fillForm({
        week_key: btn.dataset.week,
        date: btn.dataset.date,
        day: btn.dataset.day,
        time_slot: btn.dataset.time,
        open_yn: btn.dataset.open,
        status: btn.dataset.status,
        note: btn.dataset.note,
        sort: btn.dataset.sort
      });

      setMessage("입력창에 일정 정보를 불러왔습니다.");
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        const data = await callApi({
          action: "deleteRaidSchedule",
          weekKey: btn.dataset.week,
          date: btn.dataset.date,
          day: btn.dataset.day,
          timeSlot: btn.dataset.time,
          adminCode: getAdminCode()
        });

        if (!data.ok) {
          setMessage(data.message || "삭제하지 못했습니다.", true);
          return;
        }

        setMessage("삭제되었습니다.");
        await loadSchedule();
      } catch (error) {
        console.error(error);
        setMessage("삭제 중 문제가 발생했습니다.", true);
      }
    });
  });
}

async function loadSchedule() {
  const weekKey = getValue("weekKeyInput");

  if (!weekKey) {
    setMessage("주간 키를 먼저 확인해주세요.", true);
    return;
  }

  const data = await callApi({
    action: "getRaidScheduleAdmin",
    weekKey,
    adminCode: getAdminCode()
  });

  if (!data.ok) {
    setMessage(data.message || "일정을 불러오지 못했습니다.", true);
    return;
  }

  renderScheduleList(data.items || []);
}

async function saveSchedule() {
  const weekKey = getValue("weekKeyInput");
  const date = getValue("dateInput");
  const day = getValue("dayInput");
  const timeSlot = getValue("timeSlotInput");
  const openYn = getValue("openYnInput");
  const status = getValue("statusInput");
  const note = getValue("noteInput");
  const sort = getValue("sortInput");

  if (!weekKey || !date || !day || !timeSlot) {
    setMessage("주간 키, 날짜, 요일, 시간은 필수입니다.", true);
    return;
  }

  try {
    setMessage("저장 중입니다...");

    const data = await callApi({
      action: "saveRaidSchedule",
      weekKey,
      date,
      day,
      timeSlot,
      openYn,
      status,
      note,
      sort,
      adminCode: getAdminCode()
    });

    if (!data.ok) {
      setMessage(data.message || "저장하지 못했습니다.", true);
      return;
    }

    setMessage("저장되었습니다.");
    await loadSchedule();
  } catch (error) {
    console.error(error);
    setMessage("저장 중 문제가 발생했습니다.", true);
  }
}

async function initPage() {
  const adminCode = getAdminCode();

  if (!adminCode) {
    setMessage("관리자 확인 정보가 없습니다.", true);
    setTimeout(() => {
      const mainName = encodeURIComponent(getMainName());
      const accountId = encodeURIComponent(getAccountId());
      location.href = `./admin-login.html?mainName=${mainName}&accountId=${accountId}`;
    }, 400);
    return;
  }

  try {
    const auth = await callApi({
      action: "adminLogin",
      adminCode
    });

    if (!auth.ok) {
      setMessage(auth.message || "관리자 확인에 실패했습니다.", true);
      setTimeout(() => {
        const mainName = encodeURIComponent(getMainName());
        const accountId = encodeURIComponent(getAccountId());
        location.href = `./admin-login.html?mainName=${mainName}&accountId=${accountId}`;
      }, 400);
      return;
    }

    await loadWeekKey();
    await loadSchedule();
    setMessage("일정 목록을 불러왔습니다.");
  } catch (error) {
    console.error(error);
    setMessage("초기 화면을 불러오지 못했습니다.", true);
  }
}

document.getElementById("saveButton").addEventListener("click", saveSchedule);
document.getElementById("refreshButton").addEventListener("click", loadSchedule);
document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

initPage();