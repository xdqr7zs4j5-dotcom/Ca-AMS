import { supabase } from "./supabase.config.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
// 1) Gắn event trước
const ipMaKH = document.getElementById("maKH");
if (ipMaKH) ipMaKH.addEventListener("change", onMaKHChange);

const btnThemKH = document.getElementById("themKH");
if (btnThemKH) btnThemKH.addEventListener("click", openThemKH);

window.addEventListener("message", onChildMessage);

// 2) Nạp dữ liệu song song
await Promise.all([
napDanhSachKhachHang(), // có filter daxoa ở đây
taiDanhSachSP()
]);
}

// === Nạp DS KH (lọc bỏ đã xoá) ===
async function napDanhSachKhachHang() {
const { data, error } = await supabase
.from("khachhang")
.select("makh, tendv, sdt, mst, diachi")
.eq("daxoa", false)             // 👈 bỏ khách đã xoá
.not("makh", "is", null);

if (error) { console.error("Lỗi tải KH:", error); return; }

const datalist = document.getElementById("dsMaKH");
if (!datalist) return;

window.mapKH = new Map();
datalist.innerHTML = "";          // clear cũ để tránh trùng
data.forEach(kh => {
const opt = document.createElement("option");
opt.value = kh.makh;
datalist.appendChild(opt);
window.mapKH.set(kh.makh, kh);
});
}

// === Handlers giữ nguyên logic cũ ===
function onMaKHChange() {
const ma = document.getElementById("maKH").value.trim();
const kh = window.mapKH?.get(ma);
if (!kh) return;
document.getElementById("tenDV").value = kh.tendv || "";
document.getElementById("sdt").value   = kh.sdt   || "";
document.getElementById("mst").value   = kh.mst   || "";
document.getElementById("diaChi").value= kh.diachi|| "";
}

function openThemKH() {
window.open("nhapkh.html", "ThemKhachHang", "width=600,height=400");
}

function onChildMessage(event) {
const { type, makh } = event.data || {};
if (type === "khachHangMoi" && makh) {
napDanhSachKhachHang().then(() => {
const kh = window.mapKH?.get(makh);
if (!kh) return;
document.getElementById("maKH").value  = kh.makh;
document.getElementById("tenDV").value = kh.tendv || "";
document.getElementById("sdt").value   = kh.sdt   || "";
document.getElementById("mst").value   = kh.mst   || "";
document.getElementById("diaChi").value= kh.diachi|| "";
});
}
}
// helpers
const $ = (s) => document.querySelector(s);
const toYMD = (d) => new Date(d).toISOString().slice(0,10);

// GỌI CHUNG: lấy nợ cũ từ view v_bc_congno_kh
async function loadNoCuFromView(makh, ngayISO, sohd = null) {
  if (!makh) return setNoCu(0);
  const den_ngay = (ngayISO ? toYMD(ngayISO) : toYMD(new Date()));

  // Trường hợp đang "xem/sửa" 1 HĐ: lấy dòng liền trước so với (den_ngay, sohd)
  if (sohd) {
    // (den_ngay < ngày) OR (den_ngay = ngày AND sohd < sohd hiện tại)
    const { data, error } = await supabase
      .from('v_bc_congno_kh')
      .select('du_cuoi, den_ngay, sohd, idx')
      .eq('makh', makh)
      .or(`den_ngay.lt.${den_ngay},and(den_ngay.eq.${den_ngay},sohd.lt.${sohd})`)
      .order('den_ngay', { ascending: false })
      .order('idx', { ascending: false })
      .limit(1);

    if (error) { console.error('[noCu] view error:', error); return; }
    return setNoCu((data?.[0]?.du_cuoi) ?? 0);
  }

  // Trường hợp tạo HĐ mới: lấy dòng gần nhất <= den_ngay (mới nhất trước ngày)
  const { data, error } = await supabase
    .from('v_bc_congno_kh')
    .select('du_cuoi, den_ngay, idx')
    .eq('makh', makh)
    .lte('den_ngay', den_ngay)
    .order('den_ngay', { ascending: false })
    .order('idx', { ascending: false })
    .limit(1);

  if (error) { console.error('[noCu] view error:', error); return; }
  return setNoCu((data?.[0]?.du_cuoi) ?? 0);
}

const moneyVN = new Intl.NumberFormat("vi-VN");

function setNoCu(v) {
  const ip = document.getElementById("noCu");
  if (!ip) return;
  const num = Number(v) || 0;
  ip.value = moneyVN.format(num);
}

// === GẮN SỰ KIỆN ===
// Khi đổi mã KH hoặc ngày -> tính lại nợ cũ
document.addEventListener('DOMContentLoaded', () => {
  const ipMaKH = $('#maKH');
  const ipNgay = $('#ngayHD');
  const ipSoHD = $('#soHD'); // có thì xác định “liền trước” chuẩn hơn

  async function refreshNoCu() {
    const makh = (ipMaKH?.value || '').trim();
    const ngay = ipNgay?.value || new Date();
    const sohd = (ipSoHD?.value || '').trim() || null;
    await loadNoCuFromView(makh, ngay, sohd);
  }

  ipMaKH?.addEventListener('change', refreshNoCu);
  ipNgay?.addEventListener('change', refreshNoCu);
  ipSoHD?.addEventListener('change', refreshNoCu);

  // khi form nạp sẵn dữ liệu (ví dụ mở từ “đơn gần đây”)
  setTimeout(refreshNoCu, 0);
});

