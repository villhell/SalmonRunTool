// Constants
const STORAGE_KEY_WEAPONS = 'splatoon3_salmon_usage_count';
const STORAGE_KEY_BOSSES = 'splatoon3_salmon_boss_records';

// State
let weaponsData = null;
let usageData = {};
let bossData = {};
let currentMode = 'plus'; // 'plus' or 'minus'
let longPressTimer = null;
const LONG_PRESS_DURATION = 500;

// Number display helper (circled numbers)
function getCircledNumber(n) {
  const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
    '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳',
    '㉑', '㉒', '㉓', '㉔', '㉕', '㉖', '㉗', '㉘', '㉙', '㉚',
    '㉛', '㉜', '㉝', '㉞', '㉟', '㊱', '㊲', '㊳', '㊴', '㊵',
    '㊶', '㊷', '㊸', '㊹', '㊺', '㊻', '㊼', '㊽', '㊾', '㊿'];

  if (n >= 1 && n <= 50) {
    return circled[n - 1];
  }
  // For numbers 51-63, use two-digit display
  if (n >= 51 && n <= 63) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return circled[tens - 1] + (ones > 0 ? circled[ones - 1] : '');
  }
  return String(n);
}

// LocalStorage functions
function loadUsageData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WEAPONS);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Failed to load usage data:', e);
    return {};
  }
}

function saveUsageData() {
  try {
    // Remove zero values to save space
    const filtered = {};
    for (const [key, value] of Object.entries(usageData)) {
      if (value > 0) {
        filtered[key] = value;
      }
    }
    localStorage.setItem(STORAGE_KEY_WEAPONS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save usage data:', e);
  }
}

function loadBossData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BOSSES);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize default boss data
    return {
      yokozuna: { appearances: 0, defeats: 0 },
      tatsu: { appearances: 0, defeats: 0 },
      joe: { appearances: 0, defeats: 0 }
    };
  } catch (e) {
    console.error('Failed to load boss data:', e);
    return {
      yokozuna: { appearances: 0, defeats: 0 },
      tatsu: { appearances: 0, defeats: 0 },
      joe: { appearances: 0, defeats: 0 }
    };
  }
}

function saveBossData() {
  try {
    localStorage.setItem(STORAGE_KEY_BOSSES, JSON.stringify(bossData));
  } catch (e) {
    console.error('Failed to save boss data:', e);
  }
}

// Data loading
async function loadWeaponsData() {
  try {
    const response = await fetch('data/weapons.json');
    weaponsData = await response.json();
    return weaponsData;
  } catch (e) {
    console.error('Failed to load weapons data:', e);
    return null;
  }
}

// UI Rendering
function renderWeapons() {
  const grid = document.getElementById('weaponGrid');
  grid.innerHTML = '';

  weaponsData.weapons.forEach(weapon => {
    const card = createWeaponCard(weapon, false);
    grid.appendChild(card);
  });

  // Add empty cell if needed (63 weapons in 8x8 grid)
  const emptySlots = 64 - weaponsData.weapons.length;
  for (let i = 0; i < emptySlots; i++) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'weapon-card';
    emptyCard.style.visibility = 'hidden';
    grid.appendChild(emptyCard);
  }
}

function renderKumaWeapons() {
  const grid = document.getElementById('kumaGrid');
  grid.innerHTML = '';

  weaponsData.kumaWeapons.forEach(weapon => {
    const card = createWeaponCard(weapon, true);
    grid.appendChild(card);
  });
}

// Generate weapon image path
function getWeaponImagePath(weapon, isKuma) {
  if (isKuma) {
    return `images/kuma/kuma_${weapon.number.toString().padStart(2, '0')}.png`;
  }
  return `images/weapons/weapon_${weapon.number.toString().padStart(3, '0')}.png`;
}

