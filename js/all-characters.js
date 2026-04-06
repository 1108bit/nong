let allCharacters = [];
let sortState = {
  column: 'power',
  asc: false // 💡 기본 정렬: 전투력 내림차순(가장 높은 사람이 위로)
};

async function loadAllCharacters() {
  const target = getEl("allCharactersTableContainer");
  
  // 💡 [UX 향상] 데이터를 불러오는 동안 테이블 형태의 스켈레톤(고스팅) UI 표시
  target.innerHTML = `
    <div class="skeleton-list" style="margin-top: 12px;">
      <div class="skeleton-block" style="height: 52px; border-radius: 12px;"></div>
      <div class="skeleton-block" style="height: 52px; border-radius: 12px;"></div>
      <div class="skeleton-block" style="height: 52px; border-radius: 12px;"></div>
      <div class="skeleton-block" style="height: 52px; border-radius: 12px;"></div>
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

function renderTable() {
  const target = getEl("allCharactersTableContainer");
  
  // 💡 체크박스 상태를 확인하고 '본캐'만 필터링하는 로직 추가
  const isMainOnly = getEl("filterMainCharCheck")?.checked;
  let displayList = allCharacters;
  if (isMainOnly) {
    displayList = displayList.filter(c => c.type === '본캐');
  }

  if (displayList.length === 0) {
    target.innerHTML = `<div class="character-empty">등록된 캐릭터가 없습니다.</div>`;
    return;
  }
  
  const getSortIcon = (col) => {
    if (sortState.column !== col) return '<span class="sort-icon">↕</span>';
    return sortState.asc ? '<span class="sort-icon active">▲</span>' : '<span class="sort-icon active">▼</span>';
  };
  
  let html = `
    <div class="table-wrapper">
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
  
  html += displayList.map(c => {
    const classNameEscaped = escapeHtml(c.className);
    const isMainChar = c.type === '본캐';
    const mainIcon = isMainChar ? '<span style="color:var(--gold-1); margin-right:4px; font-size:14px; text-shadow: 0 0 8px rgba(246,211,122,0.4);">⭐️</span>' : '';
    return `
      <tr>
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
  `;
  
  target.innerHTML = html;
}

// 💡 체크박스를 클릭할 때마다 테이블을 다시 그리도록 이벤트 연결
const filterCheck = getEl("filterMainCharCheck");
if (filterCheck) {
  filterCheck.addEventListener("change", renderTable);
}

getEl("backButton").onclick = () => movePage("main.html");
loadAllCharacters();