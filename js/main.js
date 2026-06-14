import { subscribeToAuth } from "./auth.js";
import { groups, STORAGE_PREFIX, VALID_TABS } from "./data.js";
import { calculateStandings } from "./standings.js";
import { clearScores, setScore } from "./storage.js";
import {
  renderCalendar,
  renderGroupFilter,
  renderOverview,
  renderRanking,
  renderSimulator,
  renderStandings
} from "./render.js";
import {
  confirmPrediction,
  subscribeToOfficialMatches,
  subscribeToPredictions,
  subscribeToRanking
} from "./bolao.js";

const state = {
  activeTab: "overview",
  activeGroup: "ALL",
  query: "",
  expandedGroups: new Set(),
  user: null,
  predictions: {},
  officialMatches: {},
  ranking: []
};

let unsubscribePredictions = null;
let unsubscribeMatches = null;
let unsubscribeRanking = null;

const els = {
  tabs: document.querySelectorAll("[data-tab]"),
  panels: document.querySelectorAll("[data-panel]"),
  search: document.getElementById("globalSearch"),
  clearSearch: document.getElementById("clearSearch"),
  resetScores: document.getElementById("resetScores"),
  groupFilter: document.getElementById("groupFilter"),
  groupsGrid: document.getElementById("groupsGrid"),
  standingsGrid: document.getElementById("standingsGrid"),
  rankingList: document.getElementById("rankingList"),
  rankingEmpty: document.getElementById("rankingEmpty"),
  rankingMeta: document.getElementById("rankingMeta"),
  calendarList: document.getElementById("calendarList"),
  leadersGrid: document.getElementById("leadersGrid"),
  dashboardMetrics: document.getElementById("dashboardMetrics"),
  simulatorEmpty: document.getElementById("simulatorEmpty"),
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
  const standings = calculateStandings();
  const groupFilterHtml = renderGroupFilter(state);
  els.groupFilter.innerHTML = groupFilterHtml;

  const overview = renderOverview(standings);
  els.dashboardMetrics.innerHTML = overview.metrics;
  els.leadersGrid.innerHTML = overview.leaders;
  els.overviewMeta.textContent = overview.meta;
  els.heroGroups.textContent = overview.heroGroups;
  els.heroTeams.textContent = overview.heroTeams;
  els.heroFilled.textContent = overview.heroFilled;

  const simulator = renderSimulator(state, standings);
  els.groupsGrid.innerHTML = simulator.html;
  els.simulatorEmpty.classList.toggle("active", simulator.empty);
  els.simulatorMeta.textContent = simulator.meta;

  const standingsView = renderStandings(state, standings);
  els.standingsGrid.innerHTML = standingsView.html;
  els.standingsEmpty.classList.toggle("active", standingsView.empty);
  els.standingsMeta.textContent = standingsView.meta;

  const calendar = renderCalendar(state);
  els.calendarList.innerHTML = calendar.html;
  els.calendarEmpty.classList.toggle("active", calendar.empty);
  els.calendarMeta.textContent = calendar.meta;

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

els.resetScores.addEventListener("click", resetScoresAction);

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

els.groupFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-group]");
  if (!button) return;
  state.activeGroup = button.dataset.group;
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

document.addEventListener("input", (event) => {
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

  state.user = user;
  state.predictions = {};
  state.officialMatches = {};
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
      setScore(prediction.groupId, prediction.matchIndex, "home", String(prediction.homeScore));
      setScore(prediction.groupId, prediction.matchIndex, "away", String(prediction.awayScore));
    });
    renderAll();
  }, handleSyncError);

  unsubscribeRanking = subscribeToRanking((ranking) => {
    state.ranking = ranking;
    renderAll();
  }, handleSyncError);
});
