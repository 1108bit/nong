const API_URL = "https://script.google.com/macros/s/AKfycbxgoannrkzyrAaIF8FeJP-ZJyFUrhdtT1d_iJdrY0JiJwqebPYbToS5r-nUYp6Ow-2fYw/exec";

let globalLoadingTimeout;
let globalLoadingEl;

function showGlobalLoading() {
  if (!globalLoadingEl) {
    globalLoadingEl = document.createElement("div");
    globalLoadingEl.id = "globalLoadingOverlay";
    globalLoadingEl.innerHTML = `
      <div style="background: rgba(30, 30, 30, 0.75); padding: 36px 40px 32px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column; align-items: center; box-shadow: 0 24px 48px rgba(0,0,0,0.5); backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%); transform: scale(1.15); opacity: 0; animation: appleAlertPop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;">
        <div class="spinner-icon large" style="margin-bottom: 20px; width: 40px; height: 40px; border-width: 3.5px;"></div>
        <div id="globalLoadingText" style="font-size: 15px; font-weight: 600; color: #fff; text-align: center; letter-spacing: -0.01em;">처리 중...</div>
        <div id="globalLoadingSubText" style="font-size: 13px; font-weight: 400; color: rgba(255, 255, 255, 0.6); margin-top: 12px; opacity: 0; transition: opacity 0.5s ease; text-align: center; line-height: 1.4;">서버와 동기화 중입니다<br><span style="font-size: 11px; opacity: 0.7;">잠시만 기다려주세요</span></div>
      </div>
    `;
    globalLoadingEl.style.position = "fixed"; globalLoadingEl.style.inset = "0"; globalLoadingEl.style.zIndex = "9999";
    globalLoadingEl.style.display = "none"; globalLoadingEl.style.alignItems = "center"; globalLoadingEl.style.justifyContent = "center";
    globalLoadingEl.style.background = "rgba(0, 0, 0, 0.4)"; globalLoadingEl.style.backdropFilter = "blur(4px)"; globalLoadingEl.style.WebkitBackdropFilter = "blur(4px)"; globalLoadingEl.style.transition = "opacity 0.3s ease";
    document.body.appendChild(globalLoadingEl);
  }
  
  document.getElementById("globalLoadingSubText").style.opacity = "0";
  globalLoadingEl.style.opacity = "1";
  globalLoadingEl.style.display = "flex";

  // 1.2초 이상 응답이 안 오면 대기 안내 문구 표시 (Lock 병목 상황)
  globalLoadingTimeout = setTimeout(() => { document.getElementById("globalLoadingSubText").style.opacity = "1"; }, 1200);
}

function hideGlobalLoading() {
  clearTimeout(globalLoadingTimeout);
  if (globalLoadingEl) {
    globalLoadingEl.style.opacity = "0";
    setTimeout(() => { globalLoadingEl.style.display = "none"; }, 200);
  }
}

async function callApi(params, retries = 3) {
  // 💡 [구조 개선] 하드코딩된 배열 대신, 액션명 패턴(save, update 등)으로 쓰기 작업을 자동 감지하여 로딩창 렌더링
  const isWriteAction = params.showLoading === true || /^(save|update|delete|add|toggle|reset|login)/i.test(params.action);
  const isBackground = params.background; // 명시적으로 백그라운드 요청인 경우 오버레이 제외

  try {
    console.log(`➡️ [API 요청] ${params.action} :`, params);
    
    const hideAlert = params.hideAlert;
    delete params.hideAlert; // 서버로 전송할 필요 없는 프론트엔드 전용 옵션
    delete params.background;

    if (isWriteAction && !isBackground) showGlobalLoading();
    
    params.t = new Date().getTime(); // 캐싱 강력 방지
    const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
    
    const res = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP 오류 (${res.status})`);
    
    const json = await res.json();
    console.log(`⬅️ [API 응답] ${params.action} :`, json);
    
    // 💡 [궁극의 방어 코드] 구글 서버 갱신 지연으로 옛날 규격({ok:true})이 오더라도 프론트에서 강제로 새 규격으로 포장!
    if (typeof json.success === 'undefined' && json.ok !== undefined) {
      json.success = json.ok;
      json.data = { ...json };
      console.log(`♻️ [데이터 호환성 패치 적용 완료]`);
    }

    // 💡 [구글 시트 한계 극복] LockService 타임아웃(HTTP 429) 발생 시 유저에게 에러를 띄우지 않고 자동 재시도 (최대 3회)
    if (json.code === 429 && retries > 0) {
      console.warn(`⏳ [동시 접근 병목] 서버 혼잡. ${retries}회 재시도 대기 중...`);
      // 다수가 동시에 재시도하여 또 충돌하는 것을 막기 위해 1.5초 ~ 2.5초 사이의 랜덤한 시간 동안 대기(Jitter) 후 재요청
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
      return callApi(params, retries - 1);
    }

    // 💡 [1순위] 통합 에러 핸들링: 실패 시 공통 알림창을 띄워 개별 화면의 중복 코드를 제거
    if (!json.success && !hideAlert) {
      await uiAlert(json.message || "서버 통신 중 오류가 발생했습니다.");
    }
    
    if (isWriteAction && !isBackground) hideGlobalLoading();
    return json;
  } catch (e) {
    if (isWriteAction && !isBackground) hideGlobalLoading();
    console.error("❌ [API 연결 실패]:", e);
    await uiAlert(`통신 오류가 발생했습니다: ${e.message}`);
    return { success: false, data: {}, message: `통신 차단됨: ${e.message}`, code: 500 };
  }
}