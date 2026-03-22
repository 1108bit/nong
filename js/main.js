async function loadMain() {
  const accountId = getAccountId();
  if (!accountId) return location.href = "index.html";

  const data = await callApi({ action: "getMainData", accountId });
  if (!data.ok) return;

  // 상단 정보 세팅
  setText("accountMainName", data.mainName || getMainName());
  setText("characterCount", data.characters?.length || 0);
  setText("selectedCount", `${data.selectedCount || 0}개`);
  
  // 캐릭터 카드 출력
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

// 모달 제어
const modal = getEl("characterModal");
getEl("addCharacterButton").onclick = () => {
    modal.classList.add("show");
    document.body.classList.add("modal-open");
};
getEl("closeCharacterModalButton").onclick = closeModal;
getEl("cancelCharacterButton").onclick = closeModal;

function closeModal() {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
}

getEl("submitCharacterButton").onclick = async () => {
    const name = getEl("modalCharacterName").value.trim();
    const className = getEl("modalCharacterClass").value;
    if(!name || !className) return alert("이름과 클래스를 입력해주세요.");

    const res = await callApi({
        action: "addCharacter",
        accountId: getAccountId(),
        name, className,
        type: getEl("modalCharacterType").value,
        power: getEl("modalCharacterPower").value
    });
    if(res.ok) { closeModal(); loadMain(); }
};

// 버튼 연결
getEl("goAvailabilityButton").onclick = () => movePage("availability.html");
getEl("goPartyButton").onclick = () => movePage("party.html");
getEl("logoutButton").onclick = () => location.href = "index.html";

loadMain();