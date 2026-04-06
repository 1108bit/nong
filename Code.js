/************************************************
 * 99. 라우팅 허브 (Routes)
 ************************************************/
function doGet(e) {
  // 디버깅용 로그: 실제로 어떤 데이터가 들어오고 있는지 GAS 실행 로그에 남깁니다.
  console.log("들어온 파라미터 전체:", JSON.stringify(e));

  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (!action) {
    return outputStandard(true, null, "LEGION MANAGER API 서버가 정상 동작 중입니다.", 200);
  }

  try {
    let result;
    switch (action) {
      case 'init': result = handleInit(); break;
      case 'login': result = login(e.parameter.mainName, e.parameter.password); break;
      case 'getCharacters': result = getCharacters(e.parameter.accountId); break;
      case 'getAllCharacters': result = getAllCharacters(); break;
      case 'addCharacter': result = addCharacter(e); break;
      case 'updateCharacter': result = updateCharacter(e); break;
      case 'deleteCharacter': result = deleteCharacter(e.parameter.accountId, e.parameter.characterName); break;
      case 'toggleCharacterType': result = toggleCharacterType(e.parameter.accountId, e.parameter.characterName); break;
      case 'getCurrentWeekKey': result = getCurrentWeekKey(); break;
      case 'getRaidSchedule': result = getRaidSchedule(e.parameter.weekKey); break;
      case 'getRaidScheduleAdmin': result = getRaidScheduleAdmin(e.parameter.weekKey, e.parameter.adminCode); break;
      case 'saveRaidSchedule': result = saveRaidSchedule(e.parameter.weekKey, e.parameter.date, e.parameter.day, e.parameter.timeSlot, e.parameter.openYn, e.parameter.status, e.parameter.note, e.parameter.sort, e.parameter.adminCode); break;
      case 'deleteRaidSchedule': result = deleteRaidSchedule(e.parameter.weekKey, e.parameter.date, e.parameter.day, e.parameter.timeSlot, e.parameter.adminCode); break;
      case 'getAvailability': result = getAvailability(e.parameter.accountId, e.parameter.characterName, e.parameter.weekKey); break;
      case 'saveAvailability': result = saveAvailability(e.parameter.accountId, e.parameter.mainName, e.parameter.characterName, e.parameter.type, e.parameter.weekKey, e.parameter.slotList); break;
      case 'getAvailabilitySummary': result = getAvailabilitySummary(e.parameter.weekKey); break;
      case 'getMainData': result = getMainData(e.parameter.accountId); break;
      case 'validateDatabaseSchema': result = validateDatabaseSchema(); break;
      case 'getPartyComposition': result = getPartyComposition(e.parameter.weekKey, e.parameter.day, e.parameter.time_slot); break;
      case 'savePartyComposition': result = savePartyComposition(e.parameter.adminCode, e.parameter.date, e.parameter.timeSlot, e.parameter.partyList); break;
      case 'adminLogin': result = adminLogin(e.parameter.adminCode); break;
      case 'updateCharacterByAdmin': result = updateCharacterByAdmin(e); break;
      case 'updateAdminCodeSetting': result = updateAdminCodeSetting(e.parameter.adminCode, e.parameter.newAdminCode, e.parameter.callerAccountId); break;
      case 'changePassword': result = changePassword(e.parameter.accountId, e.parameter.oldPassword, e.parameter.newPassword); break;
      case 'toggleAdminRole': result = toggleAdminRole(e.parameter.adminCode, e.parameter.targetAccountId, e.parameter.callerAccountId); break;
      case 'resetUserPasswordByAdmin': result = resetUserPasswordByAdmin(e.parameter.adminCode, e.parameter.targetAccountId); break;
      default: return outputStandard(false, null, '잘못된 요청입니다.', 400);
    }
    
    // 기존 { ok: true, items: [], ... } 객체를 신규 표준 포맷으로 자동 변환
    const success = result.ok;
    const message = result.message || (success ? "성공" : "요청 처리 실패");
    delete result.ok;
    delete result.message;
    
    return outputStandard(success, result, message, success ? 200 : 400);
  } catch (err) {
    return outputStandard(false, null, err.message || '서버 오류가 발생했습니다.', 500);
  }
}

function doPost(e) {
  return doGet(e);
}

// [1순위] JSON 표준 응답 생성기 (통신 규격 고정)
function outputStandard(success, data, message, code) {
  const response = { success, data: data || {}, message, code };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 파티 구성을 RAID_SCHEDULE 시트의 I~P열(9~16번째 열)에 저장합니다.
 */
function savePartyComposition(adminCode, targetDate, targetTime, partyListJson) {
  try {
    const partyArray = JSON.parse(partyListJson); // 8명의 닉네임 배열 파싱

    const ss = SpreadsheetApp.getActiveSpreadsheet(); // 환경에 따라 openById로 변경이 필요할 수 있습니다.
    const sheet = ss.getSheetByName("RAID_SCHEDULE");
    if (!sheet) return { ok: false, message: "'RAID_SCHEDULE' 시트를 찾을 수 없습니다." };

    const values = sheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < values.length; i++) {
      if (!values[i][1] || !values[i][3]) continue; // 빈 줄 건너뛰기
      
      const rowDate = Utilities.formatDate(new Date(values[i][1]), "GMT+9", "yyyy-MM-dd");
      // 구글 시트의 시간 데이터(Date 객체)를 "HH:mm" 포맷으로 정확히 변환
      const rowTime = values[i][3] instanceof Date ? Utilities.formatDate(values[i][3], "GMT+9", "HH:mm") : values[i][3].toString().substring(0, 5);
      
      if (rowDate === targetDate && rowTime === targetTime) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow !== -1) {
      // I열(9)부터 8칸(1행 8열)에 배열의 값을 그대로 덮어씁니다.
      sheet.getRange(foundRow, 9, 1, 8).setValues([partyArray]);
      return { ok: true, message: "성공적으로 저장되었습니다." };
    }
    return { ok: false, message: "해당 일정을 찾을 수 없습니다." };
  } catch (err) {
    return { ok: false, message: "저장 중 오류 발생: " + err.message };
  }
}
