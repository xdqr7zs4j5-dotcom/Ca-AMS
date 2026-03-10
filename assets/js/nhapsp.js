
    import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
    const supabase = createClient(
      'https://qvifxqsgjsvvdjfclyjm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aWZ4cXNnanN2dmRqZmNseWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzc0MDcsImV4cCI6MjA2OTYxMzQwN30.egiHCr2zYRZyf6kwJk7xgcRYD5dqhU-n1H_Dnuo-jso'
    );

    let nhomKihieuMap = {}; // { "Khô": "kh", ... }

    // ===== 1) Nạp nhóm SP (thietlap_sp) =====
    async function taiDanhSachNhom() {
      const { data, error } = await supabase.from("thietlap_sp").select("nhomsp, kihieu");
      if (error) { alert("Lỗi tải nhóm: " + error.message); return; }

      const select = document.getElementById("nhomsp");
      nhomKihieuMap = {};
      select.innerHTML = '<option value="">-- Chọn nhóm --</option>';
      (data || []).forEach(row => {
        nhomKihieuMap[row.nhomsp] = row.kihieu;
        const opt = document.createElement("option");
        opt.value = row.nhomsp; opt.textContent = row.nhomsp;
        select.appendChild(opt);
      });
    }

    // ===== 2) Chọn nhóm -> tự sinh mã SP =====
    async function capNhatMaSP() {
      const nhom = document.getElementById("nhomsp").value;
      const kihieu = nhomKihieuMap[nhom];
      if (!kihieu) return;

      const { data, error } = await supabase
        .from("sanpham").select("masp").ilike("masp", `${kihieu}%`);
      if (error) { alert("Lỗi sinh mã SP: " + error.message); return; }

      const usedNumbers = new Set();
      (data || []).forEach(row => {
        const so = parseInt(String(row.masp).replace(kihieu, ""));
        if (!isNaN(so)) usedNumbers.add(so);
      });
      let next = 1; while (usedNumbers.has(next)) next++;
      const maspMoi = kihieu + String(next).padStart(3, "0");
      document.getElementById("masp").value = maspMoi;
    }

    // ===== 3) Nạp list ĐVT (list_dvt) =====
    // ===== 3) Nạp list ĐVT (list_dvt) =====
async function taiDanhSachDVT() {
  const { data, error } = await supabase
    .from('list_dvt')
    .select('dvt')
    .order('dvt', { ascending: true });

  if (error) { alert('Lỗi tải ĐVT: ' + error.message); return; }

  const selMain = document.getElementById('dvtSelect');   // ĐVT chính (có Khác…)
  const selCD1  = document.getElementById('dvtcdSelect'); // ĐVT chuyển đổi
  const selCD2  = document.getElementById('dvtcd2Select'); // ĐVT chuyển đổi 2

  // helper add options
  const fill = (sel, includeOther=false) => {
    sel.innerHTML = '';
    sel.appendChild(new Option('-- Chọn ĐVT --', ''));
    (data || []).forEach(r => { if (r?.dvt) sel.appendChild(new Option(r.dvt, r.dvt)); });
    if (includeOther) sel.appendChild(new Option('Khác…', '__OTHER__'));
  };

  fill(selMain, true);   // có “Khác…”
  fill(selCD1, false);   // chỉ chọn
  fill(selCD2, false);   // chỉ chọn
}

