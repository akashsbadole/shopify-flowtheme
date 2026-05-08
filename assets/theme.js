/**
 * FLOWTHEME - Premium Shopify Theme JavaScript
 * Version: 1.0.0
 * Vanilla JS, no jQuery dependency
 */

'use strict';

/* ============================================================
   UTILITY HELPERS
   ============================================================ */
const FlowTheme = {

  // DOM helpers
  qs:  (sel, ctx = document) => ctx.querySelector(sel),
  qsa: (sel, ctx = document) => [...ctx.querySelectorAll(sel)],

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Format currency
  formatMoney(cents, format = '${amount}') {
    const amount = (cents / 100).toFixed(2);
    return format.replace('{amount}', amount);
  },

  // Trap focus inside element (for modals/drawers)
  trapFocus(element) {
    const focusable = element.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    element.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });
  },

  // Dispatch custom events
  emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(`flowtheme:${name}`, { detail, bubbles: true }));
  }
};

/* ============================================================
   HEADER SCROLL BEHAVIOUR
   ============================================================ */
class StickyHeader {
  constructor() {
    this.header = FlowTheme.qs('.site-header');
    if (!this.header) return;
    this.lastScrollY = 0;
    this.init();
  }

  init() {
    window.addEventListener('scroll', FlowTheme.debounce(() => this.onScroll(), 10), { passive: true });
  }

  onScroll() {
    const y = window.scrollY;
    if (y > 40) {
      this.header.classList.add('scrolled');
    } else {
      this.header.classList.remove('scrolled');
    }
    this.lastScrollY = y;
  }
}

/* ============================================================
   MOBILE NAVIGATION
   ============================================================ */
class MobileNav {
  constructor() {
    this.nav    = FlowTheme.qs('.mobile-nav');
    this.openBtn  = FlowTheme.qs('.header__mobile-menu-btn');
    this.closeBtn = FlowTheme.qs('.mobile-nav__close');
    this.overlay  = FlowTheme.qs('.mobile-nav-overlay');
    if (!this.nav) return;
    this.init();
  }

  init() {
    this.openBtn?.addEventListener('click',  () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click',  () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  open() {
    this.nav.classList.add('open');
    document.body.style.overflow = 'hidden';
    FlowTheme.trapFocus(this.nav);
  }

  close() {
    this.nav.classList.remove('open');
    document.body.style.overflow = '';
    this.openBtn?.focus();
  }
}

/* ============================================================
   CART DRAWER
   ============================================================ */
class CartDrawer {
  constructor() {
    this.drawer  = FlowTheme.qs('.cart-drawer');
    this.overlay = FlowTheme.qs('.cart-drawer-overlay');
    this.closeBtn = FlowTheme.qs('.cart-drawer__close');
    this.countEl = FlowTheme.qs('.header__cart-count');
    this.bodyEl  = FlowTheme.qs('.cart-drawer__body');
    this.totalEl = FlowTheme.qs('[data-cart-total]');
    this.isOpen  = false;
    if (!this.drawer) return;
    this.init();
  }

