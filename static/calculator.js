const stepButtons = Array.from(document.querySelectorAll(".step"));
const stepPanels = Array.from(document.querySelectorAll(".step-panel"));
const form = document.getElementById("bazi-form");
const directForm = document.getElementById("bazi-direct-form");
const compatibilityForm = document.getElementById("compatibility-form");
const prevStepButton = document.getElementById("prev-step");
const nextStepButton = document.getElementById("next-step");
const submitStepButton = form ? form.querySelector('button[type="submit"]') : null;
const resultEmpty = document.getElementById("result-empty");
const resultContent = document.getElementById("result-content");
const resultPanel = document.getElementById("result-panel");
const modeTabs = Array.from(document.querySelectorAll(".mode-tab"));
const modePanels = Array.from(document.querySelectorAll(".mode-panel"));
const formFeedback = document.getElementById("form-feedback");
const directFormFeedback = document.getElementById("direct-form-feedback");
const compatibilityFormFeedback = document.getElementById("compatibility-form-feedback");
const followupSuggestions = document.getElementById("followup-suggestions");
const followupForm = document.getElementById("followup-form");
const followupInput = document.getElementById("followup-input");
const followupResponse = document.getElementById("followup-response");
const followupThread = document.getElementById("followup-thread");
const followupUpgrade = document.getElementById("followup-upgrade");
const dreamUnlockButtons = Array.from(document.querySelectorAll("[data-dream-unlock]"));
const dreamForm = document.getElementById("dream-form");
const dreamInput = document.getElementById("dream-input");
const dreamResponse = document.getElementById("dream-response");
const dreamThread = document.getElementById("dream-thread");
const dreamQuotaNote = document.getElementById("dream-quota-note");
const dreamFeedback = document.getElementById("dream-feedback");
const dreamPaywall = document.getElementById("dream-paywall");
const checkoutCard = document.getElementById("checkout-card");
const checkoutButtons = Array.from(document.querySelectorAll("[data-checkout-scroll]"));
const checkoutTitle = document.getElementById("checkout-title");
const checkoutDescription = document.getElementById("checkout-description");
const checkoutServiceLabel = document.getElementById("checkout-service-label");
const checkoutPrice = document.getElementById("checkout-price");
const checkoutServiceCopy = document.getElementById("checkout-service-copy");
const checkoutCompleteButton = document.getElementById("checkout-complete");
const checkoutCancelButton = document.getElementById("checkout-cancel");
const compatibilityButtons = Array.from(document.querySelectorAll("[data-compatibility-action]"));
const compatibilityResponse = document.getElementById("compatibility-response");
const birthdayInput = document.getElementById("birthday-input");
const birthdayFormatInputs = Array.from(document.querySelectorAll("[data-birthday-format]"));
const birthTimeInput = document.getElementById("birth-time-input");
const timeRangeSelect = document.getElementById("time-range-select");

let activeStep = 0;
let latestResult = null;
let latestFormData = null;
let latestCompatibility = null;
let pendingCompatibilityPayload = null;
let followupHistory = [];
let dreamHistory = [];
let pendingCheckoutService = null;
const paidUnlocks = {
  dream: 0,
  followup: 0,
  compatibility: 0,
};

const DREAM_DAILY_LIMIT = 1;
const DREAM_STORAGE_KEY = "wuxing-paipai-dream-quota-v1";
const FOLLOWUP_DAILY_LIMIT = 1;
const FOLLOWUP_STORAGE_KEY = "wuxing-paipai-followup-quota-v1";
const COMPATIBILITY_STORAGE_KEY = "wuxing-paipai-compatibility-free-v1";

const CHECKOUT_SERVICES = {
  dream: {
    title: "解锁梦境深读",
    label: "梦境深读",
    copy: "适合把一场醒来后还放不下的梦继续看深。会结合梦里最刺的一幕、当下情绪和命盘主题展开。",
    returnText: "支付完成后，会回到梦境解读继续展开。",
  },
  followup: {
    title: "解锁继续追问",
    label: "继续追问",
    copy: "适合把眼前最在意的问题继续往下问一次。比如关系、事业、财运或时辰校准，都可以围绕刚才的命盘继续看。",
    returnText: "支付完成后，会回到继续问答继续生成回复。",
  },
  compatibility: {
    title: "解锁合盘深读",
    label: "八字合盘",
    copy: "适合继续看两个人的相处节奏、关系卡点、长期匹配度和接下来两三年的推进方式。",
    returnText: "支付完成后，会自动展开合盘深读内容。",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setDreamFeedback(message = "") {
  if (!dreamFeedback) return;
  dreamFeedback.textContent = message;
  dreamFeedback.classList.toggle("is-hidden", !message);
}

function setStep(stepIndex) {
  activeStep = Math.max(0, Math.min(stepIndex, stepPanels.length - 1));

  stepButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === activeStep);
  });

  stepPanels.forEach((panel, index) => {
    const isActive = index === activeStep;
    panel.classList.toggle("is-active", isActive);
    panel.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = !isActive;
    });
  });

  if (prevStepButton) {
    prevStepButton.disabled = activeStep === 0;
  }

  if (nextStepButton) {
    nextStepButton.disabled = activeStep === stepPanels.length - 1;
    nextStepButton.hidden = activeStep === stepPanels.length - 1;
  }

  if (submitStepButton) {
    submitStepButton.hidden = activeStep !== stepPanels.length - 1;
  }
}

function setMode(targetId) {
  modeTabs.forEach((tab) => {
    const isActive = tab.dataset.modeTarget === targetId;
    tab.classList.toggle("is-active", isActive);
  });

  modePanels.forEach((panel) => {
    const isActive = panel.id === targetId;
    panel.classList.toggle("is-active", isActive);
    panel.querySelectorAll("input, select, textarea, button").forEach((field) => {
      if (panel.id === "profile-mode" && field === submitStepButton) return;
      field.disabled = !isActive;
    });
  });

  if (targetId === "profile-mode") {
    setStep(activeStep);
  }
}

function validateCurrentStep() {
  const currentPanel = stepPanels[activeStep];
  if (!currentPanel) return true;

  const fields = Array.from(currentPanel.querySelectorAll("input, select, textarea")).filter((field) => !field.disabled);
  for (const field of fields) {
    if (!field.reportValidity()) {
      field.focus();
      return false;
    }
  }

  return true;
}

function formatBirthdayValue(rawValue) {
  const digits = (rawValue || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function getTodayQuotaKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDreamQuotaState() {
  try {
    const raw = localStorage.getItem(DREAM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const today = getTodayQuotaKey();
    if (!parsed || parsed.date !== today) {
      return { date: today, used: 0 };
    }
    return { date: today, used: Number(parsed.used) || 0 };
  } catch {
    return { date: getTodayQuotaKey(), used: 0 };
  }
}

function saveDreamQuotaState(state) {
  try {
    localStorage.setItem(DREAM_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors and keep the page usable
  }
}

function getDailyQuotaState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const today = getTodayQuotaKey();
    if (!parsed || parsed.date !== today) {
      return { date: today, used: 0 };
    }
    return { date: today, used: Number(parsed.used) || 0 };
  } catch {
    return { date: getTodayQuotaKey(), used: 0 };
  }
}

function saveDailyQuotaState(storageKey, state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Local quota is only a soft product gate; storage errors should not break the page.
  }
}

function getDailyRemaining(storageKey, limit) {
  const state = getDailyQuotaState(storageKey);
  return Math.max(0, limit - state.used);
}

function consumeDailyQuota(storageKey, limit) {
  const state = getDailyQuotaState(storageKey);
  if (state.used >= limit) return false;
  state.used += 1;
  saveDailyQuotaState(storageKey, state);
  return true;
}

function hasUsedCompatibilityFree() {
  try {
    return localStorage.getItem(COMPATIBILITY_STORAGE_KEY) === "used";
  } catch {
    return false;
  }
}

function consumeCompatibilityFree() {
  if (hasUsedCompatibilityFree()) return false;
  try {
    localStorage.setItem(COMPATIBILITY_STORAGE_KEY, "used");
  } catch {
    // If storage is unavailable, still allow the first in-session experience.
  }
  return true;
}

function getDreamRemaining() {
  const state = getDreamQuotaState();
  return Math.max(0, DREAM_DAILY_LIMIT - state.used);
}

function consumeDreamQuota() {
  const state = getDreamQuotaState();
  if (state.used >= DREAM_DAILY_LIMIT) return false;
  state.used += 1;
  saveDreamQuotaState(state);
  return true;
}

function updateDreamQuotaUI() {
  if (!dreamQuotaNote || !dreamForm) return;
  const remaining = getDreamRemaining();
  if (dreamPaywall) {
    dreamPaywall.classList.toggle("is-hidden", remaining > 0 || paidUnlocks.dream > 0);
  }
  if (remaining > 0 || paidUnlocks.dream > 0) {
    dreamQuotaNote.textContent =
      paidUnlocks.dream > 0 && remaining <= 0 ? "已解锁 1 次梦境深读，可以继续写下这个梦。" : `今日还可免费解梦 ${remaining} 次。`;
    if (dreamInput) dreamInput.disabled = false;
    const submitButton = dreamForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = paidUnlocks.dream > 0 && remaining <= 0 ? "继续深读这个梦" : "解读这个梦";
    }
  } else {
    dreamQuotaNote.textContent = "今日免费解梦已经用完。若这个梦还放不下，可以 9.9 解锁一次梦境深读。";
    if (dreamInput) dreamInput.disabled = true;
    const submitButton = dreamForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "今日次数已用完";
    }
  }
}

