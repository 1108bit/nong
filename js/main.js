function getMainName() {
  const params = new URLSearchParams(location.search);
  return params.get("mainName") || "";
}

function initMainPage() {
  const mainName = getMainName();

  if (!mainName) {
    location.href = "./index.html";
    return;
  }

  document.getElementById("accountMainName").textContent = mainName;
  document.getElementById("characterCount").textContent = "-";
  document.getElementById("weeklyRunCount").textContent = "0 / 2";
}

function moveNotReady(pageName) {
  alert(pageName + " 기능은 다음 단계에서 연결 예정");
}

document.getElementById("logoutButton").addEventListener("click", () => {
  location.href = "./index.html";
});

document.getElementById("addCharacterButton").addEventListener("click", () => {
  moveNotReady("캐릭터 추가");
});

document.getElementById("goAvailabilityButton").addEventListener("click", () => {
  moveNotReady("시간 등록");
});

document.getElementById("goPartyButton").addEventListener("click", () => {
  moveNotReady("파티 보기");
});

document.getElementById("goHistoryButton").addEventListener("click", () => {
  moveNotReady("내 기록 보기");
});

initMainPage();