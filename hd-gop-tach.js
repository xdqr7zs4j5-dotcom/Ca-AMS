// hd-gop-tach.js
// Gộp đơn & Tách đơn cho trang danh sách HĐ
// Cần gọi initGopTachDon({ supabase }) trong HTML chính.

let sb = null; // supabase client (được truyền vào từ init)

// ===== Product cache (để map tensp -> masp một lần) =====
const _prodById = new Map();     // masp -> { masp, tensp, dvt }
const _prodByName = new Map();   // norm(tensp) -> { masp, tensp, dvt }
const _norm = (s) => String(s ?? "").trim().toLowerCase();

async function ensureProductCache() {
  if (_prodById.size) return; // đã có cache
  const { data, error } = await sb
    .from("sanpham")
    .select("masp, tensp, dvt");
  if (error) throw new Error("Tải danh mục sản phẩm lỗi: " + error.message);
  (data || []).forEach(p => {
    _prodById.set(p.masp, p);
    _prodByName.set(_norm(p.tensp), p);
  });
}

async function getNextLineNo(sohd){
  const { data, error } = await sb
    .from("chitiet")
    .select("line_no")
    .eq("sohd", sohd)
    .order("line_no", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data.length ? data[0].line_no + 1 : 1;
}

function fillMaspFromCatalog(row) {
  // Trả lại object đã điền đủ masp/dvt nếu có thể
  if (row.masp && _prodById.has(row.masp)) {
    const p = _prodById.get(row.masp);
    return {
      ...row,
      tensp: row.tensp || p.tensp,
      dvt: row.dvt || p.dvt,
    };
  }
  if (!row.masp && row.tensp) {
    const p = _prodByName.get(_norm(row.tensp));
    if (p) {
      return {
        ...row,
        masp: p.masp,
        tensp: row.tensp || p.tensp,
        dvt: row.dvt || p.dvt,
      };
    }
  }
  return row; // không tìm được thì trả y nguyên
}

export function initGopTachDon({ supabase }) {
  sb = supabase;
  if (!sb) {
    console.error("initGopTachDon: thiếu supabase client");
    return;
  }

  // Lắng nghe chọn hành động với capture để đọc value trước khi listener cũ reset
  const sel = document.querySelector("#chonHanhDong");
  if (!sel) return;

  sel.addEventListener("change", async (e) => {
    const v = e.target.value; // đọc sớm
    if (v !== "gopdon" && v !== "tachdon") return;

    e.stopPropagation();
    e.preventDefault();

    try {
      if (v === "gopdon") {
        await gopDon();
      } else {
        await tachDon();
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err?.message || err));
      console.error(err);
    } finally {
      e.target.value = ""; // trả về mặc định
    }
  }, { capture: true });
}

// ===== Helpers =====
const $  = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
const fmtVND = n => (Number(n)||0).toLocaleString("vi-VN") + " ₫";
const toNumber = v => {
  const s = String(v ?? "").replace(/\D/g, "");
  return s ? parseInt(s, 10) : 0;
};
const toast = (m) => alert(m);
function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}
// Tùy bạn thay bằng generator thực tế (sequence / rpc)
async function genSohd(prefix="BH"){

  const { data, error } = await sb
    .from("hoadon")
    .select("sohd")
    .like("sohd", `${prefix}%`)
    .order("sohd", { ascending:false })
    .limit(1);

  if(error) throw error;

  let next = 1;

  if(data.length){
    const last = data[0].sohd;
    const num = parseInt(last.replace(prefix,"")) || 0;
    next = num + 1;
  }

  return prefix + String(next).padStart(3,"0");
}

function getSelectedSohd(){
  return $$(".chonHD:checked").map(cb => cb.value);
}

