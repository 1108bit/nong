// js/main.js
let hasMainCharacter = false; // 현재 본캐 등록 여부

async function loadMain() {
  const accountId = getAccountId();
  if (!accountId) return location.href = "index.html";

  const data = await callApi({ action: "getMainData", accountId });
  if (!data.ok) return;

  setText("accountMainName", data.mainName || "계정 없음");
  setText("characterCount", data.characters?.length || 0);
  setText("selectedCount", (data.selectedCount || 0) + "개");
  
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
          <div class="character-name">${escapeHtml(c.character_name)}</div>
          <div class="character-sub">
            <span class="chip chip-class ${escapeHtml(c.className)}">${escapeHtml(c.className)}</span>
            <span class="chip chip-type">${escapeHtml(c.type)}</span>
          </div>
        </div>
        <div class="character-right">
          <div class="character-power">${powerRange}</div> 
          <div class="character-state ${c.use_yn === 'Y' ? 'on' : 'off'}">
            ${c.use_yn === 'Y' ? '사용중' : '미사용'}
          </div>
          ${!isMainChar ? `<button class="character-delete-btn" data-char-name="${escapeHtml(c.character_name)}" data-is-main="${isMainChar}" title="캐릭터 삭제">✕</button>` : ''}
          <button class="character-edit-btn" data-char-name="${escapeHtml(c.character_name)}" data-char-data='${JSON.stringify(c)}' title="캐릭터 편집">✏️</button>
          <button class="character-toggle-btn" data-char-name="${escapeHtml(c.character_name)}" data-current-type="${escapeHtml(c.type)}" title="타입 전환">🔄</button>
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

  // 편집 버튼 이벤트 리스너 추가
  document.querySelectorAll(".character-edit-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const charData = JSON.parse(btn.dataset.charData);
      editCharacter(charData);
    };
  });

  // 타입 전환 버튼 이벤트 리스너 추가
  document.querySelectorAll(".character-toggle-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const charName = btn.dataset.charName;
      const currentType = btn.dataset.currentType;
      const newType = currentType === "본캐" ? "부캐" : "본캐";
      if (confirm(`'${charName}' 캐릭터를 ${newType}로 변경하시겠습니까?`)) {
        toggleCharacterType(charName);
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
    
    const modal = getEl("characterModal");
    const isEditMode = modal.dataset.mode === "edit";
    const originalName = modal.dataset.originalName;

    // 입력 값 검증
    if (type === "본캐" && !hasMainCharacter) {
        // 본캐 등록 시 입력한 이름이 로그인 이름과 같은지 확인
        if (name !== getMainName()) {
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

    if(res.ok) {
        getEl("characterModal").classList.remove("show");
        document.body.classList.remove("modal-open");
        // 모드 초기화
        getEl("characterModal").dataset.mode = "";
        getEl("characterModal").dataset.originalName = "";
        getEl("modalTitle").textContent = "캐릭터 추가";
        getEl("submitCharacterButton").textContent = "등록하기";
        loadMain();
    } else {
        alert(res.message || "처리에 실패했습니다.");
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

// 캐릭터 편집 함수
function editCharacter(charData) {
    // 모달 열기
    const nameInput = getEl("modalCharacterName");
    const typeSelect = getEl("modalCharacterType");
    const classSelect = getEl("modalCharacterClass");
    const powerSelect = getEl("modalCharacterPower");

    // 기존 데이터 채우기
    nameInput.value = charData.character_name;
    typeSelect.value = charData.type;
    classSelect.value = charData.className;
    powerSelect.value = charData.power;

    // 편집 모드 표시
    getEl("characterModal").dataset.mode = "edit";
    getEl("characterModal").dataset.originalName = charData.character_name;
    getEl("modalTitle").textContent = "캐릭터 편집";
    getEl("submitCharacterButton").textContent = "수정하기";

    // 본캐 편집 제한
    const isMainChar = charData.type === "본캐";
    nameInput.readOnly = isMainChar; // 본캐는 이름 변경 불가
    typeSelect.disabled = isMainChar; // 본캐는 타입 변경 불가

    getEl("characterModal").classList.add("show");
    document.body.classList.add("modal-open");
}

// 캐릭터 타입 전환 함수 (본캐↔부캐)
async function toggleCharacterType(characterName) {
    const res = await callApi({
        action: "toggleCharacterType",
        accountId: getAccountId(),
        characterName: characterName
    });

    if (res.ok) {
        alert(`'${characterName}' 캐릭터 타입이 변경되었습니다.`);
        loadMain();
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
    getEl("modalCharacterType").disabled = false;
}

getEl("closeCharacterModalButton").onclick = closeModal;
getEl("cancelCharacterButton").onclick = closeModal;
    getEl("modalCharacterPower").onchange = (e) => {
        const power = Number(e.target.value);
        const rangeText = getPowerRange(power);

        let hintEl = document.querySelector('.modal-power-hint');
        if (!hintEl) {
            hintEl = document.createElement('div');
            hintEl.className = 'modal-power-hint';
            hintEl.style.fontSize = '12px';
            hintEl.style.color = 'var(--text-sub)';
            hintEl.style.marginTop = '4px';
            getEl('modalCharacterPower').parentElement.appendChild(hintEl);
        }

        hintEl.textContent = `전투력 구간: ${rangeText}`;
    };
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