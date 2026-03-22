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

function setMessage(message, isError = false, mode = "loading") {
  const el = document.getElementById("adminMessage");
  if (!el) return;

  el.textContent = message || "";
  el.classList.remove("loading", "success", "error");

  if (isError) {
    el.classList.add("error");
  } else {
    el.classList.add(mode);
  }
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

function renderAdminSkeleton() {
  const target = document.getElementById("scheduleList");
  if (!target) return;

  target.innerHTML = `
    <div class="skeleton-list">
      <div class="skeleton-block skeleton-card tall"></div>
      <div class="skeleton-block skeleton-card tall"></div>
      <div class="skeleton-block skeleton-card tall"></div>
    </div>
  `;
}

function applyTouchPopToAdmin() {
  document.querySelectorAll(".admin-card-item, .btn, .mini-btn").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.remove("touch-pop");
      void el.offsetWidth;
      el.classList.add("touch-pop");
    });
  });
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
    const date = escapeHtml(item.date || "");
    const day = escapeHtml(item.day || "");
    const time = escapeHtml(item.time_slot || "");
    const note = escapeHtml(item.note || "-");
    const openYn = String(item.open_yn || "").toUpperCase() === "Y";
    const status = escapeHtml(item.status || "OPEN");
    const sort = escapeHtml(item.sort || "0");

    return `
      <div class="admin-card-item">
        <div class="admin-card-top">
          <div>
            <div class="admin-card-time">${date} ${day} ${time}</div>
            <div class="admin-card-meta">정렬 ${sort} · 상태 ${status}</div>
          </div>

          <div class="admin-status-chip ${openYn ? "open" : "closed"}">
            ${openYn ? "열림" : "닫힘"}
          </div>
        </div>

        <div class="admin-card-note">${note}</div>

        <div class="admin-card-actions">
          <button
            class="mini-btn edit-btn"
            data-week="${escapeHtml(item.week_key || "")}"
            data-date="${date}"
            data-day="${day}"
            data-time="${time}"
            data-open="${escapeHtml(item.open_yn || "Y")}"
            data-status="${status}"
            data-note="${escapeHtml(item.note || "")}"
            data-sort="${sort}"
          >
            수정
          </button>

          <button
            class="mini-btn danger delete-btn"
            data-week="${escapeHtml(item.week_key || "")}"
            data-date="${date}"
            data-day="${day}"
            data-time="${time}"
          >
            삭제
          </button>
        </div>
      </div>
    `;
  }).join("");

  bindListEvents();
  applyTouchPopToAdmin();
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

      setMessage("수정할 값을 위 입력창에 반영했습니다.", false, "success");
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("정말 삭제하시겠습니까?")) return;

      try {
        setMessage("삭제 중입니다...", false, "loading");

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

        await loadSchedule();
        setMessage("삭제되었습니다.", false, "success");
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
    setMessage("저장 중입니다...", false, "loading");

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

    await loadSchedule();
    setMessage("저장되었습니다.", false, "success");
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
    renderAdminSkeleton();
    setMessage("주간 일정을 불러오는 중입니다.", false, "loading");

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
    setMessage("최신 상태로 반영되었습니다.", false, "success");
  } catch (error) {
    console.error(error);
    setMessage("초기 화면을 불러오지 못했습니다.", true);
  }
}

document.getElementById("saveButton").addEventListener("click", saveSchedule);
document.getElementById("refreshButton").addEventListener("click", async () => {
  setMessage("주간 일정을 불러오는 중입니다.", false, "loading");
  await loadSchedule();
  setMessage("최신 상태로 반영되었습니다.", false, "success");
});
document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

initPage();