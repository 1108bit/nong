/************************************************
 * 99. 라우팅 허브 (Routes)
 ************************************************/

// 💡 [보안] 디스코드 웹훅 URL은 코드에 노출하지 않고 GAS 스크립트 속성(비밀 금고)에서 안전하게 불러옵니다.
const DISCORD_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');

// 💡 [동시성 보수적 잠금] 구글 시트의 치명적인 단점(행 밀림 삭제 버그, 중복 가입 등)을 원천 차단하기 위해
// 데이터를 조금이라도 수정하는 "모든 쓰기(Write) 작업"에 스크립트 락을 엄격하게 적용합니다.
const WRITE_ACTIONS = [
  'login', // 신규 유저 첫 로그인 시 시트에 추가(createAccount)되므로 락 필수
  'addCharacter', 'updateCharacter', 'deleteCharacter', 'toggleCharacterType',
  'saveRaidSchedule', 'deleteRaidSchedule', 'saveAvailability', 'savePartyComposition',
  'updateCharacterByAdmin', 'updateAdminCodeSetting', 'changePassword',
  'toggleAdminRole', 'resetUserPasswordByAdmin', 'saveNotice'
];

function doGet(e) {
  // 디버깅용 로그: 실제로 어떤 데이터가 들어오고 있는지 GAS 실행 로그에 남깁니다.
  console.log("들어온 파라미터 전체:", JSON.stringify(e));

  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (!action) {
    return outputStandard(true, null, "LEGION MANAGER API 서버가 정상 동작 중입니다.", 200);
  }

  let lock = null;

  try {
    // 💡 [동시성 방어벽] 쓰기 작업 시 락을 걸어 구글 시트 데이터 덮어쓰기 및 행 밀림 대참사 완벽 방어
    if (WRITE_ACTIONS.includes(action)) {
      lock = LockService.getScriptLock();
      // 💡 [개선] 구글 시트 쓰기 지연을 고려해 대기 시간을 15초(15000ms)로 연장
      if (!lock.tryLock(15000)) {
        return outputStandard(false, null, "현재 접속자가 많아 서버가 혼잡합니다. 잠시 후 자동으로 다시 시도합니다.", 429);
      }
    }

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
      case 'savePartyComposition': result = savePartyComposition(e.parameter.adminCode, e.parameter.date, e.parameter.timeSlot, e.parameter.partyList, e.parameter.sendDiscord); break;
      case 'adminLogin': result = adminLogin(e.parameter.adminCode); break;
      case 'updateCharacterByAdmin': result = updateCharacterByAdmin(e); break;
      case 'updateAdminCodeSetting': result = updateAdminCodeSetting(e.parameter.adminCode, e.parameter.newAdminCode, e.parameter.callerAccountId); break;
      case 'changePassword': result = changePassword(e.parameter.accountId, e.parameter.oldPassword, e.parameter.newPassword); break;
      case 'toggleAdminRole': result = toggleAdminRole(e.parameter.adminCode, e.parameter.targetAccountId, e.parameter.callerAccountId); break;
      case 'resetUserPasswordByAdmin': result = resetUserPasswordByAdmin(e.parameter.adminCode, e.parameter.targetAccountId); break;
      case 'getNotice': result = getNotice(); break;
      case 'saveNotice': result = saveNotice(e.parameter.adminCode, e.parameter.notice); break;
      default: return outputStandard(false, null, '잘못된 요청입니다.', 400);
    }
    
    // 기존 { ok: true, items: [], ... } 객체를 신규 표준 포맷으로 자동 변환
    const success = result ? result.ok !== false : false; // ok 속성이 없어도 데이터가 있으면 성공으로 간주
    const message = (result && result.message) ? result.message : (success ? "성공" : "요청 처리 실패");
    
    if (result && typeof result === 'object') {
      delete result.ok;
      delete result.message;
    }
    
    return outputStandard(success, result, message, success ? 200 : 400);
  } catch (err) {
    return outputStandard(false, null, err.message || '서버 오류가 발생했습니다.', 500);
  } finally {
    // 💡 락(Lock) 해제: 통신이 성공하든 실패하든 무조건 마지막에 락을 풀어주어 다음 유저가 쓸 수 있게 함
    if (lock) lock.releaseLock();
  }
}

