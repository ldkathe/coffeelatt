import { fetchPlayerState, fetchShopItems, savePlayerState } from './lib/api.js';
import { getSession, onAuthStateChange, signInWithGoogle, signOut } from './auth/auth.js';
import {
  applyUpgradeEffects,
  buyUpgrade,
  loadLocalState,
  saveLocalState,
  upgradeCost,
} from './game/state.js';

const coinsDisplay = document.getElementById('coins-display');
const rateDisplay = document.getElementById('rate-display');
const clickPowerDisplay = document.getElementById('click-power-display');
const brewButton = document.getElementById('brew-button');
const shopList = document.getElementById('shop-list');
const authBox = document.getElementById('auth-box');

let state = loadLocalState();
let catalog = [];
let session = null;
let dirty = false;
let catalogStatus = 'loading'; // 'loading' | 'error' | 'ready'

function formatNumber(value) {
  return Math.floor(value).toLocaleString('es');
}

function renderStats() {
  coinsDisplay.textContent = formatNumber(state.coins);
  rateDisplay.textContent = `+${formatNumber(state.passive_income)} monedas/seg`;
  clickPowerDisplay.textContent = formatNumber(state.click_power);
}

function renderShop() {
  shopList.innerHTML = '';

  if (catalogStatus === 'loading') {
    shopList.innerHTML = '<p class="shop-status">Cargando mejoras…</p>';
    return;
  }

  if (catalogStatus === 'error') {
    shopList.innerHTML = '<p class="shop-status">No se pudo conectar con el servidor. Reintentando…</p>';
    return;
  }

  for (const upgrade of catalog) {
    const level = state.upgrades[upgrade.id] || 0;
    const cost = upgradeCost(upgrade, level);

    const item = document.createElement('div');
    item.className = 'shop-item';

    const info = document.createElement('div');
    info.className = 'shop-item-info';
    info.innerHTML = `<strong>${upgrade.name} (nivel ${level})</strong><span>${upgrade.description}</span>`;

    const buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.textContent = `Comprar · ${formatNumber(cost)}`;
    buyBtn.disabled = state.coins < cost;
    buyBtn.addEventListener('click', () => handleBuy(upgrade.id));

    item.appendChild(info);
    item.appendChild(buyBtn);
    shopList.appendChild(item);
  }
}

function renderAuthBox() {
  authBox.innerHTML = '';

  if (session?.user) {
    const label = document.createElement('span');
    label.className = 'user-email';
    label.textContent = session.user.email ?? 'Cuenta conectada';

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.textContent = 'Cerrar sesión';
    logoutBtn.addEventListener('click', () => signOut());

    authBox.appendChild(label);
    authBox.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.type = 'button';
    loginBtn.textContent = 'Iniciar sesión con Google';
    loginBtn.addEventListener('click', () => signInWithGoogle());
    authBox.appendChild(loginBtn);
  }
}

function renderAll() {
  renderStats();
  renderShop();
  renderAuthBox();
}

function markDirty() {
  dirty = true;
  saveLocalState(state);
}

function handleBuy(upgradeId) {
  const result = buyUpgrade(state, catalog, upgradeId);
  if (result.ok) {
    markDirty();
    renderAll();
  }
}

function spawnFloatingGain(amount, clientX, clientY) {
  const el = document.createElement('div');
  el.className = 'float-gain';
  el.textContent = `+${formatNumber(amount)}`;
  el.style.left = `${clientX - 12}px`;
  el.style.top = `${clientY - 12}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function playBrewAnimation() {
  brewButton.classList.remove('is-brewing');
  void brewButton.offsetWidth; // fuerza reflow para poder reiniciar la animación en clics seguidos
  brewButton.classList.add('is-brewing');
}

brewButton.addEventListener('click', (event) => {
  state.coins += state.click_power;
  markDirty();
  renderStats();
  renderShop();
  playBrewAnimation();
  spawnFloatingGain(state.click_power, event.clientX, event.clientY);
});

async function loadCatalog(attempt = 1) {
  try {
    catalog = await fetchShopItems();
    catalogStatus = 'ready';
    applyUpgradeEffects(state, catalog);
    renderAll();
  } catch (error) {
    console.error('No se pudo cargar el catálogo de mejoras desde el backend', error);

    if (attempt < 4) {
      // El backend gratuito de Render puede tardar ~50s en despertar; reintenta con backoff.
      setTimeout(() => loadCatalog(attempt + 1), 5000 * attempt);
    } else {
      catalogStatus = 'error';
      renderShop();
    }
  }
}

async function syncFromServer() {
  if (!session) return;

  try {
    const remoteState = await fetchPlayerState(session);
    state = {
      coins: remoteState.coins,
      click_power: remoteState.click_power,
      passive_income: remoteState.passive_income,
      upgrades: remoteState.upgrades || {},
    };
    applyUpgradeEffects(state, catalog);
    saveLocalState(state);
    renderAll();
  } catch (error) {
    console.error('No se pudo sincronizar el progreso con el servidor', error);
  }
}

async function pushToServer() {
  if (!session || !dirty) return;
  dirty = false;

  try {
    await savePlayerState(session, state);
  } catch (error) {
    console.error('No se pudo guardar el progreso en el servidor', error);
    dirty = true;
  }
}

function startGameLoop() {
  let lastTick = performance.now();

  setInterval(() => {
    const now = performance.now();
    const deltaSeconds = (now - lastTick) / 1000;
    lastTick = now;

    if (state.passive_income > 0) {
      state.coins += state.passive_income * deltaSeconds;
      markDirty();
      renderStats();
      renderShop();
    }
  }, 250);

  setInterval(pushToServer, 5000);
}

async function init() {
  renderAll();
  startGameLoop();

  const catalogPromise = loadCatalog();

  session = await getSession();
  renderAuthBox();

  await catalogPromise;
  await syncFromServer();

  onAuthStateChange(async (nextSession) => {
    session = nextSession;
    renderAuthBox();
    await syncFromServer();
  });
}

init();