function openCheckout(service = "followup") {
  const config = CHECKOUT_SERVICES[service] || CHECKOUT_SERVICES.followup;
  pendingCheckoutService = service;
  if (checkoutTitle) checkoutTitle.textContent = config.title;
  if (checkoutDescription) checkoutDescription.textContent = config.returnText;
  if (checkoutServiceLabel) checkoutServiceLabel.textContent = config.label;
  if (checkoutPrice) checkoutPrice.textContent = "¥9.9 / 次";
  if (checkoutServiceCopy) checkoutServiceCopy.textContent = config.copy;
  if (checkoutCard) {
    checkoutCard.classList.remove("is-hidden");
    checkoutCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function closeCheckout() {
  if (checkoutCard) checkoutCard.classList.add("is-hidden");
  pendingCheckoutService = null;
}

function getFollowupRemaining() {
  return getDailyRemaining(FOLLOWUP_STORAGE_KEY, FOLLOWUP_DAILY_LIMIT);
}

function canUseFollowup() {
  return getFollowupRemaining() > 0 || paidUnlocks.followup > 0;
}

function consumeFollowupAccess() {
  if (getFollowupRemaining() > 0) {
    return consumeDailyQuota(FOLLOWUP_STORAGE_KEY, FOLLOWUP_DAILY_LIMIT);
  }
  if (paidUnlocks.followup > 0) {
    paidUnlocks.followup -= 1;
    return true;
  }
  return false;
}

function getPrimaryElement(result) {
  return result?.theme?.dominantElement || result?.elements?.dominant || "";
}

function getDayBranch(result) {
  return result?.pillars?.find((pillar) => pillar.label === "日柱")?.zhi || result?.pillars?.[2]?.zhi || "";
}

function getElementRelation(leftElement, rightElement) {
  const generates = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const controls = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (!leftElement || !rightElement) return "两个人的五行关系需要结合完整命盘继续看，不能只凭一个字定合不合。";
  if (leftElement === rightElement) return `两边主气同为${leftElement}，容易懂对方的节奏，但也容易在同一个点上同时较劲。`;
  if (generates[leftElement] === rightElement) return `${leftElement}生${rightElement}，更像一方容易先给力、先托住关系，但也要防止付出变成单方面消耗。`;
  if (generates[rightElement] === leftElement) return `${rightElement}生${leftElement}，对方更容易在某些阶段托住你，但关系里也要看这份支持是不是被好好接住。`;
  if (controls[leftElement] === rightElement) return `${leftElement}克${rightElement}，不是一定不好，而是相处里更容易出现标准、控制感或谁说了算的问题。`;
  if (controls[rightElement] === leftElement) return `${rightElement}克${leftElement}，这段关系容易有牵制感，处理得好是互相校正，处理不好就会变成彼此消耗。`;
  return `两个人主气是${leftElement}与${rightElement}，关系里既有互补，也要看日主和十神怎么接住这股差异。`;
}

function getBranchRelation(leftBranch, rightBranch) {
  const clashes = { 子: "午", 丑: "未", 寅: "申", 卯: "酉", 辰: "戌", 巳: "亥" };
  const harmonies = { 子: "丑", 寅: "亥", 卯: "戌", 辰: "酉", 巳: "申", 午: "未" };
  if (!leftBranch || !rightBranch) return "日支这一层还需要更完整的出生信息来细看。";
  if (leftBranch === rightBranch) return `两个人日支同为${leftBranch}，容易在生活习惯或关系期待上有相似处，但相似也会放大彼此的固执。`;
  if (clashes[leftBranch] === rightBranch || clashes[rightBranch] === leftBranch) {
    return `${leftBranch}${rightBranch}有冲象，关系不一定差，但容易一靠近就把真实问题推出来，越回避越容易反复。`;
  }
  if (harmonies[leftBranch] === rightBranch || harmonies[rightBranch] === leftBranch) {
    return `${leftBranch}${rightBranch}有合意，说明关系里有互相靠近、愿意接住对方的空间，但仍要看现实节奏能不能跟上。`;
  }
  return `日支落在${leftBranch}与${rightBranch}，不是强冲强合的组合，更适合看日常回应、边界和两个人的现实配合度。`;
}

function getCompatibilityTone(primary, partner) {
  const primaryTen = primary?.tenGods?.dominant?.[0]?.name || "";
  const partnerTen = partner?.tenGods?.dominant?.[0]?.name || "";
  if (primaryTen.includes("印") || partnerTen.includes("印")) {
    return "这段关系里最要紧的不是谁更会说，而是谁能给出稳定、可信、不过度逼迫的空间。";
  }
  if (primaryTen.includes("官") || partnerTen.includes("官") || primaryTen.includes("杀") || partnerTen.includes("杀")) {
    return "这段关系很容易谈到责任、名分、承诺和现实安排，讲清楚比靠猜更重要。";
  }
  if (primaryTen.includes("财") || partnerTen.includes("财")) {
    return "这段关系会比较在意现实落点，比如钱、时间、生活安排和彼此投入是否对等。";
  }
  if (primaryTen.includes("食") || partnerTen.includes("食") || primaryTen.includes("伤") || partnerTen.includes("伤")) {
    return "这段关系最怕话说不透，情绪和表达如果长期堵着，很容易从小别扭变成大消耗。";
  }
  return "这段关系要看两个人是不是能把节奏放到同一条线上，而不是只看一时有没有感觉。";
}

function renderCompatibilityReading(mode = "free") {
  if (!compatibilityResponse || !latestResult) return;
  const primary = latestCompatibility?.primary || latestResult;
  const partner = latestCompatibility?.partner || null;
  const primaryName = latestCompatibility?.primaryPayload?.name || latestFormData?.name || "你";
  const partnerName = latestCompatibility?.partnerPayload?.name || "对方";
  const dayMaster = primary.dayMaster?.stem || "日主";
  const dominant = getPrimaryElement(primary) || "命盘主气";
  const currentLuck = primary.luck?.currentDaYun?.ganzhi || "当前大运";
  const isPaid = mode === "paid";

  if (partner) {
    const partnerDayMaster = partner.dayMaster?.stem || "对方日主";
    const partnerElement = getPrimaryElement(partner) || "对方主气";
    const elementLine = getElementRelation(dominant, partnerElement);
    const branchLine = getBranchRelation(getDayBranch(primary), getDayBranch(partner));
    const toneLine = getCompatibilityTone(primary, partner);
    const paidLine = isPaid
      ? `<p>深读时更要看接下来两三年的运势是不是同频：${primaryName}眼下走到${currentLuck}，${partnerName}走到${partner.luck?.currentDaYun?.ganzhi || "当前大运"}。如果一个人想定下来，另一个人还在变动期，就不是没感情，而是节奏需要谈清。</p>`
      : `<p>免费版先看大方向：如果还想继续细看“谁更容易先退、谁更需要安全感、未来两三年适不适合推进关系”，可以 9.9 解锁合盘深读。</p>`;

    compatibilityResponse.innerHTML = `
      <h5>${isPaid ? "合盘深读已解锁" : "免费合盘结果"}</h5>
      <p>${primaryName}是${dayMaster}日主，${partnerName}是${partnerDayMaster}日主。合盘不是一句合不合，而是看两个人的气放在一起，会互相托住，还是会把彼此最紧的地方碰出来。</p>
      <div class="compatibility-response-grid">
        <div class="compatibility-mini-card"><strong>五行互动</strong><p>${elementLine}</p></div>
        <div class="compatibility-mini-card"><strong>日支关系</strong><p>${branchLine}</p></div>
        <div class="compatibility-mini-card"><strong>相处重点</strong><p>${toneLine}</p></div>
        <div class="compatibility-mini-card"><strong>现实节奏</strong><p>${currentLuck}这步运会影响${primaryName}对关系稳定感的判断，不能只看当下热不热。</p></div>
      </div>
      ${paidLine}
    `;
  } else {
    compatibilityResponse.innerHTML = `
      <h5>${isPaid ? "合盘深读已解锁" : "免费合盘体验"}</h5>
      <p>合盘不是只看“合不合”三个字，而是先看两个人放在一起时，谁更需要回应，谁更容易把压力收在心里。以这张盘为底，${dayMaster}日主会更在意关系里的稳定感；${dominant}偏明显时，容易先看现实是否站得住。</p>
      <p>${currentLuck}这步运会把关系里的节奏问题推到台前。若要继续细看，请在测算页顶部切到“八字合盘”，把对方生日一起填进来。</p>
    `;
  }
  compatibilityResponse.classList.remove("is-hidden");
  compatibilityResponse.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateCompatibilityButtons() {
  compatibilityButtons.forEach((button) => {
    if (hasUsedCompatibilityFree()) {
      button.textContent = "9.9 解锁合盘深读";
      button.dataset.checkoutService = "compatibility";
    } else {
      button.textContent = "免费体验合盘";
      delete button.dataset.checkoutService;
    }
  });
}

function focusCompatibilityForm() {
  if (!compatibilityForm) return;
  setMode("compatibility-mode");

  if (latestFormData) {
    const fieldMap = {
      selfName: latestFormData.name || "",
      selfGender: latestFormData.gender || "female",
      selfBirthday: latestFormData.birthday || "",
      selfBirthTime: latestFormData.birthTime || "",
      selfTimeRange: latestFormData.timeRange || (latestFormData.birthTime ? "exact" : "unknown"),
      selfBirthplace: latestFormData.birthplace || "",
    };

    Object.entries(fieldMap).forEach(([name, value]) => {
      const field = compatibilityForm.elements[name];
      if (field && !field.value && value) {
        field.value = name === "selfBirthday" ? formatBirthdayValue(value) : value;
      }
    });
  }

  setFormFeedback(compatibilityForm, "请把对方资料也补上，合盘会重新读取两张盘，不会用单人命盘凑结果。");
  compatibilityForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getFeedbackElement(targetForm) {
  if (targetForm === form) return formFeedback;
  if (targetForm === directForm) return directFormFeedback;
  if (targetForm === compatibilityForm) return compatibilityFormFeedback;
  return null;
}

function setFormFeedback(targetForm, message = "") {
  const feedback = getFeedbackElement(targetForm);
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("is-hidden", !message);
}

function collectFormValues(targetForm) {
  const payload = {};
  const fields = Array.from(targetForm.querySelectorAll("input[name], select[name], textarea[name]"));

  fields.forEach((field) => {
    if ((field.type === "checkbox" || field.type === "radio") && !field.checked) {
      return;
    }
    payload[field.name] = field.value;
  });

  return payload;
}

function buildCompatibilityPersonPayload(values, prefix, fallbackName) {
  const birthTime = values[`${prefix}BirthTime`] || "";
  return {
    name: values[`${prefix}Name`] || fallbackName,
    gender: values[`${prefix}Gender`] || "female",
    status: "alive",
    birthday: values[`${prefix}Birthday`] || "",
    birthTime,
    timeRange: birthTime ? "exact" : values[`${prefix}TimeRange`] || "unknown",
    birthplace: values[`${prefix}Birthplace`] || "",
    focus: "relationship",
    horizon: "3",
  };
}

async function fetchBaziResult(payload) {
  const response = await fetch("/api/bazi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "排盘失败");
  }
  return result;
}

function syncTimeMode() {
  if (!birthTimeInput || !timeRangeSelect) return;

  const isExact = timeRangeSelect.value === "exact";
  birthTimeInput.disabled = !isExact;

  if (!isExact) {
    birthTimeInput.value = "";
    birthTimeInput.removeAttribute("required");
  }
}

function setTheme(theme) {
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-soft", theme.accentSoft);
  document.documentElement.style.setProperty("--glow", theme.glow);
  document.documentElement.style.setProperty("--ink", theme.ink);

  const aura = theme.aura || [];
  if (aura[0]) document.documentElement.style.setProperty("--wood", aura[0]);
  if (aura[1]) document.documentElement.style.setProperty("--fire", aura[1]);
  if (aura[2]) document.documentElement.style.setProperty("--water", aura[2]);
  if (aura[3]) document.documentElement.style.setProperty("--metal", aura[3]);
  if (aura[4]) document.documentElement.style.setProperty("--earth", aura[4]);
}

function getChartSignature(result) {
  const geju = result.geju?.label || "";
  const dominant = result.tenGods?.dominant?.[0]?.name || "";
  const second = result.tenGods?.dominant?.[1]?.name || "";
  const pair = `${dominant} ${second}`;

  if (geju === "正官格" && pair.includes("偏印") && pair.includes("正官")) return "rule-aware";
  if (geju === "正官格" && pair.includes("正印") && pair.includes("正官")) return "steady-system";
  if (pair.includes("伤官") && pair.includes("正官")) return "sharp-tension";
  if (pair.includes("食神") && (pair.includes("正财") || pair.includes("偏财"))) return "output-to-value";
  if (pair.includes("偏印") && pair.includes("七杀")) return "guarded-sense";
  if (pair.includes("正印") || pair.includes("偏印")) return "inner-first";
  if (pair.includes("食神") || pair.includes("伤官")) return "expression-first";
  if (pair.includes("正财") || pair.includes("偏财")) return "practical-first";
  return "balanced-core";
}

function pickVariantIndex(seed, count = 3) {
  const text = String(seed || "");
  let total = 0;
  for (const char of text) total += char.charCodeAt(0);
  const size = Math.max(1, count);
  return total % size;
}

function getDominantProfile(result) {
  const dominant = result.tenGods?.dominant?.[0]?.name || "";
  const second = result.tenGods?.dominant?.[1]?.name || "";
  const geju = result.geju?.label || "";
  const pattern = result.dayMaster?.pattern || "";
  const signature = getChartSignature(result);

  return { dominant, second, geju, pattern, signature };
}

function buildHealingGlossary(result) {
  const { dominant, second, geju, pattern, signature } = getDominantProfile(result);
  const dayMaster = `${result.dayMaster?.stem || ""}${result.dayMaster?.element || ""}`.trim();
  const favorable = (result.favorableElements || []).join("、");
  const currentDaYun = result.luck?.currentDaYun?.ganzhi || "";

  const baseMap = {
    "rule-aware": `这张盘不是没主见，而是先把事情在心里过一遍。${dayMaster}落在${geju}里，做决定时会先看规矩到底有没有道理，所以很多时候不是慢，而是不愿意糊里糊涂答应。比如别人一句“先这样吧”，心里也会先把后面会不会失控想一遍。`,
    "steady-system": `这张盘重的是稳和次序。很多事一上来不会先看热闹，而是先看值不值得长期放进去，所以在别人眼里常常会显得靠谱、能扛、也比较有边界。比如工作里更容易自然接住流程、责任和收尾这类位置。`,
    "sharp-tension": `这张盘的厉害之处，不在表面强硬，而在心里同时有判断和标准。想法来得快，要求也高，所以真正累人的，常常不是外面拦着，而是心里那把尺先顶上去了。比如一件事还没开始，心里已经在想做到几分才算过关。`,
    "output-to-value": `这张盘不怕做事，怕的是做了却白做。很多机会都长在表达、执行、把事情做出结果的过程中，所以只要方向对了，越做越容易看到回头钱。比如写出来、讲出来、做成作品，比闷着等更容易出成绩。`,
    "guarded-sense": `这张盘表面不一定锋利，但里面的防线很清楚。很多事会先看风险，再决定要不要把心力和时间放进去，所以真正让状态松开的，不是催，而是确认感。比如关系里常常要先确认对方说话算数，心里才会慢慢放下那层劲。`,
    "inner-first": `这张盘先往里走。很多判断不会立刻说出来，而是先在心里慢慢成形，所以真正需要的，不是别人替着下决定，而是给一点时间把那股气理顺。比如表面上看只是安静，心里其实已经把轻重缓急排了好几轮。`,
    "expression-first": `这张盘的重点在“想法不能闷太久”。很多事一旦看明白，就会想表达、想推进、想把话说透，所以最怕的不是没能力，而是把心里那股劲耗在反复犹豫里。比如明明脑子里已经有答案，却总卡在“要不要现在说”。`,
    "practical-first": `这张盘更讲实际。很多选择最后都会回到值不值、稳不稳、能不能落地，所以不是不愿意试，而是不想把时间花在一眼就站不住的地方。比如比起热闹机会，更容易被“能不能落到生活里”这件事打动。`,
    "balanced-core": `这张盘不是只靠一股劲往前冲，而是几层力量一起在推。读这类盘，重点不在一句吉凶，而在先看现在最需要把哪一层想明白。比如同一件事里，会同时想现实安排、关系分寸和自己值不值得。`,
  };

  const actionMap = {
    "rule-aware": `眼下更适合先把“什么值得答应、什么不必硬扛”分清。喜用落在${favorable || "顺势的环境"}，意思不是去补运，而是尽量靠近让心里那把尺能放松、能放心发力的环境。`,
    "steady-system": `这类盘最见效的做法，不是突然翻盘，而是把节奏调稳。眼下这步${currentDaYun ? `${currentDaYun}大运` : "运势"}推到面前的，多半是现实责任和长期位置，所以先把脚下的路铺平，比急着求快更有用。`,
    "sharp-tension": `真正要照顾的，是别让“要求高”变成“什么都先顶着”。这类盘最受用的，不是被催着快一点，而是把标准落到一件具体的事上，先做成一个点，再往外扩。`,
    "output-to-value": `这类盘很适合把想法落到看得见的结果里。比起空想方向，眼下更适合抓一件能出作品、出成绩、出回报的事，把那股劲真正换成现实感。`,
    "guarded-sense": `先别急着逼这张盘马上热起来。真正能让状态松开的，是环境先稳、关系先真、事情先看见边界；一旦确认值得，这张盘反而能投入得很深。`,
    "inner-first": `这类盘最怕被外面的节奏赶着走。眼下更适合先把最卡的一层想清，再决定要不要往前一步；先把心里理顺，比勉强表现得很笃定更有用。`,
    "expression-first": `这类盘真正会舒服，是想法有出口、判断有落点。眼下最该做的，不是压住自己，而是把表达往更具体、更能换来结果的地方放。`,
    "practical-first": `这类盘最有用的安稳，不是口头安慰，而是现实上少一点空耗。与其反复想，不如先把一件最值钱、最能留住成果的事守住。`,
    "balanced-core": `这类盘不用急着一下子看完全部。先挑一件眼下最在意的事慢慢看，往往比一下子求一个总答案更容易看进心里。`,
  };

  const glossary = [];
  if (geju) glossary.push(`格局可以先当成这张盘的做事骨架。像这里的${geju}，说白了不是术语本身厉害，而是它会让人更偏向某一种处事方式。比如有人先看责任，有人先看表达，有人先看值不值得。`);
  if (dominant) glossary.push(`十神可以先当成“最常用的反应模式”。眼下更显眼的是${[dominant, second].filter(Boolean).join("、")}，所以很多选择会自然带着这一层习惯。比如偏印重的人会先想透，食伤重的人会先表达，财星重的人会先看值不值。`);
  if (pattern) glossary.push(`${pattern}不等于好坏，只是在说这张盘此刻是更容易先往前顶，还是更需要外界托一把。`);

  return [baseMap[signature], actionMap[signature], ...glossary].filter(Boolean);
}

function detectDreamTheme(dreamText) {
  const q = dreamText || "";
  if (/考试|试卷|答题|写不完|迟到|老师|上课|作业/.test(q)) {
    return {
      key: "exam",
      label: "考试与评价",
      scene: "这场梦更像在演“怕交不出一份够好的答卷”",
      cue: "常常和评价压力、责任感、怕自己做得不够有关",
      ask: "这会儿最该先看的，不是赢没赢，而是心里那句“必须够好”是不是已经太重了",
    };
  }
  if (/迷路|找不到路|回家|回不去|车站|方向|路口/.test(q)) {
    return {
      key: "lost",
      label: "迷路与回家",
      scene: "这场梦更像在演“人已经在走，但心里还没真正知道要往哪落”",
      cue: "常常和方向感、归属感、现实里有事迟迟没定下来有关",
      ask: "更值得先看的，是哪件事表面在拖，心里其实一直还没真正做决定",
    };
  }
  if (/被追|追赶|逃跑|跑不动|躲|追杀/.test(q)) {
    return {
      key: "chase",
      label: "追赶与逃离",
      scene: "这场梦更像在演“有件事一直在身后追，心里却还没准备好正面看它”",
      cue: "常常和压力感、未完成的决定、一直回避的问题有关",
      ask: "先别急着问这是不是不吉，先看现实里是哪一层事一直在催，却还没真正被面对",
    };
  }
  if (/掉牙|牙齿|流血|断牙/.test(q)) {
    return {
      key: "teeth",
      label: "掉牙与失控",
      scene: "这场梦更像在演“有些东西原本想握住，却开始松动”",
      cue: "常常和失控感、关系边界、面子和自我支撑感有关",
      ask: "更该先看的，是这会儿哪件事让心里最怕失去控制，而不是表面上看起来的小波动",
    };
  }
  if (/水|海|河|洪水|淹|下雨|游泳/.test(q)) {
    return {
      key: "water",
      label: "水与情绪",
      scene: "这场梦更像在演“情绪已经漫上来，只是白天还没完全说出来”",
      cue: "常常和情绪积压、关系起伏、环境变化太快有关",
      ask: "先看情绪是被谁带起来的，再看这份感受到底在提醒什么",
    };
  }
  if (/前任|旧爱|过去的人|老同学|以前喜欢的人/.test(q)) {
    return {
      key: "past-love",
      label: "旧人重现",
      scene: "这场梦更像在演“有一层旧情绪没有完全过去，只是白天不常拿出来看”",
      cue: "常常和旧关系留下的标准、遗憾、比较心有关",
      ask: "更值得先看的，不是旧人会不会回来，而是旧关系到底留下了哪一种还没松开的痕迹",
    };
  }
  if (/已故|去世|过世|奶奶|爷爷|外婆|外公|亲人/.test(q)) {
    return {
      key: "ancestor",
      label: "已故亲人与牵挂",
      scene: "这场梦更像在演“心里有一层牵挂、愧疚或没说完的话，还在轻轻拉着”",
      cue: "常常和思念、告别感、家里的责任和情感线有关",
      ask: "先看最近是不是有一层家里或心里的人情牵挂被重新勾起来了",
    };
  }
  return {
    key: "general",
    label: "梦里反复冒出的情绪",
    scene: "这场梦更像在替心里一层还没说清的感觉找画面",
    cue: "梦不一定在预言什么，更多是在放大白天还没彻底处理掉的那股气",
    ask: "先抓住梦里最刺的一幕和最重的一种感受，真正有用的提醒通常就藏在那里",
  };
}

function buildDreamAnswer(dreamText, formData, result) {
  const theme = detectDreamTheme(dreamText);
  const { dominant, second, signature } = getDominantProfile(result);
  const dominantCombo = [dominant, second].filter(Boolean).join("、");
  const currentDaYun = result.luck?.currentDaYun?.ganzhi || "这步运";
  const annualLead = result.annualCards?.[0]
    ? `${result.annualCards[0].year}年${result.annualCards[0].ganzhi}，先被推到前面的主题偏向“${result.annualCards[0].title}”`
    : "眼下这层引动，还得放回日常节奏里一起看";

  const firstLayerMap = {
    "rule-aware": "这张盘不会先被表面的热闹带走，很多事都会先在心里掂一掂值不值、稳不稳。",
    "steady-system": "这张盘更在意秩序、分寸和能不能长久站住，所以梦里的紧，常常不是一时情绪，而是现实位置没放稳。",
    "sharp-tension": "这张盘心里那把尺很快，梦里出现反复卡住的画面，多半不是没路，而是要求太高、太怕走偏。",
    "output-to-value": "这张盘怕的不是忙，而是忙了半天没有回音，所以梦里的着急，常常也在提醒“这股力气别白费”。",
    "guarded-sense": "这张盘先起的是警觉，梦里越是反复追、反复找，越像在提醒心里有层顾虑一直没真正放下。",
    "inner-first": "这张盘很多感受白天不一定立刻说，梦里反而更容易把那层轻重演出来。",
    "expression-first": "这张盘想法一旦积住，梦里就容易出现赶、追、说不出来或总差一步的画面。",
    "practical-first": "这张盘很看重现实落点，所以梦里的不安，常常不是虚的，而是生活里某件事迟迟没真正落地。",
    "balanced-core": "这张盘的梦，往往不是单一情绪在说话，而是几层心事一起被带了出来。",
  };

  const focusLine = (() => {
    if (/关系|感情|对象|回应|边界/.test(dreamText)) return "这场梦更容易和关系里的回应、边界、安心感连在一起。";
    if (/工作|上班|领导|同事|项目/.test(dreamText)) return "这场梦更容易和现实里的工作评价、责任位置连在一起。";
    if (/钱|花钱|欠钱|账单/.test(dreamText)) return "这场梦更容易和现实里的钱、支出、值不值连在一起。";
    return "";
  })();

  const closeMap = {
    "exam": "今天更值得做的，不是逼自己马上完美，而是把最卡的那一件事拆小一点，先交出一版。",
    "lost": "今天更值得做的，不是急着把所有路都想清，而是先把眼前最该定的一件事定下来。",
    "chase": "今天更值得做的，不是继续躲，而是把那件一直挂着的事写下来，先正面看一眼。",
    "teeth": "今天更值得做的，不是硬撑住面子，而是先看哪件事已经让心里有失控感，再把边界补上。",
    "water": "今天更值得做的，不是压情绪，而是给这股感受一个出口，比如写下来、说出来，或把节奏放慢半拍。",
    "past-love": "今天更值得做的，不是猜旧人会不会回头，而是先看旧关系留下的那套标准，还要不要继续带着走。",
    "ancestor": "今天更值得做的，是把那层牵挂认出来，不必急着压下去，先让心里这股情慢慢落地。",
    "general": "今天更值得做的，是先抓住梦里最刺的一幕，再去看现实里哪件事正在碰那一层情绪。",
  };

  const openingMap = {
    "exam": [
      "梦里赶考，多半不是只在说试卷，更像心里那层“怕来不及、怕做不够”的气已经先起了。",
      "梦见写不完、交不出，常常不是外面真有那么急，而是心里那句“不能出错”已经压得有点紧。",
      "这类梦最像的，不是单单一场考试，而是醒来以后还能感觉到那股“我得撑住”的分量。",
    ],
    "lost": [
      "梦里寻路，常常不是路真断了，而是心里那层去处还没真正定下来。",
      "反复找路、回家、走不出去，这种梦最像是在提醒：人虽往前，心里却还有一处没落稳。",
      "这类梦多半不是外面无路，而是里面那句“我到底该往哪里去”还没停下来。",
    ],
    "chase": [
      "梦里被追，往往不是外面真有凶险，而是心里知道有件事已经不能再往后拖了。",
      "一直跑、一直躲，这股紧多半不是梦里才有，而是白天那层压力已经追到心里来了。",
      "这类梦最像的是：不是身后真有人追，而是里面那件没面对的事，一直没肯停下。",
    ],
    "teeth": [
      "梦见掉牙，未必是在报事，更像心里那层支撑感、控制感有一点发松了。",
      "梦里最刺的，不一定是牙本身，而是那种“稳不住、抓不牢”的感觉已经先冒出来了。",
      "这类梦常常和失控感、体面、边界，或者一层不太肯说出口的心慌连在一起。",
    ],
    "water": [
      "梦里见水，多半不是外面要变，而是心里那层情绪已经先漫上来了。",
      "这类梦最像的是：感受已经动了，只是白天还没真正给它一个出口。",
      "水入梦时，不必先问吉凶，更像心里那股没停下来的情绪在借景现身。",
    ],
    "past-love": [
      "旧人入梦，多半不是旧事要重来，而是心里那层旧标准、旧感受还没真正放下。",
      "梦见前任，往往不是在说对方本身，而是在提醒过去那段关系留下的痕迹还在影响现在。",
      "这类梦最值得看的，不是旧人会不会回来，而是旧情到底还牵着哪一层心。",
    ],
    "ancestor": [
      "梦见已故亲人，不必先往怪处想，更像心里那层牵挂、思念，或者没说完的话被轻轻碰了一下。",
      "这种梦很多时候不是在吓人，而是在把家里的情、心里的挂念慢慢带回眼前。",
      "这类梦最像的是：那份牵挂一直都在，只是平时不常拿出来看。",
    ],
    "general": [
      "梦里有象，不必先惊，它更像在替心里那层说不清的感觉找画面。",
      "很多梦不是在预言什么，而是把白天还没理顺的那股气，用更直白的方式演出来。",
      "这类梦最有用的地方，不是猜象征，而是看它把哪一种感受放大到醒来还放不下。",
    ],
  };

  const chartMap = {
    "rule-aware": [
      "放回这张盘里，这层梦意常常不是一时害怕，而是心里那把尺一直在衡量稳不稳、值不值。",
      "这张盘本来就不肯随便把自己交出去，所以梦里反复出现的，多半也是那层分寸和戒备。",
      "这张盘的梦，常常会把“到底站不站得住”这句心里话先演出来。",
    ],
    "steady-system": [
      "放回这张盘里，这层梦更像在碰现实秩序、责任位置，或者一件迟迟没完全落稳的安排。",
      "这张盘最在意的是稳和次序，所以梦里一乱，常常不是小事，而是现实里有一层安排还没真正站牢。",
      "这张盘的梦，不太像空来的惊吓，更像在提醒哪一层生活秩序开始松了。",
    ],
    "sharp-tension": [
      "放回这张盘里，这个梦更像在碰那股标准太高、心里先紧起来的地方。",
      "这张盘本来就很会先看出不对，所以梦里更容易把“哪里不值、哪里不稳”一下子演得很重。",
      "这张盘的梦，常常不是没答案，而是心里太清楚哪里不能将就。",
    ],
    "output-to-value": [
      "放回这张盘里，这个梦更像在碰“力气到底有没有落到结果上”这件事。",
      "这张盘最怕的是忙了半天没有回音，所以梦里也很容易把“白费”那层焦躁演出来。",
      "这张盘的梦，常常会替心里问一句：这股劲到底有没有用对地方。",
    ],
    "guarded-sense": [
      "放回这张盘里，这个梦更像在碰那层还没放下来的戒备和警觉。",
      "这张盘本来就先起的是防线，所以梦里越紧，越像在提醒心里某层顾虑还没真正松开。",
      "这张盘的梦，很多时候是在告诉人：外面未必真有事，心里那层提防却一直没有退下去。",
    ],
    "inner-first": [
      "放回这张盘里，这个梦更像在替心里那层没说出口的轻重开口。",
      "这张盘很多感受白天不急着讲，梦里反而会把那层真正介意的地方先亮出来。",
      "这张盘的梦，常常不是在新增什么，而是在替心里已经有的感受翻译成画面。",
    ],
    "expression-first": [
      "放回这张盘里，这个梦更像在碰想法太满、话还没找到出口的那一层。",
      "这张盘本来就容易先看到问题，所以梦里也会把那股“想说、想改、想推进”的劲放大。",
      "这张盘的梦，多半和表达、判断、想法卡住之后的闷感有关。",
    ],
    "practical-first": [
      "放回这张盘里，这个梦更像在碰现实里那件迟迟没落地、所以心里一直没真正松下来的事。",
      "这张盘很看重现实着落，所以梦里只要一乱，常常都和生活里的值不值、稳不稳有关。",
      "这张盘的梦，不太会离开现实太远，很多画面最后都能落回一件实际的安排上。",
    ],
    "balanced-core": [
      "放回这张盘里，这个梦更像在提醒眼下不只是一层情绪在动，而是几股心事一起被碰到了。",
      "这张盘的梦，往往不是单一吉凶，而是把状态、关系和现实三层一起轻轻推到眼前。",
      "这张盘里被梦碰到的，多半不是一个点，而是一层正在慢慢成形的心事。",
    ],
  };

  const openingVariants = openingMap[theme.key] || openingMap.general;
  const chartVariants = chartMap[signature] || chartMap.balanced-core;
  const opening = openingVariants[pickVariantIndex(`dream-opening-${theme.key}-${signature}-${dreamText}`, openingVariants.length)];
  const chartLine = chartVariants[pickVariantIndex(`dream-chart-${theme.key}-${signature}-${dreamText}`, chartVariants.length)];

  const poeticLead = (() => {
    const lines = {
      exam: ["梦里赶考，常常赶的不是时辰，而是心里那口不肯松的气。", "纸短梦长，这类梦最怕的不是答不出，而是心里先认定自己不能失手。"] ,
      lost: ["梦里寻路，最深的不是路远，而是心还没有安到该安的地方。", "有些梦一直在找出口，说到底，是心里还有一层去处没定。"] ,
      chase: ["梦里逃得越急，越像心里有一层事已经逼近，却还没肯停下来照一照。", "被追的梦，多半不是外面有急雨，而是里面那句“不能再拖了”终于追上来了。"] ,
      teeth: ["梦见牙落，不必先惊，多半是心里那层支撑感先松了一下。", "这类梦最怕的，不是失去什么，而是那股“稳不住”的感觉先露了头。"] ,
      water: ["梦里见水，常常不是山雨欲来，而是心里的波已经先起了。", "有些情绪白天不说，夜里便借水成形。"] ,
      "past-love": ["旧人入梦，不一定是旧缘要返，更像旧情留下的影子还未完全退净。", "梦见旧人，往往不是人在回来，而是心里那层旧感受还没走远。"] ,
      ancestor: ["故人入梦，多半不是来惊人，更像心里那份牵挂在夜里轻轻回身。", "梦里见到已故亲人，常常不是异事，而是心里的思念终于有了画面。"] ,
      general: ["浮生多梦，梦里最先亮出来的，往往正是白天最不肯直看的那一层。", "梦不必先当成征兆，更像一面水，照出心里最先动的地方。"] ,
    };
    const variants = lines[theme.key] || lines.general;
    return variants[pickVariantIndex(`dream-poetic-${theme.key}-${signature}-${dreamText}`, variants.length)];
  })();

  return [
    `${poeticLead} ${opening} ${theme.scene}。`,
    `${chartLine} ${firstLayerMap[signature] || firstLayerMap["balanced-core"]} 眼下命盘里更显眼的是${dominantCombo || "这组主神"}。${focusLine} ${currentDaYun}这一步也在起作用，${annualLead}。`,
    `${theme.ask}。${closeMap[theme.key] || closeMap.general}`,
  ];
}

function renderDreamThread() {
  if (!dreamThread) return;

  dreamThread.innerHTML = dreamHistory
    .map(
      (item) => `
        <article class="followup-turn">
          <p class="turn-question">梦：${item.question}</p>
          <div class="turn-answer">${item.answer.map((line) => `<p>${line}</p>`).join("")}</div>
        </article>
      `,
    )
    .join("");
}

function renderPillars(pillars) {
  const shenShaGlossary = {
    "天乙贵人": "遇事更容易逢到帮手，难处里常有人拉一把",
    "文昌贵人": "偏学习力、理解力和表达清楚的气",
    "天德贵人": "做事更容易遇到缓冲和转圜，不至于一路顶到底",
    "月德贵人": "人际里更容易逢到善意和体谅，很多事能软着落",
    "桃花": "更偏人缘、吸引力和被注意到的场",
    "驿马": "更偏变动、奔波、迁移和节奏转换",
    "华盖": "更偏独处、学术、审美、精神性和想得深",
    "红鸾": "更偏关系推进、心动和缘分靠近",
    "天喜": "更偏喜庆、人情热度和关系里容易有回应",
  };

  const body = document.getElementById("pillars-body");
  body.innerHTML = pillars
    .map((pillar) => {
      const hidden = pillar.hideGan.length ? pillar.hideGan.join("、") : "-";
      const zhiShen = pillar.shishenZhi.length ? pillar.shishenZhi.join("、") : "-";
      const note = [pillar.nayin, pillar.diShi].filter(Boolean).join(" · ") || "-";
      const shenSha = pillar.shenSha?.length
        ? pillar.shenSha
            .map((name) => `${name}（${shenShaGlossary[name] || "辅助线索"}）`)
            .join("、")
        : "这柱没有特别突出的辅助神煞";
      return `
        <tr>
          <td>${pillar.label}</td>
          <td>${pillar.gan || "-"}</td>
          <td>${pillar.zhi || "-"}</td>
          <td>${pillar.wuxing || "-"}</td>
          <td>${hidden}<br>${pillar.shishenGan || "-"} / ${zhiShen}<br>${note}<br>${shenSha}</td>
        </tr>
      `;
    })
    .join("");
}

function renderShenShaSummary(items = []) {
  const container = document.getElementById("shen-sha-summary");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <article class="shen-sha-card">
        <strong>这一盘神煞不算特别扎眼</strong>
        <p>这不代表不好，只是说明眼下更值得先看格局、十神和大运主轴，神煞这层先当辅助参考就够了。</p>
      </article>
    `;
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="shen-sha-card">
          <div class="shen-sha-head">
            <strong>${item.name}</strong>
            <span>${item.tone || "辅助线索"}</span>
          </div>
          <p>${item.meaning}</p>
          <small>落在：${(item.pillars || []).join("、") || "命盘里"}</small>
        </article>
      `,
    )
    .join("");
}

function renderElements(elements) {
  const container = document.getElementById("elements-chart");
  const maxScore = Math.max(...Object.values(elements), 1);
  container.innerHTML = Object.entries(elements)
    .map(
      ([element, score]) => `
        <div class="element-row">
          <strong>${element}</strong>
          <div class="element-bar"><div class="element-fill" style="width:${(score / maxScore) * 100}%"></div></div>
          <span>${score}</span>
        </div>
      `,
    )
    .join("");
}

function renderTenGods(tenGods) {
  const container = document.getElementById("ten-gods-grid");
  const plainMap = {
    比肩: "更像自己的那股劲，遇事会先按自己的判断来。比如别人催得很急，心里还是会先按自己的节奏过一遍。",
    劫财: "像不服输的那一面，容易自己上手，也容易不想吃亏。比如合作里会更在意边界清不清、分配公不公平。",
    食神: "像把事慢慢做顺的能力，适合稳定输出和长期积累。比如做久一点、磨细一点，反而更容易出成绩。",
    伤官: "像脑子快、表达快、标准也高，不容易被轻易说服。比如听到一句不合理的话，心里会立刻冒出反问。",
    正财: "更像踏实经营出来的钱，讲究稳、值不值、能不能落地。比如比起一时热闹，更在意东西能不能长期留住。",
    偏财: "更像机会和资源，要看眼力，也看节奏感。比如同样一件事，有时就是会更早闻到机会的味道。",
    正官: "更像规则、责任、位置，很多事会先看能不能站住。比如做决定时会自然先想后果和分寸。",
    七杀: "更像压力和推动力，逼着人尽快长出判断。比如事情一来，反而会先把自己逼到一个更能扛的位置。",
    正印: "更像被托住、被理解、被系统接住的力量。比如遇到合适的人或环境，状态会明显稳下来。",
    偏印: "更像先想透、先防风险、先看值不值得。比如还没答应之前，心里已经把最坏情况演练一遍。"
  };
  container.innerHTML = tenGods.dominant
    .map(
      (item, index) => `
        <article class="ten-god-chip">
          <span>${index === 0 ? "当前最强" : "命盘主题"}</span>
          <strong>${item.name}</strong>
          <span>${item.keyword}</span>
          <small>${plainMap[item.name] || item.relation}</small>
        </article>
      `,
    )
    .join("");
}

function renderAnnualCards(cards) {
  const container = document.getElementById("annual-cards");
  container.innerHTML = cards
    .map(
      (card) => `
        <article class="annual-card">
          <div class="annual-year">
            <strong>${card.year}</strong>
            <span>${card.ganzhi}</span>
          </div>
          <div class="meta-pill">
            <span>流年十神</span>
            <strong>${card.tenGod}</strong>
          </div>
          <h5>${card.title}</h5>
          <p>${card.summary}</p>
        </article>
      `,
    )
    .join("");
}

function renderTimeInsight(timeInsight) {
  document.getElementById("time-mode-label").textContent = timeInsight.label;
  document.getElementById("time-mode-summary").textContent = timeInsight.summary;
  document.getElementById("time-mode-prompt").textContent = timeInsight.prompt;

  const container = document.getElementById("time-candidates");
  if (!timeInsight.candidates.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = timeInsight.candidates
    .map(
      (item) => `
        <article class="ten-god-chip">
          <span>候选时柱</span>
          <strong>${item.pillar}</strong>
          <small>${item.note}</small>
        </article>
      `,
    )
    .join("");
}

function buildFollowupSuggestions(formData, result) {
  const suggestions = [];
  const focus = formData.focus || "overall";
  const { dominant, second, geju, pattern, signature } = getDominantProfile(result);
  const exactTime = result.meta?.timeExact;

  const pushMany = (...items) => {
    items.filter(Boolean).forEach((item) => suggestions.push(item));
  };

  if (focus === "relationship") {
    if (signature === "guarded-sense" || dominant.includes("印")) {
      pushMany("这张盘在关系里最怕的，不是冷淡，而是心里一直没法真正放心，问题会卡在哪一层？");
      pushMany("如果关系要走长一点，这张盘最需要对方先给出的东西是什么？");
    } else if (dominant.includes("官") || dominant.includes("杀")) {
      pushMany("感情这件事放进这张盘里，真正挑人的标准会落在哪三件事上？");
      pushMany("未来两年关系里最该先防的是不合适，还是太容易把责任先扛起来？");
    } else {
      pushMany("这张盘在关系里最怕哪一种落空：没人回应，还是回应不够真？");
      pushMany("未来两年感情里最该先看清的一个点是什么？");
    }
  } else if (focus === "career") {
    if (signature === "steady-system" || dominant.includes("官")) {
      pushMany("这张盘眼下更适合先守住位置，还是把自己往更高标准的地方放？");
      pushMany("工作里最容易被低估的，其实是哪一层能力？");
    } else if (signature === "expression-first" || dominant.includes("伤") || dominant.includes("食")) {
      pushMany("这张盘的判断和表达，最该落到哪一类工作场景才不算白费？");
      pushMany("接下来两年，事业上最值得主动争取的是位置、作品，还是话语权？");
    } else {
      pushMany("这张盘眼下更适合稳住位置，还是顺势换到新的轨道？");
      pushMany("未来两年工作里最该避开的消耗点是什么？");
    }
  } else if (focus === "finance") {
    if (dominant.includes("财")) {
      pushMany("这张盘的钱更容易长在能力兑现、位置提升，还是机会判断上？");
      pushMany("接下来这几年，最该先守住的是现金流、开销边界，还是别替别人兜底？");
    } else {
      pushMany("这张盘的财更像靠位置、能力，还是靠节奏抓机会？");
      pushMany("未来两年最该守住的钱，是收入、开销，还是错误投入？");
    }
  } else {
    if (signature === "rule-aware") {
      pushMany("这张盘眼下最该先看清的，不是输赢，而是哪一层规则其实已经在催着做决定？");
      pushMany("现在这步运把什么事情推到台前：责任、位置，还是关系里的边界？");
    } else if (signature === "output-to-value") {
      pushMany("这张盘眼下最值得先抓住的，是哪一层能真正换来结果的机会？");
      pushMany("现在这步运推到眼前的，究竟是表达、作品，还是现实回报？");
    } else {
      pushMany("这张盘眼下最该先看清的一层主题是什么？");
      pushMany("现在这步运，真正被推到眼前的事情是哪一类？");
    }
  }

  if (result.timeInsight.mode !== "manual-bazi" && !exactTime) {
    pushMany("如果出生时间只知道大概时段，先看哪些共性最不会跑掉？");
  }

  if (geju.includes("官") || dominant.includes("官") || dominant.includes("杀")) {
    pushMany("这张盘为什么总会被责任、标准和体面感推着走？");
  }

  if (dominant.includes("印") || second.includes("印")) {
    pushMany("这张盘为什么很多时候想得比说得快，也更习惯先想明白？");
  }

  if (dominant.includes("财") || second.includes("财")) {
    pushMany("这张盘的钱最容易花在什么地方，又最容易漏在哪里？");
  }

  if (dominant.includes("食") || dominant.includes("伤") || second.includes("食") || second.includes("伤")) {
    pushMany("这张盘的想法和表达，最该落到什么地方才不算白费？");
  }

  if (pattern.includes("偏弱")) {
    pushMany("这张盘最需要什么样的环境，状态才会慢慢松开？");
  } else if (pattern.includes("偏旺")) {
    pushMany("这张盘眼下最该放下的，是哪一种太用力？");
  }

  return Array.from(new Set(suggestions)).slice(0, 4);
}

function renderFollowupSuggestions(formData, result) {
  if (!followupSuggestions) return;

  const suggestions = buildFollowupSuggestions(formData, result);
  followupSuggestions.innerHTML = suggestions
    .map(
      (question) => `
        <button type="button" class="followup-chip" data-followup-question="${question}">
          ${question}
        </button>
      `,
    )
    .join("");

  followupSuggestions.querySelectorAll(".followup-chip").forEach((button) => {
    button.addEventListener("click", () => {
      if (followupInput) {
        followupInput.value = button.dataset.followupQuestion || "";
        followupInput.focus();
      }
    });
  });
}

function buildFollowupAnswer(question, formData, result) {
  const q = question || "";
  const geju = result.geju.label || "";
  const pattern = result.dayMaster.pattern || "";
  const dominantTenGod = result.tenGods.dominant[0]?.name || "";
  const secondTenGod = result.tenGods.dominant[1]?.name || "";
  const currentDaYun = result.luck.currentDaYun
    ? `${result.luck.currentDaYun.ganzhi}（${result.luck.currentDaYun.startYear}-${result.luck.currentDaYun.endYear}）`
    : "眼下这步运";
  const annualLead = result.annualCards[0]
    ? `${result.annualCards[0].year}年是${result.annualCards[0].ganzhi}，先被推到前面的主题更像“${result.annualCards[0].title}”。`
    : "流年这层，还要顺着当前大运再往下细看。";
  const fiscalLead = result.annualCards[1]
    ? `${result.annualCards[1].year}年前后，钱和现实安排这层会更容易被碰到。`
    : "财和现实安排这层，还是要顺着当前大运慢慢看。";
  const dominantCombo = [dominantTenGod, secondTenGod].filter(Boolean).join("、");
  const relationshipHit = /感情|关系|喜欢|桃花|对象|婚|亲密|相处|恋爱/.test(q);
  const careerHit = /工作|事业|岗位|升职|职业|跳槽|换工作|公司|发展/.test(q);
  const financeHit = /财|钱|收入|副业|赚钱|存款|开销|花销|投资|负债/.test(q);
  const timeHit = /时辰|出生时间|时段|几点|校准|模糊时间|晚上|早上|中午|下午/.test(q);
  const expressionHit = /想法|表达|说出来|输出|落到什么地方|不算白费|判断/.test(q);
  const themeHit = /主题|先看清|先看什么|主轴|底色|核心/.test(q);
  const burnoutHit = /内耗|发紧|消耗|累|撑着|太用力|为什么这么累/.test(q);
  const securityHit = /安全感|被看见|需求|回应|确定感|什么关系适合/.test(q);
  const changeHit = /变化|未来两年|未来三年|接下来|变化重心|会发生什么/.test(q);

  const relationshipNeed = (() => {
    if (dominantTenGod.includes("印")) return "确定感和稳定回应";
    if (dominantTenGod.includes("官") || dominantTenGod.includes("杀")) return "责任感和长期匹配";
    if (dominantTenGod.includes("财")) return "现实可靠和能一起过日子的感觉";
    if (dominantTenGod.includes("食") || dominantTenGod.includes("伤")) return "表达顺不顺、相处有没有压抑";
    return "真实回应和相处后的安心感";
  })();

  const careerAxis = (() => {
    if (geju.includes("官") && dominantTenGod.includes("印")) return "规则、位置、长期抬升";
    if (geju.includes("官") && (dominantTenGod.includes("食") || dominantTenGod.includes("伤"))) return "标准之下的表达、判断和执行";
    if (dominantTenGod.includes("财")) return "资源、兑现效率和结果感";
    if (dominantTenGod.includes("食") || dominantTenGod.includes("伤")) return "输出、方案、项目推进";
    return "把能力放进能积累的位置";
  })();

  const financeAxis = (() => {
    if (dominantTenGod.includes("财")) return "收入机会并不算少，关键在守不守得住";
    if (dominantTenGod.includes("印")) return "钱更像跟着专业、位置和稳定性走";
    if (dominantTenGod.includes("官") || dominantTenGod.includes("杀")) return "财更容易从责任、位置和长期安排里慢慢长出来";
    if (dominantTenGod.includes("食") || dominantTenGod.includes("伤")) return "财路更像靠输出、效率和把点子变成结果";
    return "财不是凭空来的，还是要靠节奏和位置慢慢累起来";
  })();

  const patternLine = pattern.includes("偏弱")
    ? "这张盘眼下不是没力气，而是更怕位置不对、环境太耗。"
    : pattern.includes("偏旺")
      ? "这张盘底子并不虚，很多时候真正难的不是扛不住，而是太容易自己先顶上去。"
      : "这张盘不是一下子往外冒的路子，更讲究顺着节奏把力气放对地方。";

  if (relationshipHit) {
    const opener = "感情这类问题，先不急着问成会不会在一起，还是先看关系里真正卡住的那一层。";
    const structure = `先看日主，这张盘目前是${pattern}；再看十神，眼下更显眼的是${dominantCombo || "当前这组主神"}，所以关系里最看重的不是表面的热闹，而是${relationshipNeed}。`;
    const timing = geju.includes("官")
      ? `${currentDaYun}这一步，本来就会把关系里的责任、承诺和现实匹配推到前面。${annualLead}`
      : `${currentDaYun}这一步，更像在筛一筛什么人和什么相处方式真的能留下来。${annualLead}`;
    const close = dominantTenGod.includes("印")
      ? "真要继续往下看，最值得细问的不是有没有人出现，而是遇到关系时，哪一种回应最能让这张盘放下戒备。"
      : dominantTenGod.includes("官") || dominantTenGod.includes("杀")
        ? "真要继续往下看，最值得细问的不是桃花多不多，而是长期关系里最怕遇到哪一种不负责。"
        : "真要继续往下看，可以把问题收窄到一段关系里最容易反复的那一个点，这样会更准。";
    return `${opener} ${structure} ${patternLine} ${timing} ${close}`;
  }

  if (careerHit) {
    const opener = "事业这类问题，先不急着看成赢没赢，还是先看这张盘最适合把力气放进哪一类位置。";
    const structure = `先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以职业主轴更偏向${careerAxis}。`;
    const timing = geju.includes("官")
      ? `${currentDaYun}这一步，事业上更容易遇到位置、标准、责任同时压上来的情况。${annualLead}`
      : `${currentDaYun}这一步，更像是在看原先那套做事方式还能不能继续往上走。${annualLead}`;
    const close = dominantTenGod.includes("食") || dominantTenGod.includes("伤")
      ? "真要继续细看，下一步最值得问的是：这张盘适合自己去带节奏，还是更适合在一个成熟系统里把判断放大。"
      : dominantTenGod.includes("印")
        ? "真要继续细看，下一步最值得问的是：哪一种平台最能让这张盘的长期价值慢慢抬起来。"
        : "真要继续细看，可以直接收窄到换工作、升职、转岗三选一，这样读出来会更有落点。";
    return `${opener} ${structure} ${patternLine} ${timing} ${close}`;
  }

  if (financeHit) {
    const opener = "财运这类问题，先不急着问会不会一下子见钱，还是先看这张盘的钱是从哪条路慢慢出来的。";
    const structure = `先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以财这层更像在看${financeAxis}。`;
    const timing = dominantTenGod.includes("财")
      ? `${currentDaYun}这一步，钱的进出会更容易跟着机会和判断一起放大。${fiscalLead}`
      : dominantTenGod.includes("印")
        ? `${currentDaYun}这一步，钱更像跟着位置、稳定性和长期积累慢慢走。${fiscalLead}`
        : `${currentDaYun}这一步，财这层不会离开现实安排单独发生。${fiscalLead}`;
    const close = dominantTenGod.includes("财")
      ? "真要继续细看，下一步最值得问的是：这张盘的钱更容易漏在冲动决定，还是漏在替别人兜底。"
      : dominantTenGod.includes("官") || dominantTenGod.includes("杀")
        ? "真要继续细看，下一步最值得问的是：收入增长更靠位置升级，还是靠额外加码。"
        : "真要继续细看，可以直接问未来两年最该守住哪一笔钱，这样会更有用。";
    return `${opener} ${structure} ${patternLine} ${timing} ${close}`;
  }

  if (timeHit) {
    const opener = "时辰这类问题，先看时柱会不会改掉主轴，再看它主要会把哪一层细节拉开。";
    const structure = result.timeInsight.mode !== "manual-bazi" && !result.meta.timeExact
      ? "年、月、日三柱已经能先读出这张盘的大方向，所以共性的部分不会完全跑掉。真正会被时柱拉开差别的，多半是亲密关系的表达方式、晚一点的人生节奏，以及某些事情落下来的时点。"
      : "现在给到的是较明确的时柱，所以主轴已经比较稳。再做校准时，重点不是推翻整张盘，而是看某些细节是不是更贴近日常经历。";
    const timing = result.timeInsight.prompt || "如果继续细看，最好把时间先缩到更小范围，再顺着时柱差异对照实际经历。";
    const close = dominantTenGod.includes("印")
      ? "这类盘做时辰校准，最有用的往往不是问吉凶，而是对照自己到底更像早一点打开，还是更习惯晚一点才真正交底。"
      : dominantTenGod.includes("官") || dominantTenGod.includes("杀")
        ? "这类盘做时辰校准，最值得对照的是责任感、关系节奏和晚运发力点到底落在哪一侧。"
        : "这类盘做时辰校准，最适合从一两件已经发生过的事回头比，看哪一种时柱更贴。";
    return `${opener} ${structure} ${timing} ${close}`;
  }

  const opener = geju.includes("官")
    ? "这类问题，还是先回到命盘本身，看哪一层秩序感和责任感最重。"
    : geju.includes("伤") || geju.includes("食")
      ? "这类问题，还是先回到命盘本身，看哪一层想法、表达和判断最强。"
      : "这类问题，还是先回到命盘本身，看眼下真正被推到前面的主题是什么。";
  if (themeHit) {
    const structure = `先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以真正被推到前面的，不是单一一件事，而是一层做事方式和人生重心。`;
    const timing = `${currentDaYun}这一步，本来就在慢慢把一层主题推到台前。${annualLead}`;
    const close = dominantTenGod.includes("印")
      ? "顺着这张盘看，眼下最该先看清的，其实是哪些选择会让心里更定，哪些会让那杆秤越压越紧。"
      : dominantTenGod.includes("食") || dominantTenGod.includes("伤")
        ? "顺着这张盘看，眼下最该先看清的，是判断和表达该落在哪个方向，才不会一直空转。"
        : "顺着这张盘看，眼下最该先看清的，是哪一层现实安排正在决定后面的节奏。";
    return `${opener} ${structure} ${patternLine} ${timing} ${close}`;
  }

  if (expressionHit) {
    const expressionAxis = dominantTenGod.includes("食") || dominantTenGod.includes("伤")
      ? "表达、判断和输出本来就是这张盘较强的一面"
      : dominantTenGod.includes("印")
        ? "这张盘先强的是理解和判断，表达往往慢半步"
        : "这张盘的表达不是没有，而是更挑场合和对象";
    const timing = dominantTenGod.includes("食") || dominantTenGod.includes("伤")
      ? "所以最不算白费的地方，往往不是只停在想明白，而是把想法落进能产生成果的位置。"
      : dominantTenGod.includes("印")
        ? "所以真正适合的，不是被催着立刻说很多，而是在有空间、有秩序的环境里把判断慢慢讲透。"
        : "所以最适合这张盘的，不是硬着头皮到处表态，而是在能接住分寸和质量的地方开口。";
    const close = dominantTenGod.includes("食") || dominantTenGod.includes("伤")
      ? "更细一点地问，可以直接落到工作、关系或合作场景里，看哪一种输出最能换来结果。"
      : "如果继续往下问，最值得收窄到一个具体场景：工作里说、关系里说，还是该先写下来再说。";
    return `这类问题，重点就在命盘里那股“想明白之后，力气该往哪用”的地方。先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼。${expressionAxis} ${timing} ${close}`;
  }

  if (burnoutHit) {
    const burnoutAxis = dominantElement === "土"
      ? "很多累，不是事情已经坏了，而是心里先把责任和后果都扛上来了。"
      : dominantElement === "水"
        ? "很多累，不在外面，而在心里一直转，想停又停不下来。"
        : dominantTenGod.includes("印")
          ? "很多累，来自那杆秤一直在衡量稳不稳、值不值。"
          : "很多累，不是没能力，而是容易先把自己顶上去。";
    const timing = `${currentDaYun}这一步，会把这一层感觉放大。${annualLead}`;
    const close = "真要顺着这张盘继续看，最值得问的不是还要不要继续扛，而是哪一种环境能先把这口气放下来。";
    return `内耗这类问题，不能只看事情多不多，还是要看命盘最容易发紧的地方在哪里。先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼。${burnoutAxis} ${timing} ${close}`;
  }

  if (securityHit) {
    const timing = `${currentDaYun}这一步，也会把关系里的需求感和回应感放得更明显。${annualLead}`;
    const close = dominantTenGod.includes("印")
      ? "所以这张盘真正要的，不是表面热情，而是能让戒备慢慢放下来的回应。"
      : dominantTenGod.includes("官") || dominantTenGod.includes("杀")
        ? "所以这张盘真正要的，不是嘴上承诺，而是责任感和稳定度能不能落到日常里。"
        : "所以这张盘真正要的，不是一时上头，而是相处下来能不能不消耗。";
    return `这类问题，要先回到关系本身在命盘里是怎么落的。先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以关系里真正要紧的，不是热闹，而是${relationshipNeed}。 ${timing} ${close}`;
  }

  if (changeHit) {
    const close = currentDaYun
      ? `${currentDaYun}这一步已经在起作用，所以变化不会只是表面换一件事，更像是把原先拖着没定的部分慢慢逼出来。`
      : "这类变化更多还是顺着大方向慢慢显出来，不是一夜之间翻盘。";
    return `问未来变化，最怕把所有东西揉成一句好不好。先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以未来两三年的变化重心，多半还是围着这组力量在转。${result.analysis.changeArea} ${close}`;
  }

  const structure = `先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以很多事都不是只看顺不顺，而是看这件事会把状态带向更稳，还是更紧。`;
  const timing = `${currentDaYun}这一步，本来就在慢慢把一层主题推到台前。${annualLead}`;
  const close = dominantTenGod.includes("印")
    ? "如果继续往下问，最好把问题收窄到一个场景里，这张盘会在细节里更容易读出分寸。"
    : dominantTenGod.includes("财")
      ? "如果继续往下问，最好把问题收窄到现实选择里，这张盘在具体取舍上更容易读出差别。"
      : "如果继续往下问，最好把时间或场景收窄一点，这样会比宽泛地问一句好不好更经得起看。";
  return `${opener} ${structure} ${patternLine} ${timing} ${close}`;
}

function buildFollowupAnswerV2(question, formData, result) {
  const q = (question || "").trim();
  const geju = result.geju?.label || "";
  const pattern = result.dayMaster?.pattern || "";
  const dominantTenGod = result.tenGods?.dominant?.[0]?.name || "";
  const secondTenGod = result.tenGods?.dominant?.[1]?.name || "";
  const dominantElement = result.theme?.dominantElement || "";
  const currentDaYun = result.luck?.currentDaYun;
  const currentDaYunText = currentDaYun
    ? `${currentDaYun.ganzhi}（${currentDaYun.startYear}-${currentDaYun.endYear}）`
    : "眼下这步运还在慢慢起势";
  const annualLead = result.annualCards?.[0]
    ? `${result.annualCards[0].year}年${result.annualCards[0].ganzhi}，先被推到前面的主题更像“${result.annualCards[0].title}”`
    : "这两年的引动，还得放回日常处境里一起看";
  const nextLead = result.annualCards?.[1]
    ? `${result.annualCards[1].year}年${result.annualCards[1].ganzhi}，下一层变化会更明显`
    : "后面的变化，还得再看下一步流年怎么接";
  const dominantCombo = [dominantTenGod, secondTenGod].filter(Boolean).join("、");

  const hits = {
    relationship: /感情|关系|恋爱|婚|对象|伴侣|桃花|喜欢|暧昧|相处/.test(q),
    career: /事业|工作|职业|岗位|升职|跳槽|转行|项目|发展|职场/.test(q),
    finance: /财|钱|收入|赚钱|存钱|副业|投资|回报|开销/.test(q),
    time: /时辰|出生时间|几点|时段|校准|早上|中午|下午|晚上/.test(q),
    theme: /主题|主轴|底色|先看什么|重点|第一层|眼下最该/.test(q),
    expression: /表达|说话|想法|输出|写|讲|说得快|落到什么地方/.test(q),
    burnout: /内耗|累|消耗|发紧|焦虑|绷着|扛|压力/.test(q),
    security: /安全感|被看见|回应|需求|稳定|确定感|靠不靠谱/.test(q),
    change: /未来|变化|接下来|两三年|明后年|转变|会不会变/.test(q),
  };
  const relationFearHit = hits.relationship && /最怕|不敢|放心|放不下|卡在|心里一直没法真正放心|不安/.test(q);
  const relationNeedHit = hits.relationship && /最需要|先给出|给出的东西|给什么|要什么|需要什么/.test(q);
  const relationBoundaryHit = hits.relationship && /边界|回应|确定感|稳定|靠不靠谱|回不回应/.test(q);
  const careerPositionHit = hits.career && /位置|岗位|适合|哪类工作|什么工作|放在哪|方向|路径/.test(q);
  const careerChangeHit = hits.career && /换|跳槽|转行|变化|守住|主动|争取/.test(q);
  const careerStrengthHit = hits.career && /能力|长处|被低估|优势|最值钱/.test(q);
  const financeSourceHit = hits.finance && /怎么来|从哪来|财路|靠什么赚钱|收入从哪里/.test(q);
  const financeLeakHit = hits.finance && /漏|花在|花销|开销|守住|留住|不该花/.test(q);
  const financeRhythmHit = hits.finance && /快慢|节奏|阶段性|慢慢累|发力/.test(q);
  const timeCommonHit = hits.time && /共性|不会跑掉|不变|先看哪些/.test(q);
  const timeDiffHit = hits.time && /改动|差异|拉开|细节|晚运|事情落点|关系表达/.test(q);
  const timeCalibrationHit = hits.time && /校准|猜准|更准|判断时辰|哪个时段/.test(q);

  const hasAny = (...keywords) =>
    keywords.some((keyword) => dominantCombo.includes(keyword) || geju.includes(keyword));

  function chartSignature() {
    if (geju === "正官格" && hasAny("偏印", "正官")) return "rule-aware";
    if (geju === "正官格" && hasAny("正印", "正官")) return "steady-system";
    if (hasAny("伤官") && hasAny("七杀")) return "sharp-tension";
    if (hasAny("食神") && hasAny("正财", "偏财")) return "output-to-value";
    if (hasAny("偏印") && hasAny("七杀")) return "guarded-sense";
    if (hasAny("偏印", "正印")) return "inner-first";
    if (hasAny("伤官", "食神")) return "expression-first";
    if (hasAny("正财", "偏财")) return "practical-first";
    return "balanced-core";
  }

  const signature = chartSignature();

  function baseTone() {
    const index = variantIndex(`base-${signature}`);
    if (signature === "rule-aware") {
      const variants = [
        "这张盘的劲，不是冲在外面，而是心里一直有分寸，很多事都要先过一遍值不值、稳不稳。",
        "这张盘看着未必张扬，但心里有自己的尺，所以很多事不会随手就接，也不会轻易就信。",
        "这张盘真正硬的地方，不在表面态度，而在心里那套标准一直都在，事情站不住，就很难真的放心往前走。",
      ];
      return variants[index];
    }
    if (signature === "steady-system") {
      const variants = [
        "这张盘偏稳，很多判断天然会落到次序、责任和能不能长久站住上。",
        "这张盘不是靠一时情绪走的路子，很多决定都会先想到后面能不能安稳落地。",
        "这张盘最明显的底色，是凡事先看完整不完整、靠不靠得住，所以很少真的轻飘飘地下决定。",
      ];
      return variants[index];
    }
    if (signature === "sharp-tension") {
      const variants = [
        "这张盘有劲，而且是那种心里先有判断的劲，所以很多事不是做不到，而是很难将就。",
        "这张盘的锋芒不一定摆在脸上，但里面那股标准很快，很多问题一眼就能看出不对。",
        "这张盘最难受的时候，往往不是没路，而是心里太清楚哪里不值得，哪里不能乱来。",
      ];
      return variants[index];
    }
    if (signature === "output-to-value") {
      const variants = [
        "这张盘不是闷着走的路子，很多机会都长在表达、输出和把事慢慢做成的过程里。",
        "这张盘的力气更像往外走，越是能把想法落成结果，状态越会亮起来。",
        "这张盘最怕的不是忙，而是忙了半天没有回音，所以很在意做出去的东西到底有没有用。",
      ];
      return variants[index];
    }
    if (signature === "guarded-sense") {
      const variants = [
        "这张盘表面安静，里面的防线却很清楚，很多时候不是慢，而是先确认值不值得把自己放进去。",
        "这张盘不会轻易把心交出去，先看风险、先看后果，是很自然的一层自保。",
        "这张盘最先冒出来的，不是冲劲，而是警觉，所以很多决定都要先确认局面靠不靠得住。",
      ];
      return variants[index];
    }
    if (signature === "inner-first") {
      const variants = [
        "这张盘更像先在心里想明白，再往前走，很多答案都不是当场冒出来的，而是慢慢沉出来的。",
        "这张盘的判断偏往里收，很多时候外面看着安静，里面其实已经把轻重分过一轮了。",
        "这张盘不太会一边走一边乱试，心里得先有个底，人才会真正动起来。",
      ];
      return variants[index];
    }
    if (signature === "expression-first") {
      const variants = [
        "这张盘藏不住想法，很多力量都落在表达、判断和输出上，关键是怎么让这股气不白白耗掉。",
        "这张盘最亮的地方，往往是脑子转得快，也看得出问题，所以很多事很难真心敷衍过去。",
        "这张盘不是没话，而是得找到对的地方说，找到对的方式用，不然很容易自己先闷住。",
      ];
      return variants[index];
    }
    if (signature === "practical-first") {
      const variants = [
        "这张盘更讲实际，很多决定都会回到值不值、稳不稳、最后能不能真正落地。",
        "这张盘看事情很少只凭感觉，更多会先掂量投入和结果能不能对得上。",
        "这张盘最看重的，往往不是漂亮话，而是这件事最后到底能不能接住现实。",
      ];
      return variants[index];
    }
    const variants = [
      "这张盘不算轻飘，很多问题都得回到日主、十神和正在走的运上，才能看清轻重。",
      "这张盘不是一句顺不顺就能讲完，真正的差别常常藏在这会儿哪股气先冒头。",
      "这张盘看事情，重点不在表面热闹，而在眼下到底是哪层力量先站到了前面。",
    ];
    return variants[index];
  }

  function driveTone() {
    const index = variantIndex(`drive-${pattern}`);
    if (pattern.includes("偏旺")) {
      const variants = [
        "日主偏旺，很多时候真正难的不是扛不住，而是太容易先自己顶上去。",
        "这张盘偏旺时，问题往往不在没劲，而在太容易先把事情都揽到自己身上。",
        "日主偏旺这层，说明很多事不是做不了，而是很容易先用力过头。",
      ];
      return variants[index];
    }
    if (pattern.includes("偏弱")) {
      const variants = [
        "日主偏弱，环境和回应给不给力，对状态影响会更直接。",
        "这张盘偏弱时，外面的风向一变，心里感受到的起伏也会更明显。",
        "日主偏弱这层，不是在说没主见，而是在说环境一冷一热，状态会更容易被带动。",
      ];
      return variants[index];
    }
    const variants = [
      "日主不走极端，所以很多事不是单看强弱，而是看哪股气先冒头。",
      "这张盘不偏到一头去，很多问题最后都要看这会儿是哪股力量先站到前面。",
      "日主中和时，很多答案不在绝对强弱里，而在眼下到底是哪层气先起作用。",
    ];
    return variants[index];
  }

  function themeTone() {
    const index = variantIndex(`theme-${dominantCombo}-${dominantElement}`);
    if (hasAny("伤官")) {
      const variants = [
        "眼下更显眼的一层，是想法、判断和表达。很多事不能只看顺不顺，还得看这件事会不会把心里的那股劲带偏。",
        "这会儿最先冒出来的，多半是判断和表达这层，所以很多问题不是没有答案，而是心里那句“值不值得”先跑出来了。",
        "盘里先亮出来的，是想法和表达，所以眼前很多事都要看：这股劲到底是在开路，还是在把自己越想越紧。",
      ];
      return variants[index];
    }
    if (hasAny("偏印", "正印")) {
      const variants = [
        "眼下更显眼的一层，是先想明白、先分轻重。很多答案都不是立刻出来的，而是慢慢沉出来的。",
        "这会儿最先起作用的，不是马上行动，而是心里先把轻重分出来，所以很多决定会显得慢半拍，其实是在稳。",
        "盘里先冒出来的，是判断和分寸这层，所以越是重要的事，越不会一下子就下结论。",
      ];
      return variants[index];
    }
    if (hasAny("正官", "七杀")) {
      const variants = [
        "眼下更显眼的一层，是责任、标准和位置。很多事最后都会落到一句：这件事能不能站住。",
        "这会儿最先被推到前面的，多半是责任和位置，所以很多问题最后都会变成“这样走稳不稳”。",
        "盘里先亮出来的，是标准和担当这层，所以这段时间很多选择都绕不开一句：到底站不站得住。",
      ];
      return variants[index];
    }
    if (hasAny("正财", "偏财")) {
      const variants = [
        "眼下更显眼的一层，是交换、回报和现实落点。值不值、换不换得来，心里其实一直在掂量。",
        "这会儿更显眼的，是现实结果和投入产出，所以很多事最后都会回到值不值、划不划算。",
        "盘里先被推出来的，是现实落点这层，所以与其空想，不如先看这一步到底能不能换来真东西。",
      ];
      return variants[index];
    }
    if (dominantElement === "土") {
      const variants = [
        "眼下更显眼的一层，是稳住自己再谈下一步。很多事不是没有路，而是不能乱走。",
        "这会儿先冒到前面的，是稳和定，所以眼前很多事与其急着动，不如先站稳再说。",
        "盘里更重的，是把自己放稳这层，所以很多问题不是没办法，而是不能太急着乱选。",
      ];
      return variants[index];
    }
    const variants = [
      "眼下更显眼的一层，是状态和节奏。先看哪股气最重，问题自然就不会问偏。",
      "这会儿真正站到前面的，是状态和节奏这一层，所以先把这股气认出来，比先定结论更重要。",
      "先被推出来的，不一定是外面的事，而常常是里面那层节奏感，所以很多答案得先看状态往哪边走。",
    ];
    return variants[index];
  }

  function timingTone() {
    const index = variantIndex(`timing-${currentDaYunText}-${annualLead}`);
    const variants = [
      `现在走的是 ${currentDaYunText}。${annualLead}，所以眼前的问题不是孤零零的一件，而是这步运本来就在把某层主题慢慢推出来。`,
      `${currentDaYunText} 这一步已经在起作用，${annualLead}，所以眼前这件事不是突然冒出来的，而是原本就在被往前推。`,
      `放回运势里看，眼下走的是 ${currentDaYunText}。${annualLead}，所以这会儿碰到的问题，更像是这步运迟早要你看见的一层。`,
    ];
    return variants[index];
  }

  function relationRead(kind) {
    const index = variantIndex(`relation-read-${kind}`);
    const map = {
      fear: [
        "真正让这张盘迟迟放不下心的，往往不是对方冷不冷，而是心里一直拿不准这段关系到底靠不靠得住。",
        "这层不安通常不是没有感觉，而是感觉有了以后，心里那句“靠不靠得住”一直没被安稳回答。",
        "关系里最磨人的，常常不是没有靠近，而是想再往前一步时，心里总还有一层顾虑压着。",
      ],
      need: [
        "如果关系要走长一点，这张盘真正先要的，不是热闹和上头，而是一种“我可以慢慢把心放下来”的确定感。",
        "这张盘在关系里更看重的，不是一时热烈，而是那种相处久了心会越来越稳的感觉。",
        "能让这张盘慢慢安下来的，从来不是几句好听话，而是回应稳、节奏稳、说出口的事也能落进日常。",
      ],
      boundary: [
        "这张盘看关系，先看的不是谁更会表达，而是谁能把回应和边界做得清楚。",
        "边界这件事落到这张盘上，不是在把人推远，而是在让心里知道哪些地方是真的能信。",
        "对这张盘来说，回应和边界不是小题大做，而是关系能不能往下走的地基。",
      ],
      default: [
        "放到关系里看，先看的不是一时热度，而是这段关系最后会不会落到确定感上。",
        "关系这件事放进这张盘里，重点从来不是谁先热起来，而是谁能让心里慢慢稳下来。",
        "这张盘问感情，最值得先看的，不是开始有多快，而是走下去以后心里会不会越来越安。",
      ],
    };
    return (map[kind] || map.default)[index];
  }

  function careerRead(kind) {
    const index = variantIndex(`career-read-${kind}`);
    const map = {
      position: [
        "这张盘放到事业里，最重要的不是哪里听起来体面，而是哪里真的接得住这股气。",
        "工作位置合不合适，不是看外面怎么说，而是看这类位置会不会越做越顺，还是越做越拧。",
        "这张盘挑位置，怕的不是辛苦，而是力气明明有，却一直放错地方。",
      ],
      change: [
        "问换不换，不是先看动不动，而是先看这一步变化会不会把人带到更顺的轨道上。",
        "守还是变，关键不在表面得失，而在这次调整之后，状态会不会更稳，力气会不会更集中。",
        "这类问题最怕只看一时利弊，更该看换过去之后，是路更开，还是消耗更重。",
      ],
      strength: [
        "这张盘最值钱的地方，常常不是最显眼的那一项，而是做久了别人会越来越离不开的那一层能力。",
        "有些长处不是一下子被看见的，而是在复杂的事里越做越显，所以真正要防的是自己先低估。",
        "最容易被忽略的，不是没能力，而是很多本事长在判断、分寸和把事情接稳的过程里。",
      ],
      default: [
        "事业这层真正要看的，不是能不能成，而是这股劲放在哪种环境里最不容易被磨空。",
        "工作这件事落到这张盘里，重点不只是机会多少，而是哪里更配得上这股长期发力的方式。",
        "问事业时，先别急着看结果，更值得先看清的是：这条路会不会让这张盘越走越顺手。",
      ],
    };
    return (map[kind] || map.default)[index];
  }

  function financeRead(kind) {
    const index = variantIndex(`finance-read-${kind}`);
    const map = {
      source: [
        "财放到这张盘里，更像是顺着位置、能力和长期积累慢慢长出来，不太像一下子撞到一笔。",
        "这张盘的进账路子，多半不是靠侥幸，而是靠哪一层本事被看见、被换成实际回报。",
        "真正能把钱接住的，往往不是冲得多快，而是这股力气放在哪种路子上最能稳稳兑现。",
      ],
      leak: [
        "最容易漏掉的，常常不是一笔大花销，而是心里太想把每一步都做稳，结果先把自己耗住了。",
        "这张盘守财最怕的，不只是乱花，而是很多不甘心、不放心，最后都变成额外的消耗。",
        "钱留不留得住，有时不只是看开销，也要看是不是总在一些不值得的地方反复用力。",
      ],
      rhythm: [
        "财的节奏在这张盘上，更像慢慢压实、再往上托，不像一阵风起来就结束。",
        "这类财气通常不怕慢，怕的是节奏乱，一会儿想冲，一会儿又想全守住。",
        "跟这张盘更合拍的，不是暴起暴落，而是踩准一段时间，把回报一点点攒出来。",
      ],
      default: [
        "财运放到这张盘里，先看的不是数字大小，而是钱到底从哪里来、又会从哪里漏掉。",
        "问到财，不必急着听一句好或不好，更该先看清这股财气是稳稳长，还是来得快去得也快。",
        "这张盘看财，重点常常不在有没有，而在接不接得住、留不留得住。",
      ],
    };
    return (map[kind] || map.default)[index];
  }

  function timeRead(kind) {
    const index = variantIndex(`time-read-${kind}`);
    const map = {
      common: [
        "时辰还没完全定下来时，真正最有用的，是先把那层不管落在哪个时段都不会跑掉的底色捞出来。",
        "先看共性，不是退一步，而是先把这张盘最稳的骨架看清，后面再去分细节。",
        "这时候最值得抓住的，不是立刻猜准，而是先把那些不会因为晚一两个时辰就变掉的部分看明白。",
      ],
      diff: [
        "时柱一变，真正会拉开的，往往不是整张盘翻掉，而是某些细节的落点、晚运的味道和关系表达。",
        "差别通常不在根底，而在后来怎么显，所以先分清哪些层会动，哪些层不会动，更有参考价值。",
        "时辰带来的变化，更像是把同一张盘往不同的生活场景里落，所以细节会越看越不一样。",
      ],
      calibration: [
        "时辰校准最稳的办法，不是靠猜，而是拿已经发生过的事一点点去对那层差别。",
        "这一步最适合用真实经历去贴，比如关系表达、离家时间、转折节点，往往比空想更准。",
        "要把时辰往准里收，最有用的通常不是再补一句模糊描述，而是找哪类经历最像自己真正走过的那条线。",
      ],
      default: [
        "问到时辰，先别急着盯一个点，先把这张盘不变的部分抓牢，后面再去收细差异会更稳。",
        "时柱这层看得准不准，关键不只是时间本身，更在于能不能把那些会变和不会变的部分分清楚。",
        "这类问题最怕一上来就想定死，反而先把共性和差异拆开，后面会更容易看准。",
      ],
    };
    return (map[kind] || map.default)[index];
  }

  function variantIndex(kind) {
    const seed = `${kind}|${signature}|${q}`;
    let total = 0;
    for (const char of seed) total += char.charCodeAt(0);
    return total % 3;
  }

  function openingTone(kind) {
    const index = variantIndex(kind);

    if (kind === "relationship") {
      const variants = [
        "关系能不能走长，通常不是看开始有多热，而是看相处下来心会不会越来越安定。",
        "问到关系这层，最先要分清的，不是谁更主动，而是谁真正让心里慢慢放得下。",
        "感情放到这张盘里，重点从来不是表面热闹，而是靠近之后会不会更安心。",
      ];
      return variants[index];
    }

    if (kind === "career") {
      const variants = [
        "工作这层最怕看得太表面，很多时候不是机会少，而是位置放得对不对。",
        "问到事业，先别急着盯结果，真正拉开差别的常常是这股劲该落在哪个位置。",
        "这张盘看事业，不是先问能不能成，而是先看哪类环境能把长处真正托出来。",
      ];
      return variants[index];
    }

    if (kind === "finance") {
      const variants = [
        "钱放进这张盘里，不只是多和少，还要看来得稳不稳、留不留得住。",
        "财这件事落到命盘里，重点往往不是有没有，而是怎么来、怎么守。",
        "问到财，不必先盯住数字，更该先看这股财气靠什么方式才接得住。",
      ];
      return variants[index];
    }

    if (kind === "time") {
      const variants = [
        "时辰还不够准的时候，先抓住那些不会变的底色，反而最稳。",
        "出生时间模糊，并不是什么都看不了，先看共性，很多判断照样能站住。",
        "问到时柱，最重要的不是立刻猜准，而是先把不管哪个时段都不会跑掉的那部分捞出来。",
      ];
      return variants[index];
    }

    if (kind === "expression") {
      const variants = [
        "很多想法不是没有价值，只是要看它最后落到哪里，才不会在心里打转。",
        "表达这层最怕的不是说不出来，而是说出去了却没落到真正有用的地方。",
        "这张盘的想法往往来得不慢，关键不在于有没有，而在于怎么把它变成现实里的推动力。",
      ];
      return variants[index];
    }

    if (kind === "burnout") {
      const variants = [
        "内耗常常不是因为外面太吵，而是心里先把自己绷得太紧。",
        "真正磨人的，很多时候不是事情本身，而是那股一直不肯放下的劲。",
        "这张盘发紧的时候，往往不是没路，而是心里那把尺一直没停下来。",
      ];
      return variants[index];
    }

    if (kind === "security") {
      const variants = [
        "安全感放到这张盘里，不是嘴上说得好，而是心里能不能慢慢松下来。",
        "问到安全感，最先看的不是表面热情，而是回应有没有让心里真正放下戒备。",
        "这张盘要的安全感，不是热闹里的安慰，而是日常里那种靠得住的回应。",
      ];
      return variants[index];
    }

    if (kind === "change") {
      const variants = [
        "变化这件事，不一定是一夜之间翻过来，更多是某一层节奏已经开始松动了。",
        "问到变化，先看的不是会不会变，而是哪一层已经先被运势推到眼前。",
        "很多变化不是突然发生的，而是这步运已经在一点点催着往前走。",
      ];
      return variants[index];
    }

    if (kind === "theme") {
      const variants = [
        "眼下最值得先抓住的，不是哪件事声音最大，而是哪一层力量已经先冒头了。",
        "问题再多，最后还是会回到同一个地方：这会儿真正站在前面的主题是什么。",
        "先把眼前这层主轴认出来，后面很多杂音自然会自己退下去。",
      ];
      return variants[index];
    }

    const variants = [
      "这会儿先别急着把问题问成好还是不好，更值得先看的是：这件事到底把状态往哪边带。",
      "很多答案不是一句行不行就能说完，得先看这件事在命盘里碰到的是哪一层气。",
      "眼前这件事要看清，先别急着定输赢，先看它到底在催哪一层变化冒出来。",
    ];
    return variants[index];
  }

  function relationshipOpening(kind) {
    const index = variantIndex(`relationship-opening-${kind}`);
    const map = {
      fear: [
        "关系里最磨人的，往往不是外面冷不冷，而是心里一直有一层放不下。",
        "问到关系里最怕卡住哪里，通常先要看那层迟迟放不下心的地方。",
        "这类关系问题，真正卡人的，常常不是没感觉，而是靠近以后那层不安一直还在。",
      ],
      need: [
        "如果真想走长一点，最先要补上的，往往不是热度，而是那层能让心慢慢安下来的东西。",
        "关系要走远，先看的通常不是谁更会靠近，而是谁给得出那份让人敢往前走的回应。",
        "问到关系里最需要对方先给什么，其实是在看这张盘最缺哪种安稳感。",
      ],
      boundary: [
        "关系一旦往深处走，最容易出问题的，往往不是喜不喜欢，而是边界和回应能不能说清楚。",
        "问到边界这层，真正该看的不是谁强谁弱，而是谁先让人有了分寸和踏实感。",
        "很多关系不是坏在没靠近，而是靠近之后那条线一直没说清。",
      ],
      default: [
        "感情放回这张盘里，先不急着看热不热，而是先看靠近以后心会不会更安。",
        "关系这件事落到这张盘上，最先要分清的不是谁更主动，而是谁真正让人放得下心。",
        "这张盘看感情，怕的不是没人靠近，而是靠近以后心里还总有一层顾虑没放下。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function careerOpening(kind) {
    const index = variantIndex(`career-opening-${kind}`);
    const map = {
      position: [
        "问到工作位置合不合适，先看的不是体面不体面，而是这股力气放进去会不会越用越顺。",
        "事业里最怕的，不是辛苦，而是明明有本事，却一直放在接不住自己的地方。",
        "工作适不适合这张盘，先看的是这类位置会不会把判断力和分寸感真正用起来。",
      ],
      change: [
        "问到该不该动，先不要被外面的动静带着走，先看这一步到底是在催守，还是在催变。",
        "工作上的变化，最怕不是做选择，而是还没分清这次变化是在开路，还是只是在加耗。",
        "要不要换，不只是看机会来了没有，更要看这一步动了以后，路会不会更清。",
      ],
      strength: [
        "工作里最值钱的，不一定是表面看得见的那层能扛，往往是那股一直都在的判断和分寸。",
        "问到最值得用的本事，其实是在看这张盘哪一层一旦用对了，位置就会慢慢抬上来。",
        "事业上真正能换来位置的，很多时候不是拼命往前冲，而是哪层本事一用出来就显出分量。",
      ],
      default: [
        "事业放到这张盘里，先看的不是哪条路听起来更亮，而是哪条路能把这股气用对。",
        "工作这件事，真正该先分清的，不是忙不忙，而是力气落下去之后，会不会越做越顺。",
        "这张盘看事业，不怕慢一步，怕的是方向没对，结果把最能抬位置的那层力气先耗掉。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function financeOpening(kind) {
    const index = variantIndex(`finance-opening-${kind}`);
    const map = {
      source: [
        "问到钱从哪里来，先别急着想横财，更要看这张盘的钱是从哪层本事慢慢长出来的。",
        "财路这件事落到这张盘里，最该先分清的，不是快不快，而是靠哪条路更能接得住。",
        "先把财路看对，比急着看一时进账更重要，这张盘的钱通常不是乱撞出来的。",
      ],
      leak: [
        "问到漏财，先看的往往不是数字掉了多少，而是那种消耗一直发生在什么地方。",
        "钱守不住的时候，很多时候不是运差，而是有些耗损一直没被看清。",
        "真正让钱慢慢漏掉的，常常不是一笔大开销，而是某种习惯性的消耗一直没停。",
      ],
      rhythm: [
        "这张盘看财，最怕看得太急，因为它更像讲节奏，不只是讲快慢。",
        "财这件事放到这张盘里，先分清节奏，比一上来就问能赚多少更重要。",
        "问到财运节奏，其实是在看这股力是该慢慢蓄，还是在某个阶段顺势发出来。",
      ],
      default: [
        "财放回这张盘里，先别急着问有没有，而是先看什么路子更接得住这股力。",
        "看钱这件事，最先要分清的，不是来得快不快，而是这张盘更适合怎么去接。",
        "这张盘问财，不怕起步慢，怕的是一开始就把力气放在不对的路子上。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function timeOpening(kind) {
    const index = variantIndex(`time-opening-${kind}`);
    const map = {
      common: [
        "只知道大概时段的时候，最稳的看法是先把不会跑掉的那层底色抓住。",
        "时辰还没完全定下来时，先看共性，不是退一步，而是在先把骨架看稳。",
        "问共性这类问题，重点不是立刻猜准，而是先看哪部分不管落在哪个时段都还成立。",
      ],
      diff: [
        "真正会被时柱拉开的，通常不是整张盘翻掉，而是几处细节开始分出不同走法。",
        "问到差异这层，先别急着觉得前面都白看了，真正变的往往只是后面那几处落点。",
        "时柱一换，最容易动的不是整张底色，而是那些最后会把人带去不同感受的位置。",
      ],
      calibration: [
        "校时这件事，最怕急着拍板，最稳的是先把不变的地方看牢，再拿会分叉的地方慢慢对。",
        "要把时辰越缩越准，关键不是一下定死，而是先找那些最能区分经历的点。",
        "时辰校准不是猜，而是先看底色，再拿会分叉的经历去一点点对照。",
      ],
      default: [
        "问到时辰，最稳的看法通常不是先猜，而是先把不会变的底色抓出来。",
        "时辰这层先别急着定死，先看什么不会跑掉，再看什么会被慢慢拉开。",
        "这类问题先抓骨架，比一开始就执着精确到几分几秒更有用。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function relationMiddle(kind) {
    const index = variantIndex(`relation-middle-${kind}-${signature}`);
    const map = {
      fear: [
        "真正绷住的，常常不是一句话没回，而是心里一直拿不准这段关系最后能不能落到安稳里。",
        "这层顾虑一旦没被安稳接住，外面再热闹，心里也还是会留一半站在原地。",
        "所以最难的从来不是开始，而是靠近以后，那层“能不能放心”迟迟没有落下来。",
      ],
      need: [
        "放到关系里看，最先缺的不是热闹，而是那种能让人慢慢把戒备放下来的稳定回应。",
        "真要走长一点，先补上的往往不是浪漫，而是情绪稳、说话算、关系能落进日常这层东西。",
        "很多关系不是败在不喜欢，而是一直没人把那份确定感真正给出来。",
      ],
      boundary: [
        "边界这层一旦模糊，心里那把尺就会一直悬着，关系看着在走，心却不敢真的往前站。",
        "关系能不能松下来，很多时候不看嘴上怎么说，而看该回应时有没有回应，该站出来时站不站出来。",
        "这张盘在关系里怕的不是冲突，而是那条线一直没人说明白，最后什么都只能靠自己猜。",
      ],
      default: [
        "感情放回这张盘里，真正关键的不是热不热，而是靠近以后会不会越来越安定。",
        "这类关系问题，最后多半都会落回同一层：回应给不给力，边界清不清，心能不能慢慢放下。",
        "所以别急着只看喜欢不喜欢，先看这段关系到底会把状态带向更稳，还是更紧。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function careerMiddle(kind) {
    const index = variantIndex(`career-middle-${kind}-${signature}`);
    const map = {
      position: [
        "位置合不合，不是看名头响不响，而是看这股判断力、执行力和分寸感能不能真的用起来。",
        "这张盘放到工作里，最怕不是辛苦，而是本事明明有，却一直放在接不住自己的地方。",
        "真正接得住这张盘的位置，通常不会只是忙，而是越做越顺、越做越能把价值拉出来。",
      ],
      change: [
        "要不要动，不是只看机会来了没有，而是看这次变化会不会把路越走越清。",
        "这类问题最怕被外面的动静带着走，真正该看的是：这一步是在开路，还是在加耗。",
        "很多变动不是不能动，而是先要分清，这一下动完之后，状态是更顺还是更散。",
      ],
      strength: [
        "真正值钱的，往往不是表面那层能扛，而是哪一层判断、节奏感和处理事的方式一直都在。",
        "这张盘最容易被低估的，不是能力本身，而是那种一旦放对地方就会很见分量的做事路数。",
        "所以最怕的不是没本事，而是一直把最能换位置的那部分，耗在不值得的小地方。",
      ],
      default: [
        "工作这件事放到这张盘里，最先要分清的，不是哪条路更亮，而是哪条路更接得住自己。",
        "事业上真正要紧的，常常不是快不快，而是力气落下去之后，会不会越做越顺。",
        "这张盘不怕起步慢，怕的是方向没对，结果把最能抬位置的那层力气先磨掉了。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function financeMiddle(kind) {
    const index = variantIndex(`finance-middle-${kind}-${signature}`);
    const map = {
      source: [
        "财路放到这张盘里，更像顺着位置、能力和长期积累慢慢长出来，不太像一下子撞到一笔。",
        "钱从哪儿来，关键不是运气大不大，而是这股力气放在哪种路子上最能稳稳兑现。",
        "真正能把钱接住的，多半不是冲得多快，而是那层本事终于被看见、被换成结果。",
      ],
      leak: [
        "漏财很多时候不是钱自己跑掉，而是某一类消耗一直没被当回事。",
        "真正该守的，往往不是一笔具体数字，而是别把时间、精力和钱都花在明知道站不住的地方。",
        "这层问题最怕的不是花钱，而是反复把资源耗在没有回响的地方，最后整个人也跟着被拖空。",
      ],
      rhythm: [
        "财这件事放到这张盘里，更像讲节奏，不只是讲快慢。",
        "先分清是适合慢慢累出稳定感，还是在某个阶段顺势发一把力，比一开始就问赚多少更重要。",
        "这张盘问财，最怕看得太急，因为很多回报本来就不是一口气跳出来的。",
      ],
      default: [
        "看财这件事，最先要分清的，不是来得快不快，而是这张盘更适合怎么去接。",
        "这张盘问钱，不怕起步慢，怕的是一开始就把力气放在不对的路子上。",
        "所以别急着先问结果大不大，先看这股力气到底放在哪种财路上更能稳住。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function timeMiddle(kind) {
    const index = variantIndex(`time-middle-${kind}-${signature}`);
    const map = {
      common: [
        "先看共性，不是退一步，而是在先把不会跑掉的骨架抓稳。",
        "这时候最值得抓住的，不是立刻猜准，而是先把那些不会因为晚一两个时辰就变掉的部分看明白。",
        "先把底色看稳，后面再分细节，会比一上来急着猜准更有用。",
      ],
      diff: [
        "真正会被时柱拉开的，往往不是整张盘翻掉，而是几处细节开始分出不同走法。",
        "时柱一换，最容易动的不是整张底色，而是后面那几处会把人带去不同感受的位置。",
        "这层差异更像是细枝末节在分叉，不是前面整套判断都要推倒重来。",
      ],
      calibration: [
        "校时最稳的办法，不是一下拍板，而是先把不变的地方看牢，再拿会分叉的地方去对照经历。",
        "这种问题越问细，时柱越容易缩准，因为真正能分开的，往往是具体年份里的关系、工作和搬动落点。",
        "先认清骨架，再去对照那些明显的分叉经历，时辰才会越校越准。",
      ],
      default: [
        "时辰这层先别急着定死，先看什么不会跑掉，再看什么会被慢慢拉开。",
        "问到时柱，最稳的看法通常不是先猜，而是先把不会变的底色捞出来。",
        "这类问题先抓骨架，比一开始就执着精确到几分几秒更有用。",
      ],
    };
    const variants = map[kind] || map.default;
    return variants[index % variants.length];
  }

  function finishTone(kind) {
    if (kind === "relationship") {
      if (signature === "guarded-sense" || signature === "rule-aware") return "关系里最值得先看清的，不是热闹不热闹，而是回应稳不稳、边界清不清。";
      if (signature === "expression-first") return "关系里最怕的是心里很满，嘴上却说快了，所以真正要紧的是把那句最在意的话说准。";
      return "关系这块别急着问成要不要，先看这段关系最后会把状态带向更稳，还是更紧。";
    }
    if (kind === "career") {
      if (signature === "steady-system") return "事业上更值得守的是长期位置，不是眼前那一下热度。";
      if (signature === "sharp-tension") return "事业上真正要防的，不是没机会，而是把自己逼进太紧的局里。";
      return "事业这块最适合看的，是哪类位置既能用上这张盘的长处，又不会把状态磨空。";
    }
    if (kind === "finance") {
      if (signature === "output-to-value") return "财路更像从表达、作品和把事做成里长出来，不太像一把抓到横财。";
      if (signature === "practical-first") return "财这块怕的不是慢，而是每一步都算得太紧，最后把人先累住。";
      return "财运这块更适合慢慢看，不是一句有财没财就能说完。";
    }
    if (kind === "time") return "时柱这块最值得看的，是哪些共性不会变，哪些细节会跟着时段一起改。";
    if (kind === "expression") return "表达这块的关键，不是说得快不快，而是说出去之后，能不能真正把路打开。";
    if (kind === "burnout") return "真正会把状态磨紧的，往往不是外面这件事本身，而是心里先把标准抬高了。";
    if (kind === "security") return "安全感这件事，落到这张盘上，看的不是表面热情，而是稳定回应。";
    if (kind === "change") return `${nextLead}，所以变化不是突然砸下来，而是一步步逼近的。`;
    if (kind === "theme") return "这层主题看清了，后面很多问题就不会再绕回同一个结。";
    return "真正要紧的，不是急着把答案定死，而是先把这张盘最先冒出来的那股气认出来。";
  }

  function joinReply(parts) {
    return parts.filter(Boolean).join(" ");
  }

  function buildRelationshipReply(kind) {
    const map = {
      fear: [
        relationshipOpening("fear"),
        relationRead("fear"),
        signature === "guarded-sense"
          ? "这张盘怕的不是没人靠近，而是靠近以后，心里那层提防一直放不下来。"
          : "这张盘在关系里真正卡住的，不是外面有没有动静，而是心里始终在问：这段回应到底稳不稳。",
        driveTone(),
        `${currentDaYunText}这一步，更像在把关系里的分寸、边界和回应慢慢推到前面。`,
        "所以最该先看清的，不是热度高不高，而是这段关系有没有让心里慢慢安下来。",
      ],
      need: [
        relationshipOpening("need"),
        relationMiddle("need"),
        signature === "rule-aware"
          ? "这张盘真正要的，不是几句好听话，而是对方说出口的事能不能落到日常里。"
          : "如果关系真要走长，最先补上的往往不是浪漫，而是情绪稳、回应稳、节奏也稳。",
        themeTone(),
        `${annualLead}，所以眼前最值得看清的，是谁给得出那份让心慢慢放下来的确定感。`,
      ],
      boundary: [
        relationshipOpening("boundary"),
        relationMiddle("boundary"),
        "很多关系表面还在往前走，真正把人绷住的，却是边界一直没说清、回应一直不够准。",
        baseTone(),
        signature === "expression-first"
          ? "这类盘尤其怕心里很满、嘴上却说快了，所以边界不是强硬，而是把真正介意的那句话说准。"
          : "这类盘更怕一切都靠自己猜，所以边界清楚，本身就是一种安稳。",
        "放回这张盘里看，真正有用的从来不是承诺本身，而是承诺后面有没有站得住的动作。",
      ],
      default: [
        relationshipOpening("default"),
        relationRead("default"),
        "关系这件事放到这张盘上，不必急着问最后成不成，先看靠近之后状态是松下来，还是越来越紧。",
        driveTone(),
        themeTone(),
        "如果这一层先看清，后面很多关于关系的细问才会真正落到点上。",
      ],
    };

    return joinReply(map[kind] || map.default);
  }

  function buildCareerReply(kind) {
    const map = {
      position: [
        careerOpening("position"),
        careerRead("position"),
        signature === "steady-system"
          ? "这张盘真正接得住的，多半是有标准、有次序、也能慢慢把位置做稳的那类环境。"
          : "这张盘最怕的不是忙，而是忙了半天，判断和执行都用不上，最后只剩消耗。",
        themeTone(),
        `${currentDaYunText}这一步，更像在把“什么位置真正接得住自己”这件事推到眼前。`,
      ],
      change: [
        careerOpening("change"),
        careerMiddle("change"),
        "问到换不换，先别只看外面的机会大不大，更该看这一步变化会不会把路越走越清。",
        signature === "sharp-tension"
          ? "这类盘最怕把自己逼进太紧的局，所以变化不是不能要，而是不能为了逃离当下就急着动。"
          : "这类盘更适合顺着节奏动，而不是被外面的动静一下子带跑。",
        `${annualLead}，所以眼前更值得分清的，是这次变化会把位置抬高，还是只会把状态先磨空。`,
      ],
      strength: [
        careerOpening("strength"),
        careerMiddle("strength"),
        "很多最值钱的部分，并不一定最先被看见，常常是在复杂的事里越做越显分量。",
        baseTone(),
        signature === "expression-first"
          ? "所以真正不能白白放掉的，是判断、表达和把事做成的那股劲。"
          : "所以真正不能低估的，是那层分寸、扛事和把局面接稳的能力。",
      ],
      default: [
        careerOpening("default"),
        careerRead("default"),
        "工作这件事放到这张盘里，不是先看哪条路更亮，而是先看哪条路会让力气越用越顺。",
        driveTone(),
        `${currentDaYunText}这一步，本来就在慢慢把事业重心往前推，所以眼下更该看清的是方向，而不只是机会。`,
      ],
    };

    return joinReply(map[kind] || map.default);
  }

  function buildFinanceReply(kind) {
    const map = {
      source: [
        financeOpening("source"),
        financeRead("source"),
        signature === "output-to-value"
          ? "这张盘的钱更像从表达、结果和可见的价值里长出来，不太像一把抓到横财。"
          : "这张盘的财路，多半还是顺着位置、判断和长期积累慢慢长，不是一下子撞出来的。",
        themeTone(),
        "所以比起急着求快，更值得先看清的是：哪一层本事最容易被换成实打实的回报。",
      ],
      leak: [
        financeOpening("leak"),
        financeMiddle("leak"),
        "漏掉的往往不只是钱本身，也可能是时间、精力和本该留给自己的资源。",
        signature === "practical-first"
          ? "这类盘尤其怕每一步都算得太紧，最后钱没少守，状态却先被掏空。"
          : "这类盘更要防的，是反复把资源耗在明知道站不住的地方。",
        "所以真正要守的，不是一笔数字，而是别让消耗变成日常习惯。",
      ],
      rhythm: [
        financeOpening("rhythm"),
        financeMiddle("rhythm"),
        "这张盘看财，更像看节奏是不是踩对，而不是只看来得快不快。",
        `${currentDaYunText}这一步，也在提醒这件事：钱要么顺着节奏一点点累，要么在某个阶段顺势发一把力。`,
        "所以眼下更值得分清的，是该稳稳接住，还是该在对的时间往前推一把。",
      ],
      default: [
        financeOpening("default"),
        financeRead("default"),
        "问到财，不必先急着听一句有还是没有，更该先看清这股财气是从哪里来，又会从哪里漏。",
        driveTone(),
        "这层看明白之后，后面再问收入、开销、机会，答案就不会总绕回同一个结。",
      ],
    };

    return joinReply(map[kind] || map.default);
  }

  function buildTimeReply(kind, prompt) {
    const map = {
      common: [
        timeOpening("common"),
        timeRead("common"),
        "时辰还没完全定下来时，最有参考价值的，往往就是那些不管落在哪个时段都不会跑掉的底色。",
        baseTone(),
        prompt,
      ],
      diff: [
        timeOpening("diff"),
        timeMiddle("diff"),
        "真正会被时柱拉开的，多半不是整张盘翻掉，而是关系表达、晚运感受、事情落点这些细处慢慢分叉。",
        prompt,
        "所以时柱要看的，不是推翻前面，而是看后面哪些细节开始走出不同味道。",
      ],
      calibration: [
        timeOpening("calibration"),
        timeMiddle("calibration"),
        "校时最稳的办法，还是先看骨架，再拿会分叉的经历去一层层对。",
        prompt,
        "越是把问题问细，比如哪几年关系、工作、搬动最明显，时柱就越容易慢慢缩准。",
      ],
      default: [
        timeOpening("default"),
        timeRead("default"),
        "问到时辰，不必先急着猜准，先把不会变的部分看稳，后面那些会分开的细处自然会慢慢显出来。",
        prompt,
      ],
    };

    return joinReply(map[kind] || map.default);
  }

  function buildExpressionReply() {
    const qLower = q.toLowerCase();
    const asksAboutSpeech = /说|开口|讲出来|表达/.test(qLower);
    const asksAboutOutput = /输出|作品|写|写出来|内容/.test(qLower);
    const asksAboutLanding = /落到什么地方|不算白费|放到哪里/.test(qLower);
    const openers = [
      "这类问题，重点不在会不会想，而在想明白之后，力气到底落到哪里才不白白绕回心里。",
      "问到表达，先别急着看说得快不快，更该看这张盘的判断最适合在哪种场合被听见。",
      "这层问的其实不是嘴上能不能说，而是心里那股判断该往哪放，才会真正变成结果。",
    ];
    const leads = [
      asksAboutSpeech
        ? "很多时候不是没话，而是话到嘴边前，心里已经先把分寸和后果都过了一遍。"
        : asksAboutOutput
          ? "这张盘一旦有了想法，最怕的不是做不到，而是一直停在心里，最后没真正长成东西。"
          : asksAboutLanding
            ? "真正怕白费的，不是想法不够好，而是一直没找到最能接住它的出口。"
            : "这张盘的表达，不是越快越好，而是要放到能接得住判断和分寸的地方。",
      signature === "expression-first"
        ? "命盘里更显眼的是把东西说清、做成、推出去的那股气，所以最值钱的地方往往不是藏着，而是把判断落成结果。"
        : signature === "inner-first" || signature === "guarded-sense"
          ? "这张盘先强的是往里看、先想透，所以表达真正顺起来，多半是在心里那杆秤先稳住之后。"
          : "放回这张盘里看，表达不是单独的一张嘴，而是判断、节奏和场合一起配合，才会显得准。",
      asksAboutOutput
        ? "如果是写、做内容、做作品这一类，更适合把想法落到看得见的成果上，不要让脑子一直领先，手却迟迟没跟上。"
        : asksAboutSpeech
          ? "如果是说话和开口这一类，更要紧的不是一次说很多，而是把最关键的那一句说到点上。"
          : "所以更值得先看的，不是表达多不多，而是哪一种表达最能替这张盘把路打开。",
      `${currentDaYunText}这一步，也在把“想法该不该落地、该落到哪”这件事慢慢推到前面。`,
      finishTone("expression"),
    ];
    return joinReply([openers[variantIndex(`expression-open-${signature}`) % openers.length], ...leads]);
  }

  function buildBurnoutReply() {
    const asksAboutAnxiety = /焦虑|发紧|绷着|慌/.test(q);
    const asksAboutTired = /累|消耗|扛不住|撑/.test(q);
    const openers = [
      "问到内耗，不是先看事情多不多，而是先看心里哪股力一直没地方放。",
      "这类问题最怕一上来只怪外面，其实很多累，都是心里那根弦先绷起来了。",
      "真正磨人的，常常不是事情本身，而是这张盘哪一层标准一直没放下。",
    ];
    const body = [
      asksAboutAnxiety
        ? "发紧这件事落到这张盘里，多半不是外面马上要出大事，而是心里先把轻重、得失、后果全都转了一遍。"
        : asksAboutTired
          ? "觉得累的时候，真正累人的通常不是做了多少，而是边做边要撑着那口不能出错的气。"
          : "内耗放回这张盘里看，常常不是没力气，而是力气一直在心里互相打架。",
      dominantElement === "土"
        ? "这张盘土重，很多时候会先把责任和后果扛进心里，所以事情还没真正压下来，人已经先累了一轮。"
        : dominantElement === "水"
          ? "这张盘水气重时，最容易出现的不是外面马上乱，而是心里一直在转，怎么也停不下来。"
          : dominantTenGod.includes("印")
            ? "印星更显时，最磨人的往往不是做不到，而是那杆秤一直在量稳不稳、值不值、会不会出错。"
            : "这张盘更容易先顶上去，所以很多消耗不是因为真没办法，而是太早把自己放到了必须扛的位置上。",
      `${annualLead}，所以眼前这层紧，不像是突然冒出来的，更像是原本在心里压着的那部分已经被推到面前了。`,
      "先别急着问自己还能不能再撑一点，更值得先看的是：眼下哪一件事最该先松手，哪一种环境最能把这口气放下来。",
      finishTone("burnout"),
    ];
    return joinReply([openers[variantIndex(`burnout-open-${signature}`) % openers.length], ...body]);
  }

  function buildSecurityReply() {
    const asksAboutNeed = /需要|要什么|最要紧/.test(q);
    const asksAboutResponse = /回应|回不回|回消息|回复/.test(q);
    const asksAboutBoundary = /边界|靠不靠谱|稳不稳|清不清/.test(q);
    const openers = [
      "安全感这类问题，先别急着往外找答案，先看这张盘到底靠什么才会慢慢松下来。",
      "问到安全感，真正该看的不是别人做得够不够，而是这张盘心里最先认的那层东西是什么。",
      "这层问题最怕只看表面热情，命盘里真正要紧的，多半是更深一层的回应和分寸。",
    ];
    const body = [
      asksAboutNeed
        ? `这张盘真正需要的，不是场面上的热，而是${relationshipNeed}。`
        : asksAboutResponse
          ? "回应落不到位时，这张盘最先感到的不是失望，而是心里那层戒备会立刻重新立起来。"
          : asksAboutBoundary
            ? "边界一旦含糊，这张盘心里那把尺就会一直悬着，所以很多不安并不是多想，而是真的没被接稳。"
            : `放回关系里看，这张盘最需要的，还是${relationshipNeed}。`,
      dominantTenGod.includes("印")
        ? "印星更显的人，不太会因为一时热情就全心交出去，真正能让心慢慢放下来的，往往是长期稳定、说到做到。"
        : dominantTenGod.includes("官") || dominantTenGod.includes("杀")
          ? "官杀更显时，安全感常常不是一句承诺，而是责任感和现实匹配能不能落到日常里。"
          : "这张盘更怕关系一直漂着，所以真正安住人的，常常不是甜，而是回应稳、边界清、日常里有着落。",
      `${currentDaYunText}这一步，也会把关系里的需求感和确认感推到前面，所以很多感受会比平时更直接。`,
      asksAboutResponse
        ? "真要继续细看，可以直接问：哪一种回应最能让这张盘把那层戒备放下来。"
        : "所以别急着只问谁更爱谁，先看谁真的给得出这份让心松下来的稳定感。",
      finishTone("security"),
    ];
    return joinReply([openers[variantIndex(`security-open-${signature}`) % openers.length], ...body]);
  }

  function buildChangeReply() {
    const asksAboutYears = /两年|三年|明年|后年|接下来/.test(q);
    const asksAboutDirection = /往哪|哪一层|哪方面|变到哪里/.test(q);
    const openers = [
      "问到变化，最怕一下子揉成一句会不会变，更值得先看这一步先推哪一层。",
      "变化这类问题，不是先听一句吉凶，而是先看命盘里哪股气已经开始转了。",
      "真正要紧的不是变不变，而是这一步变化会先落在关系、工作，还是心里的状态上。",
    ];
    const body = [
      asksAboutYears
        ? "把时间收窄到接下来这两三年，会更容易看清变化不是突然跳出来的，而是一层层往前逼近。"
        : asksAboutDirection
          ? "问方向的时候，先别急着看结果，先看这股变化最先牵动的是哪一层现实安排。"
          : "这类变化最怕看得太粗，真正能看清的，往往是先变哪一层、后变哪一层。",
      result.analysis?.changeArea || "这张盘眼下的变化重心，还是要放回当前运势和现实处境里一起看。",
      `${currentDaYunText}这一步本来就在发力，${annualLead}。`,
      "所以这会儿更值得做的，不是急着把答案定死，而是先认出哪一层已经开始松动，哪一层还不能硬推。",
      finishTone("change"),
    ];
    return joinReply([openers[variantIndex(`change-open-${signature}`) % openers.length], ...body]);
  }

  function buildThemeReply() {
    const asksAboutPriority = /先看清|先看什么|最该看/.test(q);
    const asksAboutCore = /主轴|主题|底色|重点/.test(q);
    const openers = [
      "这种问题，重点不在外面哪件事最吵，而在命盘里哪股气已经先冒到前面来了。",
      "问主轴的时候，先别急着抓一件具体的事，先看这张盘眼下真正亮出来的是哪一层力量。",
      "这类问题最值得做的，不是立刻找结论，而是先认出现在到底是哪一层在领头。",
    ];
    const body = [
      asksAboutPriority
        ? "眼下最该先看清的，多半不是表面最急的那件事，而是背后到底是哪一层安排在决定后面的节奏。"
        : asksAboutCore
          ? "主轴这层，常常不是单一一件事，而是一种做事方式、人生重心和最近一直被推着面对的题目。"
          : "这类主题往往不只落在一件事上，而是会同时牵动几个现实面向。",
      `先看日主，这张盘目前是${pattern}；再看十神，${dominantCombo || "这一组主神"}更显眼，所以现在真正被推到前面的，不只是事情本身，而是一层做事方式和人生重心。`,
      `${currentDaYunText}这一步，本来就在慢慢把一层主题推到台前。${annualLead}。`,
      dominantTenGod.includes("印")
        ? "顺着这张盘看，眼下先要看清的，多半是哪些选择会让心里的秤放松，哪些只会越压越紧。"
        : dominantTenGod.includes("食") || dominantTenGod.includes("伤")
          ? "顺着这张盘看，眼下先要看清的，是判断和表达该往哪落，才不会一直空转。"
          : "顺着这张盘看，眼下先要看清的，是哪层现实安排正在决定后面的步子。",
      finishTone("theme"),
    ];
    return joinReply([openers[variantIndex(`theme-open-${signature}`) % openers.length], ...body]);
  }

  if (hits.relationship) {
    if (relationFearHit) {
      return buildRelationshipReply("fear");
    }
    if (relationNeedHit) {
      return buildRelationshipReply("need");
    }
    if (relationBoundaryHit) {
      return buildRelationshipReply("boundary");
    }
    return buildRelationshipReply("default");
  }
  if (hits.career) {
    if (careerPositionHit) {
      return buildCareerReply("position");
    }
    if (careerChangeHit) {
      return buildCareerReply("change");
    }
    if (careerStrengthHit) {
      return buildCareerReply("strength");
    }
    return buildCareerReply("default");
  }
  if (hits.finance) {
    if (financeSourceHit) {
      return buildFinanceReply("source");
    }
    if (financeLeakHit) {
      return buildFinanceReply("leak");
    }
    if (financeRhythmHit) {
      return buildFinanceReply("rhythm");
    }
    return buildFinanceReply("default");
  }
  if (hits.time) {
    const prompt = result.timeInsight?.prompt || "如果出生时间还不够准，就先看年、月、日三柱里不会变的那部分。";
    if (timeCommonHit) {
      return buildTimeReply("common", prompt);
    }
    if (timeDiffHit) {
      return buildTimeReply("diff", prompt);
    }
    if (timeCalibrationHit) {
      return buildTimeReply("calibration", prompt);
    }
    return buildTimeReply("default", prompt);
  }
  if (hits.expression) {
    return buildExpressionReply();
  }
  if (hits.burnout) {
    return buildBurnoutReply();
  }
  if (hits.security) {
    return buildSecurityReply();
  }
  if (hits.change) {
    return buildChangeReply();
  }
  if (hits.theme) {
    return buildThemeReply();
  }
  return `${openingTone("overall")} ${baseTone()} ${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("overall")}`;
}

function detectFollowupTrack(question) {
  const q = question || "";
  if (/感情|关系|喜欢|桃花|对象|婚|亲密|相处|恋爱/.test(q)) return "relationship";
  if (/工作|事业|岗位|升职|职业|跳槽|换工作|公司|发展/.test(q)) return "career";
  if (/财|钱|收入|副业|赚钱|存款|开销|花销|投资|负债/.test(q)) return "finance";
  if (/时辰|出生时间|时段|几点|校准|模糊时间|晚上|早上|中午|下午/.test(q)) return "time";
  return "overall";
}

function buildNextFollowupPrompts(track, result) {
  const { dominant, signature } = getDominantProfile(result);
  const currentDaYun = result.luck.currentDaYun?.ganzhi || "这步大运";

  if (track === "relationship") {
    if (signature === "guarded-sense") {
      return [
        "这张盘在关系里最怕先交出去的，是信任、时间，还是期待？",
        "如果这两年真有关系推进，最该先确认对方哪一种回应？",
      ];
    }
    return [
      "未来两年关系里最该防的是冷下来，还是看走眼？",
      dominant.includes("印")
        ? "这张盘在感情里最难开口的真实需求是什么？"
        : "这张盘在关系里最容易先忍住不说的，是哪一种委屈？",
    ];
  }

  if (track === "career") {
    if (signature === "expression-first") {
      return [
        "这步运里，最值得被看见的，到底是判断力、表达力，还是把事做成的能力？",
        "如果要换位置，这张盘最适合往更有空间，还是更有秩序的环境走？",
      ];
    }
    return [
      `${currentDaYun}这一步，更适合守住位置，还是主动争取变化？`,
      dominant.includes("食") || dominant.includes("伤")
        ? "这张盘最该把判断和表达用在什么工作位置上？"
        : "这张盘最值得长期投入的职业路径是哪一类？",
    ];
  }

  if (track === "finance") {
    if (signature === "practical-first") {
      return [
        "这张盘最该先守的，不是钱本身，而是哪一种不值得的消耗？",
        "如果想把收入做稳，先抓位置、节奏，还是合作关系会更对路？",
      ];
    }
    return [
      "未来两年最该先守住哪一笔钱？",
      dominant.includes("财")
        ? "这张盘的钱更容易漏在冲动决定，还是漏在替别人兜底？"
        : "这张盘的财更适合慢慢累，还是阶段性发力？",
    ];
  }

  if (track === "time") {
    return [
      "如果只知道大概时段，先看哪些共性最不会跑掉？",
      "时柱最可能改动的，是关系表达、晚运，还是事情落点？",
    ];
  }

  if (track === "overall" && signature === "rule-aware") {
    return [
      "把问题收窄到这两年，最值得先看清的是责任、关系，还是位置变化？",
      "如果只挑一件眼下最该做的事，这张盘会先提醒哪一层边界？",
    ];
  }

  return [
    "把问题收窄到未来两年，最值得先看哪一层？",
    "如果只挑一件眼下最该看清的事，命盘会先提醒什么？",
  ];
}

function renderFollowupThread() {
  if (!followupThread) return;

  followupThread.innerHTML = followupHistory
    .map(
      (item) => `
        <article class="followup-turn">
          <p class="turn-question">问：${item.question}</p>
          <p class="turn-answer">${item.answer}</p>
        </article>
      `,
    )
    .join("");
}

function renderFollowupUpgrade() {
  if (!followupUpgrade) return;
  const shouldShow = followupHistory.length >= 1;
  followupUpgrade.classList.toggle("is-hidden", !shouldShow);
}

function renderResult(formData, result) {
  latestFormData = formData;
  latestResult = result;
  latestCompatibility = null;
  followupHistory = [];
  dreamHistory = [];
  resultEmpty.classList.add("is-hidden");
  resultContent.classList.remove("is-hidden");
  setTheme(result.theme);

  const favorable = result.favorableElements.join("、");
  const isManualBazi = result.timeInsight.mode === "manual-bazi";
  const currentDaYun = result.luck.currentDaYun;
  const summaryName = formData.name || "命主";
  const birthSolarText = (result.meta.birthSolar || "").slice(0, 10);
  const themeText = `主元素 ${result.theme.dominantElement} · 喜 ${favorable}`;
  const dayMasterText = `${result.dayMaster.stem}${result.dayMaster.element}日主`;
  const summaryContext = isManualBazi
    ? "当前按已输入的四柱来读这张盘"
    : `${birthSolarText}${formData.birthplace ? ` · ${formData.birthplace}` : ""}`;

  document.getElementById("summary-name").textContent = summaryName;
  document.getElementById("summary-theme").textContent = themeText;
  document.getElementById("summary-day-master").textContent = dayMasterText;
  document.getElementById("summary-lunar").textContent = summaryContext;
  document.getElementById("summary-pattern").textContent = currentDaYun ? `${currentDaYun.ganzhi}大运` : result.geju.label;
  document.getElementById("summary-time-note").textContent = isManualBazi
    ? "当前依据：手动输入的四柱八字"
    : `${result.geju.label} · ${result.dayMaster.pattern}`;

  document.getElementById("geju-label").textContent = result.geju.label;
  document.getElementById("geju-summary").textContent = result.geju.summary;
  document.getElementById("current-dayun").textContent = currentDaYun
    ? currentDaYun.ganzhi
    : isManualBazi
      ? "待补生日"
      : "起运前";
  document.getElementById("dayun-summary").textContent = currentDaYun
    ? `${currentDaYun.startYear}-${currentDaYun.endYear} · ${currentDaYun.startAge}-${currentDaYun.endAge}岁`
    : isManualBazi
      ? "补充阳历生日与出生时间后，可继续推算起运时间与完整大运。"
      : `起运时间：${result.luck.startSolar}`;

  document.getElementById("analysis-overview").textContent = result.analysis.overview;
  document.getElementById("analysis-public-persona").textContent = result.analysis.publicPersona;
  document.getElementById("analysis-intimacy").textContent = result.analysis.intimacy;
  document.getElementById("analysis-burnout").textContent = result.analysis.burnout;
  document.getElementById("analysis-security-need").textContent = result.analysis.securityNeed;
  document.getElementById("analysis-change-area").textContent = isManualBazi
    ? `${result.analysis.changeArea} 如果之后补充生日和出生时间，这部分还可以继续看得更细。`
    : result.analysis.changeArea;
  const healingText = (result.analysis.healing || "")
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(buildHealingGlossary(result))
    .map((item) => `<p>${item}</p>`)
    .join("");
  document.getElementById("analysis-healing").innerHTML = healingText || "<p>-</p>";

  renderPillars(result.pillars);
  renderShenShaSummary(result.shenShaSummary || []);
  renderElements(result.elements);
  renderTimeInsight(result.timeInsight);
  renderTenGods(result.tenGods);
  renderAnnualCards(result.annualCards);
  renderFollowupSuggestions(formData, result);

  if (followupResponse) {
    followupResponse.classList.add("is-hidden");
  }
  if (followupUpgrade) {
    followupUpgrade.classList.add("is-hidden");
  }
  if (followupThread) {
    followupThread.innerHTML = "";
  }
  if (checkoutCard) {
    checkoutCard.classList.add("is-hidden");
  }
  if (compatibilityResponse) {
    compatibilityResponse.classList.add("is-hidden");
    compatibilityResponse.innerHTML = "";
  }
  updateCompatibilityButtons();
  if (dreamResponse) {
    dreamResponse.classList.add("is-hidden");
  }
  if (dreamThread) {
    dreamThread.innerHTML = "";
  }
  if (dreamInput) {
    dreamInput.value = "";
  }
  setDreamFeedback("");
  updateDreamQuotaUI();

  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitForm(event, endpoint) {
  event.preventDefault();

  if (endpoint === "/api/bazi" && !validateCurrentStep()) {
    return;
  }

  const targetForm = event.currentTarget;
  const submitButton = targetForm.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;
  const payload = collectFormValues(targetForm);

  if (payload.birthTime) {
    payload.timeRange = "exact";
  }

  try {
    setFormFeedback(targetForm, "");
    submitButton.disabled = true;
    submitButton.textContent = "排盘中...";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "排盘失败");
    }

    renderResult(payload, result);
  } catch (error) {
    setFormFeedback(targetForm, error.message || "排盘失败，请检查输入后重试。");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetStep = Number(button.dataset.stepTarget);
    if (targetStep > activeStep && !validateCurrentStep()) return;
    setStep(targetStep);
  });
});

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.modeTarget));
});

if (prevStepButton) {
  prevStepButton.addEventListener("click", () => setStep(activeStep - 1));
}

if (nextStepButton) {
  nextStepButton.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    setStep(activeStep + 1);
  });
}

if (form) {
  form.addEventListener("submit", (event) => submitForm(event, "/api/bazi"));
  setStep(0);
}

if (directForm) {
  directForm.addEventListener("submit", (event) => submitForm(event, "/api/bazi-direct"));
}

if (compatibilityForm) {
  compatibilityForm.addEventListener("submit", submitCompatibilityForm);
}

if (modeTabs.length) {
  setMode("profile-mode");
}

if (timeRangeSelect) {
  timeRangeSelect.addEventListener("change", syncTimeMode);
  syncTimeMode();
}

if (birthdayInput) {
  birthdayInput.addEventListener("input", () => {
    birthdayInput.value = formatBirthdayValue(birthdayInput.value);
  });

  birthdayInput.addEventListener("blur", () => {
    birthdayInput.value = formatBirthdayValue(birthdayInput.value);
  });
}

if (followupForm) {
  followupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!latestResult || !latestFormData || !followupInput) return;

    const question = followupInput.value.trim();
    if (!question) {
      followupInput.reportValidity?.();
      followupInput.focus();
      return;
    }

    if (!canUseFollowup()) {
      openCheckout("followup");
      return;
    }

    if (!consumeFollowupAccess()) {
      openCheckout("followup");
      return;
    }

    const answer = buildFollowupAnswerV2(question, latestFormData, latestResult);
    const track = detectFollowupTrack(question);
    followupHistory.push({ question, answer, track });
    renderFollowupThread();
    renderFollowupUpgrade();
    followupResponse.classList.remove("is-hidden");
    renderFollowupSuggestions(
      { ...latestFormData, focus: track === "overall" ? latestFormData.focus : track },
      latestResult,
    );
    const nextPrompts = buildNextFollowupPrompts(track, latestResult);
    if (followupInput) {
      followupInput.value = "";
      followupInput.placeholder = nextPrompts[0];
      followupInput.focus();
    }
    followupResponse.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

birthdayFormatInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatBirthdayValue(input.value);
  });
  input.addEventListener("blur", () => {
    input.value = formatBirthdayValue(input.value);
  });
});

async function runCompatibilityPayload(values, mode = "free") {
  if (!compatibilityForm) return;
  const submitButton = compatibilityForm.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent || "开始合盘测算";
  const primaryPayload = buildCompatibilityPersonPayload(values, "self", "你");
  const partnerPayload = buildCompatibilityPersonPayload(values, "partner", "对方");

  try {
    setFormFeedback(compatibilityForm, "");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "合盘中...";
    }

    const [primaryResult, partnerResult] = await Promise.all([
      fetchBaziResult(primaryPayload),
      fetchBaziResult(partnerPayload),
    ]);

    renderResult(primaryPayload, primaryResult);
    latestCompatibility = {
      primary: primaryResult,
      partner: partnerResult,
      primaryPayload,
      partnerPayload,
    };
    renderCompatibilityReading(mode);
    updateCompatibilityButtons();
    return true;
  } catch (error) {
    setFormFeedback(compatibilityForm, error.message || "合盘失败，请检查两个人的生日和出生信息。");
    return false;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

async function submitCompatibilityForm(event) {
  event.preventDefault();
  const values = collectFormValues(event.currentTarget);

  if (!hasUsedCompatibilityFree()) {
    const success = await runCompatibilityPayload(values, "free");
    if (success) {
      consumeCompatibilityFree();
      updateCompatibilityButtons();
    }
    return;
  }

  if (paidUnlocks.compatibility > 0) {
    const success = await runCompatibilityPayload(values, "paid");
    if (success) {
      paidUnlocks.compatibility -= 1;
    }
    return;
  }

  pendingCompatibilityPayload = values;
  setFormFeedback(compatibilityForm, "免费合盘已经用完。可以 9.9 解锁一次合盘深读，付款后会自动继续生成结果。");
  openCheckout("compatibility");
}

if (dreamForm) {
  dreamForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!dreamInput) return;
    setDreamFeedback("");

    if (!latestResult || !latestFormData) {
      setDreamFeedback("请先完成命盘测算，再把梦放回这张盘里看。");
      return;
    }

    const question = dreamInput.value.trim();
    if (!question) {
      dreamInput.reportValidity?.();
      dreamInput.focus();
      return;
    }

    const remaining = getDreamRemaining();
    if (remaining <= 0 && paidUnlocks.dream <= 0) {
      setDreamFeedback("今日免费解梦已经用完。下面可以 9.9 解锁梦境深读，把这场梦看得更完整。");
      updateDreamQuotaUI();
      openCheckout("dream");
      return;
    }

    if (remaining > 0) {
      consumeDreamQuota();
    } else if (paidUnlocks.dream > 0) {
      paidUnlocks.dream -= 1;
    } else {
      setDreamFeedback("今日免费次数已用完。下面可以 9.9 解锁梦境深读，继续看这场梦真正卡住的地方。");
      updateDreamQuotaUI();
      openCheckout("dream");
      return;
    }

    try {
      const answer = buildDreamAnswer(question, latestFormData, latestResult);
      if (!Array.isArray(answer) || !answer.length) {
        throw new Error("这场梦还没顺利翻译出来，请换一种更具体的说法再试一次。");
      }

      dreamHistory.push({ question, answer });
      renderDreamThread();
      if (dreamResponse) {
        dreamResponse.classList.remove("is-hidden");
        dreamResponse.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      dreamInput.value = "";
      updateDreamQuotaUI();
    } catch (error) {
      setDreamFeedback(error.message || "这场梦暂时没能顺利解出来，试着把梦里最刺的一幕说得更具体一点。");
    }
  });
}

dreamUnlockButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!dreamInput) return;
    dreamInput.focus();
    dreamInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

checkoutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openCheckout(button.dataset.checkoutService || "followup");
  });
});

compatibilityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!latestResult || !latestFormData) return;
    if (!latestCompatibility?.partner) {
      focusCompatibilityForm();
      return;
    }
    if (!hasUsedCompatibilityFree()) {
      consumeCompatibilityFree();
      renderCompatibilityReading("free");
      updateCompatibilityButtons();
      return;
    }
    if (paidUnlocks.compatibility > 0) {
      paidUnlocks.compatibility -= 1;
      renderCompatibilityReading("paid");
      return;
    }
    openCheckout("compatibility");
  });
});

if (checkoutCompleteButton) {
  checkoutCompleteButton.addEventListener("click", () => {
    const service = pendingCheckoutService || "followup";
    paidUnlocks[service] = (paidUnlocks[service] || 0) + 1;
    closeCheckout();
    updateDreamQuotaUI();
    if (service === "dream" && dreamInput) {
      dreamInput.disabled = false;
      dreamInput.focus();
      dreamInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (service === "followup" && followupInput) {
      followupInput.focus();
      followupInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (service === "compatibility") {
      if (pendingCompatibilityPayload) {
        const values = pendingCompatibilityPayload;
        pendingCompatibilityPayload = null;
        runCompatibilityPayload(values, "paid").then((success) => {
          if (success) {
            paidUnlocks.compatibility = Math.max(0, paidUnlocks.compatibility - 1);
          }
        });
      } else {
        renderCompatibilityReading("paid");
      }
    }
  });
}

if (checkoutCancelButton) {
  checkoutCancelButton.addEventListener("click", closeCheckout);
}

updateCompatibilityButtons();
updateDreamQuotaUI();

window.renderBaziPreview = renderResult;



