const API_URL = "https://script.google.com/macros/s/AKfycbxgoannrkzyrAaIF8FeJP-ZJyFUrhdtT1d_iJdrY0JiJwqebPYbToS5r-nUYp6Ow-2fYw/exec";

async function callApi(params) {
  try {
    console.log(`➡️ [API 요청] ${params.action} :`, params);
    
    const hideAlert = params.hideAlert;
    delete params.hideAlert; // 서버로 전송할 필요 없는 프론트엔드 전용 옵션
    
    params.t = new Date().getTime(); // 캐싱 강력 방지
    const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
    
    const res = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP 오류 (${res.status})`);
    
    const json = await res.json();
    console.log(`⬅️ [API 응답] ${params.action} :`, json);
    
    // 💡 [1순위] 통합 에러 핸들링: 실패 시 공통 알림창을 띄워 개별 화면의 중복 코드를 제거
    if (!json.success) {
      alert(json.message || "서버 통신 중 오류가 발생했습니다.");
    }
    return json;
  } catch (e) {
    console.error("❌ [API 연결 실패]:", e);
    alert(`통신 오류가 발생했습니다: ${e.message}`);
    return { success: false, data: {}, message: `통신 차단됨: ${e.message}`, code: 500 };
  }
}