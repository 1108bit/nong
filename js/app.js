const mainNameInput = document.getElementById("mainName");
const loginButton = document.getElementById("loginButton");
const loginResult = document.getElementById("loginResult");

function setMessage(message, isError = false) {
  loginResult.textContent = message;
  loginResult.classList.toggle("error", isError);
}

function login() {
  const mainName = mainNameInput.value.trim();

  if (!mainName) {
    setMessage("본캐명을 입력해주세요.", true);
    mainNameInput.focus();
    return;
  }

  setMessage("입장 중입니다...");

  const moveUrl = `./main.html?mainName=${encodeURIComponent(mainName)}`;
  location.href = moveUrl;
}

loginButton.addEventListener("click", login);

mainNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});