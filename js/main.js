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

  const list = getEl("characterList");
  if (!data.characters?.length) {
    list.innerHTML = `<div class="character-empty">등록된 캐릭터가 없습니다</div>`;
  } else {
    list.innerHTML = data.characters.map(c => `
      <div class="character-card">
        <div class="character-left">
          <div class="character-name">${escapeHtml(c.character_name)}</div>
          <div class="character-sub">
            <span class="chip chip-class">${escapeHtml(c.class)}</span>
            <span class="chip chip-type">${escapeHtml(c.type)}</span>
          </div>
        </div>
        <div class="character-right">
          <div class="character-power">${Number(c.power).toLocaleString()}</div>
          <div class="character-state ${c.use_yn === 'Y' ? 'on' : 'off'}">${c.use_yn === 'Y' ? '사용중' : '미사용'}</div>
        </div>
      </div>
    `).join("");
  }
  applyTouchPop();
}

// 모달 열기 로직 개선
getEl("addCharacterButton").onclick = () => {
    const nameInput = getEl("modalCharacterName");
    const typeSelect = getEl("modalCharacterType");

    if (!hasMainCharacter) {
        // 본캐가 없는 경우: 로그인한 닉네임 고정, 타입 '본캐' 고정
        nameInput.value = LOGIN_MAIN_NAME;
        nameInput.readOnly = true; // 수정 불가
        typeSelect.value = "본캐";
        typeSelect.disabled = true; // 선택 불가
        alert("최초 1회 본캐 정보를 먼저 등록해야 합니다.");
    } else {
        // 본캐가 있는 경우: 부캐 입력 모드
        nameInput.value = "";
        nameInput.readOnly = false;
        typeSelect.value = "부캐";
        typeSelect.disabled = false;
        
        // 부캐 추가 시 '본캐' 선택 못하게 옵션 숨기기 (선택 사항)
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
        alert(res.message);
    }
};

function closeModal() {
    getEl("characterModal").classList.remove("show");
    document.body.classList.remove("modal-open");
}

getEl("closeCharacterModalButton").onclick = closeModal;
getEl("cancelCharacterButton").onclick = closeModal;

// 버튼 연결
getEl("goAvailabilityButton").onclick = () => movePage("availability.html");
getEl("goPartyButton").onclick = () => movePage("party.html");
getEl("logoutButton").onclick = () => location.href = "index.html";

loadMain();