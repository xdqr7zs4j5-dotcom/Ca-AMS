// app.js (module)
import { supabase } from './supabase.config.js';

// ===== Phát hiện Electron sớm để bỏ SW khi chạy desktop
(function detectDesktop() {
  const isElectronUA = /Electron/i.test(navigator.userAgent);
  const isDesktop = (typeof window.CA_DESKTOP?.isDesktop !== 'undefined')
    ? !!window.CA_DESKTOP.isDesktop
    : isElectronUA;
  if (isDesktop) window.__SKIP_SW__ = true;
})();

// ===== DOM refs
const body = document.body;
const menu = document.getElementById('menu');
const view = document.getElementById('view');
const sbTitle = document.getElementById('sbTitle');
const btnBack = document.getElementById('btnBack');
const btnToggle = document.getElementById('btnToggle');
const btnReopen = document.getElementById('btnReopen');

// ===== Splash =====
const SPLASH_SRC = './splash.html';
const splash = document.getElementById('splash');
const splashPlayer = document.getElementById('splashPlayer');
const splashHint = document.getElementById('splashHint');

let splashVisible = false;
let splashReason = 'startup'; // 'startup' | 'idle'
let splashHideTimer = null;
const SPLASH_FALLBACK_MS = 6000;

function mountSplashIframe() {
  if (splashPlayer.getAttribute('src') !== SPLASH_SRC) {
    splashPlayer.setAttribute('src', SPLASH_SRC);
  } else {
    try { splashPlayer.contentWindow?.location?.reload?.(); } catch (e) {}
  }
}
function unmountSplashIframe() {
  // splashPlayer.removeAttribute('src'); // nếu muốn giải phóng
}

function showSplash(reason = 'startup') {
  splashReason = reason;
  splash.classList.remove('hide');
  splash.classList.toggle('saver', reason === 'idle');
  splashHint.textContent = 'Chạm hoặc nhấn phím bất kỳ để tiếp tục';

  mountSplashIframe();
  splash.style.display = 'flex';
  splashVisible = true;

  clearTimeout(splashHideTimer);
  if (reason === 'startup') {
    splashHideTimer = setTimeout(() => {
      if (splashVisible) hideSplash();
    }, SPLASH_FALLBACK_MS);
  }
}
function hideSplash() {
  if (!splashVisible) return;
  splashVisible = false;
  splash.classList.add('hide');
  clearTimeout(splashHideTimer);
  setTimeout(() => { splash.style.display = 'none'; unmountSplashIframe(); }, 650);
}

// Đóng splash bằng thao tác trên overlay
splash.addEventListener('click', () => { if (splashVisible) hideSplash(); }, { passive: true });

// Từ splash.html có thể gửi {type:'splash:done'}
window.addEventListener('message', (e) => {
  if (e?.data?.type === 'splash:done') hideSplash();
  if (e?.data?.type === 'activity') onKeyActivity(); // fallback nếu trang con chủ động bắn
});

// ===== Idle screensaver (mọi thao tác đều tính là hoạt động) =====
const IDLE_MS = 120000; // 2 phút
let idleTimer = null;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => showSplash('idle'), IDLE_MS);
}
function onKeyActivity() {
  if (splashVisible) hideSplash();
  resetIdleTimer();
}

// Lắng nghe hoạt động ở trang cha
['keydown','click','pointerdown','mousemove','wheel','touchstart','touchmove','scroll'].forEach(evt => {
  document.addEventListener(evt, onKeyActivity, { passive: true });
});

// Không auto-reset khi tab quay lại (có thể thêm nếu muốn)
document.addEventListener('visibilitychange', () => { /* noop */ });

// Bắt đầu đếm lần đầu
resetIdleTimer();

// ===== Bắt hoạt động bên trong iframe#view =====
const _attachedFrames = new WeakSet();
function attachFrameActivity(iframe) {
  try {
    const w = iframe.contentWindow;
    const d = iframe.contentDocument || w?.document;
    if (!w || !d || _attachedFrames.has(w)) return;

    const handler = () => onKeyActivity();
    ['keydown','click','pointerdown','mousemove','wheel','touchstart','touchmove','scroll'].forEach(evt => {
      d.addEventListener(evt, handler, { passive: true });
      w.addEventListener(evt, handler, { passive: true });
    });

    // Trang con có thể chủ động gửi activity
    w.addEventListener('message', (e) => { if (e?.data?.type === 'activity') onKeyActivity(); });

    _attachedFrames.add(w);
  } catch (e) {
    // khác origin: rely vào postMessage từ trang con
  }
}