// =========================
// 공지사항 관리 (빠른 응답을 위해 PropertiesService 활용)
// =========================
function getNotice() {
  return { ok: true, notice: PropertiesService.getScriptProperties().getProperty('LEGION_NOTICE') || '' };
}
function saveNotice(adminCode, notice) {
  const auth = adminLogin(adminCode);
  if (!auth.ok) return auth;
  PropertiesService.getScriptProperties().setProperty('LEGION_NOTICE', notice || '');
  return { ok: true, message: '공지사항이 저장되었습니다.' };
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
function savePartyComposition(adminCode, targetDate, targetTime, partyListJson, sendDiscord) {
  try {
    const partyArray = JSON.parse(partyListJson); // 8명의 닉네임 배열 파싱

    // 💡 [버그 수정] getActiveSpreadsheet() 대신 안정적인 공통 헬퍼 getSheet() 사용
    const sheet = getSheet(SHEET_NAMES.RAID_SCHEDULE);

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(v => String(v).trim());
    const dateCol = headers.indexOf('date');
    const timeCol = headers.indexOf('time_slot');
    const p1Col = headers.indexOf('p1');

    if (dateCol === -1 || timeCol === -1) {
      return { ok: false, message: "시트에서 'date' 또는 'time_slot' 컬럼을 찾을 수 없습니다." };
    }

    let foundRow = -1;

    for (let i = 1; i < values.length; i++) {
      if (!values[i][dateCol] || !values[i][timeCol]) continue; // 빈 줄 건너뛰기
      
      // 💡 [버그 수정] 하드코딩된 변환 대신 완벽한 공통 헬퍼 함수를 사용하여 비교
      const rowDate = formatDate(values[i][dateCol]);
      const rowTime = formatTime(values[i][timeCol]);
      
      if (rowDate === targetDate && rowTime === targetTime) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow !== -1) {
      // p1 열이 없으면 기본값으로 I열(9)부터 8칸에 배열의 값을 그대로 덮어씁니다.
      const targetCol = p1Col !== -1 ? p1Col + 1 : 9;
      sheet.getRange(foundRow, targetCol, 1, 8).setValues([partyArray]);
      SpreadsheetApp.flush(); // 💡 구글 시트에 즉시 쓰기 강제 확정
      
      // 💡 프론트엔드에서 '디코 전송' 버튼을 눌렀을 때만 웹훅 전송
      if (sendDiscord === 'true') {
        const discordResult = sendDiscordNotification(targetDate, targetTime, partyArray);
        if (discordResult !== true) {
          return { ok: true, message: "시트에는 저장되었으나 디코 전송에 실패했습니다.\n(원인: " + discordResult + ")" };
        }
      }
      
      return { ok: true, message: "성공적으로 저장되었습니다." };
    }
    return { ok: false, message: "해당 일정을 찾을 수 없습니다." };
  } catch (err) {
    return { ok: false, message: "저장 중 오류 발생: " + err.message };
  }
}

// =========================
// 디스코드 웹훅 알림 발송 로직
// =========================
function sendDiscordNotification(date, time, partyArray) {
  if (!DISCORD_WEBHOOK_URL) return; // URL이 없으면 작동하지 않음

  // 💡 [에러 원천 차단] 데이터가 깨지거나 배열이 아닐 경우 빈 배열로 덮어씌우고 무조건 8칸을 강제 확보합니다.
  const safeArray = Array.isArray(partyArray) ? partyArray : [];
  const paddedArray = Array.from({ length: 8 }, (_, i) => safeArray[i] || "");

  const p1 = paddedArray.slice(0, 4).map((n, i) => n ? `${i+1}. ${n}` : `${i+1}. (빈자리)`).join("\n");
  const p2 = paddedArray.slice(4, 8).map((n, i) => n ? `${i+1}. ${n}` : `${i+1}. (빈자리)`).join("\n");

  const message = {
    content: "@everyone 파티 조율이 완료되었습니다!",
    embeds: [{
      title: "⚔️ 파티 조율 완료 안내",
      description: `**${date} ${time}** 레이드 파티 구성이 업데이트되었습니다.\n인게임 접속 전 파티를 확인해 주세요!`,
      color: 4445183, // 그림자 레기온의 시그니처 Cyan 블루 색상
      fields: [
        { name: "🔹 1파티", value: p1, inline: true },
        { name: "🔹 2파티", value: p2, inline: true }
      ],
      footer: { text: "그림자 · LEGION MANAGER" }
    }]
  };

  try {
    UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, { method: "post", contentType: "application/json", payload: JSON.stringify(message) });
    return true;
  } catch (e) {
    console.error("디스코드 알림 발송 실패:", e);
    return e.message;
  }
}
