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