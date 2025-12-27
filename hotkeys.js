// hotkeys.js (patched)
export class KeyboardManager {
  constructor({ onAction } = {}) {
    this.onAction = onAction || (()=>{});
    this.keyMap = new Map();
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

  // 3) Mặc định: nhảy sang phần tử có data-step kế tiếp
  const s = Number(t.dataset.step || NaN);
  if (!Number.isNaN(s)) {
    e.preventDefault();
    this.focusByStep(s + 1);
  }
}, true);
  }

  trigger(action){
    try { this.onAction(action); } catch {}
    document.querySelectorAll(`[data-action="${action}"]`).forEach(b => b.click?.());
  }

  focusByStep(step){
    const cand = [...document.querySelectorAll('[data-step]')]
      .map(el => [Number(el.dataset.step), el])
      .filter(([n]) => !Number.isNaN(n) && n >= step)
      .sort((a,b) => a[0] - b[0])[0]?.[1];
    cand?.focus?.(); cand?.select?.();
  }
}

// Tự khởi tạo nếu trang không tự import
if (!window.KeyboardManager) window.KeyboardManager = KeyboardManager;