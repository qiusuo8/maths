let data = null;
let boardData = null;

const toastState = {
  timer: null
};

const DETAIL_PAGE_SIZE = 50;

const boardConfig = {
  growth: {
    file: "growth"
  },
  interaction: {
    file: "interaction"
  },
  accuracy: {
    file: "accuracy"
  }
};

function numberFormat(value, digits = 1) {
  return Number(value).toFixed(digits).replace(/\.0+$/, "");
}

function getPageType() {
  return document.body.dataset.page || "course-home";
}

function getHomeUrl() {
  return "./index.html";
}

function getCourseListUrl() {
  return "../../index.html";
}

function goBack(fallbackUrl) {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = fallbackUrl;
}

async function loadData() {
  const response = await fetch("./summary.json");
  if (!response.ok) {
    throw new Error(`加载 summary.json 失败: ${response.status}`);
  }
  data = await response.json();
}

async function loadBoardData(boardKey) {
  const config = boardConfig[boardKey];
  if (!config) {
    throw new Error(`未知榜单类型: ${boardKey}`);
  }
  const response = await fetch(`./boards/${config.file}.json`);
  if (!response.ok) {
    throw new Error(`加载 ${config.file}.json 失败: ${response.status}`);
  }
  boardData = await response.json();
}

function renderHeaderAndRank() {
  document.title = `${data.childName}的小组成长激励榜`;
  document.getElementById("hero-title").textContent = `${data.childName}的小组成长激励榜`;
  document.getElementById("hero-subtitle").textContent = `${data.courseDateLabel} · ${data.courseTitle}`;
  document.getElementById("hero-message").textContent = data.heroMessage;

  const rankCard = document.getElementById("rank-card");
  rankCard.innerHTML = `
    <div class="rank-grid">
      <div>
        <span class="rank-badge">🏆 全班成长榜</span>
        <div class="rank-number">第 ${data.rankInfo.classRank} 名</div>
        <div class="muted">${data.rankInfo.classTotal} 位本课有效报告同学参与本次激励榜</div>
        <div class="rank-score"><strong>${numberFormat(data.rankInfo.growthScore)}</strong><span>成长积分</span></div>
      </div>
      <div class="rank-aside">
        <span class="pill">${data.rankInfo.label}</span>
        <span class="mini-pill">${
          data.rankInfo.groupRank
            ? `小组第 ${data.rankInfo.groupRank} / ${data.rankInfo.groupTotal}`
            : "未配置真实小组名单"
        }</span>
        <span class="mini-pill">距前 ${data.rankInfo.nextGoalRank} 名还差 ${numberFormat(data.rankInfo.scoreGapToTop)} 分</span>
      </div>
    </div>
    <div class="callout">
      ${data.rankInfo.encouragement}
    </div>
  `;
}

