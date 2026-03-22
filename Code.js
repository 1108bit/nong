/************************************************
 * NoStepBack Apps Script
 ************************************************/

const SPREADSHEET_ID = '1_6VXRksoes1RwVwUWWfML-fdAWDz6wTQ1xoYaVdoM0o';

const SHEET_NAMES = {
  ACCOUNTS: 'ACCOUNTS',
  CHARACTERS: 'CHARACTERS',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  SETTINGS: 'SETTINGS',
  RAID_SCHEDULE: 'RAID_SCHEDULE',
  AVAILABILITY: 'AVAILABILITY'
};

/************************************************
 * 상수
 ************************************************/
const ROLE = {
  HEALER: '치유성',
  TANK: '수호성',
  DPS_MELEE: '검성',
  DPS_RANGE: '살성',
  ARCHER: '궁성',
  MAGE: '마도성',
  SPIRIT: '정령성',
  BUFFER: '호법성'
};

const PARTY_SIZE = 4;
const WEEKS_START_DAY = 3; // 수요일

/************************************************
 * 공통
 ************************************************/
function outputJson(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(sheetName + ' 시트를 찾지 못했습니다.');
  }
  return sheet;
}

function getColumnMap(headers) {
  return headers.reduce((map, header, index) => {
    map[String(header).trim()] = index;
    return map;
  }, {});
}

function getRowsAsObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(v => String(v).trim());

  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeCompareValue(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd');
  }
  return String(value || '').trim();
}

function formatDateTime(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value || '').trim();
}

function formatTime(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, 'Asia/Seoul', 'HH:mm');
  }
  const str = String(value || '').trim();
  if (str.includes('T')) {
      const match = str.match(/T(\d{2}:\d{2})/);
      if(match) return match[1];
  }
  return str;
}

function nowText() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

function isUseYes(value) {
  return normalizeValue(value).toUpperCase() === 'Y';
}

/************************************************
 * TEXT / IMAGE / SETTINGS
 ************************************************/
function getKeyValueMap(sheetName) {
  const rows = getRowsAsObjects(sheetName);
  const result = {};

  rows.forEach(row => {
    const key = normalizeValue(row.key);
    if (!key) return;
    result[key] = row.value || row.url || '';
  });

  return result;
}

function getImageMap() {
  const rows = getRowsAsObjects(SHEET_NAMES.IMAGE);
  const result = {};

  rows.forEach(row => {
    const key = normalizeValue(row.key);
    if (!key) return;
    result[key] = {
      url: row.url || ''
    };
  });

  return result;
}

/**
 * SETTINGS 탭 스키마 정의(SCHEMA_*)에 따라 시트 헤더 유효성 검사
 */
function validateDatabaseSchema() {
  const settings = getKeyValueMap(SHEET_NAMES.SETTINGS);
  const report = [];

  const targetSheets = {
    'ACCOUNTS': settings.SCHEMA_ACCOUNTS,
    'CHARACTERS': settings.SCHEMA_CHARACTERS,
    'AVAILABILITY': settings.SCHEMA_AVAILABILITY
  };

  for (const [sheetName, schemaText] of Object.entries(targetSheets)) {
    if (!schemaText) continue;

    const requiredHeaders = schemaText.split(',').map(s => s.trim()).filter(Boolean);
    const sheet = getSheet(sheetName);
    const values = sheet.getDataRange().getValues();

    if (!values || !values.length) {
      report.push(`[${sheetName}] 시트가 비어있습니다.`);
      continue;
    }

    const actualHeaders = values[0].map(v => String(v || '').trim());
    const missing = requiredHeaders.filter(h => actualHeaders.indexOf(h) === -1);

    if (missing.length > 0) {
      report.push(`[${sheetName}] 누락 항목: ${missing.join(', ')}`);
    }
  }

  return {
    ok: true,
    isValid: report.length === 0,
    errors: report
  };
}

function handleInit() {
  return {
    ok: true,
    text: getKeyValueMap(SHEET_NAMES.TEXT),
    image: getImageMap()
  };
}

/************************************************
 * ACCOUNTS
 ************************************************/
function login(mainName, password) {
  mainName = normalizeValue(mainName);
  password = normalizeValue(password);

  if (!mainName) {
    return {
      ok: false,
      message: '본캐명을 입력해주세요.'
    };
  }
  if (!password) return { ok: false, message: '비밀번호를 입력해주세요.' };


  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return createAccount(sheet, mainName, password);
  }

  const headers = values[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const useYnCol = headers.indexOf('use_yn');
  const createdAtCol = headers.indexOf('created_at');
  const adminYnCol = headers.indexOf('admin_yn');
  const passwordCol = headers.indexOf('password');

  if (accountIdCol === -1 || mainNameCol === -1) {
    throw new Error('ACCOUNTS 헤더를 확인해주세요.');
  }

  for (let i = 1; i < values.length; i++) {
    const rowMainName = normalizeValue(values[i][mainNameCol]);
    const rowUseYn = useYnCol > -1 ? normalizeValue(values[i][useYnCol]).toUpperCase() : 'Y';
    const rowAdminYn = adminYnCol > -1 ? normalizeValue(values[i][adminYnCol]).toUpperCase() : 'N';
    const rowPassword = passwordCol > -1 ? normalizeValue(values[i][passwordCol]) : '';

    if (rowMainName !== mainName) continue;

    if (rowUseYn === 'N') {
      return {
        ok: false,
        message: '사용할 수 없는 계정입니다.'
      };
    }
    
    // 비밀번호 검증 로직
    if (passwordCol > -1) {
      if (rowPassword && rowPassword !== password) {
        return { ok: false, message: '비밀번호가 일치하지 않습니다.' };
      }
      // 기존 유저인데 비밀번호가 등록되어 있지 않은 경우, 이번에 입력한 값으로 초기 세팅
      if (!rowPassword) {
        sheet.getRange(i + 1, passwordCol + 1).setValue(password);
      }
    }

    let response = {
      ok: true,
      accountId: values[i][accountIdCol],
      mainName: rowMainName,
      isAdmin: rowAdminYn === 'Y'
    };

    if (rowAdminYn === 'Y') {
      const settings = getKeyValueMap(SHEET_NAMES.SETTINGS);
      response.adminCode = settings.ADMIN_CODE || '';
    }

    return response;
  }

  return createAccount(sheet, mainName, password);
}

