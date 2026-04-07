// js/party.js
let selectedSlot = null;

async function loadPartySummary() {
  const target = getEl("summaryGrid");
  
  // 로딩 중 스켈레톤 UI 표시
  if (target) {
    target.innerHTML = `
      <div class="skeleton-block" style="min-width: 84px; height: 68px; border-radius: 14px; flex-shrink: 0;"></div>
      <div class="skeleton-block" style="min-width: 84px; height: 68px; border-radius: 14px; flex-shrink: 0;"></div>
      <div class="skeleton-block" style="min-width: 84px; height: 68px; border-radius: 14px; flex-shrink: 0;"></div>
    `;
  }

  const data = await callApi({ action: "getAvailabilitySummary" });
  
  if (!data.success || !data.data.items.length) {
    target.innerHTML = `<div class="availability-empty" style="width:100%; text-align:center; padding: 20px 0;">📊 아직 집계된 데이터가 없습니다.</div>`;
    return;
  }

  // 💡 중복된 시간대를 묶어서 하나로 표시하도록 그룹핑 (기존 버그 수정)
  const uniqueSlots = [];
  const seen = new Set();
  
  // 날짜순, 시간순 정렬
  data.data.items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time_slot.localeCompare(b.time_slot);
  });

  data.data.items.forEach(i => {
    const key = `${i.day}_${i.time_slot}`;
    if(!seen.has(key)) { seen.add(key); uniqueSlots.push(i); }
  });

  // 💡 애플 스타일 가로 스크롤 칩으로 세련되게 렌더링
  target.innerHTML = uniqueSlots.map(i => {
    const shortDate = i.date && i.date.length >= 10 ? i.date.substring(5).replace('-', '.') : '';
    return `
    <button type="button" class="chip-btn date-chip party-slot-btn touch-pop" data-day="${escapeHtml(i.day)}" data-time="${escapeHtml(i.time_slot)}" style="min-width: 84px; height: 68px;">
      <span style="font-size:11px; opacity:0.6; font-weight:700;">${shortDate} (${escapeHtml(i.day)})</span>
      <span style="font-size:16px; font-weight:900; margin-top:4px; font-variant-numeric: tabular-nums;">${escapeHtml(i.time_slot)}</span>
    </button>
  `}).join("");
  
  // 버튼 클릭 이벤트 리스너 추가 및 Active 상태 시각화
  document.querySelectorAll(".party-slot-btn").forEach(btn => {
    btn.onclick = () => {
      if (window.isDraggingScroll) return; // 💡 가로 스크롤 중 클릭(터치) 오작동 방지
      document.querySelectorAll(".party-slot-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      showComposition(btn.dataset.day, btn.dataset.time);
    };
  });

  // 💡 메인 화면에서 '내가 신청한 일정' 클릭하고 넘어왔을 때 자동 오픈 처리
  const autoDay = sessionStorage.getItem('autoOpenPartyDay');
  const autoTime = sessionStorage.getItem('autoOpenPartyTime');
  if (autoDay && autoTime) {
    sessionStorage.removeItem('autoOpenPartyDay');
    sessionStorage.removeItem('autoOpenPartyTime');
    
    const targetBtn = document.querySelector(`.party-slot-btn[data-day="${autoDay}"][data-time="${autoTime}"]`);
    if (targetBtn) {
      setTimeout(() => {
        targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        targetBtn.click();
      }, 100);
    } else {
      showComposition(autoDay, autoTime);
    }
  } else if (uniqueSlots.length > 0) {
    // 💡 파티 탭에 처음 진입 시 첫 번째 시간대를 자동으로 눌러서 빈 화면 방지
    document.querySelector(".party-slot-btn").click();
  }
}

