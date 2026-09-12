// ---------- Small helpers shared across pages ----------

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ');
    err.data = data;
    throw err;
  }
  return data;
}

function showToast(message, type = 'default') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--gold)';
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const bar = document.querySelector('.topbar');
  if (toggle && bar) {
    toggle.addEventListener('click', () => bar.classList.toggle('open'));
  }
}

async function refreshCartBadge() {
  const el = document.querySelector('.cart-count');
  if (!el) return;
  try {
    const cart = await api('/api/cart');
    const count = cart.items.reduce((n, i) => n + i.quantity, 0);
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  } catch (e) {
    // silent — cart badge is a nice-to-have
  }
}

async function refreshAuthState() {
  const loginLink = document.querySelector('[data-auth="guest"]');
  const accountLink = document.querySelector('[data-auth="user"]');
  try {
    const { user } = await api('/api/auth/me');
    if (user) {
      if (loginLink) loginLink.style.display = 'none';
      if (accountLink) {
        accountLink.style.display = 'inline-flex';
        accountLink.textContent = user.rsn || user.email;
      }
    } else {
      if (loginLink) loginLink.style.display = 'inline-flex';
      if (accountLink) accountLink.style.display = 'none';
    }
  } catch (e) {
    // guest fallback already the default markup state
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  refreshCartBadge();
  refreshAuthState();
});