function createAccount(sheet, mainName, password) {
  const headers = sheet.getDataRange().getValues()[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const useYnCol = headers.indexOf('use_yn');
  const createdAtCol = headers.indexOf('created_at');
  const adminYnCol = headers.indexOf('admin_yn');
  const passwordCol = headers.indexOf('password');

  const row = new Array(headers.length).fill('');
  const accountId = 'ACC_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const createdAt = nowText();

  if (accountIdCol > -1) row[accountIdCol] = accountId;
  if (mainNameCol > -1) row[mainNameCol] = mainName;
  if (useYnCol > -1) row[useYnCol] = 'Y';
  if (adminYnCol > -1) row[adminYnCol] = 'N';
  if (passwordCol > -1) row[passwordCol] = password;
  if (createdAtCol > -1) row[createdAtCol] = createdAt;

  sheet.appendRow(row);
  SpreadsheetApp.flush(); // 즉시 시트에 기록 반영

  return {
    ok: true,
    accountId,
    mainName
  };
}

/************************************************
 * CHARACTERS
 ************************************************/
function getCharacters(accountIdOrMainName) {
  const query = normalizeCompareValue(accountIdOrMainName);

  if (!query) {
    return {
      ok: false,
      message: '검색어가 없습니다.',
      items: []
    };
  }

  if (query === normalizeCompareValue('MASTER_ADMIN')) {
    return { ok: true, items: [], adminYn: 'Y', targetAccountId: 'MASTER_ADMIN', mainName: '👑 마스터' };
  }

  const rows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);
  const accRows = getRowsAsObjects(SHEET_NAMES.ACCOUNTS);
  
  let acc = accRows.find(r => normalizeCompareValue(r.account_id) === query);
  if (!acc) acc = accRows.find(r => normalizeCompareValue(r.main_name) === query);

  if (!acc) return { ok: false, message: '유저를 찾을 수 없습니다.', items: [] };

  const targetAccountId = acc.account_id;
  const mainName = acc.main_name;
  const adminYn = acc.admin_yn ? (normalizeValue(acc.admin_yn).toUpperCase() === 'Y' ? 'Y' : 'N') : 'N';

  const items = rows
    .filter(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(targetAccountId))
    .filter(row => {
      const useYn = normalizeValue(row.use_yn).toUpperCase();
      return !useYn || useYn === 'Y';
    })
    .map(row => ({
      characterId: row.character_id || '',
      name: row.name || '',
      className: row.class_name || '',
      type: row.type || '',
      power: row.power || '',
      useYn: row.use_yn || 'Y'
    }));

  return {
    ok: true,
    items,
    adminYn,
    targetAccountId,
    mainName
  };
}

function getAllCharacters() {
  const charRows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);
  const accRows = getRowsAsObjects(SHEET_NAMES.ACCOUNTS);

  const accMap = {};
  accRows.forEach(acc => {
    accMap[normalizeCompareValue(acc.account_id)] = acc.main_name || '';
  });

  const items = charRows
    .filter(row => {
      const useYn = normalizeValue(row.use_yn).toUpperCase();
      return !useYn || useYn === 'Y';
    })
    .map(row => ({
      characterId: row.character_id || '',
      accountId: row.account_id || '',
      mainName: accMap[normalizeCompareValue(row.account_id)] || '알수없음',
      name: row.name || '',
      className: row.class_name || '',
      type: row.type || '',
      power: Number(row.power || 0)
    }));

  return { ok: true, items };
}

