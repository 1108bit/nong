const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

// 서버 통신 함수
async function callApi(params) {
  try {
    const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error("연결 오류:", e);
    return { ok: false, message: "서버 연결에 실패했습니다." };
  }
}

// URL 정보 추출 (accountId, mainName 등)
function getParams() { return new URLSearchParams(location.search); }
function getAccountId() { return getParams().get("accountId") || ""; }
function getMainName() { return decodeURIComponent(getParams().get("mainName") || ""); }function getAdminCode() { return sessionStorage.getItem("adminCode") || ""; }
// 요소 선택 및 텍스트 설정
function getEl(id) { return document.getElementById(id); }
function setText(id, value) { 
  const el = getEl(id);
  if (el) el.textContent = value !== undefined ? value : "-";
}

// HTML 특수문자 치환 (보안)
function escapeHtml(v) {
  return String(v || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

// 터치 피드백 애니메이션 적용
function applyTouchPop() {
  document.querySelectorAll(".btn, .main-button, .character-card, .availability-item, .bottom-action-btn").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.remove("touch-pop");
      void el.offsetWidth;
      el.classList.add("touch-pop");
    });
  });
}

// 페이지 이동 (파라미터 유지)
function movePage(url) {
  location.href = `${url}?${getParams().toString()}`;
}

// 숫자를 50 단위 구간 텍스트로 변환하는 함수
function getPowerRange(power) {
  const p = Number(power) || 0;
  const start = Math.floor(p / 50) * 50;
  const end = start + 50;
  return `${start} 이상 ~ ${end} 미만`;
}