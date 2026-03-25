import { supabase } from "./supabase.config.js";
import { spById, spMap, napDanhSachSanPham, moneyVN, parseMoneyVN } from './sanpham.data.js';
import { getMaSPGoc } from './xulisp.js';


// ===== NEW: chọn đúng tbody + scroller
let tbody;

document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById('bangSPBody');
});           
let scroller;

document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById('bangSPBody');
  scroller = document.querySelector('.table-scroll');
});     

function autoScrollToNewRow(tr) {
  // đảm bảo DOM render xong mới cuộn
  requestAnimationFrame(() => {
    // cuộn khung xuống cuối
    scroller.scrollTop = scroller.scrollHeight;
    // giữ dòng mới trong tầm nhìn (mượt)
    tr?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
window.autoScrollToNewRow = autoScrollToNewRow;

// Hàm tính lại tổng tiền hàng từ bảng
function tinhTongTienHang() {
  let tong = 0;
  document.querySelectorAll("#bangSPBody tr").forEach(row => {
    const cell = row.querySelector(".thanhTien") || row.querySelector("td:nth-child(10)");
    const raw  = cell?.textContent ?? cell?.value ?? '0';
    tong += parseMoneyVN(raw);              // <— dùng parseMoneyVN
  });

  const ip = document.getElementById("tongHang");
  ip.type = 'text';
  ip.readOnly = true;
  ip.value = moneyVN.format(tong);

  if (typeof tinhTongThanhToan === "function") tinhTongThanhToan();
}


function tinhTongThanhToan() {
  const tongHang = parseMoneyVN(document.getElementById('tongHang')?.value) || 0;
  const chietKhau = parseMoneyVN(document.getElementById('chietKhau')?.value) || 0;
  const thue = parseMoneyVN(document.getElementById('thue')?.value) || 0;

  const tienThue = (tongHang * thue) / 100;
  const tongThanhToan = tongHang - chietKhau + tienThue;

  document.getElementById('tienThue').type = 'text';
  document.getElementById('tienThue').readOnly = true;
  document.getElementById('tienThue').value = moneyVN.format(tienThue);

  document.getElementById('tongThanhToan').type = 'text';
  document.getElementById('tongThanhToan').readOnly = true;
  document.getElementById('tongThanhToan').value = moneyVN.format(tongThanhToan);
}
document.getElementById('chietKhau')?.addEventListener('input', tinhTongThanhToan);
document.getElementById('thue')?.addEventListener('input', tinhTongThanhToan);

document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("themSP");

  if(btn){
    btn.addEventListener("click", function () {

      const tenSPRaw = document.getElementById('tenSP').value;
      const tenSP = tenSPRaw.trim();

      const masp = getMaSPGoc();
      const sp = spById[masp];

      if (!sp) {
        if (confirm(`Sản phẩm "${tenSP}" chưa có trong danh sách. Bạn có muốn thêm mới không?`)) {
          const url = `nhapsp.html?tensp=${encodeURIComponent(tenSP)}`;
          window.open(url, "_blank", "width=600,height=400");
        }
        return;
      }

      const ghiChu = document.getElementById('ghiChuSP').value.trim();
      const kho_id = document.getElementById('kho').value;

      const soLuongNhap = parseFloat(document.getElementById('soLuong')?.value) || 0;
      const dvtNhap = document.getElementById('dvt')?.value || "";
      const tongSL = document.getElementById('tongSL').value.trim();
      const donGiaNum = parseMoneyVN(document.getElementById('donGia').value.trim());

      window.themDongSP({
        masp: masp,
        tensp: tenSP,
        ghichu: ghiChu,
        kho_id: kho_id,
        soLuongNhap: soLuongNhap,
        dvtNhap: dvtNhap,
        soluong: parseFloat(tongSL) || 0,
        dvt: sp.dvt || "",
        dongia: donGiaNum
      });

      document.querySelectorAll('.input-bar input').forEach(i => i.value = '');
      document.getElementById('tenSP').focus();

    });
  }

});
// Hàm cập nhật lại STT sau khi xoá dòng
function capNhatSTT() {
  const rows = document.querySelectorAll("#bangSPBody tr");
  rows.forEach((row, index) => {
    row.querySelector(".stt").textContent = index + 1;
  });
}

window.tinhTongTienHang = tinhTongTienHang;
window.tinhTongThanhToan = tinhTongThanhToan;