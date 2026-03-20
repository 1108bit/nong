:root {
  --bg: #081018;
  --bg2: #0d1621;
  --card: rgba(12, 20, 30, 0.82);
  --line: rgba(255, 255, 255, 0.08);
  --text: #f8fafc;
  --sub: #94a3b8;
  --green: #03c75a;
  --green-dark: #02b350;
  --green-soft: rgba(3, 199, 90, 0.18);
  --danger: #f87171;
  --shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top, rgba(18, 36, 58, 0.5), transparent 40%),
    linear-gradient(180deg, var(--bg), var(--bg2));
}

.app-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 18px;
}

.bg-logo {
  position: absolute;
  inset: 0;
  background: url("../images/logo_main1.png") center center / min(76vw, 620px) no-repeat;
  opacity: 0.12;
  filter: blur(1px);
  transform: translateY(-10px);
  pointer-events: none;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, rgba(6, 182, 212, 0.08), transparent 30%),
    linear-gradient(180deg, rgba(4, 10, 18, 0.32), rgba(4, 10, 18, 0.76));
  pointer-events: none;
}

.login-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  display: grid;
  gap: 18px;
}

.login-brand {
  text-align: center;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 14px;
}

.brand-title {
  margin: 0;
  font-size: 36px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.brand-sub {
  margin: 10px 0 0;
  color: var(--sub);
  font-size: 15px;
  line-height: 1.5;
}

.login-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 24px 20px 20px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
}

.login-head {
  margin-bottom: 20px;
}

.login-title {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.login-desc {
  margin: 0;
  color: var(--sub);
  font-size: 14px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 14px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  color: #dbeafe;
  font-size: 13px;
  font-weight: 700;
}

.main-input {
  width: 100%;
  height: 54px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(8, 15, 24, 0.88);
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.main-input::placeholder {
  color: #64748b;
}

.main-input:focus {
  border-color: rgba(3, 199, 90, 0.7);
  box-shadow: 0 0 0 4px rgba(3, 199, 90, 0.12);
  background: rgba(8, 15, 24, 0.96);
}

.main-button {
  width: 100%;
  height: 54px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, var(--green), var(--green-dark));
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 12px 24px rgba(3, 199, 90, 0.18);
}

.main-button:hover {
  filter: brightness(1.03);
}

.main-button:active {
  transform: scale(0.99);
}

.result {
  min-height: 20px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--sub);
  line-height: 1.5;
}

.result.error {
  color: var(--danger);
}

@media (max-width: 480px) {
  .app-page {
    padding: 20px 16px;
  }

  .login-shell {
    max-width: 100%;
  }

  .brand-title {
    font-size: 32px;
  }

  .brand-sub {
    font-size: 14px;
  }

  .login-card {
    padding: 22px 16px 18px;
    border-radius: 22px;
  }

  .login-title {
    font-size: 22px;
  }

  .main-input,
  .main-button {
    height: 52px;
    font-size: 15px;
  }

  .bg-logo {
    background-size: 92vw;
    opacity: 0.1;
  }
}