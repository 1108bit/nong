async function login() {
  const mainNameInput = getEl("mainName");
  const mainName = mainNameInput.value.trim();
  const resultEl = getEl("loginResult");

  if (!mainName) {
    resultEl.textContent = "본캐명을 입력해주세요.";
    resultEl.classList.add("error");
    return;
  }

  resultEl.textContent = "확인 중입니다...";
  const data = await callApi({ action: "login", mainName });

  if (data.ok) {
    location.href = `./main.html?mainName=${encodeURIComponent(data.mainName)}&accountId=${data.accountId}`;
  } else {
    resultEl.textContent = data.message || "입장에 실패했습니다.";
    resultEl.classList.add("error");
  }
}

getEl("loginButton").onclick = login;
getEl("mainName").onkeydown = (e) => { if(e.key === "Enter") login(); };

// =========================
// 관리자 이스터에그 (5번 연속 터치)
// =========================
let adminClickCount = 0;
let adminClickTimer = null;

const adminSecretBtn = getEl("adminSecretBtn");
if (adminSecretBtn) {
  adminSecretBtn.addEventListener("click", () => {
    adminClickCount++;
    clearTimeout(adminClickTimer);
    // 1초 내에 이어서 누르지 않으면 횟수 초기화
    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 1000);
    
    if (adminClickCount >= 3) {
      adminClickCount = 0;
      location.href = "admin-login.html"; // 3번 누르면 관리자 로그인 화면으로 이동
    }
  });
}