// 페이지 로드 시 자동 로그인 체크
window.addEventListener("DOMContentLoaded", () => {
  // 💡 로그인 화면 접속 시 무조건 스플래시 스크린 재생 (F5 새로고침 테스트 가능)
  const splash = document.getElementById('splashScreen');
  const splashDelay = 1500; // 💡 [UX 향상] 애플 HIG 권장 사항에 따라 지루한 인트로를 1.5초로 대폭 단축

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
    // 💡 [초고속 진입] 자동 로그인 유저는 1.5초를 다 기다리지 않고, 0.4초 만에 스킵하여 즉시 메인으로 하이패스!
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
    }, 400);
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
if (pwdEl) {
  pwdEl.onkeydown = (e) => { if(e.key === "Enter") login(); };
  // 💡 [UX 향상] 비밀번호 4자리가 입력되면 버튼을 누르지 않아도 즉시 자동 로그인 시도
  pwdEl.addEventListener("input", (e) => {
    if (e.target.value.length === 4) {
      e.target.blur(); // 모바일 가상 키보드 부드럽게 숨기기
      login();
    }
  });
}

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

// 💡 무거운 커스텀 HTML 모달 대신, 세련된 애플 시스템 알럿(uiAlert)으로 교체하여 일관성 확보
if (forgotBtn) forgotBtn.onclick = async () => { 
  await uiAlert("비밀번호가 기억나지 않으신가요?\n\n운영진에게 문의하여 '비밀번호 초기화'를 요청해 주세요.\n\n초기화 완료 후 임시 비밀번호는 [0000]이 됩니다."); 
};