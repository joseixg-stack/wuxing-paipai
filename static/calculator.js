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
    "rule-aware": `这张盘不是没主见，而是先把事情在心里过一遍。${dayMaster}落在${geju}里，做决定时会先看规矩到底有没有道理，所以很多时候不是慢，而是不愿意糊里糊涂答应。`,
    "steady-system": `这张盘重的是稳和次序。很多事一上来不会先看热闹，而是先看值不值得长期放进去，所以在别人眼里常常会显得靠谱、能扛、也比较有边界。`,
    "sharp-tension": `这张盘的厉害之处，不在表面强硬，而在心里同时有判断和标准。想法来得快，要求也高，所以真正累人的，常常不是外面拦着，而是心里那把尺先顶上去了。`,
    "output-to-value": `这张盘不怕做事，怕的是做了却白做。很多机会都长在表达、执行、把事情做出结果的过程中，所以只要方向对了，越做越容易看到回头钱。`,
    "guarded-sense": `这张盘表面不一定锋利，但里面的防线很清楚。很多事会先看风险，再决定要不要把心力和时间放进去，所以真正让状态松开的，不是催，而是确认感。`,
    "inner-first": `这张盘先往里走。很多判断不会立刻说出来，而是先在心里慢慢成形，所以真正需要的，不是别人替着下决定，而是给一点时间把那股气理顺。`,
    "expression-first": `这张盘的重点在“想法不能闷太久”。很多事一旦看明白，就会想表达、想推进、想把话说透，所以最怕的不是没能力，而是把心里那股劲耗在反复犹豫里。`,
    "practical-first": `这张盘更讲实际。很多选择最后都会回到值不值、稳不稳、能不能落地，所以不是不愿意试，而是不想把时间花在一眼就站不住的地方。`,
    "balanced-core": `这张盘不是只靠一股劲往前冲，而是几层力量一起在推。读这类盘，重点不在一句吉凶，而在先看现在最需要把哪一层想明白。`,
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
  if (geju) glossary.push(`格局可以先当成这张盘的做事骨架。像这里的${geju}，说白了不是术语本身厉害，而是它会让人更偏向某一种处事方式。`);
  if (dominant) glossary.push(`十神可以先当成“最常用的反应模式”。眼下更显眼的是${[dominant, second].filter(Boolean).join("、")}，所以很多选择会自然带着这一层习惯。`);
  if (pattern) glossary.push(`${pattern}不等于好坏，只是在说这张盘此刻是更容易先往前顶，还是更需要外界托一把。`);

  return [baseMap[signature], actionMap[signature], ...glossary].filter(Boolean);
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
    比肩: "更像自己的那股劲，遇事会先按自己的判断来。",
    劫财: "像不服输的那一面，容易自己上手，也容易不想吃亏。",
    食神: "像把事慢慢做顺的能力，适合稳定输出和长期积累。",
    伤官: "像脑子快、表达快、标准也高，不容易被轻易说服。",
    正财: "更像踏实经营出来的钱，讲究稳、值不值、能不能落地。",
    偏财: "更像机会和资源，要看眼力，也看节奏感。",
    正官: "更像规则、责任、位置，很多事会先看能不能站住。",
    七杀: "更像压力和推动力，逼着人尽快长出判断。",
    正印: "更像被托住、被理解、被系统接住的力量。",
    偏印: "更像先想透、先防风险、先看值不值得。"
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

  if (hits.relationship) {
    if (relationFearHit) {
      return `${relationshipOpening("fear")} ${relationRead("fear")} ${baseTone()} ${driveTone()} ${timingTone()} 所以关系里最容易卡住的，不是表面的来往多少，而是回应稳不稳、边界清不清、说过的话能不能落下来。`;
    }
    if (relationNeedHit) {
      return `${relationshipOpening("need")} ${relationRead("need")} ${baseTone()} ${driveTone()} ${timingTone()} 真正有用的，多半是稳定回应、说话算数、情绪别忽冷忽热，也愿意把关系落进日常。`;
    }
    if (relationBoundaryHit) {
      return `${relationshipOpening("boundary")} ${relationRead("boundary")} ${baseTone()} ${driveTone()} ${timingTone()} 所以真正让心里松开的，不是嘴上承诺，而是该回应的时候有回应，该站出来的时候站得出来。`;
    }
    return `${relationshipOpening("default")} ${relationRead("default")} ${baseTone()} ${driveTone()} ${timingTone()} ${finishTone("relationship")}`;
  }
  if (hits.career) {
    if (careerPositionHit) {
      return `${careerOpening("position")} ${careerRead("position")} ${baseTone()} ${themeTone()} ${timingTone()} 所以更值得先找的，不是最热的位置，而是既能用上判断、又不会把状态磨空的那类环境。`;
    }
    if (careerChangeHit) {
      return `${careerOpening("change")} 问到要不要换、该不该动，关键从来不是外面动静大不大，而是这一步运到底在催守，还是催变。${baseTone()} ${driveTone()} ${themeTone()} ${timingTone()} 真正要看的，是眼前这一下变化会不会把路越走越清，还是只是把人先推得更累。`;
    }
    if (careerStrengthHit) {
      return `${careerOpening("strength")} 这张盘在工作里最值钱的，往往不是表面能扛，而是哪一层判断、分寸和做事方式其实一直都在。${baseTone()} ${driveTone()} ${themeTone()} ${timingTone()} 所以最怕的不是没能力，而是一直把最能换位置的那部分，耗在不值得的小地方。`;
    }
    return `${careerOpening("default")} ${careerRead("default")} ${baseTone()} 放到事业上，这张盘不适合只看表面机会，更该看什么位置能把这股气用对。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("career")}`;
  }
  if (hits.finance) {
    if (financeSourceHit) {
      return `${financeOpening("source")} 问到财路，先别急着想有没有横出来的一笔，更该先看这张盘的钱是从什么地方慢慢长出来。${baseTone()} ${driveTone()} ${themeTone()} ${timingTone()} 所以比起撞运气，这张盘更适合把力气放在能兑现能力、位置或结果的地方。`;
    }
    if (financeLeakHit) {
      return `${financeOpening("leak")} 问到漏财，常常不是钱自己跑掉，而是某一类消耗一直没被看清。${baseTone()} ${driveTone()} ${themeTone()} ${timingTone()} 真正该守的，往往不是一笔具体数字，而是别把时间、精力和钱都花在明知道站不住的地方。`;
    }
    if (financeRhythmHit) {
      return `${financeOpening("rhythm")} 这张盘看财，更像看节奏，而不是只看快慢。${baseTone()} ${driveTone()} ${themeTone()} ${timingTone()} 所以更值得先分清的，是适合慢慢累出稳定感，还是在某个阶段顺势发一把力。`;
    }
    return `${financeOpening("default")} ${financeRead("default")} ${baseTone()} 放到财这件事上，先看的不是快不快，而是钱更像从哪里长出来。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("finance")}`;
  }
  if (hits.time) {
    const prompt = result.timeInsight?.prompt || "如果出生时间还不够准，就先看年、月、日三柱里不会变的那部分。";
    if (timeCommonHit) {
      return `${timeOpening("common")} 这种问法最稳，因为先抓共性，比急着猜准更有用。${baseTone()} ${prompt} ${timingTone()} 所以先不会跑掉的，多半还是日主、格局、主导十神和这步运推出来的主轴。`;
    }
    if (timeDiffHit) {
      return `${timeOpening("diff")} 真正会被时柱拉开的，往往不是整张盘翻掉，而是某些细处开始分出不同走法。${baseTone()} ${prompt} ${timingTone()} 所以更容易变化的，多半会落在关系表达、晚运感受、以及事情最后是怎么落地。`;
    }
    if (timeCalibrationHit) {
      return `${timeOpening("calibration")} 校时这件事，不是一下子拍脑袋定，而是先把不变的底色看稳，再拿会分叉的地方去对照经历。${baseTone()} ${prompt} ${timingTone()} 越是把问题问细，比如哪几年关系、工作、搬动最明显，时柱就越容易慢慢缩准。`;
    }
    return `${timeOpening("default")} ${timeRead("default")} ${baseTone()} 问到时辰，最稳的看法是先把不会变的底色捞出来，再看时柱会把哪些细节拉开。${prompt} ${timingTone()} ${finishTone("time")}`;
  }
  if (hits.expression) {
    return `${openingTone("expression")} ${baseTone()} 真正要看的，不是心里有没有想法，而是这股想法最后落到哪里，才不会转一圈又闷回自己身上。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("expression")}`;
  }
  if (hits.burnout) {
    return `${openingTone("burnout")} ${baseTone()} 问到内耗，往往不是事情太难，而是心里那股力往哪儿使。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("burnout")}`;
  }
  if (hits.security) {
    return `${openingTone("security")} ${baseTone()} 问到安全感，先看的不是别人做得够不够，而是这张盘真正靠什么才能慢慢松下来。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("security")}`;
  }
  if (hits.change) {
    return `${openingTone("change")} ${baseTone()} 问到变化，关键不是会不会变，而是先往哪一层变。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("change")}`;
  }
  if (hits.theme) {
    return `${openingTone("theme")} ${baseTone()} 这会儿最该先抓住的，不是外面哪件事最吵，而是命盘里哪一层力量已经先冒到前面来了。${driveTone()} ${themeTone()} ${timingTone()} ${finishTone("theme")}`;
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

    const answer = buildFollowupAnswerV2(question, latestFormData, latestResult);
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



