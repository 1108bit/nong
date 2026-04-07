// js/main.js
const CHARACTER_TYPES = {
  MAIN: "본캐",
  SUB: "부캐"
};

let hasMainCharacter = false; // 현재 본캐 등록 여부
let characters = []; // 전역 변수 제거, 로컬로 관리
let selectedCharNameForAction = ""; // Action Sheet용 현재 선택된 캐릭터명

async function loadMain() {
  const accountId = getAccountId();
  if (!accountId) return location.href = "index.html";
  if (accountId === "MASTER_ADMIN") return location.href = "admin.html";

  // 💡 [SWR 캐시 패턴] 이전에 저장된 데이터가 있으면 즉시(0.01초) 화면에 렌더링
  const cacheKey = `cache_main_${accountId}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  const cachedNotice = sessionStorage.getItem('cache_notice');
  
  if (cachedData) {
    try { updateMainUI(JSON.parse(cachedData)); } catch(e){}
  } else {
    getEl("characterList").innerHTML = `<div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>`;
    getEl("myScheduleList").innerHTML = `<div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>`;
  }
  
  if (cachedNotice !== null) {
    renderNotice(cachedNotice);
  } else {
    getEl("noticeContainer").style.display = "block";
    getEl("noticeText").innerHTML = `
      <div class="skeleton-list" style="gap: 6px;">
        <div class="skeleton-block" style="height: 16px; width: 100%; border-radius: 4px;"></div>
        <div class="skeleton-block" style="height: 16px; width: 80%; border-radius: 4px;"></div>
        <div class="skeleton-block" style="height: 16px; width: 40%; border-radius: 4px;"></div>
      </div>
    `;
  }

  // 백그라운드에서 서버의 최신 데이터(메인 정보 + 공지사항)를 동시에 가져옴
  const [data, noticeRes] = await Promise.all([
    callApi({ action: "getMainData", accountId, hideAlert: true, background: true }),
    callApi({ action: "getNotice", hideAlert: true, background: true })
  ]);

  if (!data.success && !cachedData) {
    return;
  }

  if (data.success) {
    sessionStorage.setItem(cacheKey, JSON.stringify(data.data));
    updateMainUI(data.data);
  }
  if (noticeRes.success) {
    sessionStorage.setItem('cache_notice', noticeRes.data.notice);
    renderNotice(noticeRes.data.notice);
  }
}

let currentNoticeText = ""; // 💡 수정 중 취소할 때를 대비한 백업 변수

// 공지사항 렌더링 및 관리자 버튼 처리
function renderNotice(text) {
  currentNoticeText = text;
  const container = getEl("noticeContainer");
  const textEl = getEl("noticeText");
  const editBtn = getEl("editNoticeBtn");
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";

  if (text || isAdmin) {
    container.style.display = "block";
    textEl.innerHTML = text ? escapeHtml(text).replace(/\n/g, "<br>") : "<span style='opacity:0.5; font-size:13px;'>등록된 공지사항이 없습니다.</span>";
  } else {
    container.style.display = "none";
  }

  if (isAdmin) {
    editBtn.style.display = "inline-flex";
    editBtn.innerHTML = "✏️";
    editBtn.onclick = () => startEditNotice();
  }
}

// 💡 공지사항 인라인 수정 (관리자 전용)
function startEditNotice() {
  const textEl = getEl("noticeText");
  const editBtn = getEl("editNoticeBtn");
  
  editBtn.style.display = "none"; // 수정 중 연필 아이콘 숨김
  
  // 박스를 텍스트 에디터로 즉시 변환
  textEl.innerHTML = `
    <textarea id="noticeEditInput" class="main-input" style="width: 100%; min-height: 80px; padding: 10px 12px; font-size: 14px; margin-bottom: 8px; resize: vertical; line-height: 1.5; background: rgba(0,0,0,0.2);">${currentNoticeText || ""}</textarea>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button class="mini-btn" onclick="cancelEditNotice()">취소</button>
      <button class="mini-btn" id="saveNoticeBtn" style="background: var(--blue-1); color: #fff; border: none;" onclick="saveInlineNotice()">저장</button>
    </div>
  `;
  getEl("noticeEditInput").focus();
}

function cancelEditNotice() {
  renderNotice(currentNoticeText); // 원래 상태로 렌더링 복구
}

async function saveInlineNotice() {
  const newText = getEl("noticeEditInput").value;
  const btn = getEl("saveNoticeBtn");
  btn.disabled = true;
  btn.textContent = "저장 중...";

  const res = await callApi({
    action: "saveNotice",
    adminCode: getAdminCode(),
    notice: newText
  });
  
  if (res.success) {
    sessionStorage.removeItem("cache_notice"); // 캐시 삭제 후 리렌더링
    renderNotice(newText);
  } else {
    btn.disabled = false;
    btn.textContent = "저장";
  }
}

// UI 업데이트 로직 분리
function updateMainUI(data) {
  setText("accountMainName", data.mainName || "계정 없음");
  setText("characterCount", data.characters?.length || 0);
  setText("selectedCount", (data.selectedCount || 0) + "개");
  
  // 등록된 캐릭터 중 '본캐'가 있는지 확인
  hasMainCharacter = data.characters?.some(c => c.type === CHARACTER_TYPES.MAIN);

  characters = data.characters || [];
  renderCharacters(characters);
  renderMySchedules(data.summary);
  applyTouchPop();
}

// 캐릭터 편집 모달 열기
function openEditModal(characterName) {
  const charData = characters.find(c => c.character_name === characterName);
  if (!charData) return;
  editCharacter(charData);
}

// 캐릭터 목록 그리기 (전투력 구간 반영 + 삭제 버튼)
function renderCharacters(items) {
  const list = getEl("characterList");
  if (!items || items.length === 0) {
    list.innerHTML = `<div style="padding: 28px 16px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 14px; margin-bottom: 8px;"><div style="font-size: 24px; margin-bottom: 8px; opacity: 0.8;">📭</div><div style="font-size: 14px; font-weight: 600; color: var(--text-main);">등록된 캐릭터가 없습니다.</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">우측 상단의 [추가] 버튼을 눌러주세요.</div></div>`;
    return;
  }

  // 데이터 규격 일치 확인
  list.innerHTML = items.map(c => {
    // c.type, c.className 등이 정확히 입력되어야 색상이 나옵니다.
    const isMainChar = (c.type === '본캐');
    const pRange = getPowerRange(c.power);
    const mainIcon = isMainChar ? '<span style="color:var(--gold-1); margin-right:4px; font-size:14px; text-shadow: 0 0 8px rgba(246,211,122,0.4);">⭐️</span>' : '';
    
    return `
      <div class="character-card touch-pop" style="cursor: pointer;" onclick="openCharacterActionSheet('${escapeHtml(c.character_name)}', ${isMainChar})">
        
        <div class="character-left">
          <div class="character-name">${mainIcon}${escapeHtml(c.character_name)}</div>
          <div class="character-sub">
            <span class="chip chip-class ${escapeHtml(c.className)}">${escapeHtml(c.className)}</span>
            <div class="character-power" style="margin-left: 4px;">${pRange}</div>
          </div>
        </div>
        
        <div class="character-right">
          <button class="icon-btn" style="border:none; background:transparent; font-size:18px; color:var(--text-sub); pointer-events:none;" title="더보기">⋯</button>
          <div style="color: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>

      </div>
    `;
  }).join("");

  // 애니메이션 효과 적용
  applyTouchPop();
}

