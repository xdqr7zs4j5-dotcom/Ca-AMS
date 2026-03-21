// xulihd.js  (module)
// =================== Imports ===================
import { supabase } from "./supabase.config.js";
import { parseMoneyVN } from './sanpham.data.js';
import { spMap}    from "./sanpham.data.js"; // nếu cần

// =================== Helpers ===================
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const moneyVN = new Intl.NumberFormat("vi-VN");
const toYMD = (d) => new Date(d).toISOString().slice(0,10);
let khoList = [];

async function loadKhoList() {
  const { data, error } = await supabase
    .from("thietlap_kho")
    .select("id, ma_kho")
    .order("ma_kho");

  if (error) {
    console.error("Lỗi load kho:", error);
    return;
  }

  khoList = data || [];
  window.khoList = khoList;
}
function setVal(sel, v){ const el = $(sel); if (el) el.value = v ?? ""; }
function numVal(sel){
  const el = $(sel); if (!el) return 0;
  return Number(String(el.value).replace(/[^\d.-]/g,'')) || 0;
}
function formatThousandInput(el){
  if (!el) return;
  el.addEventListener("focus", () => el.value = String(el.value).replace(/[^\d.-]/g,''));
  el.addEventListener("blur",  () => el.value = moneyVN.format(Number(el.value.replace(/[^\d.-]/g,'')) || 0));
}

// =================== Nợ cũ (từ view) ===================
// Lấy du_cuoi dòng gần nhất TRƯỚC (den_ngay, sohd)
async function loadNoCuFromView(makh, ngayISO, sohd = null) {
  try {
    if (!makh) return setNoCu(0);
    const den_ngay = ngayISO ? toYMD(ngayISO) : toYMD(new Date());

    // Đang mở/sửa 1 HĐ → lấy dòng liền trước so với (ngày, số HĐ)
    if (sohd) {
      const { data, error } = await supabase
        .from("v_bc_congno_kh")
        .select("du_cuoi, den_ngay, sohd, idx")
        .eq("makh", makh)
        .or(`den_ngay.lt.${den_ngay},and(den_ngay.eq.${den_ngay},sohd.lt.${sohd})`)
        .order("den_ngay", { ascending: false })
        .order("idx",      { ascending: false })
        .limit(1);
      if (error) throw error;
      return setNoCu(data?.[0]?.du_cuoi ?? 0);
    }

    // HĐ mới → lấy bản ghi gần nhất <= ngày
    const { data, error } = await supabase
      .from("v_bc_congno_kh")
      .select("du_cuoi, den_ngay, idx")
      .eq("makh", makh)
      .lte("den_ngay", den_ngay)
      .order("den_ngay", { ascending: false })
      .order("idx",      { ascending: false })
      .limit(1);
    if (error) throw error;
    return setNoCu(data?.[0]?.du_cuoi ?? 0);
  } catch (e) {
    console.error("[noCu] load error:", e);
    setNoCu(0);
  }
}
function setNoCu(v){
  const ip = $("#noCu");
  if (!ip) return;
  ip.value = moneyVN.format(Number(v)||0);
}

// =================== Nhân viên bán hàng ===================
async function loadNhanVienBanHang() {
  const { data, error } = await supabase
    .from("nhansu")
    .select("manv, ten")
    .eq("chucvu", "bán hàng")
    .eq("tinhtrang", "active")
    .order("ten", { ascending: true });

  if (error) { console.error("Lỗi NV:", error); return; }

  const sel = $("#tenNV");
  if (!sel) return;

  sel.innerHTML = `<option value="">— Chọn NV —</option>`;
  (data || []).forEach(nv => {
    sel.insertAdjacentHTML("beforeend",
      `<option value="${nv.manv}">${nv.ten}</option>`);
  });
}

async function setNhanVienForInvoice(manv) {
  const sel = $("#tenNV");
  if (!sel) return;
  if (sel.options.length <= 1) await loadNhanVienBanHang();
  if (manv && ![...sel.options].some(o => o.value === manv)) {
    sel.insertAdjacentHTML("beforeend", `<option value="${manv}">${manv}</option>`);
  }
  sel.value = manv || "";
}