// ===== Menu & routing =====
sbTitle.addEventListener('click', () => btnBack.click());
const ICON = {
  'Bán hàng': '📝', 'Hóa đơn': '📑', 'Nhập kho': '📋', 'GD khác': '🧾', 'Tra cứu': '🔎',
  'Danh sách SP': '🗂️', 'Thêm SP': '➕📦', 'Danh sách KH': '👥', 'Thêm KH': '➕👤',
  'Cài đặt': '⚙️', 'Tài khoản': '👤', 'Phân loại': '🏷️', 'Sản phẩm': '📦',
  'Đơn vị tính': '📏', 'Khách hàng': '🗺️',
  'Báo cáo': '📊', 'Doanh số': '💵', 'Lợi nhuận': '📈', 'Công nợ': '📒', 'Tồn kho': '🏬',
  'Bảng ghi': '📄', 'Chi tiết': '🪪', 'Chỉnh kho': '🛠️'
};
const MENU_MAIN = [
  { text: 'Bán hàng',    url: './ghihd.html' },
  { text: 'Tra cứu',     url: './tracuu.html' },
  { text: 'Hóa đơn',     url: './danhsachxk.html' },
  { text: 'Nhập kho',    url: './danhsachnk.html' },
  { text: 'Danh sách SP',url: './danhsachsp.html' },
  { text: 'Thêm SP',     url: './nhapsp.html' },
  { text: 'Danh sách KH',url: './danhsachkh.html' },
  { text: 'Thêm KH',     url: './nhapkh.html' },
  { text: 'Báo cáo',     mode: 'reports' },
  { text: 'Nhân sự',     mode: 'hr' },
  { text: 'Cài đặt',     mode: 'settings' }
];
const MENU_SETTINGS = [
  { text: 'Tài khoản',  url: './taikhoan.html' },
  { text: 'Phân loại',  url: './thietlaphd.html' },
  { text: 'Sản phẩm',   url: './thietlapsp.html' },
  { text: 'Khách hàng', url: './thietlapkh.html' },
  { text: 'Đơn vị tính',url: './thietlapdvt.html' }
];
const MENU_REPORTS = [
  { text: 'Doanh thu',  url: './baocao.html?view=v_bc_doanhthu_ngay' },
  { text: 'Sản phẩm',   url: './baocao.html?view=v_bc_top_sanpham' },
  { text: 'Khách hàng', url: './baocao.html?view=v_bc_top_khachhang' },
  { text: 'NCC',        url: './baocao.html?view=v_bc_congno_ncc' },
  { text: 'Công nợ',    url: './baocao.html?view=v_bc_congno_kh' },
  { text: 'Tồn kho',
    children: [
      { text: 'Bảng ghi',  url: './tk_theodoi.html' },
      { text: 'Chi tiết',  url: './tk_chitiet.html' },
      { text: 'Chỉnh kho', url: './tk_chinh.html' }
    ]
  }
];
const MENU_HR = [
  { text: 'Bảng chấm công', url: './chamcong.html' },
  { text: 'Hồ sơ',          url: './nhansu.html' },
  { text: 'Thiết lập',      url: './thietlapluong.html' }
];

let mode = 'main';
let activeUrl = './begin.html';
const expanded = new Set();
const isGroup = it => Array.isArray(it.children);
const firstUrlOf = list => {
  for (const x of list) {
    if (x.url) return x.url;
    if (x.children) {
      const u = firstUrlOf(x.children);
      if (u) return u;
    }
  }
  return null;
};

