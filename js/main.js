import { subscribeToAuth } from "./auth.js";
import { groups, STORAGE_PREFIX, VALID_TABS } from "./data.js";
import { mergeKnockoutMatches } from "./knockout.js";
import {
  calculateOfficialStandings,
  calculateStandings
} from "./standings.js";
import {
  clearScores,
  getKnockoutQualifiedTeam,
  setKnockoutQualifiedTeam,
  setKnockoutScore,
  setScore
} from "./storage.js";
import {
  renderCalendar,
  renderGroupFilter,
  renderKnockout,
  renderKnockoutFilter,
  renderOverview,
  renderRanking,
  renderSimulator,
  renderStandings,
  renderSyncStatus
} from "./render.js";
import {
  confirmKnockoutPrediction,
  confirmPrediction,
  subscribeToMatchPredictionSummaries,
  subscribeToOfficialMatches,
  subscribeToPredictions,
  subscribeToRanking,
  subscribeToSyncStatus
} from "./bolao.js";
import { buildTodayPredictionsMessage } from "./share-predictions.js";

const state = {
  activeTab: "overview",
  activeGroup: "ALL",
  todayOnly: false,
  knockoutTodayOnly: false,
  query: "",
  expandedGroups: new Set(),
  user: null,
  predictions: {},
  matchPredictionSummaries: {},
  officialMatches: {},
  syncStatus: null,
  ranking: []
};

let unsubscribePredictions = null;
let unsubscribeMatches = null;
let unsubscribeRanking = null;
let unsubscribeMatchPredictionSummaries = null;
let unsubscribeSyncStatus = null;

const els = {
  tabs: document.querySelectorAll("[data-tab]"),
  tabsNav: document.getElementById("mainTabs"),
  panels: document.querySelectorAll("[data-panel]"),
  mobileNavToggle: document.getElementById("mobileNavToggle"),
  mobileNavCurrent: document.getElementById("mobileNavCurrent"),
  installAppBtn: document.getElementById("installAppBtn"),
  search: document.getElementById("globalSearch"),
  clearSearch: document.getElementById("clearSearch"),
  resetScores: document.getElementById("resetScores"),
  groupFilter: document.getElementById("groupFilter"),
  knockoutFilter: document.getElementById("knockoutFilter"),
  groupsGrid: document.getElementById("groupsGrid"),
  standingsGrid: document.getElementById("standingsGrid"),
  rankingList: document.getElementById("rankingList"),
  rankingEmpty: document.getElementById("rankingEmpty"),
  rankingMeta: document.getElementById("rankingMeta"),
  calendarList: document.getElementById("calendarList"),
  leadersGrid: document.getElementById("leadersGrid"),
  dailyLeaders: document.getElementById("dailyLeaders"),
  dashboardMetrics: document.getElementById("dashboardMetrics"),
  simulatorEmpty: document.getElementById("simulatorEmpty"),
  knockoutGrid: document.getElementById("knockoutGrid"),
  knockoutEmpty: document.getElementById("knockoutEmpty"),
  knockoutMeta: document.getElementById("knockoutMeta"),
  standingsEmpty: document.getElementById("standingsEmpty"),
  calendarEmpty: document.getElementById("calendarEmpty"),
  simulatorMeta: document.getElementById("simulatorMeta"),
  standingsMeta: document.getElementById("standingsMeta"),
  calendarMeta: document.getElementById("calendarMeta"),
  overviewMeta: document.getElementById("overviewMeta"),
  heroGroups: document.getElementById("heroGroups"),
  heroTeams: document.getElementById("heroTeams"),
  heroFilled: document.getElementById("heroFilled"),
  toast: document.getElementById("toast")
};

const TAB_LABELS = {
  overview: "Painel",
  simulator: "Simulador",
  knockout: "Mata-mata",
  ranking: "Ranking",
  standings: "Classificação",
  calendar: "Jogos",
  rules: "Regras"
};

let deferredInstallPrompt = null;

