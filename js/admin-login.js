async function loginAdmin() {
  const adminCode = getEl("adminCode").value.trim();
  if (!adminCode) return alert("코드를 입력하세요.");

  const data = await callApi({ action: "adminLogin", adminCode });
  if (data.ok) {
    // 인증 성공 시 adminCode를 sessionStorage에 저장 (URL 노출 방지)
    sessionStorage.setItem("adminCode", adminCode);
    const params = getParams();
    location.href = `./admin.html?${params.toString()}`;
  } else {
    alert(data.message);
  }
}

getEl("loginButton").onclick = loginAdmin;
getEl("backButton").onclick = () => movePage("main.html");