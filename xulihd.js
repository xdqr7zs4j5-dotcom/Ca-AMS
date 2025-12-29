import { supabase } from "./supabase.config.js";
import { loaiHDMap, loaiHDReady } from "./xulisp.js"; // 👈 dùng map chung + promise ready
import { spMap, napDanhSachSanPham, moneyVN, parseMoneyVN } from './sanpham.data.js';

document.addEventListener("DOMContentLoaded", async () => {
  // === Gán nút thao tác ===
  document.getElementById("luuHD").addEventListener("click", async () => {
    console.log("Đã bấm nút Lưu");
    const hoaDon = await luuHoaDon();
    if (hoaDon?.sohd) {
      await window.taiDonHangGanDay?.();
      await xoaHoaDon();               // ❗ reset, KHÔNG tự tăng số
    }
  });

  document.getElementById("xoaHD").addEventListener("click", async () => {
    if (confirm("Bạn có chắc chắn muốn xóa hóa đơn này?")) {
      await xoaHoaDon();               // đã tự xử lý ngày, KHÔNG xin số
    }
  });

  document.getElementById("luuVaIn").addEventListener("click", async () => {
    const hoaDon = await luuHoaDon();
    if (!hoaDon?.sohd) {
      alert("Không thể lưu hóa đơn.");
      return;
    }
    await window.taiDonHangGanDay?.();
    await xoaHoaDon();                 // ❗ reset, KHÔNG tự tăng số

    const url = `formIn.html?sohd=${encodeURIComponent(hoaDon.sohd)}`;
    window.open(url, "_blank", "width=900,height=600");
  });

  // === Khi mới vào form: KHÔNG gán số HĐ, chỉ gán ngày nếu trống ===
  const soHDInput = document.getElementById("soHD");
  if (soHDInput) soHDInput.value = ""; // để trống → tạo mới sẽ xin số lúc Lưu

  const ngayHD = document.getElementById("ngayHD");
  if (ngayHD && !ngayHD.value) {
    ngayHD.value = new Date().toISOString().split("T")[0];
  }
});

// === Hàm tạo số hóa đơn mới (JS-only, chống paginate) ===
// Dựa vào pad 5 số nên ORDER BY chuỗi = ORDER BY số
async function taoSoHoaDonMoi() {
  const { data, error } = await supabase
    .from("hoadon")
    .select("sohd")
    .like("sohd", "HD%")
    .order("sohd", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Lỗi khi lấy số hóa đơn:", error);
    return "HD00001";
  }
  const max = data?.[0]?.sohd || "HD00000";
  const num = parseInt(max.slice(2), 10) || 0;
  return "HD" + String(num + 1).padStart(5, "0");
}

async function loadNhanVienBanHang() {
  const { data, error } = await supabase
    .from("nhansu")
    .select("manv, ten")
    .eq("chucvu", "bán hàng")
    .eq("tinhtrang", "active");

  if (error) {
    console.error("Lỗi lấy nhân viên:", error);
    return;
  }

  const select = document.getElementById("tenNV");
  if (!select) return;

  const currentNV = select.value || null;
  select.innerHTML = `<option value="">— Chọn NV —</option>`;
  for (const nv of data) {
    select.insertAdjacentHTML(
      "beforeend",
      `<option value="${nv.manv}">${nv.ten}</option>`
    );
  }
  if (currentNV) select.value = currentNV;
}
document.addEventListener("DOMContentLoaded", loadNhanVienBanHang);

function getCellValue(row, selector) {
  const el = row.querySelector(selector);
  return el?.value?.trim() || el?.textContent?.trim() || "";
}

// helper
const parseNum = v => Number(String(v ?? '').replace(/[^\d.\-]/g,'')) || 0;

function getPPBForSave(){
  const phanBo = parseNum(document.getElementById('phanBo')?.value);
  const sl     = parseNum(document.getElementById('sl')?.value);
  const tongsl = parseNum(document.getElementById('tongsl')?.value);
  const useTong = !!document.getElementById('ppbUseTongSL')?.checked;
  return { phan_bo: phanBo, so_luong_pb: useTong ? tongsl : sl, che_do_pb: useTong ? 'tongsl' : 'sl' };
}

