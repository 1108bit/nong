const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/exec";

async function callApi(params = {}) {
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString());
  return await res.json();
}

function setMessage(targetId, message = "", isError = false) {
  const el = document.getElementById(targetId);
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function setText(id, value, fallback = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || fallback;
}

function setPlaceholder(id, value, fallback = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.placeholder = value || fallback;
}

async function initPage() {
  try {
    const data = await callApi({ action: "init" });
    if (!data.ok) return;

    const text = data.text || {};
    const image = data.image || {};

    setText("eyebrowText", text.eyebrow_text, "NSB 레기온");
    setText("siteTitle", text.site_title, "NSB 레기온 페이지");
    setText("noticeText", text.notice_text, "레기온 전용 페이지에 오신 걸 환영합니다.");
    setText("featureText1", text.feature_text_1, "본캐명 기준으로 로그인 후 내 캐릭터 정보를 확인");
    setText("featureText2", text.feature_text_2, "요일·시간 기준으로 가능한 캐릭터 취합");
    setText("featureText3", text.feature_text_3, "관리자가 파티를 직접 편성하고 참여 이력 관리");

    setText("loginTitle", text.login_title, "로그인");
    setText("loginDesc", text.login_desc, "본캐명을 입력해서 레기온 페이지에 입장해주세요.");
    setText("memberEnterTitle", text.member_enter_title, "레기온원 입장");
    setText("mainNameLabel", text.main_name_label, "본캐명");
    setPlaceholder("mainName", text.login_placeholder, "본캐명을 입력해주세요");
    setText("loginButton", text.login_button, "입장하기");

    setText("adminEnterTitle", text.admin_enter_title, "관리자 입장");
    setText("adminCodeLabel", text.admin_code_label, "관리자 코드");
    setPlaceholder("adminCode", text.admin_code_placeholder, "관리자 코드를 입력해주세요");
    setText("adminButton", text.admin_button, "관리자 페이지 입장");

    setText("footerNote", text.footer_note, "로그인 후 레기온 메인 화면으로 이동하고, 관리자 코드를 입력하면 관리자 전용 화면으로 이동하게 붙일 예정입니다.");

    const logoUrl =
      (image.IMG_LOGO && image.IMG_LOGO.url) ||
      (image.logo_main && image.logo_main.url) ||
      "";

    const bgUrl =
      (image.BG_LOGIN && image.BG_LOGIN.url) ||
      (image.login_bg && image.login_bg.url) ||
      "";

    if (logoUrl) {
      document.getElementById("logoImagePc").src = logoUrl;
      document.getElementById("logoImageMobile").src = logoUrl;
    }

    if (bgUrl) {
      document.getElementById("leftPanel").style.background =
        `linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.92)), url("${bgUrl}") center/cover no-repeat`;
    }
  } catch (e) {
    console.log(e);
  }
}

async function login() {
  const mainName = document.getElementById("mainName").value.trim();

  if (!mainName) {
    setMessage("loginResult", "본캐명을 입력해주세요.", true);
    return;
  }

  try {
    const data = await callApi({ action: "login", mainName });

    if (!data.ok) {
      setMessage("loginResult", data.message || "로그인에 실패했습니다.", true);
      return;
    }

    setMessage("loginResult", data.message || "로그인되었습니다.");

    if (data.redirectUrl) {
      location.href = data.redirectUrl;
      return;
    }

    alert("로그인 성공");
  } catch (e) {
    setMessage("loginResult", "로그인 중 오류가 발생했습니다.", true);
  }
}

async function adminLogin() {
  const adminCode = document.getElementById("adminCode").value.trim();

  if (!adminCode) {
    setMessage("adminResult", "관리자 코드를 입력해주세요.", true);
    return;
  }

  try {
    const data = await callApi({ action: "adminLogin", adminCode });

    if (!data.ok) {
      setMessage("adminResult", data.message || "관리자 인증 실패", true);
      return;
    }

    setMessage("adminResult", data.message || "관리자 인증 완료");

    if (data.redirectUrl) {
      location.href = data.redirectUrl;
      return;
    }

    alert("관리자 인증 성공");
  } catch (e) {
    setMessage("adminResult", "관리자 인증 중 오류가 발생했습니다.", true);
  }
}

document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("adminButton").addEventListener("click", adminLogin);

document.getElementById("mainName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

document.getElementById("adminCode").addEventListener("keydown", (e) => {
  if (e.key === "Enter") adminLogin();
});

initPage();