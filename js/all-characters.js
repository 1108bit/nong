let allCharacters = [];
let sortState = {
  column: 'power',
  asc: false // 💡 기본 정렬: 전투력 내림차순(가장 높은 사람이 위로)
};

async function loadAllCharacters() {
  const target = getEl("allCharactersTableContainer");
  
  // 💡 [UX 향상] 데이터를 불러오는 동안 테이블 형태의 스켈레톤(고스팅) UI 표시
  target.innerHTML = `
    <div class="table-wrapper" style="pointer-events: none;">
      <table class="char-table">
        <thead style="opacity: 0.5;">
          <tr>
            <th>본캐명 <span class="sort-icon">↕</span></th>
            <th>캐릭터명 <span class="sort-icon">↕</span></th>
            <th>클래스 <span class="sort-icon">↕</span></th>
            <th>타입 <span class="sort-icon">↕</span></th>
            <th>전투력 <span class="sort-icon">↕</span></th>
          </tr>
        </thead>
        <tbody>
          ${Array(6).fill(`
            <tr>
              <td><div class="skeleton-block" style="width: 50px; height: 18px; border-radius: 4px; display: inline-block; vertical-align: middle;"></div></td>
              <td><div class="skeleton-block" style="width: 70px; height: 18px; border-radius: 4px; display: inline-block; vertical-align: middle;"></div></td>
              <td><div class="skeleton-block" style="width: 50px; height: 26px; border-radius: 12px; display: inline-block; vertical-align: middle;"></div></td>
              <td><div class="skeleton-block" style="width: 40px; height: 26px; border-radius: 12px; display: inline-block; vertical-align: middle;"></div></td>
              <td><div class="skeleton-block" style="width: 60px; height: 18px; border-radius: 4px; display: inline-block; vertical-align: middle;"></div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  const res = await callApi({ action: "getAllCharacters" });
  
  if (!res.success) {
    target.innerHTML = `<div class="character-empty">데이터를 불러올 수 없습니다.</div>`;
    return;
  }
  
  allCharacters = res.data.items || [];
  applySort(); // 💡 데이터 로드 직후 바로 정렬 적용
}

function applySort() {
  allCharacters.sort((a, b) => {
    let valA = a[sortState.column];
    let valB = b[sortState.column];
    
    // 💡 전투력(power)은 문자가 아닌 '숫자'로 변환해서 완벽하게 대소 비교
    if (sortState.column === 'power') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortState.asc ? valA - valB : valB - valA;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return sortState.asc ? -1 : 1;
    if (valA > valB) return sortState.asc ? 1 : -1;
    return 0;
  });
  
  renderTable();
}

function sortData(column) {
  if (sortState.column === column) {
    sortState.asc = !sortState.asc; // 누를 때마다 오름차순/내림차순 토글
  } else {
    sortState.column = column;
    sortState.asc = column !== 'power'; // 💡 전투력 탭을 처음 누르면 무조건 내림차순, 나머지는 오름차순 시작
  }
  
  applySort();
}

window.goToUserManage = function(mainName) {
  if (sessionStorage.getItem("isAdmin") === "true") {
    sessionStorage.setItem("autoSearchUser", mainName);
    movePage("admin.html");
  }
};

function renderTable() {
  const target = getEl("allCharactersTableContainer");
  
  // 💡 체크박스 상태를 확인하고 '본캐'만 필터링하는 로직 추가
  const isMainOnly = getEl("filterMainCharCheck")?.checked;
  const searchKeyword = getEl("searchInput")?.value.trim().toLowerCase() || "";

  let displayList = allCharacters;
  
  if (isMainOnly) {
    displayList = displayList.filter(c => c.type === '본캐');
  }

  if (searchKeyword) {
    displayList = displayList.filter(c => 
      c.mainName.toLowerCase().includes(searchKeyword) ||
      c.name.toLowerCase().includes(searchKeyword) ||
      c.className.toLowerCase().includes(searchKeyword)
    );
  }

  if (displayList.length === 0) {
    target.innerHTML = `<div class="character-empty">검색된 캐릭터가 없습니다.</div>`;
    return;
  }
  
  const getSortIcon = (col) => {
    if (sortState.column !== col) return '<span class="sort-icon">↕</span>';
    return sortState.asc ? '<span class="sort-icon active">▲</span>' : '<span class="sort-icon active">▼</span>';
  };
  
  let html = `
    <div class="table-wrapper" id="charTableScrollBox">
      <table class="char-table">
        <thead>
          <tr>
            <th onclick="sortData('mainName')">본캐명 ${getSortIcon('mainName')}</th>
            <th onclick="sortData('name')">캐릭터명 ${getSortIcon('name')}</th>
            <th onclick="sortData('className')">클래스 ${getSortIcon('className')}</th>
            <th onclick="sortData('type')">타입 ${getSortIcon('type')}</th>
            <th onclick="sortData('power')">전투력 ${getSortIcon('power')}</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";
  
  html += displayList.map(c => {
    const classNameEscaped = escapeHtml(c.className);
    const isMainChar = c.type === '본캐';
    const mainIcon = isMainChar ? '<span style="color:var(--gold-1); margin-right:4px; font-size:14px; text-shadow: 0 0 8px rgba(246,211,122,0.4);">⭐️</span>' : '';
    const rowClick = isAdmin ? `onclick="goToUserManage('${escapeHtml(c.mainName)}')" style="cursor: pointer;" title="클릭하여 유저 정보 수정"` : '';

    return `
      <tr ${rowClick}>
        <td style="font-weight: 600;">${escapeHtml(c.mainName)}</td>
        <td style="font-weight: 500; color: var(--text-main);">${mainIcon}${escapeHtml(c.name)}</td>
        <td><span class="chip chip-class ${classNameEscaped}">${classNameEscaped}</span></td>
        <td><span class="chip chip-type ${isMainChar ? 'main' : 'sub'}">${escapeHtml(c.type)}</span></td>
        <td style="font-weight: 700; color: var(--cyan-2); font-variant-numeric: tabular-nums;">${getPowerRange(c.power)}</td>
      </tr>
    `;
  }).join("");
  
  html += `
        </tbody>
      </table>
    </div>
    <div class="scroll-indicator" id="charTableScrollInd" style="margin-top: 16px; margin-bottom: 8px; width: 80px;">
      <div class="scroll-indicator-dot"></div>
    </div>
  `;
  
  target.innerHTML = html;

  // 💡 테이블 렌더링 후 커스텀 스크롤 인디케이터 연결
  setTimeout(() => {
    if (typeof setupAppleScroll === 'function') {
      setupAppleScroll('charTableScrollBox', 'charTableScrollInd');
    }
  }, 50);
}

// 💡 필터 조건 변경 시 테이블 리렌더링
const filterCheck = getEl("filterMainCharCheck");
if (filterCheck) {
  filterCheck.addEventListener("change", renderTable);
}

const searchInput = getEl("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", renderTable);
}

getEl("backButton").onclick = () => movePage("main.html");
loadAllCharacters();