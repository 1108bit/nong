/************************************************
 * 99. 라우팅 허브 (Routes)
 ************************************************/
function doGet(e) {
  // 디버깅용 로그: 실제로 어떤 데이터가 들어오고 있는지 GAS 실행 로그에 남깁니다.
  console.log("들어온 파라미터 전체:", JSON.stringify(e));

  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (!action) {
    return outputJson({ ok: true, message: 'NoStepBack API 서버가 정상 동작 중입니다.' });
  }

  try {
    switch (action) {
      case 'init': return outputJson(handleInit());
      case 'login': return outputJson(login(e.parameter.mainName, e.parameter.password));
      case 'getCharacters': return outputJson(getCharacters(e.parameter.accountId));
      case 'getAllCharacters': return outputJson(getAllCharacters());
      case 'addCharacter': return outputJson(addCharacter(e));
      case 'updateCharacter': return outputJson(updateCharacter(e));
      case 'deleteCharacter': return outputJson(deleteCharacter(e.parameter.accountId, e.parameter.characterName));
      case 'toggleCharacterType': return outputJson(toggleCharacterType(e.parameter.accountId, e.parameter.characterName));
      case 'getCurrentWeekKey': return outputJson(getCurrentWeekKey());
      case 'getRaidSchedule': return outputJson(getRaidSchedule(e.parameter.weekKey));
      case 'getRaidScheduleAdmin': return outputJson(getRaidScheduleAdmin(e.parameter.weekKey, e.parameter.adminCode));
      case 'saveRaidSchedule': return outputJson(saveRaidSchedule(e.parameter.weekKey, e.parameter.date, e.parameter.day, e.parameter.timeSlot, e.parameter.openYn, e.parameter.status, e.parameter.note, e.parameter.sort, e.parameter.adminCode));
      case 'deleteRaidSchedule': return outputJson(deleteRaidSchedule(e.parameter.weekKey, e.parameter.date, e.parameter.day, e.parameter.timeSlot, e.parameter.adminCode));
      case 'getAvailability': return outputJson(getAvailability(e.parameter.accountId, e.parameter.characterName, e.parameter.weekKey));
      case 'saveAvailability': return outputJson(saveAvailability(e.parameter.accountId, e.parameter.mainName, e.parameter.characterName, e.parameter.type, e.parameter.weekKey, e.parameter.slotList));
      case 'getAvailabilitySummary': return outputJson(getAvailabilitySummary(e.parameter.weekKey));
      case 'getMainData': return outputJson(getMainData(e.parameter.accountId));
      case 'validateDatabaseSchema': return outputJson(validateDatabaseSchema());
      case 'getPartyComposition': return outputJson(getPartyComposition(e.parameter.weekKey, e.parameter.day, e.parameter.time_slot));
      case 'savePartyComposition': return outputJson(savePartyComposition(e.parameter.adminCode, e.parameter.date, e.parameter.timeSlot, e.parameter.partyList));
      case 'adminLogin': return outputJson(adminLogin(e.parameter.adminCode));
      case 'updateCharacterByAdmin': return outputJson(updateCharacterByAdmin(e));
      case 'updateAdminCodeSetting': return outputJson(updateAdminCodeSetting(e.parameter.adminCode, e.parameter.newAdminCode, e.parameter.callerAccountId));
      case 'changePassword': return outputJson(changePassword(e.parameter.accountId, e.parameter.oldPassword, e.parameter.newPassword));
      case 'toggleAdminRole': return outputJson(toggleAdminRole(e.parameter.adminCode, e.parameter.targetAccountId, e.parameter.callerAccountId));
      case 'resetUserPasswordByAdmin': return outputJson(resetUserPasswordByAdmin(e.parameter.adminCode, e.parameter.targetAccountId));
      default: return outputJson({ ok: false, message: '잘못된 요청입니다.' });
    }
  } catch (err) {
    return outputJson({ ok: false, message: err.message || '오류가 발생했습니다.' });
  }
}

function doPost(e) {
  return doGet(e);
}

// JSON 응답을 반환하고 CORS 에러를 방지하는 필수 함수
function outputJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
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
      const rowDate = Utilities.formatDate(new Date(values[i][1]), "GMT+9", "yyyy-MM-dd");
      const rowTime = values[i][3].toString(); // 시간 데이터 형식 (주의: 시트 포맷에 따라 보정이 필요할 수 있음)
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