function makeItem(it, isActive, level) {
  const b = document.createElement('button');
  b.className = 'item' + (isActive ? ' active' : '');
  if (["Bán hàng","Tra cứu","Hóa đơn","Báo cáo","Cài đặt"].includes(it.text) && level===0)
    b.classList.add('keep-icon');
  b.style.paddingLeft = (14 + level * 16) + 'px';
  const caret = isGroup(it) ? (expanded.has(it.text) ? '▾ ' : '▸ ') : '';
  b.title = it.text;
  b.innerHTML = `<span class="ic">${ICON[it.text] || '•'}</span><span class="txt">${caret}${it.text}</span>`;
  b.addEventListener('click', () => {
    if (isGroup(it)) {
      expanded.has(it.text) ? expanded.delete(it.text) : expanded.add(it.text);
      renderMenu(); onKeyActivity(); return;
    }
    if (it.mode === 'settings') { mode='settings'; activeUrl = firstUrlOf(MENU_SETTINGS); if (activeUrl) view.src = activeUrl; renderMenu(); onKeyActivity(); return; }
    if (it.mode === 'reports')  { mode='reports';  activeUrl = firstUrlOf(MENU_REPORTS);  if (activeUrl) view.src = activeUrl; renderMenu(); onKeyActivity(); return; }
    if (it.mode === 'hr')       { mode='hr';       activeUrl = firstUrlOf(MENU_HR);       if (activeUrl) view.src = activeUrl; document.querySelector('.content').classList.add('hr'); renderMenu(); onKeyActivity(); return; }
    if (it.url) {
  activeUrl = it.url;
  view.src = it.url;

  [...menu.children].forEach(el => el.classList.remove('active'));
  b.classList.add('active');

  if (isMobile()) {
    body.classList.remove('menu-open'); // 👈 CHÍNH NÓ
  }

  onKeyActivity();
}
  });
  return b;
}
function renderTree(items, level = 0) {
  for (const it of items) {
    const active = !!(it.url && it.url === activeUrl);
    menu.appendChild(makeItem(it, active, level));
    if (isGroup(it) && expanded.has(it.text)) renderTree(it.children, level + 1);
  }
}
function renderMenu() {
  menu.innerHTML = '';

  let title = 'Trang chủ';

  if (mode === 'settings'){
    title='Thiết lập';
    renderTree(MENU_SETTINGS,0);
  }
  else if (mode === 'reports'){
    title='Báo cáo';
    renderTree(MENU_REPORTS,0);
  }
  else if (mode === 'hr'){
    title='Nhân sự';
    renderTree(MENU_HR,0);
  }
  else {
    renderTree(MENU_MAIN,0);
  }

  sbTitle.textContent = title;
  if (btnBack) btnBack.style.display = (mode === 'main') ? 'none' : 'inline-block';
}

if (sbTitle && btnBack) {
  sbTitle.addEventListener('click', () => btnBack.click());
}

if (btnBack) {
  btnBack.addEventListener('click', () => {
    mode = 'main';
    activeUrl = './begin.html';
    view.src = activeUrl;
    document.querySelector('.content')?.classList.remove('hr');
    renderMenu();
    onKeyActivity();
  });
}

if (btnToggle) {
  btnToggle.addEventListener('click', () => {
    if (isMobile()) {
      body.classList.toggle('menu-open');
    } else {
      body.classList.toggle('collapsed');
    }
    onKeyActivity();
  });
}

if (btnReopen) {
  btnReopen.addEventListener('click', () => {
    body.classList.remove('collapsed');
    onKeyActivity();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mode !== 'main' && btnBack) {
    btnBack.click();
  }
});

// init
if (!isMobile()) {
  body.classList.add('collapsed');
}
view.src = './begin.html';
renderMenu();
renderMobileTabbar();
attachFrameActivity(view);
view.addEventListener('load', () => attachFrameActivity(view));

// ===== Mobile Tabbar =====
const MOBILE_TABS = [
  { text: 'Bán hàng', icon: '📝', url: './ghihd.html' },
  { text: 'Tra cứu',  icon: '🔎', url: './tracuu.html' },
  { text: 'Hóa đơn',  icon: '📑', url: './danhsachxk.html' },
  { text: 'Kiểm kho', icon: '📋', url: './tk_chinh.html' },
  { text: 'Khác',     icon: '☰',  mode: 'main' }
];