function addCharacter(e) {
  const accountId = normalizeValue(e.parameter.accountId);
  const name = normalizeValue(e.parameter.name);
  const className = normalizeValue(e.parameter.className || e.parameter.class);
  const type = normalizeValue(e.parameter.type);
  const power = normalizeValue(e.parameter.power);

  if (!accountId) {
    return { ok: false, message: 'accountId가 없습니다.' };
  }

  if (!name) {
    return { ok: false, message: '캐릭터명이 없습니다.' };
  }

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const nameCol = headers.indexOf('name');
  const useYnCol = headers.indexOf('use_yn');

  for (let i = 1; i < values.length; i++) {
    const rowAccountId = normalizeCompareValue(values[i][accountIdCol]);
    const rowName = normalizeCompareValue(values[i][nameCol]);
    const rowUseYn = useYnCol > -1 ? normalizeValue(values[i][useYnCol]).toUpperCase() : 'Y';

    if (rowAccountId === normalizeCompareValue(accountId) &&
        rowName === normalizeCompareValue(name) &&
        rowUseYn !== 'N') {
      return {
        ok: false,
        message: '이미 등록된 캐릭터입니다.'
      };
    }
  }

  const characterId = 'CHAR_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const createdAt = nowText();
  const updatedAt = nowText();

  const row = new Array(headers.length).fill('');

  const characterIdCol = headers.indexOf('character_id');
  const classNameCol = headers.indexOf('class_name');
  const typeCol = headers.indexOf('type');
  const powerCol = headers.indexOf('power');
  const createdAtCol = headers.indexOf('created_at');
  const updatedAtCol = headers.indexOf('updated_at');

  if (characterIdCol > -1) row[characterIdCol] = characterId;
  if (accountIdCol > -1) row[accountIdCol] = accountId;
  if (nameCol > -1) row[nameCol] = name;
  if (classNameCol > -1) row[classNameCol] = className;
  if (typeCol > -1) row[typeCol] = type || '부캐';
  if (powerCol > -1) row[powerCol] = power || '';
  if (useYnCol > -1) row[useYnCol] = 'Y';
  if (createdAtCol > -1) row[createdAtCol] = createdAt;
  if (updatedAtCol > -1) row[updatedAtCol] = updatedAt;

  sheet.appendRow(row);
  SpreadsheetApp.flush(); // 즉시 시트에 기록 반영

  return {
    ok: true,
    message: '등록되었습니다.'
  };
}

function deleteCharacter(accountId, characterName) {
  accountId = normalizeValue(accountId);
  characterName = normalizeValue(characterName);

  if (!accountId) {
    return { ok: false, message: 'accountId가 없습니다.' };
  }

  if (!characterName) {
    return { ok: false, message: '캐릭터명이 없습니다.' };
  }

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());
  const accountIdCol = headers.indexOf('account_id');
  const nameCol = headers.indexOf('name');


  for (let i = values.length - 1; i >= 1; i--) {
    const rowAccountId = normalizeCompareValue(values[i][accountIdCol]);
    const rowName = normalizeCompareValue(values[i][nameCol]);

    if (rowAccountId === normalizeCompareValue(accountId) &&
        rowName === normalizeCompareValue(characterName)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return {
        ok: true,
        message: '삭제되었습니다.'
      };
    }
  }

  return {
    ok: false,
    message: '삭제할 캐릭터를 찾을 수 없습니다.'
  };
}

function toggleCharacterType(accountId, characterName) {
  accountId = normalizeValue(accountId);
  characterName = normalizeValue(characterName);

  if (!accountId) {
    return { ok: false, message: 'accountId가 없습니다.' };
  }

  if (!characterName) {
    return { ok: false, message: '캐릭터명이 없습니다.' };
  }

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const nameCol = headers.indexOf('name');
  const typeCol = headers.indexOf('type');
  const updatedAtCol = headers.indexOf('updated_at');

  for (let i = 1; i < values.length; i++) {
    const rowAccountId = normalizeCompareValue(values[i][accountIdCol]);
    const rowName = normalizeCompareValue(values[i][nameCol]);

    if (rowAccountId === normalizeCompareValue(accountId) &&
        rowName === normalizeCompareValue(characterName)) {
      
      const currentType = normalizeValue(values[i][typeCol]);
      const newType = currentType === '본캐' ? '부캐' : '본캐';
      const updatedAt = nowText();

      if (typeCol > -1) sheet.getRange(i + 1, typeCol + 1).setValue(newType);
      if (updatedAtCol > -1) sheet.getRange(i + 1, updatedAtCol + 1).setValue(updatedAt);

      // 본캐로 변경되면 계정의 main_name도 업데이트
      if (newType === '본캐') {
        updateAccountMainName(accountId, characterName);
      }
      SpreadsheetApp.flush();

      return {
        ok: true,
        message: '타입이 변경되었습니다.',
        newType: newType
      };
    }
  }

  return {
    ok: false,
    message: '변경할 캐릭터를 찾을 수 없습니다.'
  };
}

function updateCharacter(e) {
  const accountId = normalizeValue(e.parameter.accountId);
  const originalName = normalizeValue(e.parameter.originalName);
  const name = normalizeValue(e.parameter.name);
  const className = normalizeValue(e.parameter.className || e.parameter.class);
  const type = normalizeValue(e.parameter.type);
  const power = normalizeValue(e.parameter.power);

  if (!accountId) {
    return { ok: false, message: 'accountId가 없습니다.' };
  }

  if (!originalName) {
    return { ok: false, message: '원본 캐릭터명이 없습니다.' };
  }

  if (!name) {
    return { ok: false, message: '캐릭터명이 없습니다.' };
  }

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const nameCol = headers.indexOf('name');
  const classNameCol = headers.indexOf('class_name');
  const typeCol = headers.indexOf('type');
  const powerCol = headers.indexOf('power');
  const updatedAtCol = headers.indexOf('updated_at');

  for (let i = 1; i < values.length; i++) {
    const rowAccountId = normalizeCompareValue(values[i][accountIdCol]);
    const rowName = normalizeCompareValue(values[i][nameCol]);

    if (rowAccountId === normalizeCompareValue(accountId) &&
        rowName === normalizeCompareValue(originalName)) {
      
      const updatedAt = nowText();

      if (nameCol > -1) sheet.getRange(i + 1, nameCol + 1).setValue(name);
      if (classNameCol > -1) sheet.getRange(i + 1, classNameCol + 1).setValue(className);
      if (typeCol > -1) sheet.getRange(i + 1, typeCol + 1).setValue(type);
      if (powerCol > -1) sheet.getRange(i + 1, powerCol + 1).setValue(power);
      if (updatedAtCol > -1) sheet.getRange(i + 1, updatedAtCol + 1).setValue(updatedAt);

      // 본캐로 변경되면 계정의 main_name도 업데이트
      if (type === '본캐') {
        updateAccountMainName(accountId, name);
      }
      SpreadsheetApp.flush();

      return {
        ok: true,
        message: '수정되었습니다.'
      };
    }
  }

  return {
    ok: false,
    message: '수정할 캐릭터를 찾을 수 없습니다.'
  };
}

