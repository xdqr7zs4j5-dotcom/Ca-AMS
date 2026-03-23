// =====================
// Cá AMS – App Shell
// =====================

// ---- DOM ----
const body      = document.body;
const menuEl   = document.getElementById('menu');
const view     = document.getElementById('view');
const sbTitle  = document.getElementById('sbTitle');
const btnToggle= document.getElementById('btnToggle');
const tabbar   = document.getElementById('tabbar');

// ---- Helpers ----
const mqMobile = window.matchMedia('(max-width: 768px)');
const isMobile = () => mqMobile.matches;

// ---- UI MODE ----
function applyUIMode() {
  body.dataset.ui = isMobile() ? 'mobile' : 'desktop';

  if (body.dataset.ui === 'mobile') {
    body.classList.remove('collapsed');
  } else {
    body.classList.remove('menu-open');
  }
}
applyUIMode();
mqMobile.addEventListener('change', applyUIMode);

// ---- ICON ----
const ICON = {
  'Bán hàng':'📝',
  'Tra cứu':'🔎',
  'Hóa đơn':'📑',
  'Nhập kho':'📋',
  'Danh sách SP':'📦',
  'Thêm SP':'➕',
  'Nhân sự':'👤',
  'Cài đặt':'⚙️'
};

// ---- MENU DATA (2 CẤP) ----
const MENU = [
  { text:'Bán hàng', url:'./ghihd.html' },
  { text:'Tra cứu', url:'./tracuu.html' },
  { text:'Hóa đơn', url:'./danhsachxk.html' },
  { text:'Khác', url:'./danhsachph.html' },
  { text:'Danh sách SP', url:'./danhsachsp.html' },
  { text:'Thêm SP', url:'./nhapsp.html' },
  { text:'Danh sách KH', url:'./danhsachkh.html' },
  { text:'Thêm KH', url:'./nhapkh.html' },
  { text:'Báo cáo', url:'./baocao.html' },

  {
    text:'Nhân sự',
    children:[
      { text:'Chấm công', url:'./chamcong.html' },
      { text:'Hồ sơ', url:'./nhansu.html' },
      { text:'Bậc lương', url:'./thietlapluong.html' },
      { text:'Thiết lập', url:'./thietlappc.html' }
    ]
  },

  {
    text:'Kho',
    url:'./danhsachnk.html',
    children:[
      { text:'Tồn kho', url:'./tk_theodoi.html' },
      { text:'Kiểm kho', url:'tk_chinh.html' },
      { text:'Thiết lập', url:'./thietlapkho.html' }
    ]
  },

  {
    text:'Cài đặt',
    children:[
      { text:'Tài khoản', url:'./taikhoan.html' },
      { text:'Hóa đơn', url:'./thietlaphd.html' },
      { text:'Khách hàng', url:'./thietlapkh.html' },
      { text:'Sản phẩm', url:'./thietlapsp.html' },
      { text:'Đơn vị tính', url:'./thietlapdvt.html' }
    ]
  }
];

// ---- STATE ----
let activeUrl = './begin.html';

// ---- RENDER MENU ----
function renderMenu() {
  menuEl.innerHTML = '';
  sbTitle.textContent = 'Cá AMS';

  MENU.forEach(item => {

    // ===== MENU CHA (CÓ SUB) =====
    if (item.children) {
      const group = document.createElement('div');
      group.className = 'menu-group';

      // tự mở nếu đang active submenu
      if (item.children.some(c => c.url === activeUrl)) {
        group.classList.add('open');
      }

      const parent = document.createElement('button');
      parent.className = 'item parent';
      parent.innerHTML = `
        <span class="ic">${ICON[item.text] || '▸'}</span>
        <span class="txt">${item.text}</span>
        <span class="arrow">▾</span>
      `;

      parent.onclick = (e) => {
  // nếu click vào mũi tên → chỉ toggle
  if (e.target.closest('.arrow')) {
    group.classList.toggle('open');
    return;
  }

  // còn lại → đi trang của menu cha
  if (item.url) {
    activeUrl = item.url;
    view.src = item.url;
    renderMenu();

    if (body.dataset.ui === 'mobile') {
      body.classList.remove('menu-open');
    }
  }
};

      const sub = document.createElement('div');
      sub.className = 'submenu';

      item.children.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'item sub' + (ch.url === activeUrl ? ' active' : '');
        btn.innerHTML = `
          <span class="ic">•</span>
          <span class="txt">${ch.text}</span>
        `;

        btn.onclick = () => {
          activeUrl = ch.url;
          view.src = ch.url;
          renderMenu();

          if (body.dataset.ui === 'mobile') {
            body.classList.remove('menu-open');
          }
        };

        sub.appendChild(btn);
      });

      group.append(parent, sub);
      menuEl.appendChild(group);
      return;
    }

    // ===== MENU ĐƠN =====
    const btn = document.createElement('button');
    btn.className = 'item' + (item.url === activeUrl ? ' active' : '');
    btn.innerHTML = `
      <span class="ic">${ICON[item.text] || '•'}</span>
      <span class="txt">${item.text}</span>
    `;

    btn.onclick = () => {
      activeUrl = item.url;
      view.src = item.url;
      renderMenu();

      if (body.dataset.ui === 'mobile') {
        body.classList.remove('menu-open');
      }
    };

    menuEl.appendChild(btn);
  });
}

// ---- SIDEBAR TOGGLE ----
btnToggle.onclick = () => {
  if (body.dataset.ui === 'mobile') {
    body.classList.toggle('menu-open');
  } else {
    body.classList.toggle('collapsed');
  }
};

// ---- MOBILE TABBAR ----
const MOBILE_TABS = [
  { text:'Bán hàng', icon:'📝', url:'./ghihd.html' },
  { text:'Tra cứu', icon:'🔎', url:'./tracuu.html' },
  { text:'Hóa đơn', icon:'📑', url:'./danhsachxk.html' },
  { text:'Kiểm kho', icon:'🛠️', url:'./tk_chinh.html' },
  { text:'Menu', icon:'☰', action:'menu' }
];

function renderTabbar() {
  if (body.dataset.ui !== 'mobile') {
    tabbar.innerHTML = '';
    return;
  }

  tabbar.innerHTML = '';

  MOBILE_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.innerHTML = `
      <span class="ic">${tab.icon}</span>
      <span>${tab.text}</span>
    `;

    if (tab.url === activeUrl) {
      btn.classList.add('active');
    }

    btn.onclick = () => {
      if (tab.action === 'menu') {
        body.classList.add('menu-open');
        return;
      }
      activeUrl = tab.url;
      view.src = tab.url;
      renderMenu();
    };

    tabbar.appendChild(btn);
  });
}

// ---- INIT ----
view.src = activeUrl;
renderMenu();
renderTabbar();

// ---- RE-RENDER ON MODE CHANGE ----
mqMobile.addEventListener('change', () => {
  renderTabbar();
  renderMenu();
});

// ---- CLICK LOGO / TITLE -> VỀ TRANG BẮT ĐẦU ----
sbTitle.addEventListener('click', () => {
  activeUrl = './begin.html';
  view.src = activeUrl;
  renderMenu();

  // mobile thì đóng sidebar luôn
  if (body.dataset.ui === 'mobile') {
    body.classList.remove('menu-open');
  }
});

