/************************************************
 * 1. 공통 설정 및 헬퍼 함수
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

// [속도 최적화] GAS 1회 실행 시 동일한 시트를 여러 번 읽지 않도록 메모리 캐싱 적용
const _SHEET_CACHE = {};

function getRowsAsObjects(sheetName) {
  if (_SHEET_CACHE[sheetName]) return _SHEET_CACHE[sheetName];

  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    _SHEET_CACHE[sheetName] = [];
    return [];
  }

  const headers = values[0].map(v => String(v).trim());

  const rows = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  _SHEET_CACHE[sheetName] = rows;
  return rows;
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
    result[key] = { url: row.url || '' };
  });
  return result;
}

function handleInit() {
  return { ok: true, text: getKeyValueMap(SHEET_NAMES.TEXT), image: getImageMap() };
}