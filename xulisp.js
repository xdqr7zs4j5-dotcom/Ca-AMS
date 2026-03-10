import { supabase } from "./supabase.config.js";
import { spMap, napDanhSachSanPham } from "./sanpham.data.js";
import { spById } from './sanpham.data.js';

// ==== Money helpers (dùng chung) ====
export const moneyVN = (window.moneyVN ?? new Intl.NumberFormat("vi-VN"));
export const parseMoneyVN = (v) => Number(String(v ?? "").replace(/[^\d]/g, "")) || 0;
window.moneyVN = moneyVN;
window.parseMoneyVN = parseMoneyVN;

export const loaiHDMap = (window.loaiHDMap ?? new Map());
window.loaiHDMap = loaiHDMap;

// ===== cache giá cũ KH =====
const giaCuCache = new Map(); // key = `${makh}|${tensp}` -> { dongia, ngay }

// ===== helpers ngày / hiển thị giá =====
function _fmtNgayVN(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function danhGiaGiaVon() {
  const tenSP = document.getElementById("tenSP")?.value.trim();
  const masp = getMaSPGoc();
  const sp = spById[masp];
  const input = document.getElementById("donGia");
  if (!input) return;
  const gv = Number(sp?.__gia_von || 0);
  const dg = parseMoneyVN(input.value);
  const thapHon = gv > 0 && dg < gv;
  input.classList.toggle("gia-thap", thapHon);
  input.title = thapHon ? `Giá vốn: ${moneyVN.format(gv)} ₫` : "";
}

function setDonGia(value, source, extraNote = "") {
  if (isManualLocked() && source !== "manual") return;

  const donGiaInput = document.getElementById("donGia");
  const lbl = document.getElementById("labelCotGiaDangAp");
  const v = Number(value || 0);

  donGiaInput.value = v;
  donGiaInput.dataset.source = source; // 'rule' | 'old' | 'manual'
  donGiaInput.style.backgroundColor = source === "old" ? "#fff7cc" : "";

  if (lbl) {
    if (source === "manual") lbl.textContent = "Áp giá: Nhập tay" + (isManualLocked() ? " (ĐÃ KHÓA)" : "");
    else if (source === "old") lbl.textContent = `Áp giá: Giá cũ KH${extraNote ? ` (${extraNote})` : ""}`;
    else lbl.textContent = "Áp giá: Theo phân loại";
  }
  if (typeof capNhatThanhTien === "function") capNhatThanhTien();
  danhGiaGiaVon();
}

// ===== Lấy danh sách SP + autocomplete =====
  let spByGroup = {};
export async function taiDanhSachSP() {
const { data, error } = await supabase 
.from("sanpham") 
.select( "tensp, masp, group_id, dinhluong, is_stock_parent, color, dvt, dvtchuyendoi, dvtchuyendoi2, dongia, dongia2, dongia3, giavon, gianhapgoc, quycach, quycach2, tonkho" ); 
if (error) { 
console.error("❌ Lỗi khi lấy sản phẩm:", error); 
return; 
} 
Object.keys(spById).forEach(k => delete spById[k]);
spByGroup = {};

data.forEach((sp) => {
  sp.__gia_von = Number(sp.giavon || 0);

  spById[sp.masp] = sp;

  // nếu không có group_id → tự làm group riêng bằng masp
  const key = sp.group_id || sp.masp;

  if (!spByGroup[key]) {
    spByGroup[key] = [];
  }

  spByGroup[key].push(sp);
});
const datalist = document.getElementById("dsTenSP"); 
if (datalist) { 
  datalist.innerHTML = ""; 
  data
    .filter(sp => sp.is_stock_parent)
    .forEach((sp) => { 
      const opt = document.createElement("option"); 
      opt.value = sp.tensp; 
      datalist.appendChild(opt); 
    });
}
const displayList = data.filter(sp => sp.is_stock_parent);

initSmartSuggest("#tenSP", displayList);
console.log("✅ Đã cập nhật danh sách sản phẩm và datalist"); 
}

window.taiDanhSachSP = taiDanhSachSP;

// ===== Mapping loại HĐ =====
async function taiLoaiHD() {
  const { data, error } = await supabase
    .from("thietlap_hd")
    .select("loaihd, loaidongia, fallback, gd_kho")
    .order("loaihd", { ascending: true });

  if (error) {
    console.error("❌ Lỗi khi tải loại HĐ:", error);
    return [];
  }

  loaiHDMap.clear();
  data.forEach((r) => {
    loaiHDMap.set(r.loaihd.toLowerCase(), {
      ap_dung: r.loaidongia,
      fallback: r.fallback ? r.fallback.split(",").map((s) => s.trim()) : [],
      gd_kho: (r.gd_kho || "xk").toLowerCase(),
    });
  });
  return data;
}

async function napDanhSachPhanLoai() {
  const select = document.getElementById("phanLoai");
  if (!select) return;

  const ds = await taiLoaiHD();
  select.innerHTML = "";

  ds.forEach((row) => {
    const opt = document.createElement("option");
    opt.textContent = row.loaihd;
    opt.value = row.loaihd;
    select.appendChild(opt);
  });

  const norm = (s) =>
    (s || "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();

  const p = new URLSearchParams(location.search);
  const raw = p.get("phanLoai") || p.get("phanloai") || p.get("loai");
  if (!raw) return;

  const want = norm(raw);
  const opts = [...select.options];

  let match =
    opts.find((o) => norm(o.value) === want || norm(o.textContent) === want) ||
    opts.find((o) => norm(o.value).includes(want) || norm(o.textContent).includes(want));
  if (!match) return;

  select.value = match.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
export const loaiHDReady = (async () => {
  await napDanhSachPhanLoai();
  return true;
})();

// ===== Chọn giá theo rule =====
function _pickGia(sp, key) {
  const v = sp?.[key];
  return v != null && v !== "" && Number(v) > 0 ? Number(v) : null;
}
function _getRule(tenLoai) {
  const r = loaiHDMap.get(tenLoai?.toLowerCase());
  return r ?? { ap_dung: "dongia", fallback: ["dongia2", "dongia3"] };
}
function _chonDonGiaTheoRule(sp, rule) {
  const g0 = _pickGia(sp, rule.ap_dung);
  if (g0 !== null) return g0;
  for (const k of rule.fallback || []) {
    const g = _pickGia(sp, k);
    if (g !== null) return g;
  }
  return 0;
}
function capNhatDonGia() {
  if (isManualLocked()) return;
  const loaiTen = document.getElementById("phanLoai")?.value?.trim();
  const masp = getMaSPGoc();
  const sp = spById[masp];
  if (!sp || !loaiTen) return;

  const rule = _getRule(loaiTen);
  const gia = _chonDonGiaTheoRule(sp, rule);
  setDonGia(gia ?? 0, "rule");
  const lbl = document.getElementById("labelCotGiaDangAp");
  if (lbl) lbl.textContent = `Áp giá: ${rule.ap_dung}${gia === 0 ? " (fallback/0)" : ""}`;

  const el = document.getElementById("donGia");
  el.dataset.gia_rule = gia ?? 0;
}

// ===== Giá cũ KH =====
async function layGiaCuKhachHang(makh, masp) {
  if (!makh || !masp) return null;

  const key = `${makh}|${masp}`;
  if (giaCuCache.has(key)) return giaCuCache.get(key);

  const { data, error } = await supabase
    .from("chitiet")
    .select("dongia, ngay")
    .eq("makh", makh)
    .eq("masp", masp)
    .order("ngay", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ Lỗi lấy giá cũ:", error);
    return null;
  }

  const rec = data?.[0] || null;
  if (rec) giaCuCache.set(key, rec);

  return rec;
}

async function apGiaTheoPhanLoaiRoiThuDeGiaCu() {
  if (isManualLocked()) return;

  capNhatDonGia();
  if (isManualLocked()) return;

  const makh = document.getElementById("maKH")?.value.trim();
  const masp = getMaSPGoc();
  if (!makh || !masp) return;
  
  const rec = await layGiaCuKhachHang(makh, masp);
  const el = document.getElementById("donGia");

  if (isManualLocked()) return;

  if (rec?.dongia > 0) {
    el.dataset.gia_old = rec.dongia;
    el.dataset.ngay_old = rec.ngay;
    if (el.dataset.source !== "manual") setDonGia(rec.dongia, "old", _fmtNgayVN(rec.ngay));
  } else {
    if (el.dataset.source !== "manual") setDonGia(Number(el.dataset.gia_rule || el.value), "rule");
  }
}

// ===== Tính SL / tiền =====
function capNhatDonViTinh(sp) {
  const select = document.getElementById("dvt");
  if (!select || !sp) return;

  select.innerHTML = "";

  const ds = [sp.dvt, sp.dvtchuyendoi, sp.dvtchuyendoi2]
    .filter(Boolean);

  ds.forEach(dv => {
    const opt = document.createElement("option");
    opt.value = dv;
    opt.textContent = dv;
    select.appendChild(opt);
  });

  // chọn mặc định đơn vị chính
  select.value = sp.dvt || ds[0];

  select.dispatchEvent(new Event("change"));
}
function capNhatTongSL() {
  const tenSP = document.getElementById("tenSP")?.value.trim();
  const dvt = document.getElementById("dvt")?.value.trim();
  const sl = parseFloat(document.getElementById("soLuong")?.value) || 0;
  const masp = getMaSPGoc();
  const sp = spById[masp];
  if (!sp) return;

  let tong = sl;
  if (dvt === sp.dvtchuyendoi) {
    const qc = parseFloat(sp.quycach) || 1;
    tong = sl * qc;
  } else if (dvt === sp.dvtchuyendoi2) {
    const qc2 = parseFloat(sp.quycach2) || 1;
    tong = sl * qc2;
  }
  document.getElementById("tongSL").value = tong;
  capNhatThanhTien();
}
function capNhatThanhTien() {
  const tongSL = parseFloat(document.getElementById("tongSL")?.value) || 0;
  const donGia = parseFloat(document.getElementById("donGia")?.value) || 0;
  const thanhTien = tongSL * donGia;
  document.getElementById("thanhTien").value = thanhTien.toFixed(0);
}
function capNhatDonGiaNguoc() {
  const tongSL = parseFloat(document.getElementById("tongSL")?.value) || 0;
  const thanhTien = parseFloat(document.getElementById("thanhTien")?.value) || 0;
  if (tongSL === 0) return;
  const donGia = thanhTien / tongSL;
  document.getElementById("donGia").value = donGia.toFixed(0);
}

// ==== Utils chuẩn hoá / fuzzy ====
function vnNormalize(s) {
  if (!s) return "";
  const noAccent = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return noAccent.toLowerCase().replace(/\s+/g, " ").trim();
}
function slugify(s) {
  return vnNormalize(s).replace(/[^a-z0-9 ]/g, "").replace(/ /g, "");
}
function isSubsequence(q, t) {
  let i = 0,
    j = 0;
  while (i < q.length && j < t.length) {
    if (q[i] === t[j++]) i++;
  }
  return i === q.length;
}
function positionScore(q, t) {
  const i = t.indexOf(q);
  if (i === 0) return 0;
  if (i > 0) return i;
  return 9999;
}
function levenshtein(a, b) {
  const m = a.length,
    n = b.length,
    dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
function buildIndex(items) {
  return items.map((sp) => {
    const raw = sp.tensp;
    return { raw, norm: vnNormalize(raw), slug: slugify(raw), data: sp };
  });
}
function smartSearch(index, query, limit = 12) {
  const q = vnNormalize(query);
  const qslug = slugify(query);
  if (!q) return [];
  const scored = [];
  for (const it of index) {
    const contains = it.norm.includes(q);
    const subseq = isSubsequence(qslug, it.slug);
    if (!contains && !subseq) continue;
    const pos = positionScore(q, it.norm);
    const dist = Math.min(levenshtein(q, it.norm.slice(0, Math.min(it.norm.length, q.length + 8))), 6);
    const score = (subseq ? 0 : 5) + pos * 0.2 + dist * 0.8 + it.norm.length * 0.01;
    scored.push({ it, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.it);
}
function initSmartSuggest(inputSel, items) {
  const input = document.querySelector(inputSel);
  input.removeAttribute("list");
  let list = document.getElementById(input.id + "-list");
  if (!list) {
    list = document.createElement("div");
    list.id = input.id + "-list";
    list.className = "ac-list";
    list.style.display = "none";
    input.after(list);
  }

  const index = buildIndex(items);
  let cur = -1,
    last = [];

  function setActive(i) {
    const els = [...list.querySelectorAll(".ac-item")];
    els.forEach((el, k) => el.classList.toggle("active", k === i));
    if (i >= 0 && els[i]) els[i].scrollIntoView({ block: "nearest" });
  }
  function pick(item) {
    if (!item) return;

    input.value = item.raw;
    list.style.display = "none";
    input.dispatchEvent(new Event("change"));
  }

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (!q) {
      list.style.display = "none";
      cur = -1;
      return;
    }
    last = smartSearch(index, q, 12);
    list.innerHTML = last.length
      ? last.map((it, i) => `<div class="ac-item" data-i="${i}">${it.raw}</div>`).join("")
      : `<div class="ac-empty">Không có gợi ý</div>`;
    list.style.display = "block";
    cur = -1;
    [...list.querySelectorAll(".ac-item")].forEach((el, i) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pick(last[i]);
      });
      el.addEventListener("mousemove", () => {
        cur = i;
        setActive(cur);
      });
    });
  });

  input.addEventListener(
    "keydown",
    (e) => {
      const open = list.style.display !== "none";
      const itemsEls = [...list.querySelectorAll(".ac-item")];
      if (!open || !itemsEls.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        cur = (cur + 1) % itemsEls.length;
        setActive(cur);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        cur = (cur - 1 + itemsEls.length) % itemsEls.length;
        setActive(cur);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (cur >= 0 && last[cur]) {
          e.preventDefault();
          e.stopPropagation();
          pick(last[cur]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        list.style.display = "none";
        cur = -1;
      }
    },
    { capture: true }
  );

  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) list.style.display = "none";
  });
}

