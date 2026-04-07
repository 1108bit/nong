/************************************************
 * 3. 캐릭터 관리 (CHARACTERS)
 ************************************************/

function getCharacters(accountIdOrMainName) {
  const query = normalizeCompareValue(accountIdOrMainName);
  if (!query) return { ok: false, message: '검색어가 없습니다.', items: [] };
  if (query === normalizeCompareValue('MASTER_ADMIN')) {
    return { ok: true, items: [], adminYn: 'Y', targetAccountId: 'MASTER_ADMIN', mainName: '👑 마스터' };
  }

  const rows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);
  const accRows = getRowsAsObjects(SHEET_NAMES.ACCOUNTS);
  
  let acc = accRows.find(r => normalizeCompareValue(r.account_id) === query) || accRows.find(r => normalizeCompareValue(r.main_name) === query);
  if (!acc) return { ok: false, message: '유저를 찾을 수 없습니다.', items: [] };

  const items = rows
    .filter(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(acc.account_id))
    .filter(row => normalizeValue(row.use_yn).toUpperCase() !== 'N')
    .map(row => ({
      characterId: row.character_id || '', name: row.name || '',
      className: row.class_name || '', type: row.type || '',
      power: row.power || '', useYn: row.use_yn || 'Y'
    }));

  return { ok: true, items, adminYn: normalizeValue(acc.admin_yn).toUpperCase() === 'Y' ? 'Y' : 'N', targetAccountId: acc.account_id, mainName: acc.main_name };
}

function getAllCharacters() {
  const charRows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);
  const accRows = getRowsAsObjects(SHEET_NAMES.ACCOUNTS);
  const accMap = {};
  accRows.forEach(acc => { accMap[normalizeCompareValue(acc.account_id)] = acc.main_name || ''; });

  const items = charRows
    .filter(row => normalizeValue(row.use_yn).toUpperCase() !== 'N')
    .map(row => ({
      characterId: row.character_id || '', accountId: row.account_id || '',
      mainName: accMap[normalizeCompareValue(row.account_id)] || '알수없음',
      name: row.name || '', className: row.class_name || '',
      type: row.type || '', power: Number(row.power || 0)
    }));

  return { ok: true, items };
}

function addCharacter(e) {
  const accountId = normalizeValue(e.parameter.accountId);
  const name = normalizeValue(e.parameter.name);
  const className = normalizeValue(e.parameter.className || e.parameter.class);
  const type = normalizeValue(e.parameter.type) || '부캐';
  const power = normalizeValue(e.parameter.power);
  const reqCharId = normalizeValue(e.parameter.characterId); // 💡 [신규] 프론트엔드가 전달한 다이렉트 ID

  if (!accountId) return { ok: false, message: 'accountId가 없습니다.' };
  if (!name) return { ok: false, message: '캐릭터명이 없습니다.' };

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(accountId) &&
        normalizeCompareValue(values[i][headers.indexOf('name')]) === normalizeCompareValue(name) &&
        normalizeValue(values[i][headers.indexOf('use_yn')]).toUpperCase() !== 'N') {
      return { ok: false, message: '이미 등록된 캐릭터입니다.' };
    }
  }

  const row = new Array(headers.length).fill('');
  if (headers.indexOf('character_id') > -1) row[headers.indexOf('character_id')] = reqCharId ? reqCharId : 'CHAR_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  if (headers.indexOf('account_id') > -1) row[headers.indexOf('account_id')] = accountId;
  if (headers.indexOf('name') > -1) row[headers.indexOf('name')] = name;
  if (headers.indexOf('class_name') > -1) row[headers.indexOf('class_name')] = className;
  if (headers.indexOf('type') > -1) row[headers.indexOf('type')] = type;
  if (headers.indexOf('power') > -1) row[headers.indexOf('power')] = power;
  if (headers.indexOf('use_yn') > -1) row[headers.indexOf('use_yn')] = 'Y';
  if (headers.indexOf('created_at') > -1) row[headers.indexOf('created_at')] = nowText();
  if (headers.indexOf('updated_at') > -1) row[headers.indexOf('updated_at')] = nowText();

  sheet.appendRow(row);
  SpreadsheetApp.flush();
  return { ok: true, message: '등록되었습니다.' };
}

