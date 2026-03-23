/************************************************
 * 99. 라우팅 허브 (Routes)
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