/**
 * [운영자 전용] 특정 계정의 모든 캐릭터 정보를 수정합니다.
 */
function updateCharacterByAdmin(e) {
  validateAdminCode(e.parameter.adminCode); // 관리자 인증 확인
  
  const accountId = normalizeValue(e.parameter.targetAccountId);
  const originalName = normalizeValue(e.parameter.originalName);
  const newName = normalizeValue(e.parameter.newName);
  const newClass = normalizeValue(e.parameter.newClass);
  const newType = normalizeValue(e.parameter.newType);
  const newPower = normalizeValue(e.parameter.newPower);

  const sheet = getSheet(SHEET_NAMES.CHARACTERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const accCol = headers.indexOf('account_id');
  const nameCol = headers.indexOf('name');
  const classCol = headers.indexOf('class_name');
  const typeCol = headers.indexOf('type');
  const powerCol = headers.indexOf('power');

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][accCol]) === normalizeCompareValue(accountId) &&
        normalizeCompareValue(values[i][nameCol]) === normalizeCompareValue(originalName)) {
      
      if (nameCol > -1) sheet.getRange(i + 1, nameCol + 1).setValue(newName);
      if (classCol > -1) sheet.getRange(i + 1, classCol + 1).setValue(newClass);
      if (typeCol > -1) sheet.getRange(i + 1, typeCol + 1).setValue(newType);
      if (powerCol > -1) sheet.getRange(i + 1, powerCol + 1).setValue(newPower);
      SpreadsheetApp.flush();

      return { ok: true, message: '관리자 권한으로 수정되었습니다.' };
    }
  }
  return { ok: false, message: '캐릭터를 찾을 수 없습니다.' };
}

function updateAccountMainName(accountId, newMainName) {
  accountId = normalizeValue(accountId);
  newMainName = normalizeValue(newMainName);

  if (!accountId || !newMainName) {
    return;
  }

  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const updatedAtCol = headers.indexOf('updated_at');

  for (let i = 1; i < values.length; i++) {
    const rowAccountId = normalizeCompareValue(values[i][accountIdCol]);

    if (rowAccountId === normalizeCompareValue(accountId)) {
      const updatedAt = nowText();

      if (mainNameCol > -1) sheet.getRange(i + 1, mainNameCol + 1).setValue(newMainName);
      if (updatedAtCol > -1) sheet.getRange(i + 1, updatedAtCol + 1).setValue(updatedAt);

      break;
    }
  }
}

/************************************************
 * 주간 키
 ************************************************/
function getCurrentWeekKey() {
  const today = new Date();
  const day = today.getDay();
  const diffToWednesday = day >= 3 ? day - 3 : day + 4;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - diffToWednesday);

  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const date = String(startDate.getDate()).padStart(2, '0');

  return {
    ok: true,
    weekKey: `${year}-${month}-${date}`
  };
}

/************************************************
 * RAID_SCHEDULE
 ************************************************/
function getRaidSchedule(weekKey) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const rows = getRowsAsObjects(SHEET_NAMES.RAID_SCHEDULE);

  const items = rows
    .filter(row => formatDate(row.week_key) === actualWeekKey)
    .filter(row => normalizeValue(row.open_yn).toUpperCase() === 'Y')
    .filter(row => {
      const status = normalizeValue(row.status).toUpperCase();
      return !status || status === 'OPEN' || status === 'FINAL';
    })
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
    .map(row => ({
      week_key: formatDate(row.week_key),
      date: formatDate(row.date),
      day: row.day || '',
      time_slot: formatTime(row.time_slot),
      open_yn: row.open_yn || 'Y',
      status: row.status || 'OPEN',
      note: row.note || '',
      sort: row.sort || ''
    }));

  return {
    ok: true,
    weekKey: actualWeekKey,
    items
  };
}

function getRaidScheduleAdmin(weekKey, adminCode) {
  validateAdminCode(adminCode);

  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const rows = getRowsAsObjects(SHEET_NAMES.RAID_SCHEDULE);

  const items = rows
    .filter(row => formatDate(row.week_key) === actualWeekKey)
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
    .map(row => ({
      week_key: formatDate(row.week_key),
      date: formatDate(row.date),
      day: row.day || '',
      time_slot: formatTime(row.time_slot),
      open_yn: row.open_yn || 'Y',
      status: row.status || 'OPEN',
      note: row.note || '',
      sort: row.sort || ''
    }));

  return {
    ok: true,
    weekKey: actualWeekKey,
    items
  };
}