function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function renderMobileTabbar() {
  const tabbar = document.getElementById('tabbar');
  if (!tabbar || !isMobile()) return;

  tabbar.innerHTML = '';

  MOBILE_TABS.forEach(tab => {
    const b = document.createElement('button');
    b.className = 'item';

    if (tab.url && view?.src?.includes(tab.url)) {
      b.classList.add('active');
    }

    b.innerHTML = `
      <span class="ic">${tab.icon}</span>
      <span class="txt">${tab.text}</span>
    `;

    b.addEventListener('click', () => {
      if (tab.mode === 'main') {
  // ☰ Khác → mở FULL MENU (sidebar mobile)
  mode = 'main';
  renderMenu();

  body.classList.add('menu-open'); // 🔥 DÒNG QUAN TRỌNG

  onKeyActivity();
  return;
}

      if (tab.url && view) {
        activeUrl = tab.url;
        view.src = tab.url;
        renderMenu(); // sync sidebar state
        onKeyActivity();
      }
    });

    tabbar.appendChild(b);
  });
}

// ===== Splash khởi động =====
showSplash('startup');

// ===== Service Worker: đăng ký 1 lần, skip khi Electron/file://
(function setupSW(){
  if (!('serviceWorker' in navigator)) return;
  const isDesktop = !!window.CA_DESKTOP?.isDesktop || /Electron/i.test(navigator.userAgent);
  const isFile = location.protocol === 'file:';
  if (isDesktop || isFile || window.__SKIP_SW__) {
    console.log('Skip Service Worker in desktop or file:// mode');
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch(err => console.error('SW register error', err));
  });
})();

// ===== Nhắc chấm công hôm nay (ở trang cha index) =====
(() => {
  if (window.__CC_NOTICE_INIT__) return; // guard chống gắn 2 lần (HMR/live reload)
  window.__CC_NOTICE_INIT__ = true;

  const $ = s => document.querySelector(s);
  const pad = n => String(n).padStart(2,'0');
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const LS_KEY = 'cc_done_' + todayStr;

  // tạo thanh nhắc trong DOM (đặt trên iframe)
  (function injectCCNotice(){
    if ($('#ccNotice')) return;
    const main = document.querySelector('.wrap');
    const bar = document.createElement('div');
    bar.id = 'ccNotice';
    bar.style.cssText = `
      display:none; margin:8px 0;
      background:#fff5f5; border:1px solid #fee2e2; border-left:4px solid #ff3b30;
      border-radius:12px; padding:10px 12px;
      box-shadow:0 6px 24px rgba(0,0,0,.06);
      font-size:14px; color:#111;
      display:flex; align-items:center; gap:8px;
    `;
    bar.innerHTML = `<b>🔔 Chưa chấm công hôm nay.</b>
                     <span style="color:#6b7280">
                       Chỉ cần có <u>ít nhất 1 người</u> được chấm là ẩn.
                     </span>`;
    main.prepend(bar);
  })();

  async function checkChamCongToday() {
    const { count, error } = await supabase
      .from('chamcong')
      .select('manv', { count: 'exact', head: true })
      .eq('ngay', todayStr)
      .in('loai', ['half', 'full']);

    if (error) { console.warn('[CC] check error:', error.message); return; }

    const bar = $('#ccNotice');
    const show = (count || 0) === 0;
    if (bar) bar.style.display = show ? 'flex' : 'none';
    if (!show) localStorage.setItem(LS_KEY, String(Date.now()));
  }

  // tự kiểm khi mở app & định kỳ
  checkChamCongToday();
  setInterval(checkChamCongToday, 5 * 60_000);
  window.addEventListener('focus', checkChamCongToday);

  // nhận tín hiệu từ trang con (postMessage)
  window.addEventListener('message', (e) => {
    if (!e?.data) return;
    if (e.data.type === 'CC_DONE' || e.data.type === 'CC_PING') {
      checkChamCongToday();
    }
  });

  window.addEventListener('resize', () => {
    renderMenu();
    renderMobileTabbar();
  });

  // nhận tín hiệu qua localStorage (khi chamcong.html setItem)
  window.addEventListener('storage', (ev) => {
    if (ev.key === LS_KEY) checkChamCongToday();
  });

  // khi iframe view load lại (đổi trang)
  if (view) {
    view.addEventListener('load', () => checkChamCongToday());
  }
})();