// ===== Render Mã SP kèm giá vốn (dùng chung) =====
function renderMaSPFromSP(sp) {
  const el = document.getElementById("maSP");
  if (!el || !sp) return;
  const gv = Number(sp.__gia_von ?? sp.giavon ?? 0);
  el.value = [sp.masp, gv > 0 ? `cg:${moneyVN.format(gv)}` : ""].filter(Boolean).join("-");
  el.dataset.code = sp.masp || "";
  el.dataset.giavon = gv || 0;
}

export function getMaSPGoc() {
  const el = document.getElementById("maSP");
  if (!el) return "";
  const code = (el.dataset.code || "").trim();
  if (code) return code;
  const raw = (el.value || "").trim();
  return raw.replace(/-(?:cg|gv):[\d\.,\s]+$/i, "").trim();
}

// ===== Khi chọn TÊN SP =====
function onTenSPChange() {
  const el = document.getElementById("donGia");
if (el) {
  delete el.dataset.gia_old;
  delete el.dataset.ngay_old;
}
  unlockManual();

  const tenSP = document.getElementById("tenSP")?.value.trim();
  if (!tenSP) return;

  // tìm group có tensp trùng
  const group = Object.values(spByGroup).find(arr =>
    arr.some(sp => sp.tensp === tenSP)
  );
  console.log("tenSP:", tenSP);
  console.log("group:", group);

  if (!group) {
  const el = document.getElementById("maSP");
  if (el) {
    el.value = "";
    delete el.dataset.code;
  }
  return;
}

  const variantSelect = document.getElementById("variant");
  if (!variantSelect) return;

  if (group.length === 1) {
  variantSelect.innerHTML = "";
  variantSelect.style.display = "none";
  variantSelect.disabled = true;

  const sp = group[0];

  renderMaSPFromSP(sp);
  capNhatDonViTinh(sp);
  capNhatDonGia();
  capNhatTongSL();
  return;
}
  variantSelect.style.display = "inline-block";
  variantSelect.disabled = false;
  variantSelect.innerHTML = "";

  // sort theo dinhluong lớn -> nhỏ cho dễ nhìn
  group.sort((a, b) => b.dinhluong - a.dinhluong);

  group.forEach(sp => {
    const opt = document.createElement("option");
    opt.value = sp.masp;
    opt.textContent =
      `${sp.dinhluong}kg${sp.color ? " - " + sp.color : ""}`;
    variantSelect.appendChild(opt);
  });

  variantSelect.dispatchEvent(new Event("change"));
}
document.getElementById("variant")?.addEventListener("change", () => {
  const masp = document.getElementById("variant").value;
  const sp = spById[masp];
  if (!sp) return;

  // lưu mã gốc vào maSP
  renderMaSPFromSP(sp);
  capNhatDonViTinh(sp);

  // cập nhật giá theo rule
  capNhatDonGia();

  capNhatTongSL();
});

