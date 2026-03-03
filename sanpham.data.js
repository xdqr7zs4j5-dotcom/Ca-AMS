export const spById = {}
export const spMap = spById

export function napDanhSachSanPham(data) {
  data.forEach(sp => {
    spById[sp.masp] = sp
  })
}
// Cuối/đầu file tuỳ bạn
export const moneyVN = new Intl.NumberFormat('vi-VN');
export const parseMoneyVN = (v) => Number(String(v ?? '').replace(/[^\d]/g,'')) || 0;
