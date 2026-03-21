import { supabase } from "./supabase.config.js";
import { spById, spMap, napDanhSachSanPham, moneyVN, parseMoneyVN } from './sanpham.data.js';
import { getMaSPGoc } from './xulisp.js';


// ===== NEW: chọn đúng tbody + scroller
let tbody;

document.addEventListener("DOMContentLoaded", () => {
  tbody = document.getElementById('bangSPBody');
});           
const scroller = document.querySelector('.table-scroll');       // khung cuộn

// ===== NEW: hàm cuộn đến dòng vừa thêm
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

// Xử lý khi bấm nút "Thêm SP"
document.getElementById('themSP').addEventListener('click', function () {
  // ===== CHỈNH: dùng tbody sẵn ở trên cho đồng nhất
  // const tbody = document.querySelector("#bangSP tbody");

  const tenSPRaw = document.getElementById('tenSP').value; // giá trị nguyên gốc
  const tenSP = tenSPRaw.trim();
  console.log('🔍 Giá trị input #tenSP (raw):', JSON.stringify(tenSPRaw));
  console.log('🔍 Giá trị sau khi chuẩn hóa:', JSON.stringify(tenSP));

  const masp = getMaSPGoc();
  const sp = spById[masp];

  if (!sp) {
    if (confirm(`Sản phẩm "${tenSP}" chưa có trong danh sách. Bạn có muốn thêm mới không?`)) {
      const url = `nhapsp.html?tensp=${encodeURIComponent(tenSP)}`;
      window.open(url, "_blank", "width=600,height=400");
    }
    return;
}
 
  const maSPThuần = masp;
  const ghiChu = document.getElementById('ghiChuSP').value.trim();
  const khoSelect = document.getElementById('kho');
  const opt = khoSelect.selectedOptions[0];
  const kho_id = khoSelect.value;        // id (để lưu DB nếu cần)
  const soLuongNhap = parseFloat(document.getElementById('soLuong')?.value) || 0;
  const dvtNhap = document.getElementById('dvt')?.value || "";
  const tongSL = document.getElementById('tongSL').value.trim();
  const donGiaStr = document.getElementById('donGia').value.trim();
  const donGiaNum = parseMoneyVN(donGiaStr);              
  const dvtGoc = sp.dvt || "";

  window.themDongSP({
    masp: maSPThuần,
    tensp: tenSP,
    ghichu: ghiChu,
    kho_id: kho_id,
    soLuongNhap: soLuongNhap, 
    dvtNhap: dvtNhap,
 
    soluong: parseFloat(tongSL) || 0,
    dvt: dvtGoc,
    dongia: donGiaNum
  });



  // Xoá input sau khi thêm + focus nhập tiếp
  document.querySelectorAll('.input-bar input').forEach(i => i.value = '');
  document.getElementById('tenSP').focus();

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