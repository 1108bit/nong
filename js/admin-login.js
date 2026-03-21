const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

function getParams() {
  return new URLSearchParams(location.search);
}

function getMainName() {
  return getParams().get("mainName") || "";
}

function getAccountId() {
  return getParams().get("accountId") || "";
}

function setMessage(message, isError = false) {
  const el = document.getElementById("loginMessage");
  if (!el) return;

  el.textContent = message || "";
  el.classList.toggle("error", isError);
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

async function loginAdmin() {
  const adminCode = document.getElementById("adminCode").value.trim();

  if (!adminCode) {
    setMessage("관리자 코드를 입력해주세요.", true);
    return;
  }

  try {
    setMessage("확인 중입니다...");

    const data = await callApi({
      action: "adminLogin",
      adminCode
    });

    if (!data.ok) {
      setMessage(data.message || "관리자 확인에 실패했습니다.", true);
      return;
    }

    const mainName = encodeURIComponent(getMainName());
    const accountId = encodeURIComponent(getAccountId());
    const code = encodeURIComponent(adminCode);

    location.href = `./admin.html?mainName=${mainName}&accountId=${accountId}&adminCode=${code}`;
  } catch (error) {
    console.error(error);
    setMessage("관리자 확인 중 문제가 발생했습니다.", true);
  }
}

document.getElementById("loginButton").addEventListener("click", loginAdmin);

document.getElementById("adminCode").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loginAdmin();
  }
});

document.getElementById("backButton").addEventListener("click", () => {
  const mainName = encodeURIComponent(getMainName());
  const accountId = encodeURIComponent(getAccountId());
  location.href = `./main.html?mainName=${mainName}&accountId=${accountId}`;
});