function saveRaidSchedule(weekKey, date, day, timeSlot, openYn, status, note, sort, adminCode) {
  validateAdminCode(adminCode);

  const sheet = getSheet(SHEET_NAMES.RAID_SCHEDULE);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const weekKeyCol = headers.indexOf('week_key');
  const dateCol = headers.indexOf('date');
  const dayCol = headers.indexOf('day');
  const timeSlotCol = headers.indexOf('time_slot');
  const openYnCol = headers.indexOf('open_yn');
  const statusCol = headers.indexOf('status');
  const noteCol = headers.indexOf('note');
  const sortCol = headers.indexOf('sort');

  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const actualDate = normalizeValue(date);
  const actualDay = normalizeValue(day);
  const actualTimeSlot = normalizeValue(timeSlot);
  const actualOpenYn = normalizeValue(openYn).toUpperCase() || 'Y';
  const actualStatus = normalizeValue(status).toUpperCase() || 'OPEN';
  const actualNote = normalizeValue(note);
  const actualSort = normalizeValue(sort);

  if (!actualWeekKey || !actualDate || !actualDay || !actualTimeSlot) {
    return {
      ok: false,
      message: '필수값이 부족합니다.'
    };
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (
      formatDate(row[weekKeyCol]) === actualWeekKey &&
      formatDate(row[dateCol]) === actualDate &&
      normalizeValue(row[dayCol]) === actualDay &&
      normalizeValue(row[timeSlotCol]) === actualTimeSlot
    ) {
      if (openYnCol > -1) sheet.getRange(i + 1, openYnCol + 1).setValue(actualOpenYn);
      if (statusCol > -1) sheet.getRange(i + 1, statusCol + 1).setValue(actualStatus);
      if (noteCol > -1) sheet.getRange(i + 1, noteCol + 1).setValue(actualNote);
      if (sortCol > -1) sheet.getRange(i + 1, sortCol + 1).setValue(actualSort);

      return {
        ok: true,
        message: '수정되었습니다.'
      };
    }
  }

  const row = new Array(headers.length).fill('');

  if (weekKeyCol > -1) row[weekKeyCol] = actualWeekKey;
  if (dateCol > -1) row[dateCol] = actualDate;
  if (dayCol > -1) row[dayCol] = actualDay;
  if (timeSlotCol > -1) row[timeSlotCol] = actualTimeSlot;
  if (openYnCol > -1) row[openYnCol] = actualOpenYn;
  if (statusCol > -1) row[statusCol] = actualStatus;
  if (noteCol > -1) row[noteCol] = actualNote;
  if (sortCol > -1) row[sortCol] = actualSort;

  sheet.appendRow(row);

  return {
    ok: true,
    message: '추가되었습니다.'
  };
}

function deleteRaidSchedule(weekKey, date, day, timeSlot, adminCode) {
  validateAdminCode(adminCode);

  const sheet = getSheet(SHEET_NAMES.RAID_SCHEDULE);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const weekKeyCol = headers.indexOf('week_key');
  const dateCol = headers.indexOf('date');
  const dayCol = headers.indexOf('day');
  const timeSlotCol = headers.indexOf('time_slot');

  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const actualDate = normalizeValue(date);
  const actualDay = normalizeValue(day);
  const actualTimeSlot = normalizeValue(timeSlot);

  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];

    if (
      formatDate(row[weekKeyCol]) === actualWeekKey &&
      formatDate(row[dateCol]) === actualDate &&
      normalizeValue(row[dayCol]) === actualDay &&
      normalizeValue(row[timeSlotCol]) === actualTimeSlot
    ) {
      sheet.deleteRow(i + 1);
    }
  }

  return {
    ok: true,
    message: '삭제되었습니다.'
  };
}

/************************************************
 * AVAILABILITY
 ************************************************/
function getAvailability(accountId, characterName, weekKey) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const rows = getRowsAsObjects(SHEET_NAMES.AVAILABILITY);

  const items = rows
    .filter(row => formatDate(row.week_key) === actualWeekKey)
    .filter(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId))
    .filter(row => normalizeCompareValue(row.character_name) === normalizeCompareValue(characterName))
    .filter(row => {
      const status = normalizeValue(row.status).toUpperCase();
      return !status || status === 'SELECTED' || status === 'CONFIRMED';
    })
    .map(row => ({
      week_key: formatDate(row.week_key),
      account_id: row.account_id || '',
      main_name: row.main_name || '',
      character_name: row.character_name || '',
      type: row.type || '',
      day: row.day || '',
      time_slot: formatTime(row.time_slot),
      status: row.status || 'SELECTED',
      created_at: formatDateTime(row.created_at),
      updated_at: formatDateTime(row.updated_at)
    }));

  return {
    ok: true,
    weekKey: actualWeekKey,
    items
  };
}

