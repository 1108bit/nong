const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

function getParams() {
  return new URLSearchParams(location.search);
}

function getMainName() {
  return getParams().get("mainName") || "";
}

function getAdminCode() {
  return getParams().get("adminCode") || "";
}

function getAccountId() {
  return getParams().get("accountId") || "";
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

function renderScheduleList(items) {
  const target = document.getElementById("scheduleList");
  if (!target) return;

  const head = `
    <div class="admin-row admin-head">
      <div>주간키</div>
      <div>요일</div>
      <div>시간</div>
      <div>상태</div>
      <div>메모</div>
      <div>정렬</div>
      <div>관리</div>
    </div>
  `;

  if (!items || !items.length) {
    target.innerHTML = head + `
      <div class="admin-row">
        <div class="admin-cell">등록된 일정이 없습니다</div>
        <div class="admin-cell">-</div>
        <div class="admin-cell">-</div>
        <div class="admin-cell">-</div>
        <div class="admin-cell">-</div>
        <div class="admin-cell">-</div>
        <div class="admin-cell">-</div>
      </div>
    `;
    return;
  }

  target.innerHTML = head + items.map(item => `
    <div class="admin-row">
      <div class="admin-cell">${item.week_key || ""}<br>${item.date || ""}</div>
      <div class="admin-cell">${item.day || ""}</div>
      <div class="admin-cell">${item.time_slot || ""}</div>
      <div class="admin-cell">
        <span class="admin-badge ${item.open_yn === "Y" ? "" : "off"}">${item.open_yn === "Y" ? "열림" : "닫힘"}</span>
      </div>
      <div class="admin-cell">${item.note || "-"}</div>
      <div class="admin-cell">${item.sort || "-"}</div>
      <div class="admin-actions">
        <button class="btn btn-secondary toggle-btn"
          data-week="${item.week_key || ""}"
          data-date="${item.date || ""}"
          data-day="${item.day || ""}"
          data-time="${item.time_slot || ""}"
          data-open="${item.open_yn || "Y"}"
          data-note="${item.note || ""}"
          data-sort="${item.sort || ""}">
          상태변경
        </button>
        <button class="btn btn-secondary delete-btn"
          data-week="${item.week_key || ""}"
          data-date="${item.date || ""}"
          data-day="${item.day || ""}"
          data-time="${item.time_slot || ""}">
          삭제
        </button>
      </div>
    </div>
  `).join("");

  target.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nextOpenYn = btn.dataset.open === "Y" ? "N" : "Y";

      try {
const data = await callApi({
  action: "saveRaidSchedule",
  weekKey: btn.dataset.week,
  date: btn.dataset.date,
  day: btn.dataset.day,
  timeSlot: btn.dataset.time,
  openYn: nextOpenYn,
  note: btn.dataset.note,
  sort: btn.dataset.sort,
  adminCode: getAdminCode()
});

        if (!data.ok) {
          setMessage(data.message || "상태 변경 실패", true);
          return;
        }

        setMessage("상태 변경 완료");
        await loadSchedule();
      } catch (error) {
        console.error(error);
        setMessage("상태 변경 실패", true);
      }
    });
  });

  target.querySelectorAll(".delete-btn").forEach(btn => {
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
          setMessage(data.message || "삭제 실패", true);
          return;
        }

        setMessage("삭제 완료");
        await loadSchedule();
      } catch (error) {
        console.error(error);
        setMessage("삭제 실패", true);
      }
    });
  });
}

async function loadWeekKey() {
  const data = await callApi({ action: "getCurrentWeekKey" });
  if (!data.ok || !data.weekKey) {
    throw new Error("주간 키 불러오기 실패");
  }
  document.getElementById("weekKeyInput").value = data.weekKey;
}

async function loadSchedule() {
  const weekKey = getValue("weekKeyInput");
  if (!weekKey) {
    setMessage("week_key를 입력해주세요", true);
    return;
  }

  try {
const data = await callApi({
  action: "getRaidScheduleAdmin",
  weekKey,
  adminCode: getAdminCode()
});

    if (!data.ok) {
      setMessage(data.message || "일정 불러오기 실패", true);
      return;
    }

    renderScheduleList(data.items || []);
  } catch (error) {
    console.error(error);
    setMessage("일정 불러오기 실패", true);
  }
}

async function addSchedule() {
  const weekKey = getValue("weekKeyInput");
  const date = getValue("dateInput");
  const day = getValue("dayInput");
  const timeSlot = getValue("timeSlotInput");
  const openYn = getValue("openYnInput");
  const note = getValue("noteInput");
  const sort = getValue("sortInput");

  if (!weekKey || !date || !day || !timeSlot) {
    setMessage("week_key / date / day / time_slot 확인", true);
    return;
  }

  try {
    const data = await callApi({
      action: "saveRaidSchedule",
      weekKey,
      date,
      day,
      timeSlot,
      openYn,
      note,
      sort
      adminCode: getAdminCode()
    });

    if (!data.ok) {
      setMessage(data.message || "일정 저장 실패", true);
      return;
    }

    setMessage("일정 저장 완료");
    document.getElementById("dateInput").value = "";
    document.getElementById("timeSlotInput").value = "";
    document.getElementById("noteInput").value = "";
    document.getElementById("sortInput").value = "";
    await loadSchedule();
  } catch (error) {
    console.error(error);
    setMessage("일정 저장 실패", true);
  }
}

async function initPage() {
  const adminCode = getAdminCode();

  if (!adminCode) {
    setMessage("관리자 인증 정보가 없습니다", true);
    setTimeout(() => {
      const mainName = encodeURIComponent(getMainName());
      const accountId = encodeURIComponent(getAccountId());
      location.href = `./admin-login.html?mainName=${mainName}&accountId=${accountId}`;
    }, 500);
    return;
  }

  try {
    const auth = await callApi({
      action: "adminLogin",
      adminCode
    });

    if (!auth.ok) {
      setMessage(auth.message || "관리자 인증 실패", true);
      setTimeout(() => {
        const mainName = encodeURIComponent(getMainName());
        const accountId = encodeURIComponent(getAccountId());
        location.href = `./admin-login.html?mainName=${mainName}&accountId=${accountId}`;
      }, 500);
      return;
    }

    await loadWeekKey();
    await loadSchedule();
  } catch (error) {
    console.error(error);
    setMessage("초기 로딩 실패", true);
  }
}

document.getElementById("addButton").addEventListener("click", addSchedule);
document.getElementById("loadButton").addEventListener("click", loadSchedule);
document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});

initPage();