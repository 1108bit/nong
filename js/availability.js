let selectedMap = new Set();

async function initAvailability() {
  const accountId = getAccountId();
  const characterName = getMainName();

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
      <button class="availability-item ${isSelected ? 'active' : ''}" onclick="toggleTime('${i.day}', '${i.time_slot}')">
        <div class="availability-time">${i.date} ${i.day} ${i.time_slot}</div>
        <div class="availability-note">${escapeHtml(i.note)}</div>
        <div class="availability-foot">${isSelected ? '선택됨' : '미선택'}</div>
      </button>
    `;
  }).join("");
  applyTouchPop();
}

async function toggleTime(day, time) {
  const key = `${day}__${time}`;
  if (selectedMap.has(key)) selectedMap.delete(key);
  else selectedMap.add(key);

  const slotList = Array.from(selectedMap).map(s => {
    const [d, t] = s.split("__");
    return { day: d, time_slot: t };
  });

  await callApi({
    action: "saveAvailability",
    accountId: getAccountId(),
    mainName: getMainName(),
    characterName: getMainName(),
    slotList: JSON.stringify(slotList)
  });
  initAvailability();
}

getEl("backButton").onclick = () => movePage("main.html");
initAvailability();