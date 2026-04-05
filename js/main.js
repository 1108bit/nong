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

  const list = getEl("characterList");
  // 데이터를 가져오기 전 가짜 카드를 보여줌
  list.innerHTML = `
    <div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>
    <div class="skeleton-block skeleton-card" style="margin-bottom:10px;"></div>
  `;

  const data = await callApi({ action: "getMainData", accountId });
  if (!data.ok) {
    list.innerHTML = `<div class="character-empty" style="color: #fda4af;">에러: ${data.message || "데이터를 불러올 수 없습니다."}</div>`;
    return;
  }

  setText("accountMainName", data.mainName || "계정 없음");
  setText("characterCount", data.characters?.length || 0);
  setText("selectedCount", (data.selectedCount || 0) + "개");
  
  // 등록된 캐릭터 중 '본캐'가 있는지 확인
  hasMainCharacter = data.characters?.some(c => c.type === CHARACTER_TYPES.MAIN);

  characters = data.characters || [];
  renderCharacters(characters);
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
    list.innerHTML = `<div class="character-empty">📭 등록된 캐릭터가 없습니다.<br><span style="font-size:12px; opacity:0.7;">우측 상단의 [추가] 버튼을 눌러보세요!</span></div>`;
    return;
  }

  // 데이터 규격 일치 확인
  list.innerHTML = items.map(c => {
    // c.type, c.className 등이 정확히 입력되어야 색상이 나옵니다.
    const isMainChar = (c.type === '본캐');
    const pRange = getPowerRange(c.power);
    const mainIcon = isMainChar ? '<span style="color:var(--gold-1); margin-right:4px; font-size:14px; text-shadow: 0 0 8px rgba(246,211,122,0.4);">⭐️</span>' : '';
    
    return `
      <div class="character-card">
        
        <div class="character-left">
          <div class="character-name">${mainIcon}${escapeHtml(c.character_name)}</div>
          <div class="character-sub">
            <span class="chip chip-class ${escapeHtml(c.className)}">${escapeHtml(c.className)}</span>
            <div class="character-power" style="margin-left: 4px;">${pRange}</div>
          </div>
        </div>
        
        <div class="character-right">
          <button class="icon-btn" style="border:none; background:transparent; font-size:18px; color:var(--text-sub);" title="더보기" onclick="openCharacterActionSheet('${escapeHtml(c.character_name)}', ${isMainChar})">⋯</button>
        </div>

      </div>
    `;
  }).join("");

  // 애니메이션 효과 적용
  applyTouchPop();
}

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
getEl("addCharacterButton").addEventListener("click", () => {
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
        alert("최초 1회 본캐 정보를 먼저 등록해야 합니다.");
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
    return alert("이름과 클래스를 입력해주세요.");
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
      alert(`본캐 이름은 '${getMainName()}'과(와) 같아야 합니다.`);
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

  if(res.ok) {
    closeModal(); // 모달 닫기 및 입력창 완전 초기화
    setTimeout(loadMain, 400); // 구글 시트 저장 대기 후 리스트 새로고침
  } else {
    alert(res.message || "처리에 실패했습니다.");
  }
}

// 캐릭터 삭제 확인 함수
async function confirmDelete(characterName) {
  if (!confirm(`'${characterName}' 캐릭터를 삭제하시겠습니까?`)) return;

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

    if (res.ok) {
      setTimeout(loadMain, 300); // 삭제 처리 후 대기 및 새로고침
    } else {
      alert(res.message || "캐릭터 삭제에 실패했습니다.");
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

    if (!confirm(confirmMsg)) return;

    const res = await callApi({
        action: "toggleCharacterType",
        accountId: getAccountId(),
        characterName: characterName
    });

    if (res.ok) {
        // 본캐로 성공적 전환 시 브라우저 내부 로그인 세션(URL 파라미터 방어) 동기화
        if (res.newType === "본캐") {
            sessionStorage.setItem("mainName", characterName);
            if (localStorage.getItem("autoMainName")) localStorage.setItem("autoMainName", characterName);
        }
        alert(`'${characterName}' 캐릭터가 ${res.newType}로 설정되었습니다.`);
        setTimeout(loadMain, 300); // 타입 변경 후 대기 및 새로고침
    } else {
        alert(res.message || "타입 변경에 실패했습니다.");
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

// 버튼 연결
if(getEl("goAvailabilityButton")) getEl("goAvailabilityButton").onclick = () => movePage("availability.html");
if(getEl("goPartyButton")) getEl("goPartyButton").onclick = () => movePage("party.html");
getEl("goAllCharactersButton").onclick = () => movePage("all-characters.html");
getEl("logoutButton").onclick = () => {
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
const changePwdBtn = getEl("changePwdButton");
if (changePwdBtn) {
  changePwdBtn.onclick = async () => {
    const oldPwd = prompt("현재 비밀번호 4자리를 입력해주세요."); if (!oldPwd) return;
    const newPwd = prompt("새롭게 설정할 비밀번호 4자리를 입력해주세요."); if (!newPwd) return;
    if (oldPwd === newPwd) return alert("기존 비밀번호와 동일합니다.");
    const res = await callApi({ action: "changePassword", accountId: getAccountId(), oldPassword: oldPwd, newPassword: newPwd });
    alert(res.message);
  };
}

// 하단 액션 바 버튼 연결
const bottomAddBtn = getEl("bottomAddBtn");
if (bottomAddBtn) {
    bottomAddBtn.onclick = () => getEl("addCharacterButton").click();
}

// =========================
// 관리자 권한 버튼 노출 로직
// =========================
const isAdmin = sessionStorage.getItem("isAdmin") === "true";
if (isAdmin) {
  const adminBtn = getEl("goAdminButton");
  if (adminBtn) {
    adminBtn.style.display = "flex";
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
      const code = prompt("마스터 계정으로 전환합니다. 관리자 코드를 입력하세요.");
      if (!code) return;

      const res = await callApi({ action: "adminLogin", adminCode: code });
      if (res.ok) {
        sessionStorage.setItem("isAdmin", "true");
        sessionStorage.setItem("adminCode", code);
        location.href = `./admin.html?mainName=${encodeURIComponent('👑 마스터')}&accountId=MASTER_ADMIN`;
      } else {
        alert("관리자 코드가 일치하지 않습니다.");
      }
    }
  });
}

loadMain();