// ===== Lock/unlock nhập tay =====
function isManualLocked() {
  return document.getElementById("donGia")?.dataset.lock_manual === "1";
}
function lockManual() {
  const el = document.getElementById("donGia");
  if (el) el.dataset.lock_manual = "1";
}
function unlockManual() {
  const el = document.getElementById("donGia");
  if (el) el.dataset.lock_manual = "0";
}

// ===== Price chooser (khởi tạo sau DOM) =====
function initPriceChooser() {
  const input = document.getElementById("donGia");
  if (!input || input.dataset.priceChooserBound === "1") return;
  input.dataset.priceChooserBound = "1";

  let pop = document.getElementById("priceChooser");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "priceChooser";
    Object.assign(pop.style, {
      position: "absolute",
      minWidth: input.offsetWidth + "px",
      display: "none",
      zIndex: 9999,
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.12)",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "14px",
    });
    document.body.appendChild(pop);
  }

  function row(label, right, key) {
    const d = document.createElement("div");
    d.className = "price-item";
    Object.assign(d.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 10px",
      cursor: "pointer",
    });
    d.dataset.key = key;
    const l = document.createElement("div");
    l.innerHTML = label;
    const r = document.createElement("div");
    r.textContent = right;
    r.style.color = "#6b7280";
    d.appendChild(l);
    d.appendChild(r);
    d.addEventListener("mouseenter", () => setActive(d));
    d.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    d.addEventListener("click", () => applyChoice(key));
    return d;
  }
  function setActive(el) {
    [...pop.children].forEach((c) => {
      c.style.background = "";
    });
    if (el) el.style.background = "#f6f7fb";
    pop.dataset.active = el ? el.dataset.key : "";
  }
  function getItem(key) {
    return [...pop.children].find((x) => x.dataset.key === key);
  }
  function nextItem(dir) {
    const items = [...pop.children];
    if (!items.length) return null;
    const activeKey = pop.dataset.active || items[0]?.dataset.key;
    const idx = items.findIndex((x) => x.dataset.key === activeKey);
    const ni = (idx + dir + items.length) % items.length;
    return items[ni];
  }
  function applyChoice(key) {
    const el = input;
    const rule = Number(el.dataset.gia_rule || 0);
    const old = Number(el.dataset.gia_old || 0);
    const ngay = el.dataset.ngay_old || "";
    if (key === "old" && old > 0) setDonGia(old, "old", _fmtNgayVN(ngay));
    else if (key === "rule") setDonGia(rule, "rule");
    hide();
  }
  function place() {
    const r = input.getBoundingClientRect();
    const top = r.bottom + window.scrollY + 4;
    const left = r.left + window.scrollX;
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.minWidth = `${r.width}px`;
  }
  function show() {
    const el = input;
    const rule = Number(el.dataset.gia_rule || 0);
    const old = Number(el.dataset.gia_old || 0);
    if (!(old > 0 && rule >= 0)) return;
    if (el.dataset.source !== "old") return;

    pop.innerHTML = "";
    const ngay = el.dataset.ngay_old ? ` (${_fmtNgayVN(el.dataset.ngay_old)})` : "";
    const itemOld = row(`Giá cũ KH${ngay}`, moneyVN.format(old), "old");
    const itemRule = row("Giá theo phân loại", moneyVN.format(rule), "rule");
    pop.appendChild(itemOld);
    pop.appendChild(itemRule);

    place();
    pop.style.display = "block";
    setActive(getItem("old"));
  }
  function hide() {
    pop.style.display = "none";
    pop.dataset.active = "";
  }

  input.addEventListener("focus", show);
  input.addEventListener("blur", () => setTimeout(hide, 100));
  window.addEventListener(
    "scroll",
    () => {
      if (pop.style.display !== "none") place();
    },
    true
  );
  window.addEventListener("resize", () => {
    if (pop.style.display !== "none") place();
  });

  input.addEventListener("keydown", (e) => {
    const open = pop.style.display !== "none";
    if (e.key === "ArrowDown") {
      if (!open) {
        show();
        return;
      }
      e.preventDefault();
      const ni = nextItem(+1);
      if (ni) setActive(ni);
    } else if (e.key === "ArrowUp") {
      if (!open) return;
      e.preventDefault();
      const pi = nextItem(-1);
      if (pi) setActive(pi);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const k = pop.dataset.active || "old";
      applyChoice(k);
    } else if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      hide();
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (pop.style.display === "none") return;
    if (e.target === input) return;
    if (!pop.contains(e.target)) hide();
  });
}