async function showComposition(day, time) {
    // 파티 구성 분석 중 스켈레톤 UI 표시
    const skeletonHtml = `<div class="skeleton-block skeleton-card" style="margin-bottom:8px; height: 76px;"></div>`;
    getEl("party1List").innerHTML = skeletonHtml.repeat(4);
    getEl("party2List").innerHTML = skeletonHtml.repeat(4);
    getEl("party1Badges").innerHTML = `<span class="party-stat-chip skeleton" style="width:60px; height:26px;"></span>`;
    getEl("party2Badges").innerHTML = `<span class="party-stat-chip skeleton" style="width:60px; height:26px;"></span>`;

    // 경고 컨테이너 초기화
    let warningContainer = document.getElementById("partyWarningContainer");
    if (warningContainer) warningContainer.innerHTML = "";

    const res = await callApi({ action: "getPartyComposition", day, time_slot: time });
    if(!res.success) return; // 에러처리는 api.js에서 일괄 담당

    // 💡 화면 정중앙을 덮어버리는 uiAlert 대신 부드러운 인라인 알림 배너 사용 (UX 극대화)
    if (res.data.warning) {
        if (!warningContainer) {
            warningContainer = document.createElement("div");
            warningContainer.id = "partyWarningContainer";
            warningContainer.style.marginTop = "8px"; // 💡 2파티 카드와 경고창 사이의 간격 추가
            const party1Card = getEl("party1List").closest('.main-card');
            party1Card.parentNode.appendChild(warningContainer); // 💡 1파티 위가 아닌, 전체 목록의 가장 마지막(아래)에 배치
        }
        const isError = res.data.warning.includes("없습니다");
        warningContainer.innerHTML = `
            <div class="page-message ${isError ? 'error' : ''}" style="margin: 0; font-size: 13px; font-weight: 700; text-align: left; justify-content: flex-start; border-radius: 12px; padding: 12px 16px;">
                <span style="margin-right: 4px;">${isError ? '⚠️' : '💡'}</span> ${escapeHtml(res.data.warning)}
            </div>
        `;
    }

    // 1파티, 2파티 렌더링
    renderParty("party1List", res.data.party1 || []);
    renderParty("party2List", res.data.party2 || []);
    
    // 배지 업데이트 (인원, 치유 등)
    renderBadges("party1Badges", res.data.party1 || []);
    renderBadges("party2Badges", res.data.party2 || []);
}

function renderParty(id, list) {
    const target = getEl(id);
    if (!list.length) {
        target.innerHTML = `<div class="availability-empty">텅 비어있습니다</div>`;
        return;
    }

    target.innerHTML = list.map((m, index) => {
        const pValue = Number(m.power_value || m.power) || 0;
        const pRange = getPowerRange(pValue);
        const classNameEscaped = escapeHtml(m.className);
        const isMainChar = m.type === '본캐';
        const mainIcon = isMainChar ? '<span style="color:var(--gold-1); margin-right:4px; font-size:14px; text-shadow: 0 0 8px rgba(246,211,122,0.4);">⭐️</span>' : '';

        return `
            <div class="character-card touch-pop" style="padding: 14px 16px;">
                <div class="character-left">
                    <div class="character-name" style="font-size: 15px;">
                        <span style="font-size: 12px; color: var(--text-muted); margin-right: 6px; font-weight: 900;">${index + 1}</span>
                        ${mainIcon}${escapeHtml(m.character_name)}
                    </div>
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
    const tankCount = list.filter(m => m.className === '수호성' || m.className === '검성').length;
    
    // 직업군 부족 시 붉은색 경고 / 정상이면 고유 색상 뱃지
    const tankStyle = tankCount >= 1 ? 'background: rgba(59, 130, 246, 0.15); color: #bfdbfe; border-color: rgba(59, 130, 246, 0.3);' : 'background: rgba(244, 63, 94, 0.15); color: #fda4af; border-color: rgba(244, 63, 94, 0.3);';
    const healStyle = healerCount >= 1 ? 'background: rgba(250, 204, 21, 0.15); color: #fef9c3; border-color: rgba(250, 204, 21, 0.3);' : 'background: rgba(244, 63, 94, 0.15); color: #fda4af; border-color: rgba(244, 63, 94, 0.3);';

    target.innerHTML = `
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="party-stat-chip">총 ${list.length}명</span>
            <span class="party-stat-chip" style="${tankStyle}">탱커 ${tankCount}</span>
            <span class="party-stat-chip" style="${healStyle}">치유 ${healerCount}</span>
        </div>
    `;
}

getEl("backButton").onclick = () => movePage("main.html");
loadPartySummary();