function saveAvailability(accountId, mainName, characterName, type, weekKey, slotListText) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const sheet = getSheet(SHEET_NAMES.AVAILABILITY);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  let slotList = [];
  try {
    slotList = JSON.parse(slotListText || '[]');
  } catch (err) {
    return {
      ok: false,
      message: '시간 정보 형식이 잘못되었습니다.'
    };
  }

  const weekKeyCol = headers.indexOf('week_key');
  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const characterNameCol = headers.indexOf('character_name');
  const typeCol = headers.indexOf('type');
  const dayCol = headers.indexOf('day');
  const timeSlotCol = headers.indexOf('time_slot');
  const statusCol = headers.indexOf('status');
  const createdAtCol = headers.indexOf('created_at');
  const updatedAtCol = headers.indexOf('updated_at');

  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];

    if (
      formatDate(row[weekKeyCol]) === actualWeekKey &&
      normalizeCompareValue(row[accountIdCol]) === normalizeCompareValue(accountId) &&
      normalizeCompareValue(row[characterNameCol]) === normalizeCompareValue(characterName)
    ) {
      sheet.deleteRow(i + 1);
    }
  }

  if (!slotList.length) {
    SpreadsheetApp.flush(); // 모두 해제했을 경우 즉시 시트 저장
    return {
      ok: true,
      message: '저장되었습니다.',
      weekKey: actualWeekKey
    };
  }

  const now = nowText();

  const newRows = slotList.map(item => {
    const row = new Array(headers.length).fill('');

    if (weekKeyCol > -1) row[weekKeyCol] = actualWeekKey;
    if (accountIdCol > -1) row[accountIdCol] = accountId;
    if (mainNameCol > -1) row[mainNameCol] = mainName;
    if (characterNameCol > -1) row[characterNameCol] = characterName;
    if (typeCol > -1) row[typeCol] = type;
    if (dayCol > -1) row[dayCol] = item.day || '';
    if (timeSlotCol > -1) row[timeSlotCol] = item.time_slot || '';
    if (statusCol > -1) row[statusCol] = 'SELECTED';
    if (createdAtCol > -1) row[createdAtCol] = now;
    if (updatedAtCol > -1) row[updatedAtCol] = now;

    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  SpreadsheetApp.flush(); // 새 일정 덮어쓴 후 즉시 시트 저장

  return {
    ok: true,
    message: '저장되었습니다.',
    weekKey: actualWeekKey
  };
}

function getAvailabilitySummary(weekKey) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;

  const availabilityRows = getRowsAsObjects(SHEET_NAMES.AVAILABILITY)
    .filter(row => formatDate(row.week_key) === actualWeekKey)
    .filter(row => {
      const status = normalizeValue(row.status).toUpperCase();
      return !status || status === 'SELECTED' || status === 'CONFIRMED';
    });

  const characterRows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);

  const items = availabilityRows.map(row => {
    const character = characterRows.find(charRow =>
      normalizeCompareValue(charRow.account_id) === normalizeCompareValue(row.account_id) &&
      normalizeCompareValue(charRow.name) === normalizeCompareValue(row.character_name) &&
      normalizeValue(charRow.use_yn).toUpperCase() !== 'N'
    );

    return {
      week_key: formatDate(row.week_key),
      account_id: row.account_id || '',
      main_name: row.main_name || '',
      character_name: row.character_name || '',
      type: row.type || '',
      day: row.day || '',
      time_slot: formatTime(row.time_slot),
      status: row.status || 'SELECTED',
      className: character ? (character.class_name || '') : '',
      power: character ? (character.power || '') : '',
      power_value: character ? Number(character.power || 0) : 0
    };
  });

  return {
    ok: true,
    weekKey: actualWeekKey,
    items
  };
}

/************************************************
 * MAIN
 ************************************************/
function getMainData(accountId) {
  if (accountId === 'MASTER_ADMIN') {
    const actualWeekKey = getCurrentWeekKey().weekKey;
    const summary = getAvailabilitySummary(actualWeekKey).items;
    return {
      ok: true,
      mainName: '👑 마스터',
      characters: [],
      selectedCount: 0,
      weeklyRunCount: 0,
      summary
    };
  }

  const accountRows = getRowsAsObjects(SHEET_NAMES.ACCOUNTS);
  const characterRows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);
  const availabilityRows = getRowsAsObjects(SHEET_NAMES.AVAILABILITY);
  const actualWeekKey = getCurrentWeekKey().weekKey;

  const account = accountRows.find(row =>
    normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId)
  );

  const characters = characterRows
    .filter(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId))
    .filter(row => normalizeValue(row.use_yn).toUpperCase() !== 'N')
    .map(row => ({
      character_id: row.character_id || '',
      character_name: row.name || '',
      className: row.class_name || '',
      power: row.power || '',
      type: row.type || '',
      use_yn: row.use_yn || 'Y'
    }));

  const schemaResult = validateDatabaseSchema();
  if (!schemaResult.isValid) {
    return {
      ok: false,
      message: 'DB 스키마 검증 실패: ' + schemaResult.errors.join(' | '),
      mainName: '',
      characters: [],
      selectedCount: 0,
      weeklyRunCount: 0,
      summary: []
    };
  }

  const selectedCount = availabilityRows
    .filter(row => formatDate(row.week_key) === actualWeekKey)
    .filter(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId))
    .filter(row => {
      const status = normalizeValue(row.status).toUpperCase();
      return !status || status === 'SELECTED' || status === 'CONFIRMED';
    }).length;

  const summary = getAvailabilitySummary(actualWeekKey).items;

  return {
    ok: true,
    mainName: account ? (account.main_name || '') : '',
    characters,
    selectedCount,
    weeklyRunCount: 0,
    summary
  };
}

/************************************************
 * PARTY
 ************************************************/
/**
 * [업데이트] 지능형 파티 분배 알고리즘 (2026 아이온 2 최적화)
 * 1. 치유성(Healer)을 각 파티에 우선적으로 1명씩 분배
 * 2. 나머지 인원을 전투력 내림차순 정렬 후 스네이크(1->2->2->1) 방식으로 배분
 */
