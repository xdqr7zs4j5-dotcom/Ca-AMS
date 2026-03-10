// hotkeys.js (patched)
export class KeyboardManager {
  constructor({ onAction } = {}) {
    this.onAction = onAction || (()=>{});
    this.keyMap = new Map();
    this.flow = [
      "tenSP",
      "variant",
      "soLuong",
      "dvt",
      "tongSL",
      "donGia",
      "thanhTien"
    ];
    this.init();
  }

  init() {
    // Gom hotkey từ DOM (bỏ qua rỗng)
    document.querySelectorAll('[data-hotkey]').forEach(el => {
      const hkRaw = (el.getAttribute('data-hotkey') || '').trim();
      if (!hkRaw) return; // tránh undefined.toLowerCase()
      const combo = hkRaw.toLowerCase().replace(/\s+/g, '');
      this.keyMap.set(combo, el);
    });

    // Ctrl+… / F… / Esc
    window.addEventListener('keydown', e => {
      const keyLower = (e.key || '').toLowerCase(); // phòng ngừa
      // chuẩn hoá Delete
      const normKey = keyLower === 'delete' ? 'del' : keyLower;

      const combo =
        `${e.ctrlKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey ? 'shift+' : ''}${normKey}`;

      const el = this.keyMap.get(combo);
      if (el) {
        e.preventDefault();           // chặn Ctrl+S, Ctrl+P của trình duyệt
        if (el.dataset.action) this.trigger(el.dataset.action);
        else { el.focus?.(); el.select?.(); }
        return;
      }

      if (normKey === 'escape') {
        const a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) {
          if (a.value) { a.value = ''; e.preventDefault(); }
        }
      }
    }, true);

    // Enter -> chuyển theo enter-action / enter-target / data-step (trừ textarea)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;

  const t = e.target;
  if (!t || !['INPUT','SELECT'].includes(t.tagName)) return;

  // 1) Nếu có data-enter-action -> chạy action
  if (t.dataset.enterAction) {
    e.preventDefault();
    this.trigger(t.dataset.enterAction);
    return;
  }

  // 2) Nếu có data-enter-target -> focus theo selector
  if (t.dataset.enterTarget) {
    e.preventDefault();
    const dest = document.querySelector(t.dataset.enterTarget);
    dest?.focus?.();
    dest?.select?.();
    return;
  }

  if (t.id) {
    e.preventDefault();
    this.focusNextFlow(t.id);
  }
}, true);
  }

  trigger(action){
    try { this.onAction(action); } catch {}
    document.querySelectorAll(`[data-action="${action}"]`).forEach(b => b.click?.());
  }

  focusByStep(step){
    const cand = [...document.querySelectorAll('[data-step]')]
    .filter(el =>
      !el.disabled &&                     // bỏ disabled
      el.offsetParent !== null            // bỏ display:none
    )
    .map(el => [Number(el.dataset.step), el])
    .filter(([n]) => !Number.isNaN(n) && n > step)
    .sort((a,b) => a[0] - b[0])[0]?.[1];
    
    cand?.focus?.();
    cand?.select?.();
  }

  focusNextStep(current){
    const cand = [...document.querySelectorAll('[data-step]')]
    .filter(el =>
      !el.disabled &&
      el.offsetParent !== null
    )
    .map(el => [Number(el.dataset.step), el])
    .filter(([n]) => !Number.isNaN(n) && n > current)
    .sort((a,b) => a[0] - b[0])[0]?.[1];

    cand?.focus?.();
    cand?.select?.();
  }

  focusNextFlow(currentId){
    const visibleFlow = this.flow.filter(id=>{
    const el = document.getElementById(id);
    if(!el) return false;
    if(el.disabled) return false;
    if(!el.getClientRects().length) return false;
    return true;
  });
  
  const idx = visibleFlow.indexOf(currentId);
  if(idx === -1) return;

  const nextId = visibleFlow[idx+1];
  if(!nextId) return;

  const next = document.getElementById(nextId);

  next?.focus();
  setTimeout(()=>next?.select?.(),0);
}
}


// Tự khởi tạo nếu trang không tự import
if (!window.KeyboardManager) window.KeyboardManager = KeyboardManager;