  init() {
    // Open triggers
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-cart]')) {
        e.preventDefault();
        this.open();
      }
    });

    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click',  () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Listen for cart updates
    document.addEventListener('flowtheme:cart-updated', () => this.refresh());

    // Qty buttons inside drawer
    this.drawer?.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-qty-btn]')) this.handleQtyChange(e);
      if (e.target.closest('[data-cart-remove]'))  this.handleRemove(e);
    });
  }

  open() {
    this.drawer.classList.add('open');
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    FlowTheme.trapFocus(this.drawer);
    this.refresh();
  }

  close() {
    this.drawer.classList.remove('open');
    this.overlay.classList.remove('open');
    document.body.style.overflow = '';
    this.isOpen = false;
  }

  async refresh() {
    try {
      const res  = await fetch('/cart.js');
      const cart = await res.json();
      this.render(cart);
      this.updateCount(cart.item_count);
    } catch (err) {
      console.warn('Cart refresh error:', err);
    }
  }

  updateCount(count) {
    if (!this.countEl) return;
    this.countEl.textContent = count;
    this.countEl.style.display = count > 0 ? 'flex' : 'none';
  }

  render(cart) {
    if (!this.bodyEl) return;

    if (cart.item_count === 0) {
      this.bodyEl.innerHTML = `
        <div class="wishlist-empty" style="padding:40px 24px">
          <div class="wishlist-empty__icon">
            <span class="material-symbols-outlined" style="font-size:56px;color:var(--color-border)">shopping_cart</span>
          </div>
          <p class="wishlist-empty__title">Your cart is empty</p>
          <p class="wishlist-empty__subtitle">Add items to get started</p>
          <a href="/collections/all" class="btn btn--primary">Start Shopping</a>
        </div>`;
      if (this.totalEl) this.totalEl.textContent = FlowTheme.formatMoney(0);
      return;
    }

    const items = cart.items.map(item => `
      <div class="cart-item" data-key="${item.key}">
        <img class="cart-item__image" src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="cart-item__details">
          <p class="cart-item__title">${item.product_title}</p>
          <p class="cart-item__variant">${item.variant_title || ''}</p>
          <div class="cart-item__bottom">
            <div class="qty-selector" style="height:36px">
              <button class="qty-selector__btn" data-cart-qty-btn data-key="${item.key}" data-action="dec" style="width:36px">−</button>
              <input class="qty-selector__input" type="number" value="${item.quantity}" min="1" style="width:44px;font-size:14px" readonly>
              <button class="qty-selector__btn" data-cart-qty-btn data-key="${item.key}" data-action="inc" style="width:36px">+</button>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="cart-item__price">${FlowTheme.formatMoney(item.final_line_price)}</span>
              <button data-cart-remove data-key="${item.key}" title="Remove" style="color:var(--color-text-medium);background:none;border:none;cursor:pointer;font-size:16px">
                <span class="material-symbols-outlined" style="font-size:18px">close</span>
              </button>
            </div>
          </div>
        </div>
      </div>`).join('');

    this.bodyEl.innerHTML = items;

    if (this.totalEl) {
      this.totalEl.textContent = FlowTheme.formatMoney(cart.total_price);
    }
  }

  async handleQtyChange(e) {
    const btn    = e.target.closest('[data-cart-qty-btn]');
    const key    = btn.dataset.key;
    const action = btn.dataset.action;
    const item   = FlowTheme.qs(`.cart-item[data-key="${key}"]`);
    const input  = item?.querySelector('input');
    if (!input) return;

    let qty = parseInt(input.value);
    qty = action === 'inc' ? qty + 1 : Math.max(0, qty - 1);

    await this.updateItem(key, qty);
  }

  async handleRemove(e) {
    const btn = e.target.closest('[data-cart-remove]');
    await this.updateItem(btn.dataset.key, 0);
  }

  async updateItem(key, qty) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty })
      });
      const cart = await res.json();
      this.render(cart);
      this.updateCount(cart.item_count);
      FlowTheme.emit('cart-updated', { cart });
      Toast.show('Cart updated', 'success');
    } catch (err) {
      Toast.show('Could not update cart', 'error');
    }
  }

  static async addItem(variantId, qty = 1, properties = {}) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: qty, properties })
    });
    if (!res.ok) throw new Error('Could not add to cart');
    const item = await res.json();
    FlowTheme.emit('cart-updated');
    return item;
  }
}

/* ============================================================
   ADD TO CART FORM
   ============================================================ */
class ProductForm {
  constructor(form) {
    this.form    = form;
    this.btn     = form.querySelector('[data-atc-btn], .product-info__actions .btn--primary, form[action*="/cart/add"] button[type="submit"]');
    this.variantInput = form.querySelector('[name="id"]');
    if (!this.form) return;
    this.init();
  }

