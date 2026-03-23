/************************************************
 * 2. 계정 및 권한 관리 (Auth & Accounts)
 ************************************************/

function login(mainName, password) {
  mainName = normalizeValue(mainName);
  password = normalizeValue(password);

  if (!mainName) return { ok: false, message: '본캐명을 입력해주세요.' };
  if (!password) return { ok: false, message: '비밀번호를 입력해주세요.' };

  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return createAccount(sheet, mainName, password);

  const headers = values[0].map(v => String(v).trim());
  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const useYnCol = headers.indexOf('use_yn');
  const adminYnCol = headers.indexOf('admin_yn');
  const passwordCol = headers.indexOf('password');

  if (accountIdCol === -1 || mainNameCol === -1) throw new Error('ACCOUNTS 헤더를 확인해주세요.');

  for (let i = 1; i < values.length; i++) {
    const rowMainName = normalizeValue(values[i][mainNameCol]);
    const rowUseYn = useYnCol > -1 ? normalizeValue(values[i][useYnCol]).toUpperCase() : 'Y';
    const rowAdminYn = adminYnCol > -1 ? normalizeValue(values[i][adminYnCol]).toUpperCase() : 'N';
    const rowPassword = passwordCol > -1 ? normalizeValue(values[i][passwordCol]) : '';

    if (rowMainName !== mainName) continue;
    if (rowUseYn === 'N') return { ok: false, message: '사용할 수 없는 계정입니다.' };
    
    if (passwordCol > -1) {
      if (rowPassword && rowPassword !== password) return { ok: false, message: '비밀번호가 일치하지 않습니다.' };
      if (!rowPassword) sheet.getRange(i + 1, passwordCol + 1).setValue(password);
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
  SpreadsheetApp.flush();
  return { ok: true, accountId, mainName };
}

function updateAccountMainName(accountId, newMainName) {
  accountId = normalizeValue(accountId);
  newMainName = normalizeValue(newMainName);
  if (!accountId || !newMainName) return;

  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());
  const accountIdCol = headers.indexOf('account_id');
  const mainNameCol = headers.indexOf('main_name');
  const updatedAtCol = headers.indexOf('updated_at');

  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][accountIdCol]) === normalizeCompareValue(accountId)) {
      if (mainNameCol > -1) sheet.getRange(i + 1, mainNameCol + 1).setValue(newMainName);
      if (updatedAtCol > -1) sheet.getRange(i + 1, updatedAtCol + 1).setValue(nowText());
      break;
    }
  }
}

function adminLogin(adminCode) {
  adminCode = normalizeValue(adminCode);
  const savedCode = normalizeValue(getKeyValueMap(SHEET_NAMES.SETTINGS).ADMIN_CODE);
  if (!adminCode) return { ok: false, message: '관리자 코드를 입력해주세요.' };
  if (!savedCode) return { ok: false, message: '관리자 코드가 설정되지 않았습니다.' };
  if (adminCode !== savedCode) return { ok: false, message: '관리자 코드가 올바르지 않습니다.' };
  return { ok: true, message: '확인되었습니다.' };
}

function validateAdminCode(adminCode) {
  const result = adminLogin(adminCode);
  if (!result.ok) throw new Error(result.message || '관리자 인증 실패');
}

function updateAdminCodeSetting(adminCode, newCode, callerAccountId) {
  validateAdminCode(adminCode);
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
  const accountIdCol = values[0].map(v => String(v).trim()).indexOf('account_id');
  const passwordCol = values[0].map(v => String(v).trim()).indexOf('password');

  if (passwordCol === -1) return { ok: false, message: '서버에 password 컬럼이 없습니다.' };
  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][accountIdCol]) === normalizeCompareValue(accountId)) {
      if (normalizeValue(values[i][passwordCol]) !== normalizeValue(oldPassword)) {
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
  if (normalizeCompareValue(targetAccountId) === normalizeCompareValue(callerAccountId)) return { ok: false, message: '자기 자신의 권한은 변경할 수 없습니다.' };
  if (normalizeCompareValue(targetAccountId) === normalizeCompareValue('MASTER_ADMIN')) return { ok: false, message: '마스터 계정의 권한은 변경할 수 없습니다.' };

  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v).trim());
  for (let i = 1; i < values.length; i++) {
    if (normalizeCompareValue(values[i][headers.indexOf('account_id')]) === normalizeCompareValue(targetAccountId)) {
      const newRole = normalizeValue(values[i][headers.indexOf('admin_yn')]).toUpperCase() === 'Y' ? 'N' : 'Y';
      sheet.getRange(i + 1, headers.indexOf('admin_yn') + 1).setValue(newRole);
      SpreadsheetApp.flush();
      return { ok: true, message: `운영진 권한이 ${newRole === 'Y' ? '부여' : '해제'}되었습니다.`, newRole };
    }
  }
  return { ok: false, message: '계정을 찾을 수 없습니다.' };
}

function resetUserPasswordByAdmin(adminCode, targetAccountId) {
  validateAdminCode(adminCode);
  changePassword(targetAccountId, '', '0000'); // 기존 로직 재활용 우회 처리
  return { ok: true, message: '해당 유저의 비밀번호가 [0000]으로 초기화되었습니다.\n유저에게 로그인 후 비밀번호를 변경하라고 안내해 주세요.' };
}