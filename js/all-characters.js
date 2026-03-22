let allCharacters = [];
let sortState = {
  column: 'mainName',
  asc: true
};

async function loadAllCharacters() {
  const res = await callApi({ action: "getAllCharacters" });
  getEl("pageMessage").style.display = "none";
  
  if (!res.ok) {
    getEl("allCharactersTableContainer").innerHTML = `<div class="character-empty">데이터를 불러올 수 없습니다.</div>`;
    return;
  }
  
  allCharacters = res.items || [];
  renderTable();
}

function sortData(column) {
  if (sortState.column === column) {
    sortState.asc = !sortState.asc; // 누를 때마다 오름차순/내림차순 토글
  } else {
    sortState.column = column;
    sortState.asc = true;
  }
  
  allCharacters.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return sortState.asc ? -1 : 1;
    if (valA > valB) return sortState.asc ? 1 : -1;
    return 0;
  });
  
  renderTable();
}

function renderTable() {
  const target = getEl("allCharactersTableContainer");
  
  if (allCharacters.length === 0) {
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
  
  html += allCharacters.map(c => {
    const classNameEscaped = escapeHtml(c.className);
    const isMainChar = c.type === '본캐';
    return `
      <tr>
        <td style="font-weight: 800;">${escapeHtml(c.mainName)}</td>
        <td style="font-weight: 700; color: var(--text-main);">${escapeHtml(c.name)}</td>
        <td><span class="chip chip-class ${classNameEscaped}">${classNameEscaped}</span></td>
        <td><span class="chip chip-type ${isMainChar ? 'main' : 'sub'}">${escapeHtml(c.type)}</span></td>
        <td style="font-weight: 900; color: var(--cyan-2);">${getPowerRange(c.power)}</td>
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

getEl("backButton").onclick = () => movePage("main.html");
loadAllCharacters();