const API_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

const mainNameInput = document.getElementById("mainName");
const loginButton = document.getElementById("loginButton");
const loginResult = document.getElementById("loginResult");

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.textContent = value;
  }
}

function setPlaceholder(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.placeholder = value;
  }
}

function setMessage(message, isError = false) {
  loginResult.textContent = message || "";
  loginResult.classList.toggle("error", isError);
}

async function callApi(params) {
  const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return await res.json();
}

async function initPage() {
  try {
    const data = await callApi({ action: "init" });

    if (!data.ok) {
      setMessage(data.message || "초기 데이터 불러오기 실패", true);
      return;
    }

    const text = data.text || {};
    const image = data.image || {};

    setText("eyebrowText", text.eyebrow_text);
    setText("siteTitle", text.site_title);
    setText("noticeText", text.notice_text);
    setText("loginTitle", text.login_title);
    setText("loginDesc", text.login_desc);
    setText("mainNameLabel", text.main_name_label);
    setText("loginButton", text.login_button);
    setText("footerNote", text.footer_note);

    setPlaceholder("mainName", text.login_placeholder);

    if (image.IMG_LOGO && image.IMG_LOGO.url) {
      document.documentElement.style.setProperty(
        "--login-logo-url",
        `url("${image.IMG_LOGO.url}")`
      );
    }
  } catch (error) {
    console.error(error);
    setMessage("초기 데이터 불러오기 실패", true);
  }
}

async function login() {
  const mainName = mainNameInput.value.trim();

  if (!mainName) {
    setMessage("본캐명을 입력해주세요.", true);
    mainNameInput.focus();
    return;
  }

  setMessage("로그인 중입니다...");

  try {
    const data = await callApi({
      action: "login",
      mainName: mainName
    });

    if (!data.ok) {
      setMessage(data.message || "로그인 실패", true);
      return;
    }

    location.href = `./main.html?mainName=${encodeURIComponent(data.mainName || mainName)}&accountId=${encodeURIComponent(data.accountId || "")}`;
  } catch (error) {
    console.error(error);
    setMessage("서버 연결 실패", true);
  }
}

loginButton.addEventListener("click", login);

mainNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

initPage();