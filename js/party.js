// js/party.js
let selectedSlot = null;

async function loadPartySummary() {
  const data = await callApi({ action: "getAvailabilitySummary" });
  const target = getEl("summaryGrid");
  
  if (!data.ok || !data.items.length) {
    target.innerHTML = `<div class="availability-empty">집계 데이터가 없습니다.</div>`;
    return;
  }

  // 시간대별 버튼 생성
  target.innerHTML = data.items.map(i => `
    <button type="button" class="party-slot-btn" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">
      <div class="party-slot-time">${escapeHtml(i.day)} ${escapeHtml(i.time_slot)}</div>
      <div class="party-slot-foot">눌러서 이 시간 조합 확인</div>
    </button>
  `).join("");
  
  // 버튼 클릭 이벤트 리스너 추가
  document.querySelectorAll(".party-slot-btn").forEach(btn => {
    btn.onclick = () => showComposition(btn.dataset.day, btn.dataset.time);
  });
}

async function showComposition(day, time) {
    const res = await callApi({ action: "getPartyComposition", day, time_slot: time });
    if(!res.ok) return alert(res.message);

    // 1파티, 2파티 렌더링
    renderParty("party1List", res.party1 || []);
    renderParty("party2List", res.party2 || []);
    
    // 상태 정보 업데이트
    setText("statusTime", `${day} ${time}`);
    setText("statusPicked", `${res.totalCount}명`);
    
    // 배지 업데이트 (인원, 치유 등)
    renderBadges("party1Badges", res.party1 || []);
    renderBadges("party2Badges", res.party2 || []);
}

function renderParty(id, list) {
    const target = getEl(id);
    if (!list.length) {
        target.innerHTML = `<div class="availability-empty">구성 없음</div>`;
        return;
    }

    target.innerHTML = list.map(m => {
        const pValue = Number(m.power_value || m.power) || 0;
        const pRange = getPowerRange(pValue); // 전투력 구간 계산
        const roleClass = m.class === '치유성' ? 'heal' : 'normal';

        return `
            <div class="party-member-card">
                <div class="party-member-left">
                    <div class="party-name">${escapeHtml(m.character_name || m.name)}</div>
                    <div class="party-member-chips">
                        <span class="party-chip ${roleClass}">${escapeHtml(m.class || m.className)}</span>
                    </div>
                </div>
                <div class="party-member-right">
                    <div class="party-power">${pRange}</div> <div class="party-power-label">전투력 구간</div>
                </div>
            </div>
        `;
    }).join("");
}

function renderBadges(id, list) {
    const target = getEl(id);
    if (!target) return;
    const healerCount = list.filter(m => (m.class || m.className) === '치유성').length;
    target.innerHTML = `
        <span class="party-stat-chip">인원 ${list.length}</span>
        <span class="party-stat-chip">치유 ${healerCount}</span>
    `;
}

getEl("backButton").onclick = () => movePage("main.html");
loadPartySummary();