function renderExtraRanks() {
  const container = document.getElementById("extra-ranks");
  const items = [
    ["全班成长榜", data.extraRanks.classGrowth],
    ["小组成长榜", data.extraRanks.groupGrowth],
    ["全班互动榜", data.extraRanks.classInteraction],
    ["全班正确率榜", data.extraRanks.classAccuracy]
  ];
  container.innerHTML = items
    .map(
      ([label, value]) => `
        <div class="rule-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");
}

function renderStats() {
  const container = document.getElementById("stats-grid");
  const highestLikes = data.stats.highestLikes ?? data.interactionTop20?.[0]?.value ?? data.stats.likes ?? 0;
  const highestHomeworkScore = data.stats.highestHomeworkScore ?? data.stats.homeworkScore ?? 0;
  const items = [
    {
      label: "完成率",
      value: `${numberFormat(data.stats.completeRate, 0)}%`,
      notes: ["满格完成"]
    },
    {
      label: "正确率",
      value: `${numberFormat(data.stats.accuracy, 2)}%`,
      notes: ["超过平均线", `平均 ${numberFormat(data.stats.averageAccuracy, 2)}%`],
      compare: data.stats.accuracy
    },
    {
      label: "点赞",
      value: `${data.stats.likes}`,
      notes: ["课堂互动", `最高赞 ${highestLikes}`]
    },
    {
      label: "作业",
      value: data.stats.homeworkScore == null ? "--" : `${numberFormat(data.stats.homeworkScore, 0)}分`,
      notes: ["课后表现", `最高分 ${numberFormat(highestHomeworkScore, 0)}分`]
    },
    {
      label: "出勤",
      value: `${numberFormat(data.stats.attendanceDuration, 0)}分钟`,
      notes: ["在课时长"]
    },
    {
      label: "学习投入",
      value: `${numberFormat(data.stats.engagementRate, 0)}%`,
      notes: ["按在课时长估算"]
    }
  ];

  container.innerHTML = items
    .map((item) => {
      const notes = item.notes
        .map((note) => `<span class="mini-pill">${note}</span>`)
        .join("");
      const compareBar = item.compare
        ? `<div class="compare-bar"><span style="width:${Math.max(6, Math.min(100, item.compare))}%"></span></div>`
        : "";
      return `
        <article class="stat-card">
          <div class="stat-label">${item.label}</div>
          <div class="stat-value">${item.value}</div>
          <div class="stat-note">${notes}</div>
          ${compareBar}
        </article>
      `;
    })
    .join("");

  const rules = document.getElementById("score-rules");
  rules.innerHTML = data.scoreRules
    .map(
      (rule) => `
        <div class="rule-row">
          <span>${rule.label}</span>
          <strong>${rule.score} 分</strong>
        </div>
      `
    )
    .join("");

  document.getElementById("score-rule-summary").textContent = data.scoreRuleSummary;
}

function renderRankRows(containerId, rows, valueLabel = "成长积分", valueKey = "score") {
  const container = document.getElementById(containerId);
  container.innerHTML = rows
    .map((item) => {
      const medalClass = item.rank <= 3 ? `rank-${item.rank}` : "rank-plain";
      const medalText = item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : item.rank;
      const rowClass = item.name === data.childName ? "rank-row is-highlight" : "rank-row";
      const rawValue = item[valueKey];
      const displayValue =
        typeof rawValue === "number" && valueLabel === "%" ? `${numberFormat(rawValue, 2)}%` : numberFormat(rawValue);
      return `
        <div class="${rowClass}">
          <div class="medal ${medalClass}">${medalText}</div>
          <div class="row-main">
            <strong>${item.name}</strong>
            <span>${[item.tag, item.classRank ? `全班第 ${item.classRank} 名` : ""].filter(Boolean).join(" · ")}</span>
          </div>
          <div class="row-side">
            <strong>${displayValue}</strong>
            <span>${valueLabel}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderInteractionTop10() {
  renderRankRows("interaction-top10", data.interactionTop20 ?? [], "点赞", "value");
  document.getElementById("interaction-summary").textContent = data.interactionSummary;
}

function getDetailParams() {
  const params = new URLSearchParams(window.location.search);
  const boardKey = params.get("board") || "growth";
  const page = Math.max(1, Number(params.get("page")) || 1);
  return { boardKey, page };
}

function buildPageButton(label, disabled, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "page-button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function updateDetailUrl(boardKey, page) {
  const params = new URLSearchParams(window.location.search);
  params.set("board", boardKey);
  params.set("page", String(page));
  window.location.href = `./detail.html?${params.toString()}`;
}

function renderDetailView(boardKey, page) {
  if (!boardData || boardData.key !== boardKey) {
    window.location.href = getHomeUrl();
    return;
  }

  const rows = boardData.allRows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / DETAIL_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * DETAIL_PAGE_SIZE;
  const pageRows = rows.slice(start, start + DETAIL_PAGE_SIZE);

  document.title = `${data.childName} · ${boardData.title}`;
  document.getElementById("detail-title").textContent = boardData.title;
  document.getElementById("detail-subtitle").textContent =
    `${boardData.subtitle} · 第 ${currentPage} / ${totalPages} 页 · 每页 ${DETAIL_PAGE_SIZE} 条`;
  renderRankRows("detail-list", pageRows, boardData.valueLabel, boardData.valueKey);

  const pagination = document.getElementById("detail-pagination");
  pagination.innerHTML = "";
  pagination.appendChild(
    buildPageButton("上一页", currentPage <= 1, () => {
      updateDetailUrl(boardKey, currentPage - 1);
    })
  );

  const indicator = document.createElement("span");
  indicator.className = "page-indicator";
  indicator.textContent = `${currentPage} / ${totalPages}`;
  pagination.appendChild(indicator);

  pagination.appendChild(
    buildPageButton("下一页", currentPage >= totalPages, () => {
      updateDetailUrl(boardKey, currentPage + 1);
    })
  );

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderGroupNames() {
  const container = document.getElementById("group-names");
  document.getElementById("group-count").textContent = `已完课小伙伴：${data.groupNames.length} 位`;
  container.innerHTML = data.groupNames
    .map((name) => {
      const selfClass = name === data.childName ? "name-badge is-self" : "name-badge";
      const suffix = name === data.childName ? " · 我也完成啦" : "";
      return `<button type="button" class="${selfClass}" data-name="${name}">${name}${suffix}</button>`;
    })
    .join("");

  container.querySelectorAll(".name-badge").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.add("is-pressed");
      window.setTimeout(() => button.classList.remove("is-pressed"), 160);
    });
  });
}

function renderGoals() {
  const container = document.getElementById("goal-list");
  container.innerHTML = data.goals
    .map(
      (goal) => `
        <div class="goal-row">
          <span class="goal-icon">☑️</span>
          <span>${goal}</span>
        </div>
      `
    )
    .join("");
}

function renderCommentary() {
  document.getElementById("commentary").textContent = data.commentary;
}

function initAnimations() {
  const rankCard = document.getElementById("rank-card");
  if (rankCard) {
    window.setTimeout(() => rankCard.classList.add("is-popped"), 120);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".card-observe").forEach((node) => observer.observe(node));
}

function showToast(message = "已收到加油能量，下一次继续冲榜！") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastState.timer);
  toastState.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function bindHomeEvents() {
  document.getElementById("energy-button").addEventListener("click", () => {
    showToast();
  });
  document.getElementById("home-back").addEventListener("click", () => {
    goBack(getCourseListUrl());
  });
}

function bindDetailEvents() {
  document.getElementById("detail-back").addEventListener("click", () => {
    goBack(getHomeUrl());
  });
}

function renderHomePage() {
  renderHeaderAndRank();
  renderExtraRanks();
  renderStats();
  renderRankRows("class-top10", data.growthTop20 ?? []);
  renderRankRows("group-top10", data.groupTop10);
  renderInteractionTop10();
  renderRankRows("accuracy-top10", data.accuracyTop20 ?? [], "%", "value");
  renderGroupNames();
  renderGoals();
  renderCommentary();
  bindHomeEvents();
  initAnimations();
}

async function renderDetailPage() {
  const { boardKey, page } = getDetailParams();
  await loadBoardData(boardKey);
  bindDetailEvents();
  renderDetailView(boardKey, page);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    if (getPageType() === "course-detail") {
      await renderDetailPage();
      return;
    }
    renderHomePage();
  } catch (error) {
    document.body.innerHTML = `<main class="page-shell"><section class="panel detail-panel"><p class="commentary">页面加载失败：${error.message}</p></section></main>`;
    console.error(error);
  }
});
