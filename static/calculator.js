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
const followupThread = document.getElementById("followup-thread");
const birthdayInput = document.getElementById("birthday-input");
const birthTimeInput = document.getElementById("birth-time-input");
const timeRangeSelect = document.getElementById("time-range-select");

let activeStep = 0;
let latestResult = null;
let latestFormData = null;
let followupHistory = [];

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
  const suggestions = [];
  const focus = formData.focus || "overall";
  const dominant = result.tenGods.dominant[0]?.name || "";
  const second = result.tenGods.dominant[1]?.name || "";
  const geju = result.geju.label || "";
  const pattern = result.dayMaster.pattern || "";

  const pushMany = (...items) => {
    items.filter(Boolean).forEach((item) => suggestions.push(item));
  };

  if (focus === "relationship") {
    pushMany(
      "这张盘在关系里最怕哪一种落空：没人回应，还是回应不够真？",
      "未来两年感情里最该先看清的一个点是什么？",
    );
  } else if (focus === "career") {
    pushMany(
      "这张盘眼下更适合稳住位置，还是顺势换到新的轨道？",
      "未来两年工作里最该避开的消耗点是什么？",
    );
  } else if (focus === "finance") {
    pushMany(
      "这张盘的财更像靠位置、能力，还是靠节奏抓机会？",
      "未来两年最该守住的钱，是收入、开销，还是错误投入？",
    );
  } else {
    pushMany(
      "这张盘眼下最该先看清的一层主题是什么？",
      "现在这步运，真正被推到眼前的事情是哪一类？",
    );
  }

  if (result.timeInsight.mode !== "manual-bazi" && !result.meta.timeExact) {
    pushMany("如果出生时间只知道大概时段，先看哪些共性最有参考价值？");
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

function detectFollowupTrack(question) {
  const q = question || "";
  if (/感情|关系|喜欢|桃花|对象|婚|亲密|相处|恋爱/.test(q)) return "relationship";
  if (/工作|事业|岗位|升职|职业|跳槽|换工作|公司|发展/.test(q)) return "career";
  if (/财|钱|收入|副业|赚钱|存款|开销|花销|投资|负债/.test(q)) return "finance";
  if (/时辰|出生时间|时段|几点|校准|模糊时间|晚上|早上|中午|下午/.test(q)) return "time";
  return "overall";
}

function buildNextFollowupPrompts(track, result) {
  const dominant = result.tenGods.dominant[0]?.name || "";
  const currentDaYun = result.luck.currentDaYun?.ganzhi || "这步大运";

  if (track === "relationship") {
    return [
      "未来两年关系里最该防的是冷下来，还是看走眼？",
      dominant.includes("印")
        ? "这张盘在感情里最难开口的真实需求是什么？"
        : "这张盘在关系里最容易先忍住不说的，是哪一种委屈？",
    ];
  }

  if (track === "career") {
    return [
      `${currentDaYun}这一步，更适合守住位置，还是主动争取变化？`,
      dominant.includes("食") || dominant.includes("伤")
        ? "这张盘最该把判断和表达用在什么工作位置上？"
        : "这张盘最值得长期投入的职业路径是哪一类？",
    ];
  }

  if (track === "finance") {
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

function renderResult(formData, result) {
  latestFormData = formData;
  latestResult = result;
  followupHistory = [];
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
  if (followupThread) {
    followupThread.innerHTML = "";
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

    const answer = buildFollowupAnswer(question, latestFormData, latestResult);
    const track = detectFollowupTrack(question);
    followupHistory.push({ question, answer, track });
    renderFollowupThread();
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

window.renderBaziPreview = renderResult;