// Đồng bộ chọn -> input ẩn (đã có cho ĐVT chính)
function onDvtCD1Change() {
  document.getElementById('dvtchuyendoi').value = document.getElementById('dvtcdSelect').value || '';
}
function onDvtCD2Change() {
  document.getElementById('dvtchuyendoi2').value = document.getElementById('dvtcd2Select').value || '';
}

    // Đồng bộ chọn -> input dvt ẩn
    function onDvtChange() {
      const sel = document.getElementById('dvtSelect');
      const otherWrap = document.getElementById('dvtOtherWrap');
      const otherInput = document.getElementById('dvtOther');
      const dvtHidden = document.getElementById('dvt');

      if (sel.value === '__OTHER__') {
        otherWrap.style.display = 'flex';
        otherInput.focus();
        dvtHidden.value = otherInput.value.trim();
      } else {
        otherWrap.style.display = 'none';
        dvtHidden.value = sel.value;
      }
    }

    // Nhập DVT “khác” -> cập nhật input ẩn
    function onDvtOtherInput() {
      const val = document.getElementById('dvtOther').value.trim();
      document.getElementById('dvt').value = val;
    }

    // Lưu DVT mới vào list_dvt rồi reload select
    async function luuDvtMoi() {
      const btn = document.getElementById('btnSaveDvt');
      const otherInput = document.getElementById('dvtOther');
      const sel = document.getElementById('dvtSelect');
      const dvtHidden = document.getElementById('dvt');

      const val = otherInput.value.trim();
      if (!val) { alert('Nhập đơn vị tính trước đã.'); otherInput.focus(); return; }

      btn.disabled = true; btn.textContent = 'Đang lưu…';

      // Kiểm tra trùng nhẹ
      const { data: existed, error: chkErr } = await supabase
        .from('list_dvt')
        .select('dvt')
        .eq('dvt', val)
        .maybeSingle();
      if (chkErr) console.warn('Kiểm tra DVT lỗi:', chkErr);

      if (!existed) {
        const { error: insErr } = await supabase.from('list_dvt').insert([{ dvt: val }]);
        if (insErr) console.warn('Insert DVT lỗi (có thể do trùng):', insErr);
      }

      await taiDanhSachDVT();

      // Chọn lại giá trị vừa thêm
      const opt = Array.from(sel.options).find(o => o.value === val);
      if (opt) {
        sel.value = val;
        document.getElementById('dvtOtherWrap').style.display = 'none';
        dvtHidden.value = val;
      } else {
        sel.value = '__OTHER__';
        dvtHidden.value = val;
      }

      btn.disabled = false; btn.textContent = '+ Lưu vào danh sách';
      alert('✅ Đã cập nhật đơn vị tính.');
    }

    // ===== 4) Thêm / Cập nhật sản phẩm =====
    async function themSanPham() {
  const get = id => document.getElementById(id).value.trim();
  const isParent = document.getElementById("isParent").checked;
  const params = new URLSearchParams(window.location.search);
  const maspValue = get('masp');
  const maspSua = params.get("masp");
  let groupId;

// Nếu đang sửa → lấy group_id cũ
if (maspSua) {
  const { data: old } = await supabase
    .from("sanpham")
    .select("group_id")
    .eq("masp", maspSua)
    .single();

  groupId = old?.group_id || crypto.randomUUID();
} else {
  // Nếu thêm mới → tạo UUID mới
  groupId = crypto.randomUUID();
}
  const sp = {
  masp: maspValue,
  tensp: get('tensp'),
  dinhluong: parseFloat(get('dinhluong')) || null,
  dongia: parseFloat(get('dongia')) || 0,
  dongia2: parseFloat(get('dongia2')) || 0,
  dongia3: parseFloat(get('dongia3')) || 0,
  dvt: get('dvt'),
  quycach: parseFloat(get('quycach')) || 0,
  dvtchuyendoi: get('dvtchuyendoi'),
  quycach2: parseFloat(get('quycach2')) || 0,
  dvtchuyendoi2: get('dvtchuyendoi2'),
  giavon: parseFloat(get('giavon')) || 0,
  gianhapgoc: parseFloat(get('gianhapgoc')) || 0,
  tonkho: parseFloat(get('tonkho')) || 0,

  parent_id: maspValue, 
  group_id: groupId,
  is_parent: isParent,
  is_stock_parent: isParent
};

  if (!sp.masp || !sp.tensp || !sp.dvt) {
    alert("Vui lòng nhập mã SP, tên SP và đơn vị tính.");
    return;
  }
  let error;

  if (maspSua) {
    ({ error } = await supabase.from("sanpham").update(sp).eq("masp", maspSua));
  } else {
    ({ error } = await supabase.from("sanpham").insert([sp]));
  }

  if (error) {
  alert("Lỗi: " + error.message);
  return;
}

// 🔥 Nếu là cha → cập nhật lại toàn bộ con
if (maspSua || isParent) {

  const { data: children } = await supabase
    .from("sanpham")
    .select("masp, dinhluong")
    .eq("group_id", groupId)
    .eq("is_parent", false);

  if (children && children.length > 0) {

    for (const child of children) {

      const newGiaVon = (sp.giavon || 0) * (child.dinhluong || 0);
      const newGiaNhap = (sp.gianhapgoc || 0) * (child.dinhluong || 0);

      await supabase
        .from("sanpham")
        .update({
          giavon: newGiaVon,
          gianhapgoc: newGiaNhap
        })
        .eq("masp", child.masp);
    }
  }
}

// ===== XỬ LÝ SẢN PHẨM CON =====
if (maspSua) {

  // XÓA CON CŨ
  await supabase
    .from("sanpham")
    .delete()
    .eq("parent_id", maspSua)
    .eq("is_parent", false);
}

if (isParent) {

  const rows = document.querySelectorAll("#childList .child-row");

  for (const row of rows) {

    const dinhluongCon = parseFloat(row.querySelector(".c-dinhluong")?.value) || 0;

const child = {
  masp: row.querySelector(".c-masp")?.value?.trim(),
  tensp: sp.tensp + " - " + (row.querySelector(".c-color")?.value || ""),
  dinhluong: dinhluongCon,
  dvt: row.querySelector(".c-dvt")?.value || "",
  dongia: parseFloat(row.querySelector(".c-dongia")?.value) || 0,
  quycach: parseFloat(row.querySelector(".c-quycach")?.value) || 0,
  dvtchuyendoi: row.querySelector(".c-dvtcd")?.value || "",

  parent_id: sp.masp,
  group_id: groupId,
  is_parent: false,
  is_stock_parent: false,

  tonkho: 0,

  // 🔥 TÍNH LẠI GIÁ
  giavon: (sp.giavon || 0) * dinhluongCon,
  gianhapgoc: (sp.gianhapgoc || 0) * dinhluongCon
};

    if (!child.masp) continue;

    // 🔥 CHECK TRÙNG MÃ
  if (!maspSua) {
    const { data: existed } = await supabase
      .from("sanpham")
      .select("masp")
      .eq("masp", child.masp)
      .maybeSingle();

    if (existed) {
      alert("Mã con đã tồn tại: " + child.masp);
      return; // dừng toàn bộ quá trình lưu
    }
  }

    const { error: childErr } = await supabase
      .from("sanpham")
      .insert([child]);

    if (childErr) {
      alert("Lỗi sản phẩm con: " + childErr.message);
      return;
    }
  }
}

// ===== SAU KHI XỬ LÝ XONG HẾT =====

if (maspSua) {

  alert("✅ Đã cập nhật sản phẩm!");

  if (window.opener) {
    if (window.opener.taiDanhSachSP) await window.opener.taiDanhSachSP();
    window.close();
  }

} else {

  alert("✅ Đã thêm sản phẩm! Bạn có thể tiếp tục nhập sản phẩm mới.");

  resetFormKeepGroup();

  if (window.opener && window.opener.taiDanhSachSP) {
    window.opener.taiDanhSachSP().catch(()=>{});
  }
}
}
function hienThiBarcode(barcode) {
  const svg = document.getElementById("barcodeSvg");
  if (!svg) return;

  if (!barcode) {
    svg.innerHTML = "";
    return;
  }

  JsBarcode("#barcodeSvg", barcode, {
    format: "CODE128",
    width: 1.6,
    height: 34,
    displayValue: true,
    fontSize: 10,
    margin: 0
  });
}

