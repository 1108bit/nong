async function loadPartySummary() {
  const data = await callApi({ action: "getAvailabilitySummary" });
  const target = getEl("summaryGrid");
  
  // 시간별 버튼 생성 (인원수 표시)
  target.innerHTML = data.items.map(i => `
    <button class="party-slot-btn" onclick="showComposition('${i.day}', '${i.time_slot}')">
      ${i.day} ${i.time_slot} (집계됨)
    </button>
  `).join("");
}

async function showComposition(day, time) {
    const res = await callApi({ action: "getPartyComposition", day, time_slot: time });
    if(!res.ok) return;

    renderParty("party1List", res.party1);
    renderParty("party2List", res.party2);
    setText("statusTime", `${day} ${time}`);
    setText("statusPicked", res.totalCount);
}

function renderParty(id, list) {
    getEl(id).innerHTML = list.map(m => `
        <div class="party-member-card">
            <div class="party-name">${escapeHtml(m.character_name)}</div>
            <div class="party-chip ${m.class === '치유성' ? 'heal' : ''}">${escapeHtml(m.class)}</div>
        </div>
    `).join("");
}

getEl("backButton").onclick = () => movePage("main.html");
loadPartySummary();