async function fetchHoaDon(sohdList){
  const { data, error } = await sb
    .from("hoadon")
    .select("*")
    .in("sohd", sohdList);
  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchChiTietBySohdList(sohdList){
  const { data, error } = await sb
    .from("chitiet")
    .select("id, sohd, makh, masp, tensp, dvt, soluong, dongia, ngay")
    .in("sohd", sohdList)
    .order("ngay", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchChiTietBySohd(sohd){
  const { data, error } = await sb
    .from("chitiet")
    .select("id, sohd, makh, masp, tensp, dvt, soluong, dongia, ngay")
    .eq("sohd", sohd)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function insertHoaDon(row){
  const { error } = await sb.from("hoadon").insert(row);
  if (error) throw new Error(error.message);
}


async function updateHoaDon(sohd, payload){
  const { error } = await sb
    .from("hoadon")
    .update(payload)
    .eq("sohd", sohd);

  if (error) throw new Error(error.message);
}

async function insertChiTiet(rows){
  if (!rows?.length) return;

  let nextLine = await getNextLineNo(rows[0].sohd);

  for (const r of rows){
    const { error } = await sb
      .from("chitiet")
      .insert({
        ...r,
        line_no: nextLine++
      });

    if (error) throw new Error(error.message);
  }
}

async function deleteChiTietByIds(ids){
  if (!ids?.length) return;
  const { error } = await sb.from("chitiet").delete().in("id", ids);
  if (error) throw new Error(error.message);
}

async function updateChiTietQuantity(id, newQty){
  const { error } = await sb.from("chitiet").update({ soluong: newQty }).eq("id", id);
  if (error) throw new Error(error.message);
}

async function markMergedOldHoadon(sohdList, target){
  const { error } = await sb
    .from("hoadon")
    .update({ tinhtrang: "gop", ghichu: `Đã gộp vào ${target}` })
    .in("sohd", sohdList);
  if (error) throw new Error(error.message);
}

// ===== GỘP ĐƠN =====
export async function gopDon(){
  const list = getSelectedSohd();
  if (list.length < 2) { toast("Chọn ít nhất 2 hóa đơn để gộp."); return; }

  const hds = await fetchHoaDon(list);
  if (!hds.length) { toast("Không tìm thấy hóa đơn được chọn."); return; }

  // Ràng buộc: cùng makh, cùng phanloai, chưa phát hành
  const setMakh = new Set(hds.map(h => h.makh ?? ""));
  const setPL   = new Set(hds.map(h => h.phanloai ?? "xk"));
  const anyPH   = hds.some(h => !!h.phathanh);
  if (anyPH) return toast("Có hóa đơn đã phát hành — không thể gộp.");
  if (setMakh.size !== 1) return toast("Các hóa đơn phải cùng Mã KH.");
  if (setPL.size   !== 1) return toast("Các hóa đơn phải cùng loại (ví dụ cùng 'xk').");

  const makh = hds[0].makh ?? "";
  const phanloai = hds[0].phanloai ?? "xk";

  // Chuẩn bị danh mục sản phẩm để map tensp -> masp nếu thiếu
  await ensureProductCache();

  // Lấy toàn bộ CT và gộp theo masp|dvt|dongia
  let ctAll = await fetchChiTietBySohdList(list);

  // Điền masp còn thiếu
  const missing = [];
  ctAll = ctAll.map(r => {
    const filled = fillMaspFromCatalog(r);
    if (!filled.masp) {
      missing.push({ sohd: r.sohd, tensp: r.tensp || "(trống)" });
    }
    return filled;
  });
  if (missing.length) {
    const lines = missing.map(x => `• ${x.sohd} – ${x.tensp}`).join("\n");
    throw new Error("Không xác định được MÃ SP cho các dòng sau:\n" + lines + "\n\nHãy sửa hóa đơn gốc (điền Mã SP) hoặc thêm sản phẩm vào danh mục.");
  }

  const makeKey = (r) => `${r.masp}|${r.dvt||""}|${Number(r.dongia)||0}`;
  const gMap = new Map();

  for (const r of ctAll){
    // Bỏ qua dòng SL <= 0
    const sl = Number(r.soluong)||0;
    if (sl <= 0) continue;

    const k = makeKey(r);
    const cur = gMap.get(k) || {
      masp: r.masp,
      tensp: r.tensp, // optional
      dvt: r.dvt,
      dongia: r.dongia,
      soluong: 0
    };
    cur.soluong += sl;
    gMap.set(k, cur);
  }
  const mergedRows = Array.from(gMap.values());
  if (!mergedRows.length) return toast("Không có dòng hợp lệ để gộp.");

  const tongtien = mergedRows.reduce((s, r) => s + (Number(r.soluong)||0)*(Number(r.dongia)||0), 0);
  const sohdMoi = await genSohd("BH");

  // Tạo HĐ mới
  const newHD = {
    sohd: sohdMoi,
    ngay: todayISO(),
    makh,
    phanloai,
    ghichu: `Gộp từ: ${list.join(", ")}`,
    tongtien,
    tongthanhtoan: tongtien,
    tinhtrang: "chua",
    phathanh: false
  };
  await insertHoaDon(newHD);

  // Insert CT mới (bắt buộc có masp)
  const ctInsert = mergedRows.map(r => ({
    ngay: todayISO(),
    sohd: sohdMoi,
    makh,
    masp: r.masp,
    tensp: r.tensp,     // có thể bỏ nếu chỉ lưu mã
    dvt: r.dvt,
    soluong: r.soluong,
    dongia: r.dongia
    // thanhtien để trigger tính (nếu có)
  }));
  await insertChiTiet(ctInsert);

  // Đánh dấu HĐ cũ
  await markMergedOldHoadon(list, sohdMoi);

  toast(`✅ Đã gộp ${list.length} hoá đơn thành ${sohdMoi}.`);
  window.dispatchEvent(new Event("focus")); // để trang chính tự reload (theo code bạn)
}

// ===== TÁCH ĐƠN =====
function openSplitModal(hdInfo, ctRows){
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:9999;";

  const card = document.createElement("div");
  card.style.cssText = "width:min(900px,90vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.2);padding:16px;";
  card.innerHTML = `
    <h3 style="margin:0 0 8px">Tách hoá đơn: <b>${hdInfo.sohd}</b></h3>
    <div style="color:#6b7280;font-size:13px;margin-bottom:10px">Chọn dòng & nhập số lượng muốn tách.</div>
    <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <table style="width:100%;border-collapse:separate;border-spacing:0">
        <thead>
          <tr style="background:#fafafa">
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb">Chọn</th>
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left">Sản phẩm</th>
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb">ĐVT</th>
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb">SL gốc</th>
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb">SL tách</th>
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb">Đơn giá</th>
            <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb">Thành tiền tách</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button id="split-cancel" class="btn-ghost" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;background:#fff;cursor:pointer">Hủy</button>
      <button id="split-ok" style="border:none;background:#007aff;color:#fff;padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:600">Tạo HĐ mới</button>
    </div>
  `;

  const tbody = $("tbody", card);
  ctRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f0f0f0";
    tr.innerHTML = `
      <td style="padding:8px 10px;text-align:center">
        <input type="checkbox" data-id="${r.id}" class="sp-chk" />
      </td>
      <td style="padding:8px 10px;text-align:left">${r.tensp || r.masp}</td>
      <td style="padding:8px 10px;text-align:center">${r.dvt||""}</td>
      <td style="padding:8px 10px;text-align:center;font-weight:600">${r.soluong}</td>
      <td style="padding:8px 10px;text-align:center">
        <input class="sl-tach" type="number" min="0" step="1" value="0" style="width:90px;text-align:right;padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px" />
      </td>
      <td style="padding:8px 10px;text-align:right">${fmtVND(r.dongia)}</td>
      <td class="tt-tach" style="padding:8px 10px;text-align:right">0 ₫</td>
    `;
    tbody.appendChild(tr);

    const chk = $(".sp-chk", tr);
    const inp = $(".sl-tach", tr);
    const ttCell = $(".tt-tach", tr);
    function recalc() {
      const val = Number(inp.value)||0;
      const t = val * (Number(r.dongia)||0);
      ttCell.textContent = fmtVND(t);
      chk.checked = val > 0;
    }
    inp.addEventListener("input", recalc);
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    close: () => overlay.remove(),
    getPayload: () => {
      const rows = [];
      $$("tbody tr", card).forEach(tr => {
        const chk = $(".sp-chk", tr);
        const inp = $(".sl-tach", tr);
        const id = String(chk.dataset.id);
        const sl = Number(inp.value)||0;
        if (sl > 0) rows.push({ id, sl });
      });
      return rows;
    },
    onOK: (fn) => $("#split-ok", card).addEventListener("click", fn),
    onCancel: (fn) => $("#split-cancel", card).addEventListener("click", fn),
  };
}

export async function tachDon(){
  const list = getSelectedSohd();
  if (list.length !== 1) { toast("Chọn đúng 1 hóa đơn để tách."); return; }
  const sohd = list[0];

  const hds = await fetchHoaDon([sohd]);
  const hd = hds?.[0];
  if (!hd) return toast("Không tìm thấy hoá đơn.");
  if (hd.phathanh) return toast("Hoá đơn đã phát hành — không tách được.");

  const ct = await fetchChiTietBySohd(sohd);
  if (!ct.length) return toast("Hóa đơn không có chi tiết để tách.");

  const modal = openSplitModal(hd, ct);
  modal.onCancel(() => modal.close());
  modal.onOK(async () => {
    try {
      const moves = modal.getPayload(); // [{id, sl}]
      if (!moves.length) return toast("Chưa chọn dòng/SL để tách.");

      const sohdMoi = await genSohd("BH");
      const insertRows = [];
      const updateOps  = [];

      const idMap = new Map(ct.map(r => [String(r.id), r]));
      for (const m of moves){
        const row = idMap.get(m.id);
        if (!row) continue;
        const slTach = Number(m.sl)||0;
        const slGoc  = Number(row.soluong)||0;
        if (!row.masp) throw new Error("Chi tiết thiếu MÃ SP. Hãy sửa hóa đơn gốc để bổ sung.");
        if (slTach <= 0 || slTach > slGoc) continue;

        insertRows.push({
          ngay: todayISO(),
          sohd: sohdMoi,
          makh: hd.makh,
          masp: row.masp,
          tensp: row.tensp, // optional
          dvt: row.dvt,
          soluong: slTach,
          dongia: row.dongia
        });

        updateOps.push({ id: row.id, slCon: slGoc - slTach });
      }

      if (!insertRows.length) return toast("Không có dòng hợp lệ để tách.");

      const tongMoi = insertRows.reduce((s,r)=> s + (Number(r.soluong)||0)*(Number(r.dongia)||0), 0);

      // Tạo HĐ mới
      await insertHoaDon({
        sohd: sohdMoi,
        ngay: todayISO(),
        makh: hd.makh,
        phanloai: hd.phanloai ?? "xk",
        ghichu: `Tách từ: ${sohd}`,
        tinhtrang: "chua",
        phathanh: false,
        tongtien: tongMoi,
        tongthanhtoan: tongMoi
      });

      // Ghi CT mới
      await insertChiTiet(insertRows);

      // Giảm/xoá CT cũ
      const toDel = [];
      for (const op of updateOps){
        if (op.slCon <= 0) toDel.push(op.id);
        else await updateChiTietQuantity(op.id, op.slCon);
      }
      if (toDel.length) await deleteChiTietByIds(toDel);

      // Cập nhật tổng HĐ gốc
      const ctAfter = await fetchChiTietBySohd(sohd);
      const tongGoc = (ctAfter||[]).reduce((s,r)=> s + (Number(r.soluong)||0)*(Number(r.dongia)||0), 0);
      await sb.from("hoadon").update({
        tongtien: tongGoc,
        tongthanhtoan: tongGoc,
        ghichu: (hd.ghichu ? (hd.ghichu + " | ") : "") + `Đã tách ra: ${sohdMoi}`
      }).eq("sohd", sohd);

      modal.close();
      toast(`✅ Đã tách hoá đơn. HĐ mới: ${sohdMoi}`);
      window.dispatchEvent(new Event("focus"));
    } catch (err) {
      console.error(err);
      toast("❌ Lỗi tách hoá đơn: " + (err?.message || err));
    }
  });
}