function switchTab(tabName, updateHash = true) {
  const nextTab = VALID_TABS.includes(tabName) ? tabName : "overview";
  state.activeTab = nextTab;
  localStorage.setItem(`${STORAGE_PREFIX}lastTab`, nextTab);

  els.tabs.forEach((tab) => {
    const active = tab.dataset.tab === nextTab;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  els.panels.forEach((panel) => {
    const active = panel.dataset.panel === nextTab;
    panel.classList.toggle("active", active);
  });

  els.mobileNavCurrent.textContent = TAB_LABELS[nextTab] || "Menu";
  els.tabsNav.classList.remove("mobile-open");
  els.mobileNavToggle.setAttribute("aria-expanded", "false");

  if (updateHash && location.hash.replace("#", "") !== nextTab) {
    history.replaceState(null, "", `#${nextTab}`);
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function renderAll() {
  const simulatedStandings = calculateStandings();
  const officialStandings = calculateOfficialStandings(state.officialMatches);
  const syncStatusText = renderSyncStatus(state.syncStatus);
  const groupFilterHtml = renderGroupFilter(state);
  els.groupFilter.innerHTML = groupFilterHtml;
  els.knockoutFilter.innerHTML = renderKnockoutFilter(state);

  const overview = renderOverview(state, officialStandings);
  els.dashboardMetrics.innerHTML = overview.metrics;
  els.dailyLeaders.innerHTML = overview.dailyLeaders;
  els.leadersGrid.innerHTML = overview.leaders;
  els.overviewMeta.textContent = `${overview.meta} · ${syncStatusText}`;
  els.heroGroups.textContent = overview.heroGroups;
  els.heroTeams.textContent = overview.heroTeams;
  els.heroFilled.textContent = overview.heroFilled;

  const simulator = renderSimulator(state, simulatedStandings);
  els.groupsGrid.innerHTML = simulator.html;
  els.simulatorEmpty.classList.toggle("active", simulator.empty);
  els.simulatorEmpty.textContent = simulator.emptyMessage;
  els.simulatorMeta.textContent = `${simulator.meta} · ${syncStatusText}`;

  const knockout = renderKnockout(state);
  els.knockoutGrid.innerHTML = knockout.html;
  els.knockoutEmpty.classList.toggle("active", knockout.empty);
  els.knockoutEmpty.textContent = knockout.emptyMessage;
  els.knockoutMeta.textContent = `${knockout.meta} · ${syncStatusText}`;

  const standingsView = renderStandings(state, officialStandings);
  els.standingsGrid.innerHTML = standingsView.html;
  els.standingsEmpty.classList.toggle("active", standingsView.empty);
  els.standingsMeta.textContent = `${standingsView.meta} · ${syncStatusText}`;

  const calendar = renderCalendar(state);
  els.calendarList.innerHTML = calendar.html;
  els.calendarEmpty.classList.toggle("active", calendar.empty);
  els.calendarMeta.textContent = `${calendar.meta} · ${syncStatusText}`;

  const rankingView = renderRanking(state.ranking, state.user?.uid);
  els.rankingList.innerHTML = rankingView.html;
  els.rankingEmpty.classList.toggle("active", rankingView.empty);
  els.rankingMeta.textContent = rankingView.meta;
}

function resetScoresAction() {
  const confirmed = window.confirm("Deseja apagar apenas os placares salvos deste simulador?");
  if (!confirmed) return;
  clearScores();
  state.expandedGroups.clear();
  renderAll();
  showToast("Placares apagados com sucesso!");
}

function sanitizeScore(value) {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? "" : String(Math.min(99, Number(digits)));
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Falha ao copiar.");
}

function copyTodayPredictions({ button, phase, noGamesMessage, noPredictionsMessage }) {
  const officialMatches = phase === "knockout"
    ? {
        ...state.officialMatches,
        ...Object.fromEntries(mergeKnockoutMatches(state.officialMatches).map((match) => [match.id, match]))
      }
    : state.officialMatches;
  const message = buildTodayPredictionsMessage({
    predictions: state.predictions,
    officialMatches,
    displayName: state.user?.displayName || "",
    phase
  });

  if (!message.todayCount) {
    showToast(noGamesMessage);
    return;
  }
  if (!message.confirmedCount) {
    showToast(noPredictionsMessage);
    return;
  }

  button.disabled = true;
  copyText(message.text)
    .then(() => {
      const suffix = message.missingCount
        ? ` ${message.missingCount} ainda não confirmado${message.missingCount === 1 ? "" : "s"}.`
        : "";
      showToast(`Palpites copiados!${suffix}`);
    })
    .catch(() => showToast("Não foi possível copiar os palpites."))
    .finally(() => {
      button.disabled = false;
    });
}

els.resetScores.addEventListener("click", resetScoresAction);

els.mobileNavToggle.addEventListener("click", () => {
  const isOpen = els.tabsNav.classList.toggle("mobile-open");
  els.mobileNavToggle.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
  if (!els.tabsNav.classList.contains("mobile-open")) return;
  if (event.target.closest("#mainTabs") || event.target.closest("#mobileNavToggle")) return;
  els.tabsNav.classList.remove("mobile-open");
  els.mobileNavToggle.setAttribute("aria-expanded", "false");
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installAppBtn.hidden = false;
});

els.installAppBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    showToast("Use o menu do navegador para adicionar à tela inicial.");
    return;
  }

  els.installAppBtn.disabled = true;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  els.installAppBtn.hidden = true;
  els.installAppBtn.disabled = false;
  if (choice?.outcome === "accepted") showToast("App instalado com sucesso!");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  els.installAppBtn.hidden = true;
});

els.groupFilter.addEventListener("click", (event) => {
  const shareButton = event.target.closest("[data-share-today]");
  if (shareButton) {
    copyTodayPredictions({
      button: shareButton,
      phase: "group",
      noGamesMessage: "Não há jogos de grupos hoje.",
      noPredictionsMessage: "Confirme ao menos um palpite de grupo de hoje antes de compartilhar."
    });
    return;
  }

  const todayButton = event.target.closest("[data-today-filter]");
  if (todayButton) {
    state.todayOnly = !state.todayOnly;
    renderAll();
    return;
  }

  const button = event.target.closest("[data-group]");
  if (!button) return;
  state.activeGroup = button.dataset.group;
  renderAll();
});

els.knockoutFilter.addEventListener("click", (event) => {
  const shareButton = event.target.closest("[data-share-knockout-today]");
  if (shareButton) {
    copyTodayPredictions({
      button: shareButton,
      phase: "knockout",
      noGamesMessage: "Não há jogos do mata-mata hoje.",
      noPredictionsMessage: "Confirme ao menos um palpite do mata-mata de hoje antes de compartilhar."
    });
    return;
  }

  const todayButton = event.target.closest("[data-knockout-today-filter]");
  if (!todayButton) return;
  state.knockoutTodayOnly = !state.knockoutTodayOnly;
  renderAll();
});

els.groupsGrid.addEventListener("click", async (event) => {
  const confirmButton = event.target.closest("[data-confirm-prediction]");
  if (confirmButton) {
    const [groupId, index] = confirmButton.dataset.confirmPrediction.split("-");
    const groupCard = confirmButton.closest("[data-card-group]");
    const matchRow = groupCard?.querySelector(`[data-score="${groupId}:${index}:home"]`)?.closest(".match-block");
    const homeInput = matchRow?.querySelector(`[data-score="${groupId}:${index}:home"]`);
    const awayInput = matchRow?.querySelector(`[data-score="${groupId}:${index}:away"]`);
    const group = groups[groupId];
    const [, home, away] = group.matches[Number(index)];

    confirmButton.disabled = true;
    confirmButton.textContent = "Salvando...";
    try {
      await confirmPrediction({
        user: state.user,
        officialMatch: state.officialMatches[`${groupId}-${index}`],
        groupId,
        index,
        home,
        away,
        homeScore: homeInput?.value,
        awayScore: awayInput?.value
      });
      showToast("Palpite confirmado no bolão!");
    } catch (error) {
      showToast(error.message || "Não foi possível confirmar o palpite.");
      renderAll();
    }
    return;
  }

  const button = event.target.closest("[data-toggle-table]");
  if (!button) return;
  const groupId = button.dataset.toggleTable;
  if (state.expandedGroups.has(groupId)) state.expandedGroups.delete(groupId);
  else state.expandedGroups.add(groupId);
  renderAll();
});

els.knockoutGrid.addEventListener("click", async (event) => {
  const confirmButton = event.target.closest("[data-confirm-knockout-prediction]");
  if (!confirmButton) return;

  const matchId = confirmButton.dataset.confirmKnockoutPrediction;
  const matchBlock = confirmButton.closest("[data-knockout-match]");
  const home = matchBlock?.dataset.home || "";
  const away = matchBlock?.dataset.away || "";
  const homeInput = matchBlock?.querySelector(`[data-knockout-score="${matchId}:home"]`);
  const awayInput = matchBlock?.querySelector(`[data-knockout-score="${matchId}:away"]`);
  const homeScore = homeInput?.value || "";
  const awayScore = awayInput?.value || "";
  const directQualified = homeScore !== "" && awayScore !== "" && Number(homeScore) !== Number(awayScore)
    ? (Number(homeScore) > Number(awayScore) ? home : away)
    : "";
  const qualifiedTeamId = directQualified || getKnockoutQualifiedTeam(matchId);
  const officialMatch = state.officialMatches[matchId]
    || mergeKnockoutMatches(state.officialMatches).find((match) => match.id === matchId);

  confirmButton.disabled = true;
  confirmButton.textContent = "Salvando...";
  try {
    await confirmKnockoutPrediction({
      user: state.user,
      officialMatch,
      matchId,
      home,
      away,
      homeScore,
      awayScore,
      qualifiedTeamId
    });
    showToast("Palpite do mata-mata confirmado!");
  } catch (error) {
    showToast(error.message || "Não foi possível confirmar o palpite.");
    renderAll();
  }
});

document.addEventListener("input", (event) => {
  const knockoutInput = event.target.closest("[data-knockout-score]");
  if (knockoutInput) {
    const [matchId, side] = knockoutInput.dataset.knockoutScore.split(":");
    const sanitized = sanitizeScore(knockoutInput.value);
    knockoutInput.value = sanitized;
    setKnockoutScore(matchId, side, sanitized);
    renderAll();
    const restoredInput = document.querySelector(`[data-knockout-score="${matchId}:${side}"]`);
    if (restoredInput) {
      restoredInput.focus();
      restoredInput.classList.add("score-pulse");
    }
    return;
  }

  const input = event.target.closest("[data-score]");
  if (!input) return;
  const [groupId, index, side] = input.dataset.score.split(":");
  const sanitized = sanitizeScore(input.value);
  input.value = sanitized;
  setScore(groupId, index, side, sanitized);
  renderAll();
  const restoredInput = document.querySelector(`[data-score="${groupId}:${index}:${side}"]`);
  if (restoredInput) {
    restoredInput.focus();
    restoredInput.classList.add("score-pulse");
  }
});

document.addEventListener("change", (event) => {
  const qualifiedInput = event.target.closest("[data-knockout-qualified]");
  if (!qualifiedInput) return;
  setKnockoutQualifiedTeam(qualifiedInput.dataset.knockoutQualified, qualifiedInput.value);
  renderAll();
});

els.search.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderAll();
});