  init() {
    this.form.addEventListener('submit', (e) => this.onSubmit(e));

    // Variant selectors
    FlowTheme.qsa('[data-variant-btn]', this.form).forEach(btn => {
      btn.addEventListener('click', () => this.selectVariant(btn));
    });

    // Color swatches
    FlowTheme.qsa('[data-color-swatch], .color-swatch-btn', this.form).forEach(swatch => {
      swatch.addEventListener('click', () => this.selectColor(swatch));
    });

    // Quantity
    FlowTheme.qsa('.qty-selector__btn', this.form).forEach(btn => {
      btn.addEventListener('click', () => this.changeQty(btn));
    });
  }

  selectVariant(btn) {
    const group = btn.dataset.group || btn.closest('.variant-selector').dataset.optionIndex;
    FlowTheme.qsa(`[data-variant-btn][data-group="${group}"], .variant-selector[data-option-index="${group}"] .variant-btn`, this.form)
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.updateVariantId();
  }

  selectColor(swatch) {
    const container = swatch.closest('.color-swatch-selector');
    FlowTheme.qsa('[data-color-swatch], .color-swatch-btn', container).forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    this.updateVariantId();
  }

  changeQty(btn) {
    const container = btn.closest('.qty-selector') || this.form;
    const input = FlowTheme.qs('.qty-selector__input', container);
    if (!input) return;
    let val = parseInt(input.value) || 1;
    const action = btn.dataset.action;
    if (action === 'inc') val++;
    if (action === 'dec') val = Math.max(1, val - 1);
    input.value = val;
  }

  updateVariantId() {
    // Collect option values
    const options = {};
    this.form.querySelectorAll('input[name^="options["]').forEach(input => {
      const match = input.name.match(/options\[(.+)\]/);
      if (match) options[match[1]] = input.value;
    });

    // Find matching variant from JSON
    const product = this.form.closest('.product-info')?.dataset;
    if (!product || !window.productVariants) return;

    const matching = Object.values(window.productVariants).find(v => {
      return Object.entries(options).every(([key, val]) =>
        v.options[key.toLowerCase()] === val.toLowerCase()
      );
    });

    if (matching) {
      this.variantInput.value = matching.id;
      // Update price
      const priceEl = document.getElementById('product-price');
      if (priceEl) {
        priceEl.textContent = FlowTheme.formatMoney(matching.price);
        priceEl.dataset.price = matching.price;
      }
      // Update compare price
      const compareEl = document.getElementById('compare-price');
      if (compareEl) {
        if (matching.compare_at_price > matching.price) {
          compareEl.textContent = FlowTheme.formatMoney(matching.compare_at_price);
          compareEl.style.display = '';
        } else {
          compareEl.style.display = 'none';
        }
      }
    }
  }

