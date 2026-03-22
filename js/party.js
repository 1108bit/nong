// js/party.js
let selectedSlot = null;

async function loadPartySummary() {
  const target = getEl("summaryGrid");
  
  // 로딩 중 스켈레톤 UI 표시
  if (target) {
    target.innerHTML = `
      <div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>
      <div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>
      <div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>
    `;
  }

  const data = await callApi({ action: "getAvailabilitySummary" });
  
  if (!data.ok || !data.items.length) {
    target.innerHTML = `<div class="availability-empty">집계 데이터가 없습니다.</div>`;
    return;
  }

  // 시간대별 버튼 생성
  target.innerHTML = data.items.map(i => `
    <button type="button" class="party-slot-btn" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}">
      <div class="party-slot-time">${escapeHtml(i.day)} ${escapeHtml(i.time_slot)}</div>
      <div class="party-slot-foot">조합 상세 보기 ➔</div>
    </button>
  `).join("");
  
  // 버튼 클릭 이벤트 리스너 추가
  document.querySelectorAll(".party-slot-btn").forEach(btn => {
    btn.onclick = () => showComposition(btn.dataset.day, btn.dataset.time);
  });
}

async function showComposition(day, time) {
    // 파티 구성 분석 중 스켈레톤 UI 표시
    const skeletonHtml = `
        <div class="skeleton-block skeleton-card" style="margin-bottom:8px;"></div>
        <div class="skeleton-block skeleton-card" style="margin-bottom:8px;"></div>
    `;
    getEl("party1List").innerHTML = skeletonHtml;
    getEl("party2List").innerHTML = skeletonHtml;
    getEl("party1Badges").innerHTML = `<span class="party-stat-chip skeleton" style="width:60px; height:26px;"></span>`;
    getEl("party2Badges").innerHTML = `<span class="party-stat-chip skeleton" style="width:60px; height:26px;"></span>`;

    const res = await callApi({ action: "getPartyComposition", day, time_slot: time });
    if(!res.ok) return alert(res.message);

    if (res.warning) {
        alert(res.warning);
    }

    // 1파티, 2파티 렌더링
    renderParty("party1List", res.party1 || []);
    renderParty("party2List", res.party2 || []);
    
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
        const pRange = getPowerRange(pValue);
        const classNameEscaped = escapeHtml(m.className);

        return `
            <div class="character-card" style="margin-bottom: 8px;">
                <div class="character-left">
                    <div class="character-name">${escapeHtml(m.character_name)}</div>
                    <div class="character-sub">
                        <span class="chip chip-class ${classNameEscaped}">${classNameEscaped}</span>
                        <div class="character-power" style="margin-left: 4px;">${pRange}</div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderBadges(id, list) {
    const target = getEl(id);
    if (!target) return;
    const healerCount = list.filter(m => m.className === '치유성').length;
    target.innerHTML = `
        <span class="party-stat-chip">인원 ${list.length}</span>
        <span class="party-stat-chip">치유 ${healerCount}</span>
    `;
}

getEl("backButton").onclick = () => movePage("main.html");
loadPartySummary();