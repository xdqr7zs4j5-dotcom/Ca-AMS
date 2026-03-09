import { supabase } from "./supabase.config.js";
import { spById, spMap, napDanhSachSanPham, moneyVN, parseMoneyVN } from './sanpham.data.js';
import { getMaSPGoc } from './xulisp.js';


// ===== NEW: chọn đúng tbody + scroller
const tbody = document.getElementById('bangSPBody');            // <tbody id="bangSPBody">
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

// Hàm tính lại tổng tiền hàng từ bảng
function tinhTongTienHang() {
  let tong = 0;
  document.querySelectorAll("#bangSP tbody tr").forEach(row => {
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
 
  const stt = tbody.rows.length + 1;
  const maSPHienThi = sp.masp;
  const maSPThuần = masp;
  const ghiChu = document.getElementById('ghiChuSP').value.trim();
  const soLuong = document.getElementById('soLuong').value.trim();
  const dvt = document.getElementById('dvt').value.trim();
  const tongSL = document.getElementById('tongSL').value.trim();
  const donGiaStr = document.getElementById('donGia').value.trim();
  const donGiaNum = parseMoneyVN(donGiaStr);              // <—
  const thanhTienNum = (parseFloat(tongSL)||0) * donGiaNum;

  const isDVTGoc = dvt === sp.dvt;
  const hienSoLuong = isDVTGoc ? "" : soLuong;
  const hienDVT = isDVTGoc ? "" : dvt;
  const dvtGoc = sp.dvt || "";

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="stt">${stt}</td> 
    <td class="maSP" data-masp="${maSPThuần}">${maSPHienThi}</td>
    <td class="tenSP">${tenSP}</td>
    <td class="ghiChuSP">${ghiChu}</td>
    <td class="soLuong">${hienSoLuong}</td>
    <td class="dvt">${hienDVT}</td>
    <td><input type="number" class="editable tongSL" value="${tongSL}" /></td>
    <td class="dvtGoc">${dvtGoc}</td>
    <td><input type="text" class="editable donGia" value="${moneyVN.format(donGiaNum)}" inputmode="numeric" /></td>
    <td class="thanhTien">${moneyVN.format(Math.round(thanhTienNum))}</td>
    <td><button class="xoaSP">❌</button></td>
  `;

  tbody.appendChild(tr);

  // ===== NEW: auto cuộn & highlight nhẹ
  autoScrollToNewRow(tr);
  tr.style.transition = 'background 500ms';
  tr.style.background = '#fff8e1';
  setTimeout(() => (tr.style.background = ''), 500);

  // mask cho ô đơn giá của dòng mới
const ipDG = tr.querySelector('.donGia');
ipDG.addEventListener('focus', () => { ipDG.value = String(parseMoneyVN(ipDG.value) || ''); });
ipDG.addEventListener('blur',  () => { ipDG.value = moneyVN.format(parseMoneyVN(ipDG.value)); });

tr.querySelectorAll('.tongSL, .donGia').forEach(input => {
  input.addEventListener('input', () => {
    const row = input.closest('tr');
    const tongSL = parseFloat(row.querySelector('.tongSL')?.value) || 0;
    const donGia = parseMoneyVN(row.querySelector('.donGia')?.value);
    const tt = Math.round(tongSL * donGia);
    row.querySelector('.thanhTien').textContent = moneyVN.format(tt);  // <—

    tinhTongTienHang();
    tinhTongThanhToan();
  });
});

  // Xoá dòng
  tr.querySelector(".xoaSP")?.addEventListener("click", () => {
    tr.remove();
    capNhatSTT();
    tinhTongTienHang();
    tinhTongThanhToan();
  });

  // Xoá input sau khi thêm + focus nhập tiếp
  document.querySelectorAll('.input-bar input').forEach(i => i.value = '');
  document.getElementById('tenSP').focus();

  tinhTongTienHang();
  tinhTongThanhToan();
});

// Hàm cập nhật lại STT sau khi xoá dòng
function capNhatSTT() {
  const rows = document.querySelectorAll("#bangSP tbody tr");
  rows.forEach((row, index) => {
    row.querySelector(".stt").textContent = index + 1;
  });
}