  async onSubmit(e) {
    e.preventDefault();
    const variantId = this.variantInput?.value;
    const qty = parseInt(FlowTheme.qs('.qty-selector__input', this.form)?.value) || 1;

    if (!variantId) {
      Toast.show('Please select all options', 'error');
      return;
    }

    this.setLoading(true);
    try {
      await CartDrawer.addItem(variantId, qty);
      Toast.show('Added to cart!', 'success');
      // Open cart drawer
      const cartDrawer = document.querySelector('.cart-drawer');
      if (cartDrawer) {
        cartDrawer.classList.add('open');
        document.querySelector('.cart-drawer-overlay')?.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      FlowTheme.emit('cart-updated');
    } catch (err) {
      Toast.show(err.message || 'Could not add to cart', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(state) {
    if (!this.btn) return;
    this.btn.disabled = state;
    this.btn.classList.toggle('btn--loading', state);
    const span = this.btn.querySelector('[data-btn-text]');
    if (span) span.textContent = state ? 'Adding...' : 'Add to Cart';
  }
}

/* ============================================================
   PRODUCT IMAGE GALLERY
   ============================================================ */
class ProductGallery {
  constructor(el) {
    this.el   = el;
    this.main = el.querySelector('.product-gallery__main img');
    this.thumbs = FlowTheme.qsa('.product-gallery__thumb', el);
    if (!this.main || !this.thumbs.length) return;
    this.init();
  }

  init() {
    this.thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => this.setActive(thumb, i));
    });

    // Keyboard navigation
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    this.current = 0;
  }

  setActive(thumb, idx) {
    this.thumbs.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    const src = thumb.querySelector('img')?.src;
    if (src && this.main) {
      this.main.style.opacity = '0';
      setTimeout(() => {
        this.main.src = src;
        this.main.style.opacity = '1';
      }, 150);
    }
    this.current = idx;
  }

  prev() {
    const idx = (this.current - 1 + this.thumbs.length) % this.thumbs.length;
    this.setActive(this.thumbs[idx], idx);
  }

  next() {
    const idx = (this.current + 1) % this.thumbs.length;
    this.setActive(this.thumbs[idx], idx);
  }
}

/* ============================================================
   ACCORDION
   ============================================================ */
class Accordion {
  constructor(el) {
    this.el = el;
    FlowTheme.qsa('.accordion-item__trigger', el).forEach(trigger => {
      trigger.addEventListener('click', () => this.toggle(trigger));
    });
  }

