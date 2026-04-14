const stepButtons = Array.from(document.querySelectorAll(".step"));
const stepPanels = Array.from(document.querySelectorAll(".step-panel"));
const form = document.getElementById("bazi-form");
const directForm = document.getElementById("bazi-direct-form");
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
const followupSuggestions = document.getElementById("followup-suggestions");
const followupForm = document.getElementById("followup-form");
const followupInput = document.getElementById("followup-input");
const followupResponse = document.getElementById("followup-response");
const followupAnswer = document.getElementById("followup-answer");
const birthdayInput = document.getElementById("birthday-input");
const birthTimeInput = document.getElementById("birth-time-input");
const timeRangeSelect = document.getElementById("time-range-select");

let activeStep = 0;
let latestResult = null;
let latestFormData = null;

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

function getFeedbackElement(targetForm) {
  if (targetForm === form) return formFeedback;
  if (targetForm === directForm) return directFormFeedback;
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

function renderPillars(pillars) {
  const body = document.getElementById("pillars-body");
  body.innerHTML = pillars
    .map((pillar) => {
      const hidden = pillar.hideGan.length ? pillar.hideGan.join("、") : "-";
      const zhiShen = pillar.shishenZhi.length ? pillar.shishenZhi.join("、") : "-";
      const note = [pillar.nayin, pillar.diShi].filter(Boolean).join(" · ") || "-";
      return `
        <tr>
          <td>${pillar.label}</td>
          <td>${pillar.gan || "-"}</td>
          <td>${pillar.zhi || "-"}</td>
          <td>${pillar.wuxing || "-"}</td>
          <td>${hidden}<br>${pillar.shishenGan || "-"} / ${zhiShen}<br>${note}</td>
        </tr>
      `;
    })
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
  container.innerHTML = tenGods.dominant
    .map(
      (item, index) => `
        <article class="ten-god-chip">
          <span>${index === 0 ? "当前最强" : "命盘主题"}</span>
          <strong>${item.name}</strong>
          <span>${item.keyword}</span>
          <small>${item.relation}</small>
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
  const suggestions = [
    "我最近更适合稳住，还是主动做变化？",
    "感情里我更容易卡在哪一种关系模式？",
    "接下来一两年工作上该更主动一点吗？",
    "如果出生时间不够准，哪些判断最值得再校正？",
  ];

  if ((formData.focus || "overall") === "career") {
    suggestions.unshift("我的事业运更适合慢慢积累，还是主动争机会？");
  }

  if ((formData.focus || "overall") === "relationship") {
    suggestions.unshift("这张盘在感情里最需要被看见的需求是什么？");
  }

  if (result.timeInsight.mode !== "manual-bazi" && !result.meta.timeExact) {
    suggestions.unshift("如果我只知道大概时段，先看哪些共性最有参考价值？");
  }

  return suggestions.slice(0, 4);
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
  const currentDaYun = result.luck.currentDaYun
    ? `${result.luck.currentDaYun.ganzhi}（${result.luck.currentDaYun.startYear}-${result.luck.currentDaYun.endYear}）`
    : "当前阶段";
  const annualLead = result.annualCards[0]
    ? `${result.annualCards[0].year}年是 ${result.annualCards[0].ganzhi}，主题偏向“${result.annualCards[0].title}”`
    : "未来几年先看整体节奏";
  const dominantTenGod = result.tenGods.dominant[0]?.name || "命盘主题";
  const favorable = result.favorableElements.join("、");
  const text = question.toLowerCase();
  const isRelationship = /感情|关系|喜欢|对象|恋爱|婚姻|亲密|安全感/.test(question);
  const isCareer = /工作|事业|财运|换工作|收入|发展|升职|选择/.test(question);
  const poeticLead = isRelationship
    ? "情不知所起，先看其深浅，再看其去处。"
    : isCareer
      ? "行到水穷处，未必要急着转身，也可以先看哪一条路更稳。"
      : "一气流行，各有归处。问的不是吉凶两个字，而是这股气会把你带向哪里。";
  const currentTheme = isRelationship
    ? result.analysis.intimacy
    : isCareer
      ? result.analysis.career
      : result.analysis.overview;
  const practicalHint = isRelationship
    ? `顺着这张盘看，关系这一面更在意的是确定感和真实回应。${result.analysis.securityNeed}`
    : isCareer
      ? `顺着这张盘看，这几年更适合先把位置放到能长期积累的方向里。${result.analysis.changeArea}`
      : `顺着这张盘看，眼下最值得先看清的，是哪种环境能让状态慢慢松开。${result.analysis.burnout}`;
  const readingLead = isRelationship
    ? "这类问题不能只看一时心动，更要看命里真正需要怎样的关系方式。"
    : isCareer
      ? "这类现实选择不能只看眼前轻松不轻松，更要看它是不是合当下这步运。"
      : "这类问题不能只用一句吉或凶来答，还是要回到命局本身。";

  return `${poeticLead} 所问的是“${question}”。${readingLead} 按八字的次序，先看日主，这张盘属 ${result.dayMaster.pattern}；再看十神，眼下更显眼的是 ${dominantTenGod}；最后落到大运流年，目前行 ${currentDaYun}，而 ${annualLead} 已经把这一层主题推到眼前。${currentTheme} ${practicalHint} 更贴近这张盘的建议是：先别急着用一句“要不要”定死方向，先看哪条路更稳、更长，也更少消耗。若要继续细看，把问题收窄到一个场景，例如“未来两年感情里最该注意什么”或“换工作时最该避开什么”，这样更能顺着命盘往下读。`;
}

function renderResult(formData, result) {
  latestFormData = formData;
  latestResult = result;
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
    .map((item) => `<p>${item}</p>`)
    .join("");
  document.getElementById("analysis-healing").innerHTML = healingText || "<p>-</p>";

  renderPillars(result.pillars);
  renderElements(result.elements);
  renderTimeInsight(result.timeInsight);
  renderTenGods(result.tenGods);
  renderAnnualCards(result.annualCards);
  renderFollowupSuggestions(formData, result);

  if (followupResponse) {
    followupResponse.classList.add("is-hidden");
  }
  if (followupAnswer) {
    followupAnswer.textContent = "-";
  }

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

    followupAnswer.textContent = buildFollowupAnswer(question, latestFormData, latestResult);
    followupResponse.classList.remove("is-hidden");
    followupResponse.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

window.renderBaziPreview = renderResult;
