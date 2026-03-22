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

  const [schedule, mySelection, summaryData] = await Promise.all([
    callApi({ action: "getRaidSchedule" }),
    callApi({ action: "getAvailability", accountId, characterName }),
    callApi({ action: "getAvailabilitySummary" })
  ]);

  selectedMap.clear();
  mySelection.items?.forEach(i => selectedMap.add(`${i.day}__${i.time_slot}`));
  
  const summaryItems = summaryData.items || [];
  renderList(schedule.items || [], summaryItems);
}

function renderList(items, summaryItems) {
  const target = getEl("availabilityList");
  target.innerHTML = items.map(i => {
    const key = `${i.day}__${i.time_slot}`;
    const isSelected = selectedMap.has(key);
    const shortDate = i.date && i.date.length >= 10 ? i.date.substring(5).replace('-', '.') : i.date;
    
    const participantsCount = summaryItems.filter(s => s.day === i.day && s.time_slot === i.time_slot).length;

    return `
      <button class="availability-item ${isSelected ? 'active' : ''}" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="row-time" style="flex-direction:row; align-items:center; width:auto; gap:6px;">
            <span class="row-date">${shortDate} (${escapeHtml(i.day)})</span>
            <span class="row-hhmm">${escapeHtml(i.time_slot)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="participant-count" style="font-size:12px; font-weight:600; color:var(--text-sub); display:flex; align-items:center; gap:4px;">
              <span class="ui-dot ${participantsCount >= 8 ? 'green' : 'gold'}"></span>${participantsCount}명 참여
            </span>
            <span class="status-text" style="font-size:13px; font-weight:800; color: ${isSelected ? 'var(--cyan-1)' : 'var(--text-muted)'};">${isSelected ? '✓ 참여' : '미선택'}</span>
          </div>
        </div>
        ${i.note ? `<div class="row-note" style="margin-top:6px; max-width:100%; white-space:normal;">${escapeHtml(i.note)}</div>` : ''}
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
      btn.querySelector(".status-text").innerHTML = "미선택";
      btn.querySelector(".status-text").style.color = "var(--text-muted)";
      
      const countEl = btn.querySelector(".participant-count");
      if (countEl) {
        let currentCount = parseInt(countEl.textContent.replace(/[^0-9]/g, '')) || 0;
        currentCount = Math.max(0, currentCount - 1);
        countEl.innerHTML = `<span class="ui-dot ${currentCount >= 8 ? 'green' : 'gold'}"></span>${currentCount}명 참여`;
      }
    }
  } else {
    selectedMap.add(key);
    if (btn) {
      btn.classList.add("active");
      btn.querySelector(".status-text").innerHTML = "✓ 참여";
      btn.querySelector(".status-text").style.color = "var(--cyan-1)";

      const countEl = btn.querySelector(".participant-count");
      if (countEl) {
        let currentCount = parseInt(countEl.textContent.replace(/[^0-9]/g, '')) || 0;
        currentCount += 1;
        countEl.innerHTML = `<span class="ui-dot ${currentCount >= 8 ? 'green' : 'gold'}"></span>${currentCount}명 참여`;
      }
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