  toggle(trigger) {
    const content = trigger.nextElementSibling;
    const icon    = trigger.querySelector('.accordion-icon');
    const isOpen  = content.classList.contains('open');

    // Close all
    FlowTheme.qsa('.accordion-item__content', this.el).forEach(c => c.classList.remove('open'));
    FlowTheme.qsa('.accordion-icon', this.el).forEach(i => i.style.transform = '');

    if (!isOpen) {
      content.classList.add('open');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }
}

/* ============================================================
   COUNTDOWN TIMER
   ============================================================ */
class CountdownTimer {
  constructor(el) {
    this.el      = el;
    this.endTime = new Date(el.dataset.end).getTime();
    this.daysEl  = el.querySelector('[data-days]');
    this.hrsEl   = el.querySelector('[data-hours]');
    this.minsEl  = el.querySelector('[data-minutes]');
    this.secsEl  = el.querySelector('[data-seconds]');
    if (isNaN(this.endTime)) return;
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  tick() {
    const now  = Date.now();
    const diff = Math.max(0, this.endTime - now);

    if (diff === 0) {
      clearInterval(this.interval);
      this.el.dispatchEvent(new CustomEvent('countdown:ended'));
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    if (this.daysEl)  this.daysEl.textContent  = String(d).padStart(2, '0');
    if (this.hrsEl)   this.hrsEl.textContent   = String(h).padStart(2, '0');
    if (this.minsEl)  this.minsEl.textContent  = String(m).padStart(2, '0');
    if (this.secsEl)  this.secsEl.textContent  = String(s).padStart(2, '0');
  }
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
class Toast {
  static container = null;

  static getContainer() {
    if (!Toast.container) {
      Toast.container = document.createElement('div');
      Toast.container.className = 'toast-container';
      document.body.appendChild(Toast.container);
    }
    return Toast.container;
  }

  static show(message, type = 'info', duration = 3000) {
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon material-symbols-outlined fill">${icons[type] || 'info'}</span>
      <span class="toast__message">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--color-text-medium);padding:0;margin-left:8px">
        <span class="material-symbols-outlined" style="font-size:16px">close</span>
      </button>`;
    Toast.getContainer().appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }
}

/* ============================================================
   SEARCH OVERLAY
   ============================================================ */
class SearchOverlay {
  constructor() {
    this.overlay   = FlowTheme.qs('.search-overlay');
    this.input     = FlowTheme.qs('.search-overlay__input');
    this.results   = FlowTheme.qs('.search-overlay__results');
    this.openBtns  = FlowTheme.qsa('[data-open-search]');
    this.closeBtn  = FlowTheme.qs('.search-overlay__close');
    if (!this.overlay) return;
    this.init();
  }

  init() {
    this.openBtns.forEach(b => b.addEventListener('click', () => this.open()));
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
    });

    this.input?.addEventListener('input', FlowTheme.debounce(() => this.search(), 350));
  }

  open() {
    this.overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.input?.focus(), 100);
  }

  close() {
    this.overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  async search() {
    const q = this.input?.value.trim();
    if (!q || q.length < 2) {
      if (this.results) this.results.innerHTML = '';
      return;
    }
    try {
      const res  = await fetch(`/search?q=${encodeURIComponent(q)}&type=product&view=json&limit=6`);
      const data = await res.json();
      const products = data.results || data.products || [];
      this.renderResults(products);
    } catch (_) {}
  }

  renderResults(products) {
    if (!this.results) return;
    if (!products.length) {
      this.results.innerHTML = `<p style="padding:24px;color:var(--color-text-medium);text-align:center">No products found</p>`;
      return;
    }
    this.results.innerHTML = products.map(p => `
      <a href="${p.url}" class="search-result-item" style="display:flex;align-items:center;gap:16px;padding:12px 24px;border-bottom:1px solid var(--color-border);transition:background var(--transition-fast)">
        <img src="${p.featured_image || p.images?.[0]?.src || ''}" alt="${p.title}" style="width:56px;height:56px;object-fit:cover;border-radius:4px;background:var(--color-surface-low)">
        <div>
          <p style="font-size:14px;font-weight:600;color:var(--color-text-high)">${p.title}</p>
          <p style="font-size:13px;color:var(--color-text-medium)">${FlowTheme.formatMoney(p.price)}</p>
        </div>
      </a>`).join('');
  }
}

/* ============================================================
   QUICK VIEW MODAL
   ============================================================ */
class QuickView {
  constructor() {
    this.modal   = FlowTheme.qs('#quick-view-modal');
    this.overlay = FlowTheme.qs('#quick-view-overlay');
    if (!this.overlay) return;
    this.init();
  }

  init() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-quick-view]');
      if (btn) {
        e.preventDefault();
        await this.open(btn.dataset.quickView, btn.dataset.handle);
      }
      if (e.target === this.overlay || e.target.closest('.modal__close')) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  async open(productUrl, handle) {
    if (!this.overlay || !this.modal) return;
    this.modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:300px">
        <span class="material-symbols-outlined" style="font-size:40px;color:var(--color-border);animation:spin 1s linear infinite">autorenew</span>
      </div>`;
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
      const res  = await fetch(`${productUrl}?view=quick-view`);
      const html = await res.text();
      const doc  = new DOMParser().parseFromString(html, 'text/html');
      const content = doc.querySelector('.quick-view-content') || doc.body;
      this.modal.innerHTML = `<button class="modal__close" aria-label="Close">✕</button>${content.innerHTML}`;
      FlowTheme.trapFocus(this.modal);

      // Re-init components inside modal
      const form = this.modal.querySelector('.product-form');
      if (form) new ProductForm(form);
      const gallery = this.modal.querySelector('.product-gallery');
      if (gallery) new ProductGallery(gallery);
      this.modal.querySelectorAll('.accordion').forEach(a => new Accordion(a));
    } catch (err) {
      this.modal.innerHTML = `<div style="padding:40px;text-align:center"><p>Could not load product. <a href="${productUrl}">View full page</a></p></div>`;
    }
  }

  close() {
    this.overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ============================================================
   WISHLIST (LocalStorage based, Shopify Customer API ready)
   ============================================================ */
class Wishlist {
  constructor() {
    this.key   = 'flowtheme_wishlist';
    this.items = JSON.parse(localStorage.getItem(this.key) || '[]');
    this.init();
  }

  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wishlist-toggle]');
      if (btn) {
        e.preventDefault();
        this.toggle(btn.dataset.wishlistToggle, btn);
      }
    });
    this.syncUI();
    // Update header count on init
    const countEl = FlowTheme.qs('[data-wishlist-count]');
    if (countEl) countEl.textContent = this.items.length;
  }