function getPartyComposition(weekKey, day, timeSlot) {
  const summary = getAvailabilitySummary(weekKey).items
    .filter(item => normalizeValue(item.day) === normalizeValue(day))
    .filter(item => normalizeValue(item.time_slot) === normalizeValue(timeSlot));

  const byAccount = {};
  summary.forEach(item => {
    const key = normalizeValue(item.account_id);
    if (!key) return;
    if (!byAccount[key] || Number(item.power_value || 0) > Number(byAccount[key].power_value || 0)) {
      byAccount[key] = item;
    }
  });

  const candidates = Object.values(byAccount);
  const healers = candidates.filter(c => c.className === ROLE.HEALER)
    .sort((a, b) => b.power_value - a.power_value);
  const others = candidates.filter(c => c.className !== ROLE.HEALER)
    .sort((a, b) => b.power_value - a.power_value);

  const party1 = [];
  const party2 = [];

  // 치유성 경고
  const warning = healers.length === 0
    ? '선택된 시간대에 치유성 캐릭터가 없습니다. 치유성을 포함한 상태에서 재시도해주세요.'
    : '';

  // 1. 치유성 분배 (1파티 우선 순차 배분)
  healers.forEach((h, idx) => {
    if (idx % 2 === 0 && party1.length < PARTY_SIZE) party1.push(h);
    else if (party2.length < PARTY_SIZE) party2.push(h);
  });

  // 2. 나머지 인원 스네이크 배분 (균형 유지)
  let toParty1 = party1.length <= party2.length;
  others.forEach(member => {
    if (toParty1) {
      if (party1.length < PARTY_SIZE) {
        party1.push(member);
        if (party2.length < PARTY_SIZE) toParty1 = false;
      } else if (party2.length < PARTY_SIZE) {
        party2.push(member);
      }
    } else {
      if (party2.length < PARTY_SIZE) {
        party2.push(member);
        if (party1.length < PARTY_SIZE) toParty1 = true;
      } else if (party1.length < PARTY_SIZE) {
        party1.push(member);
      }
    }
  });

  return {
    ok: true,
    warning,
    party1,
    party2,
    totalCount: party1.length + party2.length,
    highPowerCount: candidates.filter(i => Number(i.power_value || 0) >= 400).length,
    hasHeal: party1.some(i => i.className === ROLE.HEALER),
    party2HasHeal: party2.some(i => i.className === ROLE.HEALER)
  };
}

/************************************************
 * ADMIN
 ************************************************/
function adminLogin(adminCode) {
  adminCode = normalizeValue(adminCode);
  const settings = getKeyValueMap(SHEET_NAMES.SETTINGS);
  const savedCode = normalizeValue(settings.ADMIN_CODE);

  if (!adminCode) {
    return { ok: false, message: '관리자 코드를 입력해주세요.' };
  }

  if (!savedCode) {
    return { ok: false, message: '관리자 코드가 설정되지 않았습니다.' };
  }

  if (adminCode !== savedCode) {
    return { ok: false, message: '관리자 코드가 올바르지 않습니다.' };
  }

  return {
    ok: true,
    message: '확인되었습니다.'
  };
}

function validateAdminCode(adminCode) {
  const result = adminLogin(adminCode);
  if (!result.ok) {
    throw new Error(result.message || '관리자 인증 실패');
  }
}

function updateAdminCodeSetting(adminCode, newCode, callerAccountId) {
  validateAdminCode(adminCode); // 현재 코드로 권한 확인
  if (callerAccountId !== 'MASTER_ADMIN') return { ok: false, message: '마스터 계정만 접근 가능합니다.' };

  const actualNewCode = normalizeValue(newCode);
  if (!actualNewCode) return { ok: false, message: '새 코드를 입력해주세요.' };

  const sheet = getSheet(SHEET_NAMES.SETTINGS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (normalizeValue(values[i][0]) === 'ADMIN_CODE') {
      sheet.getRange(i + 1, 2).setValue(actualNewCode);
      return { ok: true, message: '관리자 코드가 성공적으로 변경되었습니다.' };
    }
  }

  sheet.appendRow(['ADMIN_CODE', actualNewCode]);
  return { ok: true, message: '관리자 코드가 등록되었습니다.' };
}

function changePassword(accountId, oldPassword, newPassword) {
  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());
  const accountIdCol = headers.indexOf('account_id');
  const passwordCol = headers.indexOf('password');

  if (passwordCol === -1) return { ok: false, message: '서버에 password 컬럼이 없습니다.' };

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][accountIdCol]) === normalizeCompareValue(accountId)) {
      const currentPwd = normalizeValue(values[i][passwordCol]);
      if (currentPwd !== normalizeValue(oldPassword)) {
        return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };
      }
      sheet.getRange(i + 1, passwordCol + 1).setValue(normalizeValue(newPassword));
      return { ok: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
    }
  }
  return { ok: false, message: '계정을 찾을 수 없습니다.' };
}

function toggleAdminRole(adminCode, targetAccountId, callerAccountId) {
  validateAdminCode(adminCode);
  if (callerAccountId !== 'MASTER_ADMIN') return { ok: false, message: '마스터 계정만 접근 가능합니다.' };

  if (normalizeCompareValue(targetAccountId) === normalizeCompareValue(callerAccountId)) {
    return { ok: false, message: '자기 자신의 권한은 변경할 수 없습니다.' };
  }
  
  if (normalizeCompareValue(targetAccountId) === normalizeCompareValue('MASTER_ADMIN')) {
    return { ok: false, message: '마스터 계정의 권한은 변경할 수 없습니다.' };
  }

  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();
  const accountIdCol = values[0].map(v => String(v).trim()).indexOf('account_id');
  const adminYnCol = values[0].map(v => String(v).trim()).indexOf('admin_yn');
  
  if (adminYnCol === -1) return { ok: false, message: 'admin_yn 컬럼이 없습니다.' };

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][accountIdCol]) === normalizeCompareValue(targetAccountId)) {
      const currentRole = normalizeValue(values[i][adminYnCol]).toUpperCase();
      const newRole = currentRole === 'Y' ? 'N' : 'Y';
      sheet.getRange(i + 1, adminYnCol + 1).setValue(newRole);
      SpreadsheetApp.flush();
      return { ok: true, message: `운영진 권한이 ${newRole === 'Y' ? '부여' : '해제'}되었습니다.`, newRole };
    }
  }
  return { ok: false, message: '계정을 찾을 수 없습니다.' };
}

