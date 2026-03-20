function getMainName() {
  const params = new URLSearchParams(location.search);
  return params.get("mainName") || "레기온원";
}

function initMainPage() {
  const mainName = getMainName();

  // 본캐명 표시
  document.getElementById("accountMainName").textContent = mainName;

  // (임시 데이터 - 나중에 DB 연결 예정)
  document.getElementById("characterCount").textContent = "3";
  document.getElementById("weeklyRunCount").textContent = "1 / 2";
}

// 로그아웃
document.getElementById("logoutButton").addEventListener("click", () => {
  location.href = "./index.html";
});

// 캐릭터 추가
document.getElementById("addCharacterButton").addEventListener("click", () => {
  alert("캐릭터 추가 페이지는 다음 단계에서 연결 예정");
});

// 시간 등록 이동
document.getElementById("goAvailabilityButton").addEventListener("click", () => {
  alert("시간 등록 페이지는 다음 단계에서 연결 예정");
});

// 파티 보기 이동
document.getElementById("goPartyButton").addEventListener("click", () => {
  alert("파티 보기 페이지는 다음 단계에서 연결 예정");
});

// 내 기록 보기 이동
document.getElementById("goHistoryButton").addEventListener("click", () => {
  alert("내 기록 보기 페이지는 다음 단계에서 연결 예정");
});

// 초기 실행
initMainPage();