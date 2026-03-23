/************************************************
 * 4. 일정 및 파티 구성 (Schedule & Party)
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
  return { ok: true, weekKey: `${year}-${month}-${date}` };
}

function getRaidSchedule(weekKey) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const items = getRowsAsObjects(SHEET_NAMES.RAID_SCHEDULE)
    .filter(row => formatDate(row.week_key) === actualWeekKey)
    .filter(row => normalizeValue(row.open_yn).toUpperCase() === 'Y')
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
    .map(row => ({
      week_key: formatDate(row.week_key), date: formatDate(row.date), day: row.day || '',
      time_slot: formatTime(row.time_slot), note: row.note || ''
    }));
  return { ok: true, weekKey: actualWeekKey, items };
}

function getRaidScheduleAdmin(weekKey, adminCode) {
  validateAdminCode(adminCode);
  return getRaidSchedule(weekKey);
}

function saveRaidSchedule(weekKey, date, day, timeSlot, openYn, status, note, sort, adminCode) {
  validateAdminCode(adminCode);
  const sheet = getSheet(SHEET_NAMES.RAID_SCHEDULE);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  for (let i = 1; i < values.length; i++) {
    if (formatDate(values[i][headers.indexOf('week_key')]) === actualWeekKey &&
        formatDate(values[i][headers.indexOf('date')]) === normalizeValue(date) &&
        normalizeValue(values[i][headers.indexOf('time_slot')]) === normalizeValue(timeSlot)) {
      if (headers.indexOf('note') > -1) sheet.getRange(i + 1, headers.indexOf('note') + 1).setValue(normalizeValue(note));
      return { ok: true, message: '수정되었습니다.' };
    }
  }

  const row = new Array(headers.length).fill('');
  if (headers.indexOf('week_key') > -1) row[headers.indexOf('week_key')] = actualWeekKey;
  if (headers.indexOf('date') > -1) row[headers.indexOf('date')] = normalizeValue(date);
  if (headers.indexOf('day') > -1) row[headers.indexOf('day')] = normalizeValue(day);
  if (headers.indexOf('time_slot') > -1) row[headers.indexOf('time_slot')] = normalizeValue(timeSlot);
  if (headers.indexOf('open_yn') > -1) row[headers.indexOf('open_yn')] = 'Y';
  if (headers.indexOf('note') > -1) row[headers.indexOf('note')] = normalizeValue(note);
  sheet.appendRow(row);
  return { ok: true, message: '추가되었습니다.' };
}

function deleteRaidSchedule(weekKey, date, day, timeSlot, adminCode) {
  validateAdminCode(adminCode);
  const sheet = getSheet(SHEET_NAMES.RAID_SCHEDULE);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;

  for (let i = values.length - 1; i >= 1; i--) {
    if (formatDate(values[i][headers.indexOf('week_key')]) === actualWeekKey &&
        formatDate(values[i][headers.indexOf('date')]) === normalizeValue(date) &&
        normalizeValue(values[i][headers.indexOf('time_slot')]) === normalizeValue(timeSlot)) {
      sheet.deleteRow(i + 1);
    }
  }
  return { ok: true, message: '삭제되었습니다.' };
}

function getAvailability(accountId, characterName, weekKey) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const items = getRowsAsObjects(SHEET_NAMES.AVAILABILITY)
    .filter(row => formatDate(row.week_key) === actualWeekKey && normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId))
    .map(row => ({ day: row.day || '', time_slot: formatTime(row.time_slot) }));
  return { ok: true, weekKey: actualWeekKey, items };
}

function saveAvailability(accountId, mainName, characterName, type, weekKey, slotListText) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const sheet = getSheet(SHEET_NAMES.AVAILABILITY);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());

  let slotList = [];
  try { slotList = JSON.parse(slotListText || '[]'); } catch (err) { return { ok: false, message: '시간 형식 오류' }; }

  for (let i = values.length - 1; i >= 1; i--) {
    if (formatDate(values[i][headers.indexOf('week_key')]) === actualWeekKey &&
        normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(accountId)) {
      sheet.deleteRow(i + 1);
    }
  }

  if (slotList.length > 0) {
    const newRows = slotList.map(item => {
      const row = new Array(headers.length).fill('');
      if (headers.indexOf('week_key') > -1) row[headers.indexOf('week_key')] = actualWeekKey;
      if (headers.indexOf('account_id') > -1) row[headers.indexOf('account_id')] = accountId;
      if (headers.indexOf('main_name') > -1) row[headers.indexOf('main_name')] = mainName;
      if (headers.indexOf('character_name') > -1) row[headers.indexOf('character_name')] = characterName;
      if (headers.indexOf('type') > -1) row[headers.indexOf('type')] = type;
      if (headers.indexOf('day') > -1) row[headers.indexOf('day')] = item.day || '';
      if (headers.indexOf('time_slot') > -1) row[headers.indexOf('time_slot')] = item.time_slot || '';
      return row;
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  }
  SpreadsheetApp.flush();
  return { ok: true, message: '저장되었습니다.', weekKey: actualWeekKey };
}

function getAvailabilitySummary(weekKey) {
  const actualWeekKey = normalizeValue(weekKey) || getCurrentWeekKey().weekKey;
  const availabilityRows = getRowsAsObjects(SHEET_NAMES.AVAILABILITY).filter(row => formatDate(row.week_key) === actualWeekKey);
  const characterRows = getRowsAsObjects(SHEET_NAMES.CHARACTERS);

  const items = availabilityRows.map(row => {
    const character = characterRows.find(charRow =>
      normalizeCompareValue(charRow.account_id) === normalizeCompareValue(row.account_id) &&
      normalizeCompareValue(charRow.name) === normalizeCompareValue(row.character_name) &&
      normalizeValue(charRow.use_yn).toUpperCase() !== 'N'
    );
    return {
      account_id: row.account_id, main_name: row.main_name, character_name: row.character_name,
      day: row.day, time_slot: formatTime(row.time_slot),
      className: character ? character.class_name : '', power: character ? character.power : '', power_value: character ? Number(character.power || 0) : 0
    };
  });
  return { ok: true, weekKey: actualWeekKey, items };
}

function validateDatabaseSchema() { return { ok: true, isValid: true, errors: [] }; }

function getMainData(accountId) {
  if (accountId === 'MASTER_ADMIN') {
    return { ok: true, mainName: '👑 마스터', characters: [], selectedCount: 0, summary: getAvailabilitySummary(getCurrentWeekKey().weekKey).items };
  }
  const account = getRowsAsObjects(SHEET_NAMES.ACCOUNTS).find(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId));
  const characters = getRowsAsObjects(SHEET_NAMES.CHARACTERS)
    .filter(row => normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId) && normalizeValue(row.use_yn).toUpperCase() !== 'N')
    .map(row => ({ character_id: row.character_id, character_name: row.name, className: row.class_name, power: row.power, type: row.type, use_yn: row.use_yn }));
  
  const selectedCount = getRowsAsObjects(SHEET_NAMES.AVAILABILITY).filter(row => formatDate(row.week_key) === getCurrentWeekKey().weekKey && normalizeCompareValue(row.account_id) === normalizeCompareValue(accountId)).length;

  return { ok: true, mainName: account ? account.main_name : '', characters, selectedCount, summary: getAvailabilitySummary(getCurrentWeekKey().weekKey).items };
}

function getPartyComposition(weekKey, day, timeSlot) {
  const summary = getAvailabilitySummary(weekKey).items.filter(item => normalizeValue(item.day) === normalizeValue(day) && normalizeValue(item.time_slot) === normalizeValue(timeSlot));
  const byAccount = {};
  summary.forEach(item => {
    const key = normalizeValue(item.account_id);
    if (!key) return;
    if (!byAccount[key] || Number(item.power_value || 0) > Number(byAccount[key].power_value || 0)) byAccount[key] = item;
  });

  const candidates = Object.values(byAccount);
  const healers = candidates.filter(c => c.className === ROLE.HEALER).sort((a, b) => b.power_value - a.power_value);
  const others = candidates.filter(c => c.className !== ROLE.HEALER).sort((a, b) => b.power_value - a.power_value);

  const party1 = [], party2 = [];
  healers.forEach((h, idx) => {
    if (idx % 2 === 0 && party1.length < PARTY_SIZE) party1.push(h);
    else if (party2.length < PARTY_SIZE) party2.push(h);
  });

  let toParty1 = party1.length <= party2.length;
  others.forEach(member => {
    if (toParty1) {
      if (party1.length < PARTY_SIZE) { party1.push(member); if (party2.length < PARTY_SIZE) toParty1 = false; }
      else if (party2.length < PARTY_SIZE) party2.push(member);
    } else {
      if (party2.length < PARTY_SIZE) { party2.push(member); if (party1.length < PARTY_SIZE) toParty1 = true; }
      else if (party1.length < PARTY_SIZE) party1.push(member);
    }
  });

  return {
    ok: true,
    warning: healers.length === 0 ? '선택된 시간대에 치유성 캐릭터가 없습니다.' : '',
    party1, party2, totalCount: party1.length + party2.length,
    hasHeal: party1.some(i => i.className === ROLE.HEALER), party2HasHeal: party2.some(i => i.className === ROLE.HEALER)
  };
}