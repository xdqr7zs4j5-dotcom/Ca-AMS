import { taiDanhSachSP } from './xulisp.js';
import { loaiHDReady } from './xulisp.js';

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await taiDanhSachSP();   // nạp sản phẩm trước
    await loaiHDReady;       // đảm bảo phân loại đã load
    console.log("✅ Bootstrap đã nạp xong dữ liệu");
  } catch (err) {
    console.error("❌ Lỗi bootstrap:", err);
  }
});