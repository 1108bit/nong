// URL 정보 추출 (accountId, mainName 등)

function getParameter(key) {
  const urlParams = new URLSearchParams(location.search);
  const urlValue = urlParams.get(key) || '';
  return urlValue;
}

function getAccountId() {
  const urlId = getParameter('accountId');
  if (urlId) {
    sessionStorage.setItem('accountId', urlId);
    return urlId;
  }
  return sessionStorage.getItem('accountId') || '';
}

function getMainName() {
  const urlName = decodeURIComponent(getParameter('mainName') || '');
  if (urlName) {
    sessionStorage.setItem('mainName', urlName);
    return urlName;
  }
  return sessionStorage.getItem('mainName') || '';
}

function getAdminCode() {
  return sessionStorage.getItem('adminCode') || '';
}

// 새로운 함수
function clearSessionStorage() {
    sessionStorage.clear();
}
// 요소 선택 및 텍스트 설정
function setText(id, value) { 
  const el = getEl(id);
  if (el) el.textContent = value !== undefined ? value : "-";
}

// HTML 특수문자 치환 (보안)
function escapeHtml(v) {
  return String(v || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

// 터치 피드백 애니메이션 적용
function applyTouchPop() {
  document.querySelectorAll(".btn, .main-button, .character-card, .availability-item, .bottom-action-btn").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.remove("touch-pop");
      void el.offsetWidth;
      el.classList.add("touch-pop");
    });
  });
}

// 페이지 이동 (세션 기반 로그인 유지)
function movePage(url) {
  location.href = url;
}

// 숫자를 전투력 구간 텍스트로 변환하는 함수 ("100<span class='unit-k'>K</span> ~ 150<span class='unit-k'>K</span>")
function getPowerRange(power) {
  const p = Number(power) || 0;
  const kUnit = '<span class="unit-k">K</span>';
  if (p < 100) return `100${kUnit} 미만`;
  if (p >= 500) return `500${kUnit} 이상`;
  const start = Math.floor(p / 50) * 50;
  const end = start + 50;
  return `${start}${kUnit} ~ ${end}${kUnit}`;
}

// 날짜 표준화 및 완벽 비교 헬퍼 (2026. 3. 8 -> 2026-03-08)
function normalizeDateStr(val) {
  if (!val) return '';
  let text = String(val).replace(/[\.\/]/g, '-').replace(/\s/g, '').trim();
  if (text.includes('-')) text = text.split('-').map(p => p.padStart(2, '0')).join('-');
  return text;
}
const isSameDate = (d1, d2) => normalizeDateStr(d1) === normalizeDateStr(d2);

function getEl(id) { return document.getElementById(id); }

// =========================
// 애플 스타일 가로 스크롤 & 프로그레스 바 (공통)
// =========================
window.isDraggingScroll = false; // 드래그 클릭 방지용 전역 상태

function setupAppleScroll(scrollBoxId, indicatorId) {
  const slider = document.getElementById(scrollBoxId);
  const indicatorWrap = document.getElementById(indicatorId);
  if (!slider) return;
  
  const indicator = indicatorWrap ? indicatorWrap.querySelector('.scroll-indicator-dot') : null;
  let isDown = false;
  let startX, scrollLeft, momentumID;
  let velX = 0;

  const updateIndicator = () => {
    if (!indicator) return;
    const maxScroll = slider.scrollWidth - slider.clientWidth;
    if (maxScroll <= 0) { indicator.style.width = '0%'; return; }
    indicator.style.width = `${(slider.scrollLeft / maxScroll) * 100}%`; 
  };

  slider.addEventListener('scroll', updateIndicator);
  setTimeout(updateIndicator, 100);

  slider.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) { e.preventDefault(); slider.scrollLeft += e.deltaY; cancelAnimationFrame(momentumID); }
  });

  slider.addEventListener('mousedown', (e) => {
    isDown = true; window.isDraggingScroll = false;
    slider.classList.add('grabbing');
    slider.style.scrollSnapType = 'none';
    slider.style.scrollBehavior = 'auto';
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
    cancelAnimationFrame(momentumID);
  });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) window.isDraggingScroll = true;
    const prevScroll = slider.scrollLeft;
    slider.scrollLeft = scrollLeft - walk;
    velX = slider.scrollLeft - prevScroll;
  });

  const handleMouseUp = () => {
    if (!isDown) return;
    isDown = false;
    slider.classList.remove('grabbing');
    slider.style.scrollSnapType = 'x mandatory';
    slider.style.scrollBehavior = 'smooth';
    beginMomentum();
  };

  slider.addEventListener('mouseup', handleMouseUp);
  slider.addEventListener('mouseleave', handleMouseUp);

  function beginMomentum() {
    velX *= 0.95;
    slider.scrollLeft += velX;
    if (Math.abs(velX) > 0.5) momentumID = requestAnimationFrame(beginMomentum);
  }
}