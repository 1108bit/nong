let selectedMap = new Set();

async function initAvailability() {
  const accountId = getAccountId();
  const characterName = getMainName();

  // 로딩 중 스켈레톤 UI 표시
  const target = getEl("availabilityList");
  if (target) {
    target.innerHTML = `
      <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
      <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
      <div class="skeleton-block skeleton-card tall" style="margin-bottom:10px;"></div>
    `;
  }

  const [schedule, mySelection] = await Promise.all([
    callApi({ action: "getRaidSchedule" }),
    callApi({ action: "getAvailability", accountId, characterName })
  ]);

  selectedMap.clear();
  mySelection.items?.forEach(i => selectedMap.add(`${i.day}__${i.time_slot}`));
  
  renderList(schedule.items || []);
}

function renderList(items) {
  const target = getEl("availabilityList");
  target.innerHTML = items.map(i => {
    const key = `${i.day}__${i.time_slot}`;
    const isSelected = selectedMap.has(key);
    return `
      <button class="availability-item ${isSelected ? 'active' : ''}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">
        <div class="availability-time">${escapeHtml(i.date)} ${escapeHtml(i.day)} ${escapeHtml(i.time_slot)}</div>
        <div class="availability-note">${escapeHtml(i.note)}</div>
        <div class="availability-foot">${isSelected ? '선택됨' : '미선택'}</div>
      </button>
    `;
  }).join("");
  
  applyTouchPop();
}

// 이벤트 위임(Event Delegation)을 통한 리스너 최적화
getEl("availabilityList").addEventListener("click", (e) => {
  const btn = e.target.closest(".availability-item");
  if (!btn) return;
  toggleTime(btn.dataset.day, btn.dataset.time);
});

async function toggleTime(day, time) {
  const key = `${day}__${time}`;
  
  // 1. 낙관적 UI 업데이트 (API 응답을 기다리지 않고 화면부터 즉각 변경)
  const btn = document.querySelector(`.availability-item[data-day="${day}"][data-time="${time}"]`);
  if (selectedMap.has(key)) {
    selectedMap.delete(key);
    if (btn) {
      btn.classList.remove("active");
      btn.querySelector(".availability-foot").textContent = "미선택";
    }
  } else {
    selectedMap.add(key);
    if (btn) {
      btn.classList.add("active");
      btn.querySelector(".availability-foot").textContent = "선택됨";
    }
  }

  const slotList = Array.from(selectedMap).map(s => {
    const [d, t] = s.split("__");
    return { day: d, time_slot: t };
  });

  // 2. 백그라운드에서 서버 동기화 (await 없이 백그라운드 실행)
  callApi({
    action: "saveAvailability",
    accountId: getAccountId(),
    mainName: getMainName(),
    characterName: getMainName(),
    type: "본캐",
    slotList: JSON.stringify(slotList)
  }).then(res => {
    // 3. 실패했을 경우에만 경고 후 원래 상태로 복구
    if (!res.ok) {
      alert("저장에 실패했습니다. 상태를 다시 동기화합니다.");
      initAvailability(); 
    }
  });
}

getEl("backButton").onclick = () => movePage("main.html");
initAvailability();