els.clearSearch.addEventListener("click", () => {
  state.query = "";
  els.search.value = "";
  renderAll();
  els.search.focus();
});

window.addEventListener("hashchange", () => {
  switchTab(location.hash.replace("#", ""), false);
});

const initialTab = location.hash.replace("#", "") || localStorage.getItem(`${STORAGE_PREFIX}lastTab`) || "overview";

renderAll();
switchTab(initialTab, Boolean(location.hash));

subscribeToAuth((user) => {
  unsubscribePredictions?.();
  unsubscribeMatches?.();
  unsubscribeRanking?.();
  unsubscribeMatchPredictionSummaries?.();
  unsubscribeSyncStatus?.();

  state.user = user;
  state.predictions = {};
  state.matchPredictionSummaries = {};
  state.officialMatches = {};
  state.syncStatus = null;
  state.ranking = [];

  if (!user) {
    renderAll();
    return;
  }

  clearScores();

  const handleSyncError = (error) => {
    console.error("Erro ao sincronizar o bolão.", error);
    showToast("Não foi possível sincronizar o bolão agora.");
  };

  unsubscribeMatches = subscribeToOfficialMatches((matches) => {
    state.officialMatches = matches;
    renderAll();
  }, handleSyncError);

  unsubscribePredictions = subscribeToPredictions(user.uid, (predictions) => {
    state.predictions = predictions;
    Object.values(predictions).forEach((prediction) => {
      if (prediction.phase === "knockout") {
        setKnockoutScore(prediction.matchId, "home", String(prediction.homeScore));
        setKnockoutScore(prediction.matchId, "away", String(prediction.awayScore));
        setKnockoutQualifiedTeam(prediction.matchId, prediction.qualifiedTeamId || "");
        return;
      }
      setScore(prediction.groupId, prediction.matchIndex, "home", String(prediction.homeScore));
      setScore(prediction.groupId, prediction.matchIndex, "away", String(prediction.awayScore));
    });
    renderAll();
  }, handleSyncError);

  unsubscribeRanking = subscribeToRanking((ranking) => {
    state.ranking = ranking;
    renderAll();
  }, handleSyncError);

  unsubscribeMatchPredictionSummaries = subscribeToMatchPredictionSummaries((summaries) => {
    state.matchPredictionSummaries = summaries;
    renderAll();
  }, handleSyncError);

  unsubscribeSyncStatus = subscribeToSyncStatus((syncStatus) => {
    state.syncStatus = syncStatus;
    renderAll();
  }, handleSyncError);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .catch((error) => console.warn("Service worker nao registrado.", error));
  });
}