// 내 레이드 일정 그리기
function renderMySchedules(summary) {
  const list = getEl("myScheduleList");
  if (!list) return;

  // 💡 오늘 날짜 기준(YYYY-MM-DD) 생성
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 💡 내 캐릭터이면서, 동시에 오늘 날짜(todayStr) 이후의 일정만 필터링 (과거 일정 숨김)
  const myItems = (summary || []).filter(s => String(s.account_id).trim() === getAccountId() && s.date >= todayStr);

  if (myItems.length === 0) {
    list.innerHTML = `<div style="padding: 28px 16px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 14px; margin-bottom: 8px;"><div style="font-size: 24px; margin-bottom: 8px; opacity: 0.8;">📅</div><div style="font-size: 14px; font-weight: 600; color: var(--text-main);">예정된 레이드 일정이 없습니다.</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">우측 상단의 [일정 관리]를 눌러 신청해주세요.</div></div>`;
    return;
  }

  // 날짜순, 시간순 정렬
  myItems.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time_slot.localeCompare(b.time_slot);
  });

  let html = "";
  let currentDate = null;

  myItems.forEach(i => {
    const shortDate = i.date && i.date.length >= 10 ? i.date.substring(5).replace('-', '.') : i.date;
    const totalParticipants = summary.filter(s => s.date === i.date && s.time_slot === i.time_slot).length;

    // 💡 [프롬프트 반영 1&2] 날짜 기준으로 그룹화하여 Sticky Header 스타일의 섹션 추가
    if (currentDate !== i.date) {
      currentDate = i.date;
      html += `
        <div style="position: sticky; top: -16px; z-index: 10; background: rgba(14, 28, 44, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 12px 4px 8px; margin-top: 8px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-sub); letter-spacing: -0.02em;">🗓️ ${shortDate} (${escapeHtml(i.day)})</span>
        </div>
      `;
    }

    // 💡 [프롬프트 반영] 정보 밀집도 강화, 메모 영역 추가, 폰트/아이콘 계층화 (Tight & Compact)
    html += `
      <div class="character-card touch-pop" style="cursor: pointer; padding: 12px 14px; margin-bottom: 8px; border: none; background: rgba(255, 255, 255, 0.03);" onclick="goToParty('${escapeHtml(i.day)}', '${escapeHtml(i.time_slot)}')">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
            <div style="font-size:18px; font-weight:800; color:var(--text-main); font-variant-numeric:tabular-nums; display:flex; align-items:center; gap:4px; flex-shrink: 0;">
              <span style="font-size:14px; opacity:0.8;">🕒</span>${escapeHtml(i.time_slot)}
            </div>
            <div style="font-size:13px; font-weight:600; color:var(--text-sub); display:flex; align-items:center; gap:4px; flex-shrink: 0;">
              <span style="font-size:12px; opacity:0.8;">👤</span><span style="color:var(--cyan-2); font-weight:700;">${escapeHtml(i.character_name)}</span>
            </div>
            ${i.note ? `
            <div style="font-size:12px; font-weight:500; padding: 3px 8px; border-radius: 6px; display: flex; align-items: center; gap: 4px; transition: all 0.3s ease; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${
              totalParticipants >= 8 
                ? 'background: rgba(16, 185, 129, 0.15); color: #a7f3d0; box-shadow: inset 0 0 8px rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);' 
                : 'background: rgba(0,0,0,0.2); color: var(--text-muted); border: 1px solid transparent;'
            }">
               <span style="font-size:10px; opacity:0.8; flex-shrink: 0;">${totalParticipants >= 8 ? '✅' : '📝'}</span> 
               <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(i.note)}</span>
            </div>
            ` : ''}
          </div>
          <div style="font-size:12px; font-weight:800; color:${totalParticipants >= 8 ? 'var(--green-1)' : 'var(--cyan-1)'}; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 8px; letter-spacing: -0.02em; flex-shrink: 0;">
            👥 ${totalParticipants}명
          </div>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

window.goToParty = function(day, time) {
  sessionStorage.setItem('autoOpenPartyDay', day);
  sessionStorage.setItem('autoOpenPartyTime', time);
  movePage('party.html');
};

// Action Sheet 열기/닫기
window.openCharacterActionSheet = function(charName, isMainChar) {
  selectedCharNameForAction = charName;
  getEl("actionSheetCharName").textContent = charName;
  
  const deleteBtn = getEl("actionSheetDeleteBtn");
  const toggleBtn = getEl("actionSheetToggleBtn");
  
  if(isMainChar) {
    deleteBtn.style.display = "none";
    toggleBtn.innerHTML = "⇄ 본캐 지정 해제";
  } else {
    deleteBtn.style.display = "block";
    toggleBtn.innerHTML = "⇄ 본캐로 전환";
  }
  
  getEl("characterActionSheet").classList.add("show");
  document.body.classList.add("modal-open");
};

window.closeCharacterActionSheet = function() {
  getEl("characterActionSheet").classList.remove("show");
  document.body.classList.remove("modal-open");
};

// 모달 열기 로직 개선
getEl("addCharacterButton").addEventListener("click", async () => {
    const nameInput = getEl("modalCharacterName");
    const typeInput = getEl("modalCharacterType");
    const powerInput = getEl("modalCharacterPower");
    const chipMain = getEl("chipTypeMain");
    const chipSub = getEl("chipTypeSub");

    if (!hasMainCharacter) {
        // 본캐가 없는 경우: 로그인한 닉네임 고정, 타입 '본캐' 고정
        const mainName = getMainName();
        nameInput.value = mainName || "";
        nameInput.readOnly = true; // 수정 불가
        typeInput.value = CHARACTER_TYPES.MAIN;
        if (chipMain) { chipMain.classList.add("selected"); chipMain.disabled = false; }
        if (chipSub) { chipSub.classList.remove("selected"); chipSub.disabled = true; }
        powerInput.disabled = false;
        await uiAlert("최초 1회 본캐 정보를 먼저 등록해야 합니다.");
    } else {
        // 본캐가 있는 경우: 부캐 입력 모드
        nameInput.value = "";
        nameInput.readOnly = false;
        typeInput.value = CHARACTER_TYPES.SUB;
        if (chipSub) { chipSub.classList.add("selected"); chipSub.disabled = false; }
        if (chipMain) { chipMain.classList.remove("selected"); chipMain.disabled = true; }
        powerInput.disabled = false;
    }

    getEl("characterModal").classList.add("show");
    document.body.classList.add("modal-open");
});

// 캐릭터 등록 실행
getEl("submitCharacterButton").onclick = () => submitCharacter();

// 버튼 처리 중 상태 관리 (캐릭터 등록 시)
async function submitCharacter() {
  const btn = getEl("submitCharacterButton");
  const originalText = btn.textContent;
  
  // 처리 중 UI 고정
  btn.disabled = true;
  btn.textContent = "처리 중...";
  btn.style.opacity = "0.6";

  const name = getEl("modalCharacterName").value.trim();
  const className = getEl("modalCharacterClass").value;
  const type = getEl("modalCharacterType").value;
  const power = getEl("modalCharacterPower").value;

  if(!name || !className) {
    // 버튼 복구
    btn.disabled = false;
    btn.textContent = originalText;
    btn.style.opacity = "1";
    await uiAlert("이름과 클래스를 입력해주세요.");
    return;
  }
  
  const modal = getEl("characterModal");
  const isEditMode = modal.dataset.mode === "edit";
  const originalName = modal.dataset.originalName;

  // 입력 값 검증
  if (type === "본캐" && !hasMainCharacter) {
    // 본캐 등록 시 입력한 이름이 로그인 이름과 같은지 확인
    if (name !== getMainName()) {
      // 버튼 복구
      btn.disabled = false;
      btn.textContent = originalText;
      btn.style.opacity = "1";
      await uiAlert(`본캐 이름은 '${getMainName()}'과(와) 같아야 합니다.`);
      return;
    }
  }

  const apiAction = isEditMode ? "updateCharacter" : "addCharacter";
  const apiParams = {
    action: apiAction,
    accountId: getAccountId(),
    name, className, type, power
  };

  if (isEditMode) {
    apiParams.originalName = originalName;
  }

  const res = await callApi(apiParams);

  // 완료 후 복구
  btn.disabled = false;
  btn.textContent = originalText;
  btn.style.opacity = "1";

  if(res.success) {
    sessionStorage.removeItem(`cache_main_${getAccountId()}`); // 💡 캐시 날리기
    closeModal(); // 모달 닫기 및 입력창 완전 초기화
    setTimeout(loadMain, 400); // 구글 시트 저장 대기 후 리스트 새로고침
  } else {
    await uiAlert(res.message || "처리에 실패했습니다.");
  }
}

// 캐릭터 삭제 확인 함수
async function confirmDelete(characterName) {
  if (!(await uiConfirm(`'${characterName}' 캐릭터를 삭제하시겠습니까?`))) return;

  // 1. 해당 캐릭터 카드 요소 찾기
  const cards = document.querySelectorAll(".character-card");
  let targetCard = null;
  cards.forEach(card => {
    if (card.querySelector(".character-name").textContent === characterName) {
      targetCard = card;
    }
  });

  // 2. 애니메이션 적용
  if (targetCard) {
    targetCard.classList.add("removing");
  }

  // 3. 애니메이션 시간(0.4초) 대기 후 실제 삭제 API 호출
  setTimeout(async () => {
    const res = await callApi({
      action: "deleteCharacter",
      accountId: getAccountId(),
      characterName: characterName
    });

    if (res.success) {
      sessionStorage.removeItem(`cache_main_${getAccountId()}`); // 💡 캐시 날리기
      setTimeout(loadMain, 300); // 삭제 처리 후 대기 및 새로고침
    } else {
      await uiAlert(res.message || "캐릭터 삭제에 실패했습니다.");
      if (targetCard) targetCard.classList.remove("removing"); // 실패 시 복구
    }
  }, 400);
}

// 캐릭터 편집 함수
function editCharacter(charData) {
    // 모달 열기
    const nameInput = getEl("modalCharacterName");
    const typeInput = getEl("modalCharacterType");
    const powerInput = getEl("modalCharacterPower");

    // 기존 데이터 채우기
    nameInput.value = charData.character_name;
    typeInput.value = charData.type;
    powerInput.value = charData.power;
    
    getEl("modalCharacterClass").value = charData.className;
    document.querySelectorAll(`[data-target="modalCharacterClass"] .chip-btn`).forEach(b => {
        b.classList.toggle("selected", b.dataset.value === charData.className);
    });
    
    document.querySelectorAll(`[data-target="modalCharacterPower"] .chip-btn`).forEach(b => {
        b.classList.toggle("selected", b.dataset.value == charData.power);
    });

    // 편집 모드 표시
    getEl("characterModal").dataset.mode = "edit";
    getEl("characterModal").dataset.originalName = charData.character_name;
    getEl("modalTitle").textContent = "캐릭터 편집";
    getEl("submitCharacterButton").textContent = "수정하기";

    // 본캐 편집 제한
    const isMainChar = charData.type === "본캐";
    nameInput.readOnly = isMainChar; // 본캐는 이름 변경 불가
    
    const chipMain = getEl("chipTypeMain");
    const chipSub = getEl("chipTypeSub");
    if (chipMain && chipSub) {
        chipMain.classList.toggle("selected", isMainChar);
        chipSub.classList.toggle("selected", !isMainChar);
        chipMain.disabled = true;
        chipSub.disabled = true;
    }

    getEl("characterModal").classList.add("show");
    document.body.classList.add("modal-open");
}

// 캐릭터 타입 전환 함수 (본캐↔부캐)
async function toggleCharacterType(characterName) {
    // 현재 캐릭터 상태 확인
    const targetChar = characters.find(c => c.character_name === characterName);
    if (!targetChar) return;

    const isCurrentlySub = targetChar.type === "부캐";
    
    // 전문적인 경고 메시지 구성
    let confirmMsg = "";
    if (isCurrentlySub) {
        confirmMsg = `[ ${characterName} ] 캐릭터를 '본캐'로 지정하시겠습니까?\n\n⚠️ 시스템 안내: 본캐 지정 시 로그인 아이디가 변경되며, 다음 접속부터는  ${characterName} 로 로그인하셔야 합니다.`;
    } else {
        confirmMsg = `[ ${characterName} ] 캐릭터의 '본캐' 지정을 해제하시겠습니까?\n\n⚠️ 경고: 정상적인 레기온 관리를 위해 1개의 본캐가 필수로 요구됩니다. 해제 후 다른 캐릭터를 본캐로 지정해 주세요.`;
    }

    if (!(await uiConfirm(confirmMsg))) return;

    const res = await callApi({
        action: "toggleCharacterType",
        accountId: getAccountId(),
        characterName: characterName
    });

    if (res.success) {
        // 본캐로 성공적 전환 시 브라우저 내부 로그인 세션(URL 파라미터 방어) 동기화
        if (res.data?.newType === "본캐") {
            sessionStorage.setItem("mainName", characterName);
            if (localStorage.getItem("autoMainName")) localStorage.setItem("autoMainName", characterName);
        }
        await uiAlert(`'${characterName}' 캐릭터 설정이 변경되었습니다.`);
        sessionStorage.removeItem(`cache_main_${getAccountId()}`); // 💡 캐시 날리기
        setTimeout(loadMain, 300); // 타입 변경 후 대기 및 새로고침
    } else {
        await uiAlert(res.message || "타입 변경에 실패했습니다.");
    }
}

function closeModal() {
    getEl("characterModal").classList.remove("show");
    document.body.classList.remove("modal-open");
    // 모드 초기화
    getEl("characterModal").dataset.mode = "";
    getEl("characterModal").dataset.originalName = "";
    getEl("modalTitle").textContent = "캐릭터 추가";
    getEl("submitCharacterButton").textContent = "등록하기";
    // 입력 필드 초기화
    getEl("modalCharacterName").value = "";
    getEl("modalCharacterType").value = "부캐";
    getEl("modalCharacterClass").value = "검성";
    getEl("modalCharacterPower").value = "400";
    // 필드 잠금 해제
    getEl("modalCharacterName").readOnly = false;
    
    // 칩 초기화
    document.querySelectorAll(`[data-target="modalCharacterClass"] .chip-btn`).forEach(b => {
        b.classList.toggle("selected", b.dataset.value === "검성");
    });
    document.querySelectorAll(`[data-target="modalCharacterPower"] .chip-btn`).forEach(b => {
        b.classList.toggle("selected", b.dataset.value === "400");
    });
    const chipMain = getEl("chipTypeMain");
    const chipSub = getEl("chipTypeSub");
    if (chipMain && chipSub) {
        chipMain.classList.remove("selected");
        chipSub.classList.add("selected");
        chipMain.disabled = false;
        chipSub.disabled = false;
    }
}

getEl("closeCharacterModalButton").onclick = closeModal;
getEl("cancelCharacterButton").onclick = closeModal;

// 칩 버튼 클릭 이벤트 위임
document.querySelectorAll('.chip-select-group').forEach(group => {
    group.addEventListener('click', e => {
        const btn = e.target.closest('.chip-btn');
        if (!btn || btn.disabled) return;
        
        group.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        const hiddenId = group.dataset.target;
        if (hiddenId) getEl(hiddenId).value = btn.dataset.value;
    });
});

// =========================
// 설정 메뉴 (Action Sheet) 제어
// =========================
const settingsSheet = getEl("settingsActionSheet");
getEl("openSettingsBtn").onclick = () => {
  settingsSheet.classList.add("show");
  document.body.classList.add("modal-open");
};
window.closeSettingsActionSheet = function() {
  settingsSheet.classList.remove("show");
  document.body.classList.remove("modal-open");
};

getEl("logoutBtn").onclick = () => {
    // 로그아웃 시 sessionStorage 정리
    sessionStorage.clear();
    // 자동 로그인 정보도 해제
    localStorage.removeItem("autoAccountId");
    localStorage.removeItem("autoMainName");
    localStorage.removeItem("autoIsAdmin");
    localStorage.removeItem("autoAdminCode");
    location.href = "index.html";
};

// 일반 유저 비밀번호 변경
const changePwdBtn = getEl("changePwdBtn");
if (changePwdBtn) {
  changePwdBtn.onclick = async () => {
    closeSettingsActionSheet(); // 모달 닫고 알림창 띄우기
    const oldPwd = await uiPrompt("현재 비밀번호 4자리를 입력해주세요."); if (!oldPwd) return;
    const newPwd = await uiPrompt("새롭게 설정할 비밀번호 4자리를 입력해주세요."); if (!newPwd) return;
    if (oldPwd === newPwd) { await uiAlert("기존 비밀번호와 동일합니다."); return; }
    const res = await callApi({ action: "changePassword", accountId: getAccountId(), oldPassword: oldPwd, newPassword: newPwd });
    if (res.success) await uiAlert(res.message); // 에러는 api.js가 띄우므로 성공 시에만 띄움
  };
}

// =========================
// 관리자 권한 버튼 노출 로직
// =========================
const isAdmin = sessionStorage.getItem("isAdmin") === "true";
if (isAdmin) {
  const adminBtn = getEl("goAdminBtn");
  if (adminBtn) {
    adminBtn.style.display = "block";
    adminBtn.onclick = () => movePage("admin.html"); // 비밀번호 입력 없이 다이렉트 이동
  }
}

// =========================
// 관리자 이스터에그 (3번 연속 터치)
// =========================
let adminClickCount = 0;
let adminClickTimer = null;

const adminSecretBtn = getEl("adminSecretBtn");
if (adminSecretBtn) {
  adminSecretBtn.addEventListener("click", async () => {
    adminClickCount++;
    clearTimeout(adminClickTimer);
    // 1초 내에 이어서 누르지 않으면 횟수 초기화
    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 1000);
    
    if (adminClickCount >= 3) {
      adminClickCount = 0;
      const code = await uiPrompt("마스터 계정으로 전환합니다. 관리자 코드를 입력하세요.");
      if (!code) return;

      const res = await callApi({ action: "adminLogin", adminCode: code });
      if (res.success) {
        sessionStorage.setItem("isAdmin", "true");
        sessionStorage.setItem("adminCode", code);
        location.href = `./admin.html?mainName=${encodeURIComponent('👑 마스터')}&accountId=MASTER_ADMIN`;
      }
    }
  });
}

loadMain();