function moBarcodeModal(barcode) {
  if (!barcode) return;

  const modal = document.getElementById('barcodeModal');
  const svg = document.getElementById('barcodeModalSvg');
  svg.innerHTML = "";

  const BAR_H = 160;
  const TEXT_H = 40;
  const BAR_WIDTH = 3;

  // 1️⃣ MỞ MODAL TRƯỚC
  modal.classList.add('active');

  // 2️⃣ ĐỢI BROWSER LAYOUT
  requestAnimationFrame(() => {

    JsBarcode(svg, barcode, {
      format: "CODE128",
      width: BAR_WIDTH,
      height: BAR_H,
      displayValue: false,
      margin: 0
    });

    const barBox = svg.getBBox(); // ✅ LÚC NÀY MỚI ĐÚNG
    const W = barBox.width;
    const H = BAR_H + TEXT_H + 10;

    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", barBox.x);
    text.setAttribute("y", BAR_H + 6);
    text.setAttribute("font-size", "22");
    text.setAttribute("font-weight", "700");
    text.setAttribute("fill", "#000");
    text.setAttribute("dominant-baseline", "hanging");
    text.setAttribute( "font-family","ui-monospace, Menlo, Consolas, monospace");

    // 🔥 CHỈ ÉP ĐÚNG BẰNG BARCODE
    text.setAttribute("textLength", W * 0.98); // an toàn in tem
    text.setAttribute("lengthAdjust", "spacingAndGlyphs");
    text.textContent = barcode;

    svg.appendChild(text);
  });
}

