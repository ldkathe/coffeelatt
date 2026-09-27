const STORAGE_KEY = 'coffeelatt.state.v1';

export function defaultState() {
  return {
    coins: 0,
    click_power: 1,
    passive_income: 0,
    upgrades: {},
  };
}

export function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveLocalState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Almacenamiento no disponible (modo privado, etc.); se ignora.
  }
}

export function upgradeCost(upgrade, currentLevel) {
  return Math.ceil(upgrade.base_cost * Math.pow(upgrade.cost_growth, currentLevel));
}

export function applyUpgradeEffects(state, catalog) {
  let clickPower = 1;
  let passiveIncome = 0;

  for (const upgrade of catalog) {
    const level = state.upgrades[upgrade.id] || 0;
    if (level <= 0) continue;

    if (upgrade.category === 'click') {
      clickPower += upgrade.effect_value * level;
    } else if (upgrade.category === 'passive') {
      passiveIncome += upgrade.effect_value * level;
    }
  }

  state.click_power = clickPower;
  state.passive_income = passiveIncome;
  return state;
}

export function buyUpgrade(state, catalog, upgradeId) {
  const upgrade = catalog.find((item) => item.id === upgradeId);
  if (!upgrade) return { ok: false, reason: 'unknown-upgrade' };

  const currentLevel = state.upgrades[upgradeId] || 0;
  const cost = upgradeCost(upgrade, currentLevel);

  if (state.coins < cost) {
    return { ok: false, reason: 'not-enough-coins' };
  }

  state.coins -= cost;
  state.upgrades[upgradeId] = currentLevel + 1;
  applyUpgradeEffects(state, catalog);

  return { ok: true };
}
