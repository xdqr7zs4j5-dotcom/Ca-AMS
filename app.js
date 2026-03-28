import { supabase } from "./supabase.config.js"
// =====================
// Cá AMS – App Shell
// =====================

// ---- DOM ----
const body      = document.body;
const menuEl    = document.getElementById('menu');
const viewWrap  = document.getElementById('viewWrap');
const sbTitle   = document.getElementById('sbTitle');
const btnToggle = document.getElementById('btnToggle');
const tabbar    = document.getElementById('tabbar');

const tabMap = new Map()

// ---- Helpers ----
const mqMobile = window.matchMedia('(max-width: 768px)');
const isMobile = () => mqMobile.matches;
const tabsEl = document.getElementById("tabs")

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
  'Thêm SP':'➕',
  'Thêm KH':'➕',
  'Nhân sự':'👤',
  'Kho':'📦',
  'Cài đặt':'⚙️'
};

// ---- MENU DATA (2 CẤP) ----
const MENU = [
  { text:'Bán hàng', url:'./ghihd.html' },
  { text:'Tra cứu', url:'./tracuu.html' },
  {
    text:'Hóa đơn',
    children:[
      { text:'Bán hàng', url:'./danhsachxk.html' },
      { text:'Nhập kho', url:'./danhsachnk.html'},
      { text:'Xuất kho', url:'./danhsachph.html' },  
    ]
  },

  { text:'Sản phẩm', url:'./danhsachsp.html' },
  { text:'Thêm SP', url:'./nhapsp.html' },
  { text:'Khách hàng', url:'./danhsachkh.html' },
  { text:'Thêm KH', url:'./nhapkh.html' },
  { text:'Báo cáo', url:'./baocao.html' },

  {
    text:'Nhân sự',
    children:[
      { text:'Danh sách', url:'./nhansu.html' },
      { text:'Chấm công', url:'./chamcong.html' },
      { text:'Bậc lương', url:'./thietlapluong.html' },
      { text:'Thiết lập', url:'./thietlappc.html' }
    ]
  },


  {
    text:'Kho',
    children:[
      { text:'Tồn kho', url:'./tk_theodoi.html' },
      { text:'Kiểm kho', url:'./tk_chinh.html' },
      { text:'Chuyển kho', url:'./tk_chuyen.html' },
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

      parent.onclick = () => {
  group.classList.toggle('open')
}

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

  openTab(
    ch.url,
    ch.text,
    ch.url
  )

  activeUrl = ch.url
  renderMenu()

  if (body.dataset.ui === 'mobile') {
    body.classList.remove('menu-open')
  }
}

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

  window.openTab(
    item.url,
    item.text,
    item.url
  )

  activeUrl = item.url
  renderMenu()

  if (body.dataset.ui === 'mobile') {
    body.classList.remove('menu-open')
  }
}

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
      renderMenu();
    };

    tabbar.appendChild(btn);
  });
}

const tabs = {}

window.openTab = function(id,title,url){

  if(tabs[id]){
    setActiveTab(id)
    return
  }

  tabs[id] = url

  // ⭐ TẠO IFRAME
  const frame = document.createElement("iframe")
  frame.src = url
  frame.className = "tab-frame"

  viewWrap.appendChild(frame)
  tabMap.set(url,frame)

  const tab = document.createElement("div")
  tab.className = "tab"
  tab.dataset.id = id

  tab.innerHTML = `
    <span>${title}</span>
    <span class="close">✕</span>
  `

  tab.onclick = ()=> setActiveTab(id)

  tab.querySelector(".close").onclick = (e)=>{
    e.stopPropagation()
    closeTab(id)
  }

  tabsEl.appendChild(tab)

  setActiveTab(id)
}

function setActiveTab(id){

  const url = tabs[id]

  const frame = tabMap.get(url)
  
  if(frame){
    document.querySelectorAll(".tab-frame").forEach(f=>f.classList.remove("active"))
    frame.classList.add("active")
  }

  document.querySelectorAll(".tab").forEach(t=>{
    t.classList.toggle("active", t.dataset.id === id)
  })
}

function closeTab(id){

  const tab = tabsEl.querySelector(`[data-id="${id}"]`)
  if(tab) tab.remove()

  delete tabs[id]

  const last = Object.keys(tabs).pop()

  if(last){
    setActiveTab(last)
  }
}
async function loadMiniKPI(){

  const today = new Date().toISOString().slice(0,10)

  // doanh thu hôm nay
  const { data:rev } = await supabase
    .from("v_bc_doanhthu_ngay")
    .select("doanhthu")
    .eq("ngay",today)
    .limit(1)

  document.getElementById("miniRev").textContent =
    Number(rev?.[0]?.doanhthu || 0).toLocaleString("vi-VN")

  const qBase = {count:"exact",head:true}

  const [c1,c2,c3] = await Promise.all([
    supabase.from("hoadon").select("*",qBase).eq("ngay",today).or("tinhtrang.is.null,tinhtrang.eq.chua"),
    supabase.from("hoadon").select("*",qBase).eq("ngay",today).eq("tinhtrang","dang"),
    supabase.from("hoadon").select("*",qBase).eq("ngay",today).eq("tinhtrang","da")
  ])

  document.getElementById("miniChua").textContent = c1.count || 0
  document.getElementById("miniDang").textContent = c2.count || 0
  document.getElementById("miniDa").textContent   = c3.count || 0
}
// ---- INIT ----
window.openTab(activeUrl,"Trang chủ",activeUrl)
renderMenu();
renderTabbar();
loadMiniKPI()

// ---- RE-RENDER ON MODE CHANGE ----
mqMobile.addEventListener('change', () => {
  renderTabbar();
  renderMenu();
  loadMiniKPI()
});

// ---- CLICK LOGO / TITLE -> VỀ TRANG BẮT ĐẦU ----
sbTitle.addEventListener('click', () => {
  activeUrl = './begin.html';
  window.openTab(activeUrl,"Trang chủ",activeUrl)
  renderMenu();

  // mobile thì đóng sidebar luôn
  if (body.dataset.ui === 'mobile') {
    body.classList.remove('menu-open');
  }
});