  toggle(productId, btn) {
    if (this.has(productId)) {
      this.items = this.items.filter(id => id !== productId);
      Toast.show('Removed from wishlist', 'info');
    } else {
      this.items.push(productId);
      Toast.show('Added to wishlist', 'success');
    }
    localStorage.setItem(this.key, JSON.stringify(this.items));
    this.syncUI();
    FlowTheme.emit('wishlist-updated', { items: this.items });
  }

  has(productId) {
    return this.items.includes(productId);
  }

  syncUI() {
    FlowTheme.qsa('[data-wishlist-toggle]').forEach(btn => {
      const id = btn.dataset.wishlistToggle;
      const icon = btn.querySelector('.material-symbols-outlined');
      if (this.has(id)) {
        btn.setAttribute('aria-pressed', 'true');
        if (icon) icon.classList.add('fill');
      } else {
        btn.setAttribute('aria-pressed', 'false');
        if (icon) icon.classList.remove('fill');
      }
    });

    const countEl = FlowTheme.qs('[data-wishlist-count]');
    if (countEl) countEl.textContent = this.items.length;
  }
}

/* ============================================================
   STICKY BUY BAR (Product page)
   ============================================================ */
class StickyBuyBar {
  constructor() {
    this.bar    = FlowTheme.qs('.sticky-buy-bar');
    this.target = FlowTheme.qs('.product-info__actions');
    if (!this.bar || !this.target) return;
    this.init();
  }

  init() {
    const obs = new IntersectionObserver(([entry]) => {
      this.bar.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0 });
    obs.observe(this.target);
  }
}

/* ============================================================
   FILTER SIDEBAR (Collection page)
   ============================================================ */
class FilterSidebar {
  constructor() {
    this.sidebar  = FlowTheme.qs('.collection-filters');
    this.mobileToggle = FlowTheme.qs('[data-filter-toggle]');
    if (!this.sidebar) return;
    this.init();
  }

  init() {
    this.mobileToggle?.addEventListener('click', () => {
      this.sidebar.classList.toggle('mobile-open');
    });

    // Filter group toggles
    FlowTheme.qsa('.filter-group__title', this.sidebar).forEach(title => {
      title.addEventListener('click', () => {
        const group   = title.closest('.filter-group');
        const options = group.querySelector('.filter-group__options');
        const icon    = title.querySelector('.filter-toggle-icon');
        options?.classList.toggle('hidden');
        if (icon) icon.style.transform = options?.classList.contains('hidden') ? '' : 'rotate(180deg)';
      });
    });

    // Active filters
    FlowTheme.qsa('.filter-option input', this.sidebar).forEach(input => {
      input.addEventListener('change', () => this.applyFilters());
    });

    // Price range
    const rangeMin = FlowTheme.qs('[data-price-min]', this.sidebar);
    const rangeMax = FlowTheme.qs('[data-price-max]', this.sidebar);
    rangeMin?.addEventListener('input', FlowTheme.debounce(() => this.applyFilters(), 500));
    rangeMax?.addEventListener('input', FlowTheme.debounce(() => this.applyFilters(), 500));
  }

  applyFilters() {
    const params = new URLSearchParams(window.location.search);
    // Collect checked filters
    FlowTheme.qsa('.filter-option input:checked', this.sidebar).forEach(input => {
      const group = input.dataset.group;
      const value = input.value;
      params.append(`filter.p.m.${group}`, value);
    });
    // Navigate with filters
    window.location.search = params.toString();
  }
}

/* ============================================================
   SORT SELECTOR
   ============================================================ */
class SortSelector {
  constructor() {
    this.select = FlowTheme.qs('[data-sort-select]');
    if (!this.select) return;
    this.init();
  }