// === Lưu Hóa Đơn: tạo mới (xin số) hoặc cập nhật (giữ số) ===
async function luuHoaDon() {
  try {
    await loaiHDReady;

    // 1) Header
    let sohd  = document.getElementById("soHD")?.value.trim(); // ❗ có => UPDATE, rỗng => INSERT
    const ngay  = document.getElementById("ngayHD")?.value.trim();
    const makh  = document.getElementById("maKH")?.value.trim();
    const ghichu= document.getElementById("ghiChu")?.value || "";

    const chietkhau     = parseMoneyVN(document.getElementById("chietKhau")?.value);
    const thue          = parseMoneyVN(document.getElementById("tienThue")?.value);
    const tongtien      = parseMoneyVN(document.getElementById("tongHang")?.value);
    const tongthanhtoan = parseMoneyVN(document.getElementById("tongThanhToan")?.value);

    const thamChieu = document.getElementById('thamChieu')?.value?.trim() || null;
    const nv = document.getElementById("tenNV")?.value || null;

    // phân loại -> loaiphieu (nk/xk/kh/…)
    const loaiHDChon = (document.getElementById("phanLoai")?.value || "").trim();
    const map = loaiHDMap.get(loaiHDChon.toLowerCase()) || {};
    const loaiphieu = ['nk','xk','kh'].includes(map.gd_kho)
      ? map.gd_kho
      : (['nk','xk','kh'].includes(loaiHDChon.toLowerCase()) ? loaiHDChon.toLowerCase() : '');

    const isNhapKho = (loaiphieu === 'nk');
    const ppb = isNhapKho ? getPPBForSave() : null;
    const nz = v => Number.isFinite(v) ? v : 0;

    // payload KHÔNG chứa sohd khi tạo mới
    const payloadHD = {
      ngay, makh, ghichu,
      tongtien:      nz(tongtien),
      chietkhau:     nz(chietkhau),
      thue:          nz(thue),
      phanloai:      loaiphieu || null,
      tongthanhtoan: nz(tongthanhtoan),
      thanhtoan:     0,
      tinhtrang:     '',
      thamchieu:     thamChieu || null,
      nv,
      ...(isNhapKho ? {
        phan_bo:     nz(ppb.phan_bo),
        so_luong_pb: nz(ppb.so_luong_pb),
        che_do_pb:   ppb.che_do_pb
      } : {
        phan_bo:     null,
        so_luong_pb: null,
        che_do_pb:   null
      }),
    };

    // 2) INSERT (xin số) hoặc UPDATE (giữ số)
    if (!sohd) {
      // Tạo mới: xin số ngay trước khi chèn
      sohd = await taoSoHoaDonMoi();
      const { error: errHD } = await supabase.from("hoadon").insert([{ ...payloadHD, sohd }]);
      if (errHD) { console.error("❌ Lỗi lưu hóa đơn:", errHD); alert("Lưu hóa đơn thất bại!"); return; }
      document.getElementById("soHD").value = sohd; // để in/ghi chi tiết
    } else {
      // Cập nhật: không xóa, chỉ update
      const { error: errHD } = await supabase.from("hoadon").update(payloadHD).eq("sohd", sohd);
      if (errHD) { console.error("❌ Lỗi cập nhật hóa đơn:", errHD); alert("Cập nhật hóa đơn thất bại!"); return; }
    }

    // 3) Thu sản phẩm từ bảng và ghi bảng chitiet
    const rows = document.querySelectorAll("#bangSP tbody tr");
    const dsSP = [];

    rows.forEach(row => {
      const tensp   = getCellValue(row, '.tenSP');
      const elMaSP  = row.querySelector('.maSP');
      const masp    = elMaSP?.dataset?.masp || getCellValue(row, '.maSP');
      const ghichu  = getCellValue(row, '.ghiChuSP');
      const dvtGoc  = getCellValue(row, '.dvtGoc');
      const dvt     = getCellValue(row, '.dvt');
      const soluongText = getCellValue(row, '.soLuong');
      const soluong = parseFloat(soluongText) || 0;
      const slthung = (!soluongText || soluongText === "0") ? "" : `${soluongText} ${dvt}`;
      const tongSL  = parseFloat(getCellValue(row, '.tongSL')) || 0;
      const dongia  = parseMoneyVN(getCellValue(row, '.donGia'));
      const thanhTien = tongSL * dongia;

      dsSP.push({
        sohd, ngay, makh,
        tensp, masp, ghichu,
        soluong: tongSL,
        slthung,
        dvt: dvtGoc,
        dongia,
        thanhtien: thanhTien
      });
    });

    if (dsSP.length === 0) { alert("Chưa có sản phẩm nào trong hóa đơn!"); return; }

    const { error: errCT } = await supabase
  .from("chitiet")
  .upsert(dsSP, {
    onConflict: "sohd,masp",
    defaultToNull: true
  });

if (errCT) {
  console.error("❌ Lỗi lưu chi tiết hóa đơn:", errCT);
  alert("Lưu chi tiết hóa đơn thất bại!");
  return;
}

    // Thông báo & sync
    try { window.opener?.postMessage({ type: "hd-saved", sohd }, "*"); } catch {}
    try {
      localStorage.setItem("hd-saved", JSON.stringify({ sohd, ts: Date.now() }));
      localStorage.removeItem("hd-saved");
    } catch {}

    alert("✅ Đã lưu hóa đơn và sản phẩm thành công!");
    return { sohd };

  } catch (err) {
    console.error("❌ Lỗi không xác định:", err);
    alert("Đã xảy ra lỗi không xác định khi lưu hóa đơn.");
  }
}

// === In hóa đơn ===
function inHoaDon() {
  window.print();
}

// === Reset form: KHÔNG xin/gán số mới ===
async function xoaHoaDon() {
  // 1. Xóa input và textarea (trừ ngày)
  document.querySelectorAll("input, textarea").forEach(el => {
    if (["ngayHD"].includes(el.id)) return;
    el.value = "";
  });

  // 2. Xóa bảng sản phẩm
  const tbody = document.querySelector("#bangSP tbody");
  if (tbody) tbody.innerHTML = "";

  // 3. Số HĐ để trống
  const soHDInput = document.getElementById("soHD");
  if (soHDInput) soHDInput.value = "";

  // 4. Gán lại ngày hôm nay (nếu trống)
  const ngayHD = document.getElementById("ngayHD");
  if (ngayHD && !ngayHD.value) {
    ngayHD.value = new Date().toISOString().split("T")[0];
  }
  requestAnimationFrame(focusMaKH);
}

function focusMaKH() {
  const el = document.getElementById('maKH');
  if (el) { el.focus(); el.select?.(); }
}

// ❌ Không còn dùng trong flow lưu, có thể giữ lại nếu chỗ khác cần
function tangSoHoaDon(sohdCu) {
  const prefix = sohdCu.slice(0, 2);     // "HD"
  const number = parseInt(sohdCu.slice(2)) || 0;
  const next = number + 1;
  return prefix + next.toString().padStart(5, "0");
}
