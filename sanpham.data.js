export const spMap = {}

export function napDanhSachSanPham(data) {
  data.forEach(sp => {
    spMap[sp.tensp] = sp
  })
}
// Cuối/đầu file tuỳ bạn
export const moneyVN = new Intl.NumberFormat('vi-VN');
export const parseMoneyVN = (v) => Number(String(v ?? '').replace(/[^\d]/g,'')) || 0;