  init() {
    this.select.addEventListener('change', () => {
      const params = new URLSearchParams(window.location.search);
      params.set('sort_by', this.select.value);
      window.location.search = params.toString();
    });
  }
}

/* ============================================================
   TABS
   ============================================================ */
class Tabs {
  constructor(el) {
    this.el   = el;
    this.btns = FlowTheme.qsa('.tab-btn', el);
    this.panes = FlowTheme.qsa('.tab-pane', el);
    this.init();
  }

  init() {
    this.btns.forEach((btn, i) => {
      btn.addEventListener('click', () => this.activate(i));
    });
  }

  activate(idx) {
    this.btns.forEach(b => b.classList.remove('active'));
    this.panes.forEach(p => p.style.display = 'none');
    this.btns[idx]?.classList.add('active');
    if (this.panes[idx]) this.panes[idx].style.display = '';
  }
}

/* ============================================================
   BACK TO TOP
   ============================================================ */
class BackToTop {
  constructor() {
    this.btn = FlowTheme.qs('.back-to-top');
    if (!this.btn) return;
    this.init();
  }

  init() {
    window.addEventListener('scroll', FlowTheme.debounce(() => {
      this.btn.classList.toggle('visible', window.scrollY > 500);
    }, 100), { passive: true });
    this.btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

/* ============================================================
   LAZY IMAGE LOADING
   ============================================================ */
class LazyImages {
  constructor() {
    this.init();
  }

  init() {
    const imgs = FlowTheme.qsa('img[data-src]');
    if (!imgs.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.removeAttribute('data-src');
        obs.unobserve(img);
      });
    }, { rootMargin: '200px' });

    imgs.forEach(img => obs.observe(img));
  }
}

/* ============================================================
   COOKIE CONSENT (GDPR)
   ============================================================ */
class CookieConsent {
  constructor() {
    this.key    = 'flowtheme_cookies_accepted';
    this.banner = FlowTheme.qs('.cookie-banner');
    if (!this.banner) return;
    if (localStorage.getItem(this.key)) {
      this.banner.style.display = 'none';
      return;
    }
    this.init();
  }

  init() {
    FlowTheme.qs('[data-cookie-accept]', this.banner)?.addEventListener('click', () => {
      localStorage.setItem(this.key, '1');
      this.banner.style.display = 'none';
    });
    FlowTheme.qs('[data-cookie-decline]', this.banner)?.addEventListener('click', () => {
      this.banner.style.display = 'none';
    });
  }
}

/* ============================================================
   VIEW TOGGLE (Grid / List)
   ============================================================ */
class ViewToggle {
  constructor() {
    this.btns = FlowTheme.qsa('.view-toggle__btn');
    this.grid = FlowTheme.qs('.product-grid');
    if (!this.btns.length || !this.grid) return;
    this.init();
  }

  init() {
    this.btns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        if (view === 'list') {
          this.grid.style.gridTemplateColumns = '1fr';
          this.grid.querySelectorAll('.product-card').forEach(c => c.style.display = 'flex');
        } else {
          this.grid.style.gridTemplateColumns = '';
          this.grid.querySelectorAll('.product-card').forEach(c => c.style.display = '');
        }
      });
    });
  }
}

/* ============================================================
   ANNOUNCEMENT BAR DISMISSAL
   ============================================================ */
class AnnouncementBar {
  constructor() {
    this.bar = FlowTheme.qs('.announcement-bar');
    this.closeBtn = FlowTheme.qs('.announcement-bar__close');
    if (!this.bar || !this.closeBtn) return;
    this.init();
  }

  init() {
    if (sessionStorage.getItem('announcement_dismissed')) {
      this.bar.style.display = 'none';
      return;
    }
    this.closeBtn.addEventListener('click', () => {
      this.bar.style.display = 'none';
      sessionStorage.setItem('announcement_dismissed', '1');
    });
  }
}

/* ============================================================
   NEWSLETTER FORM
   ============================================================ */
class NewsletterForm {
  constructor(form) {
    this.form = form;
    if (!form) return;
    this.init();
  }