function deleteCharacter(accountId, characterName) {
  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  for (let i = values.length - 1; i >= 1; i--) {
    if (normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(accountId) &&
        normalizeCompareValue(values[i][headers.indexOf('name')]) === normalizeCompareValue(characterName)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { ok: true, message: '삭제되었습니다.' };
    }
  }
  return { ok: false, message: '삭제할 캐릭터를 찾을 수 없습니다.' };
}

function toggleCharacterType(accountId, characterName) {
  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(accountId) &&
        normalizeCompareValue(values[i][headers.indexOf('name')]) === normalizeCompareValue(characterName)) {
      
      const newType = normalizeValue(values[i][headers.indexOf('type')]) === '본캐' ? '부캐' : '본캐';
      if (headers.indexOf('type') > -1) sheet.getRange(i + 1, headers.indexOf('type') + 1).setValue(newType);
      if (headers.indexOf('updated_at') > -1) sheet.getRange(i + 1, headers.indexOf('updated_at') + 1).setValue(nowText());

      if (newType === '본캐') updateAccountMainName(accountId, characterName);
      SpreadsheetApp.flush();
      return { ok: true, message: '타입이 변경되었습니다.', newType };
    }
  }
  return { ok: false, message: '변경할 캐릭터를 찾을 수 없습니다.' };
}

function updateCharacter(e) {
  const accountId = normalizeValue(e.parameter.accountId);
  const originalName = normalizeValue(e.parameter.originalName);
  const name = normalizeValue(e.parameter.name);
  const className = normalizeValue(e.parameter.className || e.parameter.class);
  const type = normalizeValue(e.parameter.type);
  const power = normalizeValue(e.parameter.power);
  const reqCharId = normalizeValue(e.parameter.characterId); // 💡 [신규]

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(accountId) &&
        normalizeCompareValue(values[i][headers.indexOf('name')]) === normalizeCompareValue(originalName)) {
      
      if (headers.indexOf('name') > -1) sheet.getRange(i + 1, headers.indexOf('name') + 1).setValue(name);
      if (headers.indexOf('class_name') > -1) sheet.getRange(i + 1, headers.indexOf('class_name') + 1).setValue(className);
      if (headers.indexOf('type') > -1) sheet.getRange(i + 1, headers.indexOf('type') + 1).setValue(type);
      if (headers.indexOf('power') > -1) sheet.getRange(i + 1, headers.indexOf('power') + 1).setValue(power);
      if (headers.indexOf('updated_at') > -1) sheet.getRange(i + 1, headers.indexOf('updated_at') + 1).setValue(nowText());
      if (reqCharId && headers.indexOf('character_id') > -1) sheet.getRange(i + 1, headers.indexOf('character_id') + 1).setValue(reqCharId); // 💡 갱신 시 ID 박제

      if (type === '본캐') updateAccountMainName(accountId, name);
      SpreadsheetApp.flush();
      return { ok: true, message: '수정되었습니다.' };
    }
  }
  return { ok: false, message: '수정할 캐릭터를 찾을 수 없습니다.' };
}

function updateCharacterByAdmin(e) {
  validateAdminCode(e.parameter.adminCode);
  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(e.parameter.targetAccountId) &&
        normalizeCompareValue(values[i][headers.indexOf('name')]) === normalizeCompareValue(e.parameter.originalName)) {
      updateCharacter({ parameter: { accountId: e.parameter.targetAccountId, originalName: e.parameter.originalName, name: e.parameter.newName, className: e.parameter.newClass, type: e.parameter.newType, power: e.parameter.newPower } });
      return { ok: true, message: '관리자 권한으로 수정되었습니다.' };
    }
  }
  return { ok: false, message: '캐릭터를 찾을 수 없습니다.' };
}