// ======= SINGLE INIT =======
document.addEventListener("DOMContentLoaded", async () => {
  // bind 1 lần
  const elTen = document.getElementById("tenSP");
  if (elTen && !elTen.dataset.bound) {
    elTen.addEventListener("change", onTenSPChange);
    elTen.dataset.bound = "1";
  }

  // các sự kiện khác
  const elLoai = document.getElementById("phanLoai");
  if (elLoai && !elLoai.dataset.bound) {
    elLoai.addEventListener("change", () => {
      unlockManual();
      apGiaTheoPhanLoaiRoiThuDeGiaCu();
    });
    elLoai.dataset.bound = "1";
  }

  const soLuong = document.getElementById("soLuong");
  if (soLuong && !soLuong.dataset.bound) {
    soLuong.addEventListener("input", capNhatTongSL);
    soLuong.dataset.bound = "1";
  }

  const dvt = document.getElementById("dvt");
  if (dvt && !dvt.dataset.bound) {
    dvt.addEventListener("change", capNhatTongSL);
    dvt.dataset.bound = "1";
  }

  const tongSL = document.getElementById("tongSL");
  if (tongSL && !tongSL.dataset.bound) {
    tongSL.addEventListener("input", capNhatThanhTien);
    tongSL.dataset.bound = "1";
  }

  const thanhTien = document.getElementById("thanhTien");
  if (thanhTien && !thanhTien.dataset.bound) {
    thanhTien.addEventListener("input", capNhatDonGiaNguoc);
    thanhTien.dataset.bound = "1";
  }

  const maKH = document.getElementById("maKH");
  if (maKH && !maKH.dataset.bound) {
    maKH.addEventListener("change", async () => {
      if (isManualLocked()) return;
      const makh = document.getElementById("maKH")?.value.trim();
      const masp = getMaSPGoc();
      if (!makh || !masp) return;
      
      const rec = await layGiaCuKhachHang(makh, masp);
      const el = document.getElementById("donGia");

      if (isManualLocked()) return;
      if (rec?.dongia > 0) {
        el.dataset.gia_old = rec.dongia;
        el.dataset.ngay_old = rec.ngay;
        if (el.dataset.source !== "manual") setDonGia(rec.dongia, "old", _fmtNgayVN(rec.ngay));
      } else {
        if (el.dataset.source !== "manual") setDonGia(Number(el.dataset.gia_rule || el.value), "rule");
      }
    });
    maKH.dataset.bound = "1";
  }

  const donGia = document.getElementById("donGia");
  if (donGia && !donGia.dataset.bound) {
    donGia.addEventListener("input", () => {
      const val = document.getElementById("donGia").value;
      lockManual();
      setDonGia(val, "manual");
    });
    donGia.dataset.bound = "1";
  }

  // nạp dữ liệu + UI phụ
  await napDanhSachPhanLoai();
  initPriceChooser();
});