  init() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = this.form.querySelector('input[type="email"]')?.value;
      if (!email) return;
      Toast.show('Thank you for subscribing!', 'success');
      this.form.reset();
    });
  }
}

/* ============================================================
   IMAGE ZOOM (Product gallery)
   ============================================================ */
class ImageZoom {
  constructor(el) {
    this.el  = el;
    this.img = el.querySelector('img');
    if (!this.img) return;
    this.init();
  }

  init() {
    this.el.addEventListener('mousemove', (e) => this.onMove(e));
    this.el.addEventListener('mouseleave', () => this.reset());
  }

  onMove(e) {
    const rect = this.el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    this.img.style.transformOrigin = `${x}% ${y}%`;
    this.img.style.transform = 'scale(1.8)';
    this.img.style.transition = 'none';
  }

  reset() {
    this.img.style.transform = '';
    this.img.style.transition = '';
  }
}

/* ============================================================
   RECENTLY VIEWED (Dropshipping / All niches)
   ============================================================ */
class RecentlyViewed {
  constructor() {
    this.key  = 'flowtheme_recently_viewed';
    this.limit = 8;
    this.init();
  }

  init() {
    const productHandle = document.body.dataset.productHandle;
    if (productHandle) this.track(productHandle);
  }

  track(handle) {
    let items = JSON.parse(localStorage.getItem(this.key) || '[]');
    items = [handle, ...items.filter(h => h !== handle)].slice(0, this.limit);
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  get() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  }
}

/* ============================================================
   SPIN ANIMATION (CSS)
   ============================================================ */
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

/* ============================================================
   INIT ALL COMPONENTS ON DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Global
  new StickyHeader();
  new MobileNav();
  new CartDrawer();
  new SearchOverlay();
  new QuickView();
  new Wishlist();
  new BackToTop();
  new LazyImages();
  new CookieConsent();
  new AnnouncementBar();
  new ViewToggle();
  new SortSelector();

  // Product page
  FlowTheme.qsa('.product-form').forEach(f => new ProductForm(f));
  FlowTheme.qsa('.product-gallery').forEach(g => new ProductGallery(g));
  FlowTheme.qsa('.product-gallery__main').forEach(m => new ImageZoom(m));
  new StickyBuyBar();

  // Accordion
  FlowTheme.qsa('.accordion').forEach(a => new Accordion(a));

  // Countdown timers
  FlowTheme.qsa('[data-countdown]').forEach(el => new CountdownTimer(el));

  // Tabs
  FlowTheme.qsa('.tabs-component').forEach(el => new Tabs(el));

  // Collection filters
  new FilterSidebar();

  // Newsletter forms
  FlowTheme.qsa('.newsletter-form').forEach(f => new NewsletterForm(f));

  // Recently viewed
  new RecentlyViewed();

  console.log('%cFlowTheme v1.0.0 loaded', 'color:#0052FF;font-weight:900;font-size:14px');
});

/* Export globals for Liquid templates */
window.FlowTheme = FlowTheme;
window.Toast = Toast;

// Quick Add to Cart from product cards
window.quickAddToCart = async function(variantId, productName) {
  try {
    await CartDrawer.addItem(variantId, 1);
    Toast.show(productName + ' added to cart!', 'success');
    document.querySelector('.cart-drawer')?.classList.add('open');
    document.querySelector('.cart-drawer-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    Toast.show('Could not add to cart', 'error');
  }
};

/* ============================================================
   RECENTLY VIEWED TRACKING
   ============================================================ */
(function() {
  const STORAGE_KEY = 'flowtheme_recently_viewed';
  const MAX_ITEMS = 12;
  
  function trackViewedProduct() {
    const productHandle = {{ product.handle | json }};
    if (!productHandle) return;
    
    let viewed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    viewed = viewed.filter(h => h !== productHandle);
    viewed.unshift(productHandle);
    viewed = viewed.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackViewedProduct);
  } else {
    trackViewedProduct();
  }
})();
