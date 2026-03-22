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
function login(mainName) {
  mainName = normalizeValue(mainName);

  if (!mainName) {
    return {
      ok: false,
      message: '본캐명을 입력해주세요.'
    };
  }

  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return createAccount(sheet, mainName);
  }

  const headers = values[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const useYnCol = headers.indexOf('use_yn');
  const createdAtCol = headers.indexOf('created_at');

  if (accountIdCol === -1 || mainNameCol === -1) {
    throw new Error('ACCOUNTS 헤더를 확인해주세요.');
  }

  for (let i = 1; i < values.length; i++) {
    const rowMainName = normalizeValue(values[i][mainNameCol]);
    const rowUseYn = useYnCol > -1 ? normalizeValue(values[i][useYnCol]).toUpperCase() : 'Y';

    if (rowMainName !== mainName) continue;

    if (rowUseYn === 'N') {
      return {
        ok: false,
        message: '사용할 수 없는 계정입니다.'
      };
    }

    return {
      ok: true,
      accountId: values[i][accountIdCol],
      mainName: rowMainName
    };
  }

  return createAccount(sheet, mainName);
}

function createAccount(sheet, mainName) {
  const headers = sheet.getDataRange().getValues()[0].map(v => String(v).trim());

  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const useYnCol = headers.indexOf('use_yn');
  const createdAtCol = headers.indexOf('created_at');

  const row = new Array(headers.length).fill('');
  const accountId = 'ACC_' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const createdAt = nowText();

  if (accountIdCol > -1) row[accountIdCol] = accountId;
  if (mainNameCol > -1) row[mainNameCol] = mainName;
  if (useYnCol > -1) row[useYnCol] = 'Y';
  if (createdAtCol > -1) row[createdAtCol] = createdAt;

  sheet.appendRow(row);

  return {
    ok: true,
    accountId,
    mainName
  };
}

/************************************************
 * CHARACTERS
 ************************************************/
function getCharacters(accountId) {
  accountId = normalizeCompareValue(accountId);

  if (!accountId) {
    return {
      ok: false,
      message: 'accountId가 없습니다.',
      items: []
    };
  }

  const rows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);

  const items = rows
    .filter(row => normalizeCompareValue(row.account_id) === accountId)
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
    items
  };
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
      time_slot: row.time_slot || '',
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
      time_slot: row.time_slot || '',
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

  const actualWeekKey = normalizeValue(weekKey);
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

  const actualWeekKey = normalizeValue(weekKey);
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
      time_slot: row.time_slot || '',
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
      time_slot: row.time_slot || '',
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
function getPartyComposition(weekKey, day, timeSlot) {
  // 해당 시간대 참여자 조회
  const summary = getAvailabilitySummary(weekKey).items
    .filter(item => normalizeValue(item.day) === normalizeValue(day))
    .filter(item => normalizeValue(item.time_slot) === normalizeValue(timeSlot));

  // 계정별 최고 전투력 캐릭터만 선택
  const byAccount = {};
  summary.forEach(item => {
    const key = normalizeValue(item.account_id);
    if (!key) return;

    if (!byAccount[key]) {
      byAccount[key] = item;
      return;
    }

    const prev = byAccount[key];
    const currentPower = Number(item.power_value || 0);
    const prevPower = Number(prev.power_value || 0);

    if (currentPower > prevPower) {
      byAccount[key] = item;
    }
  });

  const candidates = Object.keys(byAccount).map(key => byAccount[key]);

  // 정렬: 치유성 우선, 다음은 전투력 높은순
  candidates.sort((a, b) => {
    const aHeal = a.className === ROLE.HEALER ? 1 : 0;
    const bHeal = b.className === ROLE.HEALER ? 1 : 0;
    if (aHeal !== bHeal) return bHeal - aHeal;
    return Number(b.power_value || 0) - Number(a.power_value || 0);
  });

  // 파티 분배: 균등하게 배분, 최대 4명씩
  const party1 = [];
  const party2 = [];

  candidates.forEach(item => {
    if (party1.length <= party2.length) {
      if (party1.length < PARTY_SIZE) {
        party1.push(item);
      } else if (party2.length < PARTY_SIZE) {
        party2.push(item);
      }
    } else {
      if (party2.length < PARTY_SIZE) {
        party2.push(item);
      } else if (party1.length < PARTY_SIZE) {
        party1.push(item);
      }
    }
  });

  const totalCount = party1.length + party2.length;
  const highPowerCount = candidates.filter(i => Number(i.power_value || 0) >= 400).length;
  const hasHeal = candidates.some(i => i.className === ROLE.HEALER);
  const party2HasHeal = party2.some(i => i.className === ROLE.HEALER);

  return {
    ok: true,
    party1,
    party2,
    totalCount,
    highPowerCount,
    hasHeal,
    party2HasHeal
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
        return outputJson(login(e.parameter.mainName));

      case 'getCharacters':
        return outputJson(getCharacters(e.parameter.accountId));

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