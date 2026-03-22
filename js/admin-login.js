async function loginAdmin() {
  const adminCode = getEl("adminCode").value.trim();
  if (!adminCode) return alert("코드를 입력하세요.");

  const data = await callApi({ action: "adminLogin", adminCode });
  if (data.ok) {
    // 인증 성공 시 adminCode를 주소에 담아 이동
    const params = getParams();
    params.set("adminCode", adminCode);
    location.href = `./admin.html?${params.toString()}`;
  } else {
    alert(data.message);
  }
}

getEl("loginButton").onclick = loginAdmin;
getEl("backButton").onclick = () => movePage("main.html");