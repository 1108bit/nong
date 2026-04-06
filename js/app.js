// 페이지 로드 시 자동 로그인 체크
window.addEventListener("DOMContentLoaded", () => {
  // 💡 로그인 화면 접속 시 무조건 스플래시 스크린 재생 (F5 새로고침 테스트 가능)
  const splash = document.getElementById('splashScreen');
  const splashDelay = 3600; // 스플래시 대기 시간 고정

  if (splash) {
    splash.style.display = 'flex';
    splash.classList.remove('hidden');
    setTimeout(() => {
      splash.classList.add('hidden');
    }, splashDelay);
  }

  const autoAccountId = localStorage.getItem("autoAccountId");
  const autoMainName = localStorage.getItem("autoMainName");
  
  if (autoAccountId && autoMainName) {
    // 💡 자동 로그인 시, 스플래시가 재생 중이면 끝날 때까지 기다렸다가 우아하게 메인으로 이동
    setTimeout(() => {
      const isAdmin = localStorage.getItem("autoIsAdmin") === "true";
      if (isAdmin) {
        sessionStorage.setItem("isAdmin", "true");
        const adminCode = localStorage.getItem("autoAdminCode");
        if (adminCode) sessionStorage.setItem("adminCode", adminCode);
      }
      if (autoAccountId === "MASTER_ADMIN") {
        location.href = `./admin.html?mainName=${encodeURIComponent(autoMainName)}&accountId=${autoAccountId}`;
      } else {
        location.href = `./main.html?mainName=${encodeURIComponent(autoMainName)}&accountId=${autoAccountId}`;
      }
    }, splashDelay);
  }
});

async function login() {
  const mainNameInput = getEl("mainName");
  const mainName = mainNameInput.value.trim();
  const passwordInput = getEl("password");
  const password = passwordInput ? passwordInput.value.trim() : "";
  const isAutoLogin = getEl("autoLoginCheck")?.checked;
  const resultEl = getEl("loginResult");

  if (!mainName) {
    resultEl.textContent = "본캐명을 입력해주세요.";
    resultEl.classList.add("error");
    return;
  }
  if (!password) {
    resultEl.textContent = "비밀번호를 입력해주세요.";
    resultEl.classList.add("error");
    return;
  }

  resultEl.textContent = "확인 중입니다...";
  resultEl.classList.remove("error"); // 이전 에러 텍스트 스타일(빨간색) 초기화
  const data = await callApi({ action: "login", mainName, password, hideAlert: true });

  if (data.success) {
    if (data.data.isAdmin) {
      sessionStorage.setItem("isAdmin", "true");
      if (data.data.adminCode) sessionStorage.setItem("adminCode", data.data.adminCode);
    } else {
      sessionStorage.removeItem("isAdmin");
      sessionStorage.removeItem("adminCode");
    }

    if (isAutoLogin) {
      localStorage.setItem("autoAccountId", data.data.accountId);
      localStorage.setItem("autoMainName", data.data.mainName);
      if (data.data.isAdmin) {
        localStorage.setItem("autoIsAdmin", "true");
        if (data.data.adminCode) localStorage.setItem("autoAdminCode", data.data.adminCode);
      } else {
        localStorage.removeItem("autoIsAdmin");
        localStorage.removeItem("autoAdminCode");
      }
    } else {
      localStorage.removeItem("autoAccountId");
      localStorage.removeItem("autoMainName");
      localStorage.removeItem("autoIsAdmin");
      localStorage.removeItem("autoAdminCode");
    }

    if (data.data.accountId === "MASTER_ADMIN") {
      location.href = `./admin.html?mainName=${encodeURIComponent(data.data.mainName)}&accountId=${data.data.accountId}`;
    } else {
      location.href = `./main.html?mainName=${encodeURIComponent(data.data.mainName)}&accountId=${data.data.accountId}`;
    }
  } else {
    resultEl.textContent = data.message || "입장에 실패했습니다.";
    resultEl.classList.add("error");
  }
}

getEl("loginButton").onclick = login;
getEl("mainName").onkeydown = (e) => { if(e.key === "Enter") getEl("password").focus(); };
const pwdEl = getEl("password");
if (pwdEl) pwdEl.onkeydown = (e) => { if(e.key === "Enter") login(); };

// =========================
// 관리자 이스터에그 (3번 연속 터치)
// =========================
let adminClickCount = 0;
let adminClickTimer = null;

const adminSecretBtn = getEl("adminSecretBtn");
if (adminSecretBtn) {
  adminSecretBtn.addEventListener("click", async () => {
    adminClickCount++;
    clearTimeout(adminClickTimer);
    // 1초 내에 이어서 누르지 않으면 횟수 초기화
    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 1000);
    
    if (adminClickCount >= 3) {
      adminClickCount = 0;
      const code = await uiPrompt("마스터 계정으로 접속합니다. 관리자 코드를 입력하세요.");
      if (!code) return;
      
      const res = await callApi({ action: "adminLogin", adminCode: code });
      if (res.success) {
        sessionStorage.setItem("isAdmin", "true");
        sessionStorage.setItem("adminCode", code);
        location.href = `./admin.html?mainName=${encodeURIComponent('👑 마스터')}&accountId=MASTER_ADMIN`;
      }
    }
  });
}

// =========================
// 비밀번호 찾기 모달 로직
// =========================
const forgotBtn = getEl("forgotPasswordBtn");
const helpModal = getEl("helpModal");

function closeHelpModal() {
  helpModal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

if (forgotBtn) forgotBtn.onclick = () => { helpModal.classList.add("show"); document.body.classList.add("modal-open"); };
if (getEl("closeHelpModalBtn")) getEl("closeHelpModalBtn").onclick = closeHelpModal;
if (getEl("confirmHelpModalBtn")) getEl("confirmHelpModalBtn").onclick = closeHelpModal;