function createWeaponCard(weapon, isKuma) {
  const card = document.createElement('div');
  card.className = 'weapon-card' + (isKuma ? ' kuma-card' : '');
  card.dataset.id = weapon.id;
  card.dataset.name = weapon.name;

  // Weapon image
  const img = document.createElement('img');
  img.src = getWeaponImagePath(weapon, isKuma);
  img.alt = weapon.name;
  img.className = 'weapon-image';
  img.loading = 'lazy'; // Lazy loading for performance

  // Handle image load error - show fallback number
  img.onerror = function() {
    card.classList.add('image-failed');
  };

  card.appendChild(img);

  // Fallback number display (hidden by default, shown when image fails)
  const numberSpan = document.createElement('span');
  numberSpan.className = 'weapon-number';
  if (isKuma) {
    numberSpan.textContent = 'K' + getCircledNumber(weapon.number);
  } else {
    numberSpan.textContent = getCircledNumber(weapon.number);
  }
  card.appendChild(numberSpan);

  // Update badge
  updateWeaponBadge(card, weapon.id);

  // Event listeners
  card.addEventListener('click', (e) => handleWeaponClick(e, weapon.id));
  card.addEventListener('contextmenu', (e) => handleWeaponRightClick(e, weapon));

  // Long press for mobile
  card.addEventListener('touchstart', (e) => handleTouchStart(e, weapon));
  card.addEventListener('touchend', handleTouchEnd);
  card.addEventListener('touchmove', handleTouchEnd);

  return card;
}

function updateWeaponBadge(card, weaponId) {
  let badge = card.querySelector('.usage-badge');
  const count = usageData[weaponId] || 0;

  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'usage-badge';
      card.appendChild(badge);
    }
    badge.textContent = count;
    // Re-trigger animation
    badge.style.animation = 'none';
    badge.offsetHeight; // Trigger reflow
    badge.style.animation = null;
  } else if (badge) {
    badge.remove();
  }
}

function renderBosses() {
  const grid = document.getElementById('bossGrid');
  grid.innerHTML = '';

  weaponsData.bosses.forEach(boss => {
    const card = createBossCard(boss);
    grid.appendChild(card);
  });
}

function createBossCard(boss) {
  const card = document.createElement('div');
  card.className = 'boss-card';
  card.dataset.id = boss.id;

  const data = bossData[boss.id] || { appearances: 0, defeats: 0 };

  card.innerHTML = `
    <div class="boss-name">${boss.name}</div>

    <div class="boss-counter">
      <span class="counter-label">出現:</span>
      <div class="counter-controls">
        <button class="counter-btn minus" data-type="appearances" data-action="minus">-</button>
        <span class="counter-value" data-type="appearances">${data.appearances}</span>
        <button class="counter-btn plus" data-type="appearances" data-action="plus">+</button>
      </div>
    </div>

    <div class="boss-counter">
      <span class="counter-label">討伐:</span>
      <div class="counter-controls">
        <button class="counter-btn minus" data-type="defeats" data-action="minus">-</button>
        <span class="counter-value" data-type="defeats">${data.defeats}</span>
        <button class="counter-btn plus" data-type="defeats" data-action="plus">+</button>
      </div>
    </div>

    <div class="boss-rate">討伐率: ${calculateBossRate(data)}</div>

    <button class="boss-reset">リセット</button>
  `;

  // Event listeners for counter buttons
  card.querySelectorAll('.counter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = btn.dataset.type;
      const action = btn.dataset.action;
      handleBossCounter(boss.id, type, action);
    });
  });

  // Reset button
  card.querySelector('.boss-reset').addEventListener('click', (e) => {
    e.stopPropagation();
    handleBossReset(boss);
  });

  return card;
}

function calculateBossRate(data) {
  if (data.appearances === 0) {
    return '--%';
  }
  const rate = Math.round((data.defeats / data.appearances) * 100);
  return `${rate}%`;
}

// Event handlers
function handleWeaponClick(e, weaponId) {
  e.preventDefault();

  const currentCount = usageData[weaponId] || 0;

  if (currentMode === 'plus') {
    usageData[weaponId] = currentCount + 1;
  } else {
    usageData[weaponId] = Math.max(0, currentCount - 1);
  }

  saveUsageData();

  // Update badge
  const card = document.querySelector(`[data-id="${weaponId}"]`);
  if (card) {
    updateWeaponBadge(card, weaponId);
  }

  updateStats();
}

function handleWeaponRightClick(e, weapon) {
  e.preventDefault();

  if (confirm(`「${weapon.name}」の使用回数をリセットしますか？`)) {
    usageData[weapon.id] = 0;
    saveUsageData();

    const card = document.querySelector(`[data-id="${weapon.id}"]`);
    if (card) {
      updateWeaponBadge(card, weapon.id);
    }

    updateStats();
  }
}

function handleTouchStart(e, weapon) {
  longPressTimer = setTimeout(() => {
    if (confirm(`「${weapon.name}」の使用回数をリセットしますか？`)) {
      usageData[weapon.id] = 0;
      saveUsageData();

      const card = document.querySelector(`[data-id="${weapon.id}"]`);
      if (card) {
        updateWeaponBadge(card, weapon.id);
      }

      updateStats();
    }
    longPressTimer = null;
  }, LONG_PRESS_DURATION);
}

function handleTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function handleBossCounter(bossId, type, action) {
  const data = bossData[bossId];

  if (action === 'plus') {
    data[type]++;
  } else {
    data[type] = Math.max(0, data[type] - 1);
  }

  // Validation: defeats cannot exceed appearances
  if (data.defeats > data.appearances) {
    data.defeats = data.appearances;
  }

  saveBossData();
  updateBossCard(bossId);
  updateStats();
}

function handleBossReset(boss) {
  if (confirm(`「${boss.name}」の記録をリセットしますか？`)) {
    bossData[boss.id] = { appearances: 0, defeats: 0 };
    saveBossData();
    updateBossCard(boss.id);
    updateStats();
  }
}

function updateBossCard(bossId) {
  const card = document.querySelector(`.boss-card[data-id="${bossId}"]`);
  if (!card) return;

  const data = bossData[bossId];

  card.querySelector('[data-type="appearances"].counter-value').textContent = data.appearances;
  card.querySelector('[data-type="defeats"].counter-value').textContent = data.defeats;
  card.querySelector('.boss-rate').textContent = '討伐率: ' + calculateBossRate(data);
}

// Mode switching
function setupModeSwitch() {
  const plusBtn = document.getElementById('plusMode');
  const minusBtn = document.getElementById('minusMode');

  plusBtn.addEventListener('click', () => {
    currentMode = 'plus';
    plusBtn.classList.add('active');
    minusBtn.classList.remove('active');
  });

  minusBtn.addEventListener('click', () => {
    currentMode = 'minus';
    minusBtn.classList.add('active');
    plusBtn.classList.remove('active');
  });
}

// Clear all
function setupClearAll() {
  const clearBtn = document.getElementById('clearAll');

  clearBtn.addEventListener('click', () => {
    if (confirm('全ての使用回数とオカシラ記録をリセットしますか？')) {
      // Clear weapon usage
      usageData = {};
      saveUsageData();

      // Clear boss data
      bossData = {
        yokozuna: { appearances: 0, defeats: 0 },
        tatsu: { appearances: 0, defeats: 0 },
        joe: { appearances: 0, defeats: 0 }
      };
      saveBossData();

      // Re-render
      renderWeapons();
      renderKumaWeapons();
      renderBosses();
      updateStats();
    }
  });
}

// Statistics
function updateStats() {
  const totalWeapons = weaponsData.weapons.length + weaponsData.kumaWeapons.length;
  let usedCount = 0;
  let totalUsage = 0;

  // Count weapon usage
  for (const weapon of [...weaponsData.weapons, ...weaponsData.kumaWeapons]) {
    const count = usageData[weapon.id] || 0;
    if (count > 0) {
      usedCount++;
      totalUsage += count;
    }
  }

  // Calculate achievement rate
  const achievementRate = totalWeapons > 0
    ? Math.round((usedCount / totalWeapons) * 1000) / 10
    : 0;

  // Update weapon stats
  document.getElementById('usedWeapons').textContent = `${usedCount} / ${totalWeapons} 武器使用`;
  document.getElementById('totalCount').textContent = `合計 ${totalUsage} 回`;
  document.getElementById('achievement').textContent = `${achievementRate}%`;

  // Calculate boss stats
  let totalAppearances = 0;
  let totalDefeats = 0;

  for (const boss of weaponsData.bosses) {
    const data = bossData[boss.id] || { appearances: 0, defeats: 0 };
    totalAppearances += data.appearances;
    totalDefeats += data.defeats;
  }

  const bossRate = totalAppearances > 0
    ? Math.round((totalDefeats / totalAppearances) * 100)
    : '--';

  document.getElementById('bossStats').textContent =
    `オカシラ討伐率: ${bossRate}% (${totalDefeats}/${totalAppearances})`;
}

// Initialize
async function init() {
  // Load data
  await loadWeaponsData();
  if (!weaponsData) {
    alert('武器データの読み込みに失敗しました。');
    return;
  }

  usageData = loadUsageData();
  bossData = loadBossData();

  // Render UI
  renderWeapons();
  renderKumaWeapons();
  renderBosses();

  // Setup controls
  setupModeSwitch();
  setupClearAll();

  // Update stats
  updateStats();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