function resetUserPasswordByAdmin(adminCode, targetAccountId) {
  validateAdminCode(adminCode);
  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();
  const accountIdCol = values[0].map(v => String(v).trim()).indexOf('account_id');
  const passwordCol = values[0].map(v => String(v).trim()).indexOf('password');

  if (passwordCol === -1) return { ok: false, message: 'password 컬럼이 없습니다.' };

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][accountIdCol]) === normalizeCompareValue(targetAccountId)) {
      sheet.getRange(i + 1, passwordCol + 1).setValue('0000');
      SpreadsheetApp.flush();
      return { ok: true, message: '해당 유저의 비밀번호가 [0000]으로 초기화되었습니다.\n유저에게 로그인 후 비밀번호를 변경하라고 안내해 주세요.' };
    }
  }
  return { ok: false, message: '계정을 찾을 수 없습니다.' };
}

/************************************************
 * 라우팅
 ************************************************/
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (!action) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('NoStepBack')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  try {
    switch (action) {
      case 'init':
        return outputJson(handleInit());

      case 'login':
        return outputJson(login(e.parameter.mainName, e.parameter.password));

      case 'getCharacters':
        return outputJson(getCharacters(e.parameter.accountId));

      case 'getAllCharacters':
        return outputJson(getAllCharacters());

      case 'addCharacter':
        return outputJson(addCharacter(e));

      case 'updateCharacter':
        return outputJson(updateCharacter(e));

      case 'deleteCharacter':
        return outputJson(deleteCharacter(e.parameter.accountId, e.parameter.characterName));

      case 'toggleCharacterType':
        return outputJson(toggleCharacterType(e.parameter.accountId, e.parameter.characterName));

      case 'getCurrentWeekKey':
        return outputJson(getCurrentWeekKey());

      case 'getRaidSchedule':
        return outputJson(getRaidSchedule(e.parameter.weekKey));

      case 'getRaidScheduleAdmin':
        return outputJson(getRaidScheduleAdmin(e.parameter.weekKey, e.parameter.adminCode));

      case 'saveRaidSchedule':
        return outputJson(
          saveRaidSchedule(
            e.parameter.weekKey,
            e.parameter.date,
            e.parameter.day,
            e.parameter.timeSlot,
            e.parameter.openYn,
            e.parameter.status,
            e.parameter.note,
            e.parameter.sort,
            e.parameter.adminCode
          )
        );

      case 'deleteRaidSchedule':
        return outputJson(
          deleteRaidSchedule(
            e.parameter.weekKey,
            e.parameter.date,
            e.parameter.day,
            e.parameter.timeSlot,
            e.parameter.adminCode
          )
        );

      case 'getAvailability':
        return outputJson(
          getAvailability(
            e.parameter.accountId,
            e.parameter.characterName,
            e.parameter.weekKey
          )
        );

      case 'saveAvailability':
        return outputJson(
          saveAvailability(
            e.parameter.accountId,
            e.parameter.mainName,
            e.parameter.characterName,
            e.parameter.type,
            e.parameter.weekKey,
            e.parameter.slotList
          )
        );

      case 'getAvailabilitySummary':
        return outputJson(getAvailabilitySummary(e.parameter.weekKey));

      case 'getMainData':
        return outputJson(getMainData(e.parameter.accountId));

      case 'validateDatabaseSchema':
        return outputJson(validateDatabaseSchema());

      case 'getPartyComposition':
        return outputJson(
          getPartyComposition(
            e.parameter.weekKey,
            e.parameter.day,
            e.parameter.time_slot
          )
        );

      case 'adminLogin':
        return outputJson(adminLogin(e.parameter.adminCode));

      case 'updateCharacterByAdmin':
        return outputJson(updateCharacterByAdmin(e));

      case 'updateAdminCodeSetting':
        return outputJson(updateAdminCodeSetting(e.parameter.adminCode, e.parameter.newAdminCode, e.parameter.callerAccountId));

      case 'changePassword':
        return outputJson(changePassword(e.parameter.accountId, e.parameter.oldPassword, e.parameter.newPassword));
        
      case 'toggleAdminRole':
        return outputJson(toggleAdminRole(e.parameter.adminCode, e.parameter.targetAccountId, e.parameter.callerAccountId));

      case 'resetUserPasswordByAdmin':
        return outputJson(resetUserPasswordByAdmin(e.parameter.adminCode, e.parameter.targetAccountId));

      default:
        return outputJson({
          ok: false,
          message: '잘못된 요청입니다.'
        });
    }
  } catch (err) {
    return outputJson({
      ok: false,
      message: err.message || '오류가 발생했습니다.'
    });
  }
}

/************************************************
 * POST 라우팅 (보안 및 캐시 방지 강화)
 ************************************************/
function doPost(e) {
  return doGet(e);
}