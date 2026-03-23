// 페이지 로드 시 자동 로그인 체크
window.addEventListener("DOMContentLoaded", () => {
  const autoAccountId = localStorage.getItem("autoAccountId");
  const autoMainName = localStorage.getItem("autoMainName");
  
  if (autoAccountId && autoMainName) {
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
  const data = await callApi({ action: "login", mainName, password });

  if (data.ok) {
    if (data.isAdmin) {
      sessionStorage.setItem("isAdmin", "true");
      if (data.adminCode) sessionStorage.setItem("adminCode", data.adminCode);
    } else {
      sessionStorage.removeItem("isAdmin");
      sessionStorage.removeItem("adminCode");
    }

    if (isAutoLogin) {
      localStorage.setItem("autoAccountId", data.accountId);
      localStorage.setItem("autoMainName", data.mainName);
      if (data.isAdmin) {
        localStorage.setItem("autoIsAdmin", "true");
        if (data.adminCode) localStorage.setItem("autoAdminCode", data.adminCode);
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

    if (data.accountId === "MASTER_ADMIN") {
      location.href = `./admin.html?mainName=${encodeURIComponent(data.mainName)}&accountId=${data.accountId}`;
    } else {
      location.href = `./main.html?mainName=${encodeURIComponent(data.mainName)}&accountId=${data.accountId}`;
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
      const code = prompt("마스터 계정으로 접속합니다. 관리자 코드를 입력하세요.");
      if (!code) return;
      
      const res = await callApi({ action: "adminLogin", adminCode: code });
      if (res.ok) {
        sessionStorage.setItem("isAdmin", "true");
        sessionStorage.setItem("adminCode", code);
        location.href = `./admin.html?mainName=${encodeURIComponent('👑 마스터')}&accountId=MASTER_ADMIN`;
      } else {
        alert("관리자 코드가 일치하지 않습니다.");
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