function dongBarcodeModal() {
  document.getElementById('barcodeModal').classList.remove('active');
}


    function resetFormKeepGroup() {
  // giữ nhóm đang chọn
  const selNhom = document.getElementById("nhomsp");
  const nhomDangChon = selNhom.value;

  // clear tất cả input/text/number
  const idsClear = [
    "masp","tensp","dongia","dongia2","dongia3",
    "quycach","quycach2","dvt","dvtchuyendoi","dvtchuyendoi2",
    "giavon","gianhapgoc","tonkho"
  ];
  idsClear.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

  // reset select ĐVT chính (về placeholder)
  const selDvt = document.getElementById("dvtSelect");
  if (selDvt) selDvt.value = "";
  // ẩn vùng “Khác…”
  const otherWrap = document.getElementById("dvtOtherWrap");
  if (otherWrap) otherWrap.style.display = "none";
  const dvtOther = document.getElementById("dvtOther");
  if (dvtOther) dvtOther.value = "";

  // reset 2 select ĐVT chuyển đổi
  const selCD1 = document.getElementById("dvtcdSelect");
  const selCD2 = document.getElementById("dvtcd2Select");
  if (selCD1) selCD1.value = "";
  if (selCD2) selCD2.value = "";

  // đặt lại nhóm cũ
  selNhom.value = nhomDangChon || "";

  // tự sinh lại mã SP theo nhóm đang chọn
  if (nhomDangChon) { window.capNhatMaSP && window.capNhatMaSP(); }

  // 🔥 reset trạng thái cha-con
const isParent = document.getElementById("isParent");
const childGroup = document.getElementById("childGroup");

if (isParent) isParent.checked = false;
if (childGroup) childGroup.style.display = "none";

  // focus vào tên SP để nhập nhanh
  const ten = document.getElementById("tensp");
  ten && ten.focus();
}
    // Expose
    window.themSanPham = themSanPham;
    window.capNhatMaSP = capNhatMaSP;

    document.addEventListener("DOMContentLoaded", async () => {
  await taiDanhSachNhom();
  await taiDanhSachDVT();

  // ... đoạn lấy params như cũ
  const params = new URLSearchParams(window.location.search);
  const maspSua = params.get("masp");
  const tenSP = params.get("tensp");
  if (tenSP) { const el = document.getElementById("tensp"); el.value = tenSP; el.focus(); }

  if (maspSua) {
    const { data, error } = await supabase.from("sanpham").select("*").eq("masp", maspSua).single();
    if (error || !data) { alert("Không tìm thấy sản phẩm để sửa!"); return; }
    for (const key in data) if (document.getElementById(key)) document.getElementById(key).value = data[key];
    if (data.is_parent) {
      document.getElementById("isParent").checked = true;
      document.getElementById("childGroup").style.display = "block";}
    document.getElementById("masp").readOnly = true;

    // Set ĐVT chính (giữ logic cũ)
    const sel = document.getElementById('dvtSelect');
    const otherWrap = document.getElementById('dvtOtherWrap');
    if (data.dvt) {
      const opt = Array.from(sel.options).find(o => o.value === data.dvt);
      if (opt) {
        sel.value = data.dvt;
        document.getElementById('dvt').value = data.dvt;
        otherWrap.style.display = 'none';
      } else {
        sel.value = '__OTHER__';
        otherWrap.style.display = 'flex';
        document.getElementById('dvtOther').value = data.dvt;
        document.getElementById('dvt').value = data.dvt;
      }
    }

    // ⬇️ NEW: Set ĐVT chuyển đổi/2 theo dữ liệu cũ
    if (data.dvtchuyendoi) {
      const selCD1 = document.getElementById('dvtcdSelect');
      const opt1 = Array.from(selCD1.options).find(o => o.value === data.dvtchuyendoi);
      selCD1.value = opt1 ? data.dvtchuyendoi : '';
      document.getElementById('dvtchuyendoi').value = selCD1.value;
    }

    if (data.dvtchuyendoi2) {
      const selCD2 = document.getElementById('dvtcd2Select');
      const opt2 = Array.from(selCD2.options).find(o => o.value === data.dvtchuyendoi2);
      selCD2.value = opt2 ? data.dvtchuyendoi2 : '';
      document.getElementById('dvtchuyendoi2').value = selCD2.value;
    }
    hienThiBarcode(data.barcode);

    // ===== LOAD SẢN PHẨM CON =====
const { data: children } = await supabase
  .from("sanpham")
  .select("*")
  .eq("parent_id", maspSua)
  .eq("is_parent", false);

if (children && children.length > 0) {

  document.getElementById("isParent").checked = true;
  document.getElementById("childGroup").style.display = "block";

  children.forEach(child => {

    themDongCon();

    const rows = document.querySelectorAll("#childList .child-row");
    const lastRow = rows[rows.length - 1];

    lastRow.querySelector(".c-masp").value = child.masp;
    lastRow.querySelector(".c-dinhluong").value = child.dinhluong || "";
    lastRow.querySelector(".c-dvt").value = child.dvt || "";
    lastRow.querySelector(".c-dongia").value = child.dongia || "";
    lastRow.querySelector(".c-quycach").value = child.quycach || "";
    lastRow.querySelector(".c-dvtcd").value = child.dvtchuyendoi || "";
  });
}
  }

  // Nút Lưu trên appbar
  document.getElementById("saveTop").addEventListener("click", ()=>{
    document.getElementById('formSP').requestSubmit();
  });

  // Gắn sự kiện DVT
  document.getElementById('dvtSelect').addEventListener('change', onDvtChange);
  document.getElementById('dvtOther').addEventListener('input', onDvtOtherInput);
  document.getElementById('btnSaveDvt').addEventListener('click', luuDvtMoi);

  // ⬇️ NEW: gắn change cho 2 select chuyển đổi
  document.getElementById('dvtcdSelect').addEventListener('change', onDvtCD1Change);
  document.getElementById('dvtcd2Select').addEventListener('change', onDvtCD2Change);

  // ===== BARCODE EVENTS – ĐÚNG CHỖ =====
const barcodeBox = document.getElementById('barcodeBox');
const barcodeModal = document.getElementById('barcodeModal');

barcodeBox.addEventListener('click', async () => {
  const masp = document.getElementById('masp').value;
  if (!masp) return;

  const { data, error } = await supabase
    .from('sanpham')
    .select('barcode')
    .eq('masp', masp)
    .single();

  if (error) {
    console.error('Lỗi lấy barcode:', error);
    return;
  }

  if (data?.barcode) {
    moBarcodeModal(data.barcode);
  }
});

barcodeModal.addEventListener('click', (e) => {
  if (e.target.classList.contains('barcode-modal-backdrop')) {
    dongBarcodeModal();
  }
});


const isParentCheckbox = document.getElementById("isParent");
const childGroup = document.getElementById("childGroup");

isParentCheckbox.addEventListener("change", (e) => {
  childGroup.style.display = e.target.checked ? "block" : "none";
});
const btnAddChild = document.getElementById("btnAddChild");
const childList = document.getElementById("childList");

btnAddChild.addEventListener("click", themDongCon);
});
function themDongCon() {

  const parentCode = document.getElementById("masp").value;

  const rows = document.querySelectorAll("#childList .child-row");

let maxIndex = 0;

rows.forEach(row => {
  const code = row.querySelector(".c-masp")?.value || "";
  const match = code.match(/-(\d+)$/);

  if (match) {
    const num = parseInt(match[1]);
    if (num > maxIndex) maxIndex = num;
  }
});

const nextIndex = maxIndex + 1;

const childCode = parentCode + "-" + String(nextIndex).padStart(2, "0");

  const div = document.createElement("div");
  div.className = "item child-row";

  div.innerHTML = `
    <div style="width:100%; display:flex; flex-direction:column; gap:10px;">

      <div style="display:flex; gap:10px;">
        <input class="c-masp" value="${childCode}" readonly>
        <button type="button" class="btn-link btn-remove">Xoá</button>
      </div>

      <div style="display:flex; gap:10px;">
        <input type="number" class="c-dinhluong" placeholder="Định lượng">
        <input class="c-color" placeholder="Thuộc tính">
       </div>

      <div style="display:flex; gap:10px;">
        <input type="number" class="c-dongia" placeholder="Đơn giá">
        <input class="c-dvt" placeholder="ĐVT">
      </div>

      <div style="display:flex; gap:10px; align-items:center;">
        <input type="number" class="c-quycach" placeholder="Quy cách">
        <input class="c-dvtcd" placeholder="ĐVT chuyển đổi">  
      </div>

    </div>
  `;

  div.querySelector(".btn-remove").addEventListener("click", () => {
    div.remove();
  });

  document.getElementById("childList").appendChild(div);
}