// =================== Khởi động ===================
document.addEventListener("DOMContentLoaded", init);

async function init(){
  try {
    // format nghìn cho ô nợ cũ
    formatThousandInput($("#noCu"));

    const sohd = new URLSearchParams(location.search).get("sohd") || "";

    await loadNhanVienBanHang();
    await loadKhoList();

    // Đổ danh sách đơn gần đây nếu có khung
    if (typeof taiDonHangGanDay === "function") await taiDonHangGanDay();

    // Nạp HĐ cũ nếu có sohd
    if (sohd) await taiHoaDonCu(sohd);

    // Tự tính nợ cũ khi đổi mã KH / ngày
    $("#maKH")?.addEventListener("change", () => {
      const makh = $("#maKH").value.trim();
      const sohdNow = $("#soHD")?.value?.trim() || null;
      const ngay = $("#ngayHD")?.value || new Date();
      loadNoCuFromView(makh, ngay, sohdNow);
    });
    $("#ngayHD")?.addEventListener("change", () => {
      const makh = $("#maKH")?.value?.trim();
      if (makh) {
        const sohdNow = $("#soHD")?.value?.trim() || null;
        loadNoCuFromView(makh, $("#ngayHD").value, sohdNow);
      }
    });
  } catch (e) {
    console.error("Lỗi init:", e);
  }
}

// =================== Nạp hóa đơn cũ ===================
export async function taiHoaDonCu(sohd){
  try {
    // 1) Header hóa đơn
    const { data: hd, error: errHD } = await supabase
      .from("hoadon").select("*").eq("sohd", sohd).single();

    if (errHD || !hd) {
      alert("Không tìm thấy hóa đơn!");
      console.error(errHD);
      return;
    }

    // 2) Chi tiết
    const { data: chitiet, error: errCT } = await supabase
      .from("chitiet").select(`*,thietlap_kho (id, ma_kho)`).eq("sohd", sohd);

    if (errCT) {
      alert("Không tìm được chi tiết sản phẩm!");
      console.error("[CT ERROR]", errCT);
      return;
    }
    console.log("[HD]", hd);
    console.log("[CT length]", chitiet?.length, chitiet?.slice(0,3));

    // 3) Khách hàng
    let kh = null;
    if (hd.makh) {
      const { data, error } = await supabase
        .from("khachhang").select("*").eq("makh", hd.makh).single();
      if (!error) kh = data;
    }

    // 4) Gán header form
    setVal("#soHD",  hd.sohd);
    setVal("#ngayHD",hd.ngay);
    setVal("#maKH",  hd.makh);
    setVal("#ghiChu",hd.ghichu ?? "");
    setVal("#chietKhau", hd.chietkhau ?? 0);
    setVal("#thue",      hd.thue ?? 0);

    if (kh) {
      setVal("#tenDV",  kh.tendv  ?? "");
      setVal("#sdt",    kh.sdt    ?? "");
      setVal("#mst",    kh.mst    ?? "");
      setVal("#diaChi", kh.diachi ?? "");
    }

    // 4b) Ẩn/hiện khung theo phân loại NK/KH
    const isNK = String(hd.phanloai || "").trim().toLowerCase() === "nk";
    const k4 = document.getElementById("recentInvoices") || document.getElementById("khung4");
    const k5 = document.getElementById("khuPhiPhanBo");
    if (k4) k4.classList.toggle("hidden",  isNK);
    if (k5) k5.classList.toggle("hidden", !isNK);

    if (isNK) {
      setVal("#phanBo", hd.phan_bo     ?? 0);
      setVal("#sl",     hd.so_luong_pb ?? 0);
      setVal("#tongsl", hd.so_luong_pb ?? 0);

      const useTongEl = document.getElementById("ppbUseTongSL");
      const cheDoIsTong = (hd.che_do_pb || "").toLowerCase() === "tongsl";
      if (useTongEl) useTongEl.checked = cheDoIsTong;
      if (typeof window._refreshPPBModeUI === "function") window._refreshPPBModeUI();
      useTongEl?.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      setVal("#phanBo", 0); setVal("#sl", 0); setVal("#tongsl", 0);
      const useTongEl = document.getElementById("ppbUseTongSL");
      if (useTongEl) useTongEl.checked = false;
      if (typeof window._refreshPPBModeUI === "function") window._refreshPPBModeUI();
    }

    await setNhanVienForInvoice(hd.nv || null);

    // 5) Nợ cũ từ view (liền trước HĐ này)
    await loadNoCuFromView(hd.makh, hd.ngay, hd.sohd);

    // 6) Đổ bảng sản phẩm
    const tbody = document.getElementById("bangSPBody");
    if (!tbody) { console.warn("Không thấy #bangSPBody"); return; }
    tbody.innerHTML = "";

    if (!chitiet || chitiet.length === 0) {
      console.warn("[CT EMPTY] Không có chi tiết cho", sohd);
      window.themDongSP({});
    } else {
      chitiet.forEach(sp => window.themDongSP(sp));
    }

    // 7) Tính tổng
    if (typeof window.tinhTongTienHang === "function") window.tinhTongTienHang();
    if (typeof window.tinhTongThanhToan === "function") window.tinhTongThanhToan();
  } catch (e) {
    console.error("taiHoaDonCu lỗi:", e);
  }
}

