// js/main.js
let hasMainCharacter = false; // 현재 본캐 등록 여부

async function loadMain() {
  const accountId = getAccountId();
  if (!accountId) return location.href = "index.html";

  const data = await callApi({ action: "getMainData", accountId });
  if (!data.ok) return;

  setText("accountMainName", data.mainName || LOGIN_MAIN_NAME);
  setText("characterCount", data.characters?.length || 0);
  
  // 등록된 캐릭터 중 '본캐'가 있는지 확인
  hasMainCharacter = data.characters?.some(c => c.type === "본캐");

  renderCharacters(data.characters || []);
  applyTouchPop();
}

// 캐릭터 목록 그리기 (전투력 구간 반영 + 삭제 버튼)
function renderCharacters(items) {
  const list = getEl("characterList");
  if (!items || items.length === 0) {
    list.innerHTML = `<div class="character-empty">등록된 캐릭터가 없습니다</div>`;
    return;
  }

  list.innerHTML = items.map((c, idx) => {
    const powerValue = Number(c.power) || 0;
    const powerRange = getPowerRange(powerValue); // 구간 계산 호출
    const isMainChar = c.type === "본캐";

    return `
      <div class="character-card" data-char-index="${idx}">
        <div class="character-left">
          <div class="character-name">${escapeHtml(c.character_name || c.name)}</div>
          <div class="character-sub">
            <span class="chip chip-class">${escapeHtml(c.class || c.className)}</span>
            <span class="chip chip-type">${escapeHtml(c.type)}</span>
          </div>
        </div>
        <div class="character-right">
          <div class="character-power">${powerRange}</div> 
          <div class="character-state ${c.use_yn === 'Y' ? 'on' : 'off'}">
            ${c.use_yn === 'Y' ? '사용중' : '미사용'}
          </div>
          <button class="character-delete-btn" data-char-name="${escapeHtml(c.character_name || c.name)}" data-is-main="${isMainChar}" title="캐릭터 삭제">✕</button>
        </div>
      </div>
    `;
  }).join("");
  
  // 삭제 버튼 이벤트 리스너 추가
  document.querySelectorAll(".character-delete-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const charName = btn.dataset.charName;
      const isMain = btn.dataset.isMain === "true";
      if (isMain) {
        alert("본캐는 삭제할 수 없습니다.");
        return;
      }
      if (confirm(`'${charName}' 캐릭터를 삭제하시겠습니까?`)) {
        deleteCharacter(charName);
      }
    };
  });
}

// 모달 열기 로직 개선
getEl("addCharacterButton").onclick = () => {
    const nameInput = getEl("modalCharacterName");
    const typeSelect = getEl("modalCharacterType");
    const classSelect = getEl("modalCharacterClass");
    const powerInput = getEl("modalCharacterPower");

    if (!hasMainCharacter) {
        // 본캐가 없는 경우: 로그인한 닉네임 고정, 타입 '본캐' 고정
        const mainName = getMainName();
        nameInput.value = mainName || "";
        nameInput.readOnly = true; // 수정 불가
        typeSelect.value = "본캐";
        typeSelect.disabled = true; // 선택 불가
        classSelect.disabled = false;
        powerInput.disabled = false;
        alert("최초 1회 본캐 정보를 먼저 등록해야 합니다.");
    } else {
        // 본캐가 있는 경우: 부캐 입력 모드
        nameInput.value = "";
        nameInput.readOnly = false;
        typeSelect.value = "부캐";
        typeSelect.disabled = false;
        classSelect.disabled = false;
        powerInput.disabled = false;
        
        // 부캐 추가 시 '본캐' 선택 못하게 옵션 비활성화
        Array.from(typeSelect.options).forEach(opt => {
            if(opt.value === "본캐") opt.disabled = true;
        });
    }

    getEl("characterModal").classList.add("show");
    document.body.classList.add("modal-open");
};

// 캐릭터 등록 실행
getEl("submitCharacterButton").onclick = async () => {
    const name = getEl("modalCharacterName").value.trim();
    const className = getEl("modalCharacterClass").value;
    const type = getEl("modalCharacterType").value;
    const power = getEl("modalCharacterPower").value;

    if(!name || !className) return alert("이름과 클래스를 입력해주세요.");
    
    // 입력 값 검증
    if (type === "본캐" && !hasMainCharacter) {
        // 본캐 등록 시 입력한 이름이 로그인 이름과 같은지 확인
        if (name !== getMainName()) {
            alert(`본캐 이름은 '${getMainName()}'과(와) 같아야 합니다.`);
            return;
        }
    }

    const res = await callApi({
        action: "addCharacter",
        accountId: getAccountId(),
        name, className, type, power
    });

    if(res.ok) {
        getEl("characterModal").classList.remove("show");
        document.body.classList.remove("modal-open");
        loadMain();
    } else {
        alert(res.message || "캐릭터 등록에 실패했습니다.");
    }
};

// 캐릭터 삭제 함수
async function deleteCharacter(characterName) {
    const res = await callApi({
        action: "deleteCharacter",
        accountId: getAccountId(),
        characterName: characterName
    });

    if (res.ok) {
        alert(`'${characterName}' 캐릭터가 삭제되었습니다.`);
        loadMain();
    } else {
        alert(res.message || "캐릭터 삭제에 실패했습니다.");
    }
}

function closeModal() {
    getEl("characterModal").classList.remove("show");
    document.body.classList.remove("modal-open");
}

getEl("closeCharacterModalButton").onclick = closeModal;
getEl("cancelCharacterButton").onclick = closeModal;

// 버튼 연결
getEl("goAvailabilityButton").onclick = () => movePage("availability.html");
getEl("goPartyButton").onclick = () => movePage("party.html");
getEl("logoutButton").onclick = () => {
    // 로그아웃 시 sessionStorage 정리
    sessionStorage.clear();
    location.href = "index.html";
};

// 하단 액션 바 버튼 연결
const bottomAddBtn = getEl("bottomAddBtn");
if (bottomAddBtn) {
    bottomAddBtn.onclick = () => getEl("addCharacterButton").click();
}

loadMain();