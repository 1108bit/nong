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
      case 'fetchAionToolData': result = fetchAionToolData(e.parameter.characterName); break;
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
// 외부 사이트 및 NC 다이렉트 하이브리드 동기화 엔진 (Clean Ver.)
// =========================
/**
 * [그림자 레기온 전용 하이브리드 동기화 엔진]
 * 1단계: 시트에 저장된 UUID 확인
 * 2단계: 없으면 aions.kr에서 UUID 식별 (최초 1회)
 * 3단계: 획득한 UUID로 NC 공식 API 다이렉트 호출
 */
function fetchAionToolData(characterName) {
  try {
    const serverId = "2015"; // 젠카카 고정
    const sheet = getSheet(SHEET_NAMES.CHARACTERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(v => String(v).trim());
    const idCol = headers.indexOf('character_id');
    const nameCol = headers.indexOf('name');
    
    let ncCharacterId = null;
    let rowIndex = -1;

    // 1. 시트 검색: 입력받은 'characterName'과 일치하는 행을 찾습니다.
    if (idCol > -1 && nameCol > -1) {
      for (let i = 1; i < values.length; i++) {
        // 공백 제거 및 대소문자 무시 비교
        if (String(values[i][nameCol]).trim() === characterName.trim()) {
          const existingId = values[i][idCol];
          // 진짜 UUID(chQW...)가 이미 있다면 그것을 사용
          if (existingId && !String(existingId).startsWith('CHAR_')) {
            ncCharacterId = existingId;
            rowIndex = i + 1;
          }
          break;
        }
      }
    }
    
    // 2. ID 식별: 시트에 진짜 ID가 없다면 aions.kr에서 새로 찾아옵니다.
    if (!ncCharacterId) {
      // 💡 여기서 '농'이 아니라 'characterName' 변수를 사용해야 합니다!
      const searchUrl = `https://aions.kr/api/v1/characters/autocomplete?query=${encodeURIComponent(characterName)}&limit=10`;
      const searchRes = UrlFetchApp.fetch(searchUrl, {
        headers: { "Accept": "application/json", "Referer": "https://aions.kr/" }
      });
      const searchData = JSON.parse(searchRes.getContentText());
      
      // 💡 [핵심 방어] 데이터가 배열인지 확인하고, 아니면 배열로 감싸거나 내부 리스트를 추출합니다.
      let charList = [];
      if (Array.isArray(searchData)) {
        charList = searchData;
      } else if (searchData && Array.isArray(searchData.data)) {
        charList = searchData.data; // 만약 { data: [...] } 구조라면
      } else if (searchData && typeof searchData === 'object') {
        charList = [searchData]; // 단일 객체라면 배열로 변환
      }

      // 이제 charList는 무조건 배열이므로 .find를 안전하게 쓸 수 있습니다.
      const targetChar = charList.find(c => 
        (c.serverId == serverId || c.serverName === '젠카카') && 
        String(c.name || c.characterName).trim() === characterName.trim()
      );
      
      if (targetChar && targetChar.characterId) {
        ncCharacterId = targetChar.characterId;
        // 새로 찾은 ID를 시트에 즉시 업데이트 (박제)
        if (rowIndex !== -1) {
          sheet.getRange(rowIndex, idCol + 1).setValue(ncCharacterId);
        }
      }
    }

    if (!ncCharacterId) {
      return { ok: false, message: `'${characterName}' 캐릭터를 찾을 수 없습니다. 공식홈페이지 검색 결과와 일치해야 합니다.` };
    }

    // 3. 데이터 추출: 확정된 ID로 NC 공식 서버에 다이렉트 호출
    const infoUrl = `https://aion2.plaync.com/api/character/info?lang=ko&characterId=${ncCharacterId}&serverId=${serverId}`;
    const infoRes = UrlFetchApp.fetch(infoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://aion2.plaync.com/"
      }
    });
    
    const res = JSON.parse(infoRes.getContentText());
    const p = res.profile;
    const stats = res.stat ? res.stat.statList : [];
    const itemLevel = stats.find(s => s.type === "ItemLevel")?.value || "0";

    return { 
      ok: true, 
      characterId: ncCharacterId,
      name: p.characterName,
      level: p.characterLevel,
      className: p.className,
      power: p.combatPower,
      img: p.profileImage,
      itemLevel: itemLevel,
      title: p.titleName || ""
    };

  } catch (e) {
    return { ok: false, message: "엔진 구동 실패: " + e.message };
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
  if (!DISCORD_WEBHOOK_URL) return "GAS 스크립트 속성에 DISCORD_WEBHOOK_URL이 설정되지 않았습니다.";

  // 💡 [에러 원천 차단] 데이터가 깨지거나 배열이 아닐 경우 빈 배열로 덮어씌우고 무조건 8칸을 강제 확보합니다.
  const safeArray = Array.isArray(partyArray) ? partyArray : [];
  const paddedArray = Array.from({ length: 8 }, (_, i) => safeArray[i] || "");

  // 💡 [UX 디자인] 파티 슬롯별 하이테크 이모지 부여 및 파티장(1번) 강조
  const emojis = ["⚔️", "🛡️", "🪄", "🌿"];
  const formatMember = (n, i) => {
    const nameStr = n ? n : "(빈자리)";
    return i === 0 ? `${i+1}. ${emojis[i]} **${nameStr}**` : `${i+1}. ${emojis[i]} ${nameStr}`;
  };

  const p1 = paddedArray.slice(0, 4).map(formatMember).join("\n");
  const p2 = paddedArray.slice(4, 8).map(formatMember).join("\n");

  const message = {
    content: "@everyone 파티 조율이 완료되었습니다!",
    embeds: [{
      title: "⚔️ 레이드 파티 조율 완료 안내",
      description: `**${date} ${time}** 그림자 레기온의 승리를 위해 파티 구성을 업데이트했습니다.\n인게임 접속 전 본인의 파티를 반드시 확인해 주세요!`,
      color: 3447003, // 세련된 사이언 블루 (하이테크 느낌)
      fields: [
        { name: "🔹 1파티", value: p1, inline: true },
        { name: "🔹 2파티", value: p2, inline: true }
      ],
      footer: { 
        text: "SHADOW LEGION · SYSTEM MANAGER",
        icon_url: "https://i.postimg.cc/C5RSrYvD/logo-main2.png" // 💡 그림자 레기온 전용 로고 적용 완료
      },
      timestamp: new Date().toISOString() // 💡 발송 시간 타임스탬프 추가 (공식 문서 느낌)
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

// =========================
// 💡 [보안 권한 강제 활성화] 구글 앱스 스크립트 권한 팝업 호출용 미끼 함수
// 에디터 상단에서 이 함수(forceAuth)를 선택하고 [▶️ 실행]을 누르세요.
// =========================
function forceAuth() {
  UrlFetchApp.fetch("https://google.com");
}