// =================== Đơn gần đây ===================
export async function taiDonHangGanDay(){
  const list = $("#recentList");
  if (!list) return;

  list.innerHTML = `<div class="recent-item"><span class="meta">Đang tải...</span></div>`;

  const { data, error } = await supabase
    .from("hoadon")
    .select("sohd, makh, tongtien, ngay, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    list.innerHTML = `<p style="color:red;margin:0">Không thể tải đơn hàng gần đây</p>`;
    return;
  }

  list.innerHTML = "";
  const frag = document.createDocumentFragment();
  (data || []).forEach(don => {
    const item = document.createElement("div");
    item.className = "recent-item";
    const ngay = don.ngay || new Date(don.created_at).toLocaleDateString("vi-VN");
    const tien = (don.tongtien || 0).toLocaleString("vi-VN") + "₫";
    item.innerHTML = `
      <span class="sohd-link" style="cursor:pointer" onclick="napLaiDon('${don.sohd}')">
        ${ngay} - ${don.sohd} - ${don.makh} - ${tien}
      </span>
      <button class="recent-print" onclick="inHoaDon('${don.sohd}')" title="In">🖨️</button>
    `;
    frag.appendChild(item);
  });
  list.appendChild(frag);
}
window.taiDonHangGanDay = taiDonHangGanDay;

