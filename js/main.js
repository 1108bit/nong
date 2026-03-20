function getMainName() {
  const params = new URLSearchParams(location.search);
  return params.get("mainName") || "레기온원";
}

function initMainPage() {
  const mainName = getMainName();
  document.getElementById("accountMainName").textContent = mainName;
}

document.getElementById("logoutButton").addEventListener("click", () => {
  location.href = "./index.html";
});

document.getElementById("addCharacterButton").addEventListener("click", () => {
  alert("캐릭터 추가 페이지는 다음 단계에서 연결 예정");
});

document.getElementById("goAvailabilityButton").addEventListener("click", () => {
  alert("시간 등록 페이지는 다음 단계에서 연결 예정");
});

document.getElementById("goPartyButton").addEventListener("click", () => {
  alert("파티 보기 페이지는 다음 단계에서 연결 예정");
});

document.getElementById("goHistoryButton").addEventListener("click", () => {
  alert("내 기록 보기 페이지는 다음 단계에서 연결 예정");
});

initMainPage();