// =================== Thêm dòng SP ===================
window.themDongSP = function(sp = {}) {
  const tbody = document.getElementById("bangSPBody");
  if (!tbody) return;

  const moneyVN = new Intl.NumberFormat("vi-VN");
  // ===== normalize data =====
  const masp    = sp.masp ?? sp.ma_sp ?? "";
  const tensp   = sp.tensp ?? sp.ten_sp ?? "";
  const ghichu  = sp.ghichu ?? "";
  const kho_id  = sp.kho_id ?? "";
  const soluong = Number(sp.soluong ?? sp.so_luong ?? 0);
  const spInfo = spMap?.[masp] || {};

  const dvtGoc = sp.dvt ?? sp.don_vi_tinh ?? spInfo.dvt ?? "";
  const dvtChuyen = spInfo.dvtchuyendoi ?? "";

  const soLuong = Number(sp.soLuongNhap ?? sp.so_luong ?? 0);
  const dvtNhap = sp.dvtNhap ?? "";

  // 🔥 KEY LOGIC
  const isNhapGoc = dvtNhap === dvtGoc;

  // hiển thị
  const soLuongDisplay = isNhapGoc ? "" : soLuong;
  const dvtNhapDisplay = isNhapGoc ? "" : dvtNhap;
  const dvtDisplay = dvtGoc;
  const dongia = parseMoneyVN(sp.dongia ?? sp.don_gia ?? 0);

  const stt = tbody.rows.length + 1;

  // ===== create row =====
  const row = document.createElement("tr");

  row.innerHTML = `
    <td class="stt">${stt}</td>

    <td><input class="maSP" value="${masp}"></td>

    <td><input class="tenSP" value="${tensp}"></td>

    <td><input class="ghiChuSP" value="${ghichu}"></td>

    <td>
      <select class="khoSelect">
        <option value="">-- Chọn kho --</option>
      </select>
    </td>
    <td><input class="soLuong" type="number" value="${soLuongDisplay}"></td>
    
    <td><input class="dvtNhap" value="${dvtNhapDisplay}"></td>

    <td><input class="tongSL" type="number" value="${soluong}"></td>

    <td><input class="dvt" value="${dvtDisplay}"></td>

    <td>
      <input class="donGia" type="text"
        value="${moneyVN.format(dongia)}"
        inputmode="numeric">
    </td>

    <td class="thanhTien">0</td>

    <td><button class="xoaSP">❌</button></td>
  `;

  // ===== kho select =====
  const khoSelect = row.querySelector(".khoSelect");
  if (window.khoList) {
    window.khoList.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k.id;
      opt.textContent = k.ma_kho;
      khoSelect.appendChild(opt);
    });
  }
  if (kho_id) khoSelect.value = String(kho_id);

  // ===== elements =====
  const ipSL  = row.querySelector(".tongSL");
  const ipGia = row.querySelector(".donGia");
  const cellTT = row.querySelector(".thanhTien");

  // ===== format tiền =====
  ipGia.addEventListener("focus", () => {
    ipGia.value = String(ipGia.value).replace(/[^\d]/g, '');
  });

  ipGia.addEventListener("blur", () => {
    ipGia.value = moneyVN.format(parseMoneyVN(ipGia.value));
  });

  // ===== tính tiền =====
  const capNhatTien = () => {
    const sl  = Number(ipSL.value) || 0;
    const gia = parseMoneyVN(ipGia.value);   

    const tt  = Math.round(sl * gia);

    cellTT.textContent = moneyVN.format(tt);

    if (typeof window.tinhTongTienHang === "function") window.tinhTongTienHang();
    if (typeof window.tinhTongThanhToan === "function") window.tinhTongThanhToan();
  };

  ipSL.addEventListener("input", capNhatTien);
  ipGia.addEventListener("input", capNhatTien);
  ipGia.addEventListener("blur", capNhatTien);

  // ===== xóa dòng =====
  row.querySelector(".xoaSP").addEventListener("click", () => {
    row.remove();
    capNhatSTT();

    if (typeof window.tinhTongTienHang === "function") window.tinhTongTienHang();
    if (typeof window.tinhTongThanhToan === "function") window.tinhTongThanhToan();
  });

  // ===== append =====
  tbody.appendChild(row);

  capNhatSTT();
  capNhatTien();

  // ===== auto scroll (nếu có) =====
  if (typeof window.autoScrollToNewRow === "function") {
    window.autoScrollToNewRow(row);
  }
};

// =================== Tính tổng ===================
function capNhatSTT(){
  $$("#bangSPBody tr").forEach((row, i) => {
    const cell = row.querySelector("td:first-child");
    if (cell) cell.textContent = i + 1;
  });
}

// =================== Mở form in / nạp lại đơn ===================
window.inHoaDon = function(sohd){
  const url = `formIn.html?sohd=${encodeURIComponent(sohd)}`;
  window.open(url, "_blank", "width=900,height=650");
};
window.napLaiDon = function(sohd){
  const url = `ghihd.html?sohd=${encodeURIComponent(sohd)}`;
  window.open(url, "_blank");
};
