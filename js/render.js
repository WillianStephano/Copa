import { flagCodes, groups, matchVenues } from "./data.js";
import { buildDailyRanking } from "./daily-ranking.js";
import { allGroupIds, allMatches, getScore } from "./storage.js";
import {
  getPredictionFeedback,
  getPredictionLockTime,
  isPredictionLocked
} from "./scoring.js";
import { isMatchToday } from "./match-date.js";

export function flagUrl(team) {
  return `https://flagcdn.com/w40/${flagCodes[team] || "un"}.png`;
}

export function normalize(text) {
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function getMatchVenue(groupId, index) {
  return matchVenues[`${groupId}:${index}`] || null;
}

export function renderSyncStatus(status) {
  if (!status) return "Resultados ainda sem status de sincronização";

  const sourceLabels = {
    "api-football": "API-Football",
    "worldcup26.ir": "worldcup26.ir"
  };
  const lastSuccess = formatSyncDate(status.lastSuccessfulAt);
  const lastFailure = formatSyncDate(status.lastFailedAt);

  if (status.status === "success" && lastSuccess) {
    return `Resultados atualizados às ${lastSuccess} · fonte: ${sourceLabels[status.source] || status.source || "automática"}`;
  }

  if (status.status === "skipped" && lastSuccess) {
    return `Resultados atualizados às ${lastSuccess} · próxima busca perto dos jogos`;
  }

  if (status.status === "failed") {
    return lastSuccess
      ? `Resultados atualizados às ${lastSuccess} · última tentativa falhou ${lastFailure ? `às ${lastFailure}` : ""}`.trim()
      : "Última tentativa de atualizar resultados falhou";
  }

  return lastSuccess
    ? `Resultados atualizados às ${lastSuccess}`
    : "Resultados aguardando primeira sincronização";
}

function formatSyncDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";

  return value.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function renderGroupFilter(state) {
  const todayCount = Object.values(state.officialMatches).filter((match) =>
    isMatchToday(match)
  ).length;
  const buttons = [
    `<button class="chip today-chip ${state.todayOnly ? "active" : ""}" data-today-filter type="button" aria-pressed="${state.todayOnly}">Jogos de hoje</button>`,
    `<button class="chip share-chip" data-share-today type="button" ${todayCount ? "" : "disabled"}>Copiar palpites</button>`,
    `<span class="filter-divider" aria-hidden="true"></span>`,
    `<button class="chip ${state.activeGroup === "ALL" ? "active" : ""}" data-group="ALL" type="button">Todos</button>`
  ];

  allGroupIds().forEach((groupId) => {
    buttons.push(
      `<button class="chip ${groupId === "C" ? "brazil" : ""} ${state.activeGroup === groupId ? "active" : ""}" data-group="${groupId}" type="button">${groupId}</button>`
    );
  });

  return buttons.join("");
}

function renderTeam(team, classes = "") {
  const isHome = classes.split(" ").includes("home");
  return `<div class="team ${classes}">
    ${isHome
      ? `<span>${team}</span><img class="flag" src="${flagUrl(team)}" alt="" onerror="this.style.visibility='hidden'">`
      : `<img class="flag" loading="lazy" decoding="async" src="${flagUrl(team)}" alt="${team}" onerror="this.style.visibility='hidden'"><span>${team}</span>`
    }
  </div>`;
}

function renderStandingsRows(standings, groupId) {
  return standings[groupId].map((row, index) => {
    const classes = [index < 2 ? "qualifier" : "", row.team === "Brasil" ? "brazil-row" : ""].filter(Boolean).join(" ");
    return `<tr class="${classes}">
      <td>${index + 1}</td>
      <td>
        <div class="standing-team"><img class="flag" src="${flagUrl(row.team)}" alt=""><span>${row.team}</span></div>
      </td>
      <td>${row.points}</td>
      <td>${row.played}</td>
      <td>${row.goalDiff}</td>
      <td>${row.goalsFor}</td>
    </tr>`;
  }).join("");
}

function renderOfficialResult(officialMatch, prediction, home, away) {
  const feedback = getPredictionFeedback(prediction, officialMatch, home, away);
  if (!feedback) return "";

  const pointsLabel = feedback.points === 1 ? "1 ponto" : `${feedback.points} pontos`;
  return `<div class="official-result result-${feedback.type}">
    <div class="official-score">
      <span>Resultado oficial</span>
      <strong>${officialMatch.homeScore} x ${officialMatch.awayScore}</strong>
    </div>
    <div class="prediction-verdict">
      <strong>${feedback.title}</strong>
      <span>${feedback.detail}</span>
    </div>
    <span class="points-earned">${pointsLabel}</span>
  </div>`;
}

function renderMatchPredictionPanel(summary, officialMatch, home, away) {
  const locked = officialMatch?.kickoffDate ? isPredictionLocked(officialMatch.kickoffDate) : false;

  if (!summary) {
    const message = !officialMatch?.kickoffDate
      ? "Assim que o horário oficial for sincronizado, os palpites aparecem após o fechamento."
      : locked
        ? "O jogo já travou. Estamos aguardando a próxima sincronização para liberar os palpites."
        : "Os palpites dos outros participantes ficam ocultos até 30 minutos antes do jogo.";

    return `<div class="match-predictions-panel is-private">
      <div class="match-predictions-head">
        <div>
          <strong>Palpites do bolão</strong>
          <span>${message}</span>
        </div>
        <span class="privacy-pill">${locked ? "Sincronizando" : "Protegido"}</span>
      </div>
    </div>`;
  }

  const predictions = Array.isArray(summary.predictions) ? summary.predictions : [];
  const total = Number(summary.totalPredictions) || predictions.length;
  const safeHome = escapeHtml(summary.home || home);
  const safeAway = escapeHtml(summary.away || away);
  const tally = [
    ["home", safeHome, summary.homeWinPredictions || 0],
    ["draw", "Empate", summary.drawPredictions || 0],
    ["away", safeAway, summary.awayWinPredictions || 0]
  ].map(([choice, label, count]) => `
    <span class="prediction-tally-item choice-${choice}">
      <strong>${count}</strong>
      <span>${label}</span>
    </span>
  `).join("");
  const rows = predictions.length
    ? predictions.map(renderPublicPrediction).join("")
    : `<p class="public-predictions-empty">Jogo travado, mas ninguém confirmou palpite para esta partida.</p>`;

  return `<div class="match-predictions-panel">
    <div class="match-predictions-head">
      <div>
        <strong>Palpites do bolão</strong>
        <span>${total} participante${total === 1 ? "" : "s"} com palpite liberado</span>
      </div>
      <span class="privacy-pill open">Liberado</span>
    </div>
    <div class="prediction-tally" aria-label="Resumo dos palpites desta partida">
      ${tally}
    </div>
    <div class="public-predictions-list">
      ${rows}
    </div>
  </div>`;
}

function renderPublicPrediction(prediction) {
  const name = prediction.displayName || "Participante";
  const safeName = escapeHtml(name);
  const safeChoice = escapeHtml(prediction.choiceLabel || "Palpite confirmado");
  const choice = ["home", "draw", "away"].includes(prediction.choice)
    ? prediction.choice
    : "draw";
  const resultType = ["exact", "outcome", "miss", "pending"].includes(prediction.type)
    ? prediction.type
    : "pending";
  const statusLabels = {
    exact: "Placar exato",
    outcome: "Resultado correto",
    miss: "Errou",
    pending: "Aguardando resultado"
  };
  const pointsLabel = resultType === "pending"
    ? "Ainda sem pontuação"
    : `${prediction.points || 0} pts`;

  return `<div class="public-prediction choice-${choice} result-${resultType}">
    <div class="public-prediction-person">
      ${renderPersonAvatar(name, prediction.photoURL, "public-prediction-avatar")}
      <span>${safeName}</span>
    </div>
    <div class="public-prediction-score">
      <strong>${prediction.homeScore} x ${prediction.awayScore}</strong>
      <span>${safeChoice}</span>
    </div>
    <span class="public-prediction-status">${statusLabels[resultType]} · ${pointsLabel}</span>
  </div>`;
}

export function renderStandingsTable(standings, groupId, collapsed = false) {
  return `<div class="table-wrap ${collapsed ? "collapsed" : ""}" id="table-${groupId}">
    <table>
      <thead>
        <tr><th>Pos</th><th>Seleção</th><th>P</th><th>J</th><th>SG</th><th>GP</th></tr>
      </thead>
      <tbody>${renderStandingsRows(standings, groupId)}</tbody>
    </table>
  </div>`;
}

export function renderGroupCard(
  state,
  standings,
  groupId,
  includeMatches = true,
  visibleMatchIndexes = null
) {
  const group = groups[groupId];
  const finished = group.matches.filter((_, index) => getScore(groupId, index, "home") !== "" && getScore(groupId, index, "away") !== "").length;
  const progress = Math.round((finished / group.matches.length) * 100);
  const expanded = !includeMatches || state.expandedGroups.has(groupId);
  const cardClass = ["card", includeMatches ? "simulator-card" : "", expanded ? "expanded" : "", groupId === "C" ? "brazil-card" : ""].filter(Boolean).join(" ");
  const matchIndexes = visibleMatchIndexes || group.matches.map((_, index) => index);

  const matchesHtml = matchIndexes.map((index) => {
    const [date, home, away] = group.matches[index];
    const id = `${groupId}-${index}`;
    const officialMatch = state.officialMatches[id];
    const confirmedPrediction = state.predictions[id];
    const homeScore = getScore(groupId, index, "home");
    const awayScore = getScore(groupId, index, "away");
    const completed = homeScore !== "" && awayScore !== "";
    const locked = officialMatch?.kickoffDate ? isPredictionLocked(officialMatch.kickoffDate) : false;
    const lockTime = officialMatch?.kickoffDate ? getPredictionLockTime(officialMatch.kickoffDate) : null;
    const confirmedMatchesDraft = confirmedPrediction
      && Number(homeScore) === Number(confirmedPrediction.homeScore)
      && Number(awayScore) === Number(confirmedPrediction.awayScore);
    const buttonLabel = confirmedPrediction
      ? (confirmedMatchesDraft ? "Palpite confirmado" : "Atualizar palpite")
      : "Confirmar palpite";
    const deadlineText = officialMatch?.kickoffDate
      ? (locked ? "Palpite encerrado" : `Até ${lockTime.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`)
      : "Aguardando horário oficial";
    const homeGoals = Number(homeScore);
    const awayGoals = Number(awayScore);
    const homeClasses = ["home", completed && homeGoals > awayGoals ? "winner" : ""].filter(Boolean).join(" ");
    const awayClasses = [completed && awayGoals > homeGoals ? "winner" : ""].filter(Boolean).join(" ");
    const officialResultHtml = renderOfficialResult(
      officialMatch,
      confirmedPrediction,
      home,
      away
    );
    const publicPredictionsHtml = state.todayOnly
      ? renderMatchPredictionPanel(state.matchPredictionSummaries?.[id], officialMatch, home, away)
      : "";

    return `<div class="match-block ${confirmedPrediction ? "has-confirmed-prediction" : ""} ${officialResultHtml ? "has-official-result" : ""} ${publicPredictionsHtml ? "has-public-predictions" : ""}">
      <div class="match-row ${completed ? "completed" : ""}">
        <span class="match-date">${date}</span>
        ${renderTeam(home, homeClasses)}
        <div class="score-inputs">
          <input class="${homeScore !== "" ? "filled" : ""}" aria-label="${home} contra ${away}, gols de ${home}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${homeScore}" data-score="${groupId}:${index}:home" ${locked ? "disabled" : ""}>
          <input class="${awayScore !== "" ? "filled" : ""}" aria-label="${home} contra ${away}, gols de ${away}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${awayScore}" data-score="${groupId}:${index}:away" ${locked ? "disabled" : ""}>
        </div>
        ${renderTeam(away, awayClasses)}
      </div>
      ${officialResultHtml}
      ${publicPredictionsHtml}
      <div class="prediction-actions">
        <span class="prediction-deadline ${locked ? "locked" : ""}">${deadlineText}</span>
        <button class="confirm-prediction ${confirmedMatchesDraft ? "confirmed" : ""}" type="button" data-confirm-prediction="${id}" ${!officialMatch?.kickoffDate || locked || !completed || confirmedMatchesDraft ? "disabled" : ""}>${buttonLabel}</button>
      </div>
    </div>`;
  }).join("");

  return `<article class="${cardClass}" data-card-group="${groupId}" data-expanded="${expanded}">
    <div class="card-header">
      <div>
        <h3>${group.name}</h3>
        <p class="meta-line">${group.teams.join(" · ")}</p>
        <div class="progress-track" aria-hidden="true"><span class="progress-bar" style="width: ${progress}%"></span></div>
      </div>
      <div class="card-actions">
        <span class="badge">${state.todayOnly && includeMatches ? `${matchIndexes.length} hoje` : `${finished}/6 jogos`}</span>
        ${includeMatches ? `<button class="table-toggle" type="button" data-toggle-table="${groupId}" aria-expanded="${expanded}" aria-controls="table-${groupId}">${expanded ? "Ocultar tabela" : "Ver tabela"}</button>` : ""}
      </div>
    </div>
    ${includeMatches ? `<div class="matches">${matchesHtml}</div>` : ""}
    ${renderStandingsTable(standings, groupId, includeMatches && !expanded)}
  </article>`;
}

export function renderSimulator(state, standings) {
  const visibleGroups = filteredGroupIds(state)
    .map((groupId) => ({
      groupId,
      matchIndexes: visibleMatchIndexes(state, groupId)
    }))
    .filter(({ matchIndexes }) => !state.todayOnly || matchIndexes.length);
  const visibleTodayCount = visibleGroups.reduce(
    (total, group) => total + group.matchIndexes.length,
    0
  );

  return {
    html: visibleGroups.map(({ groupId, matchIndexes }) =>
      renderGroupCard(state, standings, groupId, true, matchIndexes)
    ).join(""),
    empty: visibleGroups.length === 0,
    emptyMessage: state.todayOnly
      ? "Não há jogos hoje para os filtros selecionados."
      : "Nenhum grupo encontrado para a busca atual.",
    meta: state.todayOnly
      ? `${visibleTodayCount} jogo${visibleTodayCount === 1 ? "" : "s"} hoje · horário de Brasília`
      : `${visibleGroups.length} de ${allGroupIds().length} grupos visíveis`
  };
}

export function renderStandings(state, standings) {
  const visibleGroups = filteredGroupIds(state);
  return {
    html: visibleGroups.map((groupId) => renderGroupCard(state, standings, groupId, false)).join(""),
    empty: visibleGroups.length === 0,
    meta: `${visibleGroups.length} tabelas exibidas`
  };
}

function filteredGroupIds(state) {
  const query = normalize(state.query);
  return allGroupIds().filter((groupId) => {
    const selected = state.activeGroup === "ALL" || state.activeGroup === groupId;
    if (!selected) return false;
    if (!query) return true;

    const group = groups[groupId];
    const haystack = [
      groupId,
      group.name,
      ...group.teams,
      ...group.matches.flat(),
      ...group.matches.flatMap((_, index) => {
        const venue = getMatchVenue(groupId, index);
        return venue ? [venue.stadium, venue.city, venue.country] : [];
      })
    ].join(" ");

    return normalize(haystack).includes(query);
  });
}

function visibleMatchIndexes(state, groupId) {
  return groups[groupId].matches
    .map((_, index) => index)
    .filter((index) => {
      if (!state.todayOnly) return true;
      return isMatchToday(state.officialMatches[`${groupId}-${index}`]);
    });
}

export function renderCalendar(state) {
  const query = normalize(state.query);
  const rows = allMatches().filter(({ groupId, index, match }) => {
    const selected = state.activeGroup === "ALL" || state.activeGroup === groupId;
    const venue = getMatchVenue(groupId, index);
    const haystack = normalize([groupId, groups[groupId].name, ...match, venue?.stadium, venue?.city, venue?.country].join(" "));
    return selected && (!query || haystack.includes(query));
  });

  const html = rows
    .map(({ groupId, index, match }) => {
      const [date, home, away] = match;
      const id = `${groupId}-${index}`;
      const officialMatch = state.officialMatches[id];
      const prediction = state.predictions[id];
      const finished = officialMatch?.status === "FINISHED"
        && Number.isInteger(officialMatch.homeScore)
        && Number.isInteger(officialMatch.awayScore);
      const score = finished
        ? `${officialMatch.homeScore} x ${officialMatch.awayScore}`
        : "A disputar";
      const venue = getMatchVenue(groupId, index);
      const feedback = getPredictionFeedback(prediction, officialMatch, home, away);

      let resultText = "";
      let resultClass = "";

      if (finished) {
        const h = officialMatch.homeScore;
        const a = officialMatch.awayScore;
        if (h > a) {
          resultText = `${home} venceu`;
          resultClass = "win";
        } else if (a > h) {
          resultText = `${away} venceu`;
          resultClass = "win";
        } else {
          resultText = "Empate";
          resultClass = "draw";
        }
      }

      return `<div class="calendar-row">
        <div class="calendar-date">${date}</div>
        <div class="calendar-body">
          <div class="calendar-meta">
            <span class="badge">${groups[groupId].name}</span>
            <span class="calendar-score">${score}</span>
            ${resultText ? `<span class="calendar-result ${resultClass}">${resultText}</span>` : ""}
            ${feedback ? `<span class="calendar-prediction result-${feedback.type}">${feedback.title} · ${feedback.points} pts</span>` : ""}
          </div>
          <div class="calendar-teams">
            <img class="flag" src="${flagUrl(home)}" alt="">
            <span>${home}</span>
            <strong>vs</strong>
            <span>${away}</span>
            <img class="flag" src="${flagUrl(away)}" alt="">
          </div>
          <div class="venue-line ${venue ? "" : "pending"}">
            <strong>${venue ? venue.stadium : "Local a confirmar"}</strong>
            <span>${venue ? `${venue.city}, ${venue.country}` : "Aguardando definição oficial para este jogo."}</span>
          </div>
        </div>
      </div>`;
    })
    .join("");

  return { html, empty: rows.length === 0, meta: `${rows.length} de ${allMatches().length} jogos visíveis` };
}

export function renderOverview(state, standings) {
  const totalMatches = allMatches().length;
  const finished = Object.values(state.officialMatches).filter((match) =>
    match.status === "FINISHED"
    && Number.isInteger(match.homeScore)
    && Number.isInteger(match.awayScore)
  ).length;
  const totalTeams = allGroupIds().reduce((sum, groupId) => sum + groups[groupId].teams.length, 0);
  const leaders = allGroupIds()
    .map((groupId) => {
      const leader = standings[groupId][0];
      const played = standings[groupId].reduce((sum, row) => sum + row.played, 0) / 2;
      const leaderText = played
        ? `${leader.team} lidera com ${leader.points} ponto${leader.points === 1 ? "" : "s"}.`
        : "Aguardando o primeiro resultado oficial.";
      return `<article class="${groupId === "C" ? "card brazil-card" : "card"}">
        <div class="card-header">
          <div>
            <h3>${groups[groupId].name}</h3>
            <p class="meta-line">${leaderText}</p>
          </div>
          <span class="badge">${played}/6 jogos</span>
        </div>
        ${renderStandingsTable(standings, groupId)}
      </article>`;
    })
    .join("");
  const dailyRanking = buildDailyRanking(state.ranking, state.officialMatches);
  const dailyLeaders = renderDailyLeaders(dailyRanking);

  return {
    leaders,
    dailyLeaders,
    metrics: [
      ["Grupos", allGroupIds().length],
      ["Seleções", totalTeams],
      ["Jogos", totalMatches],
      ["Encerrados", `${finished}/${totalMatches}`]
    ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join(""),
    meta: `${Math.round((finished / totalMatches) * 100)}% dos jogos encerrados`,
    heroGroups: allGroupIds().length,
    heroTeams: totalTeams,
    heroFilled: `${finished}/${totalMatches}`
  };
}

function renderDailyLeaders(entries) {
  if (!entries.length) {
    return `<article class="daily-ranking-card is-empty">
      <div class="daily-ranking-head">
        <div>
          <h3>Maiores pontuadores do dia</h3>
          <p>Aguardando jogos finalizados hoje.</p>
        </div>
      </div>
    </article>`;
  }

  const rows = entries.slice(0, 5).map((entry, index) => `
    <li class="daily-ranking-row">
      <strong class="daily-ranking-position">${index + 1}º</strong>
      <div class="daily-ranking-person">
        ${renderPersonAvatar(entry.displayName, entry.photoURL, "daily-ranking-avatar")}
        <span>${escapeHtml(entry.displayName)}</span>
      </div>
      <strong class="daily-ranking-points">${entry.points} pts</strong>
      <span class="daily-ranking-tags">
        ${entry.exactHits} exato${entry.exactHits === 1 ? "" : "s"} · ${entry.outcomeHits} resultado${entry.outcomeHits === 1 ? "" : "s"}
      </span>
    </li>
  `).join("");

  return `<article class="daily-ranking-card">
    <div class="daily-ranking-head">
      <div>
        <h3>Maiores pontuadores do dia</h3>
        <p>Recorte dos jogos encerrados no dia operacional.</p>
      </div>
      <span class="badge">${entries.length} participante${entries.length === 1 ? "" : "s"}</span>
    </div>
    <ol class="daily-ranking-list">
      ${rows}
    </ol>
  </article>`;
}

export function renderRanking(ranking, currentUid) {
  if (!ranking.length) {
    return { html: "", empty: true, meta: "Aguardando resultados oficiais" };
  }

  const currentEntry = ranking.find((entry) => entry.uid === currentUid) || null;
  const html = ranking.map((entry) => {
    const isCurrentUser = entry.uid === currentUid;
    const isAiBot = entry.uid === "ai-gemini-bot";
    const safeName = escapeHtml(entry.displayName || "Participante");
    const streakBadge = entry.currentStreak >= 3
      ? `<small class="ranking-streak-badge">Sequência de ${entry.currentStreak}</small>`
      : "";
    const photo = entry.photoURL
      ? `<img class="ranking-avatar" src="${escapeHtml(entry.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="ranking-avatar fallback" aria-hidden="true">${safeName.charAt(0).toUpperCase()}</span>`;

    const details = Array.isArray(entry.details) ? entry.details : [];
    const exactCount = details.filter((detail) => detail.type === "exact").length;
    const outcomeCount = details.filter((detail) => detail.type === "outcome").length;
    const missCount = details.filter((detail) => detail.type === "miss").length;
    const detailRows = details.length
      ? details.map(renderRankingDetail).join("")
      : `<p class="ranking-no-details">Nenhuma partida avaliada até agora.</p>`;

    const aiEntryNote = isAiBot
      ? `<div class="ranking-ai-note">
          <strong>IA do Bolão entrou no bolão em 20/06, quando a menor pontuação era 27 pontos.</strong>
          <span>A partir daqui, ela corre atrás dos humanos.</span>
        </div>`
      : "";
    const streakSummary = renderStreakSummary(entry);
    const comparison = renderUserComparison(currentEntry, entry, currentUid);

    return `<details class="ranking-entry ${isCurrentUser ? "current-user" : ""}">
      <summary class="ranking-row">
        <strong class="ranking-position">${entry.position}º</strong>
        <div class="ranking-person">${photo}<span>${safeName}${isCurrentUser ? " (você)" : ""}</span>${streakBadge}</div>
        <strong>${entry.points || 0}</strong>
        <span>${entry.exactHits || 0}</span>
        <span>${entry.outcomeHits || 0}</span>
        <span class="ranking-expand" aria-hidden="true"></span>
      </summary>
      <div class="ranking-details">
        ${aiEntryNote}
        ${streakSummary}
        ${comparison}
        <div class="ranking-details-head">
          <div>
            <strong>Desempenho por partida</strong>
            <span>Somente jogos encerrados entram nesta visão.</span>
          </div>
          <div class="ranking-details-pills">
            <span class="result-exact">${exactCount} exato${exactCount === 1 ? "" : "s"}</span>
            <span class="result-outcome">${outcomeCount} resultado${outcomeCount === 1 ? "" : "s"}</span>
            <span class="result-miss">${missCount} erro${missCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        ${detailRows}
      </div>
    </details>`;
  }).join("");

  return {
    html,
    empty: false,
    meta: `${ranking.length} participante${ranking.length === 1 ? "" : "s"}`
  };
}

function renderStreakSummary(entry) {
  const currentStreak = Number(entry.currentStreak) || 0;
  const bestStreak = Number(entry.bestStreak) || 0;
  const hasBadge = bestStreak >= 3;

  return `<div class="ranking-streak-summary ${hasBadge ? "is-hot" : ""}">
    <div>
      <strong>${hasBadge ? "Conquista de sequência" : "Sequência de acertos"}</strong>
      <span>Placar exato ou resultado correto contam. Erro ou jogo sem palpite quebram a sequência.</span>
    </div>
    <div class="ranking-streak-numbers">
      <span><strong>${currentStreak}</strong> atual</span>
      <span><strong>${bestStreak}</strong> maior</span>
    </div>
  </div>`;
}

function renderUserComparison(currentEntry, targetEntry, currentUid) {
  if (!currentEntry || !targetEntry || targetEntry.uid === currentUid) return "";

  const currentDetails = new Map((currentEntry.details || []).map((detail) => [detail.matchId, detail]));
  const targetDetails = (targetEntry.details || [])
    .filter((detail) => currentDetails.has(detail.matchId));

  if (!targetDetails.length) {
    return `<details class="ranking-compare ranking-compare-toggle is-empty">
      <summary class="ranking-compare-summary">
        <div>
          <strong>Comparação com você</strong>
          <span>Sem jogos em comum avaliados</span>
        </div>
        <span class="ranking-compare-cta">Ver detalhes</span>
        <span class="ranking-compare-chevron" aria-hidden="true"></span>
      </summary>
      <p>Ainda não há jogos encerrados com palpites avaliados para os dois.</p>
    </details>`;
  }

  const currentName = escapeHtml(currentEntry.displayName || "Você");
  const targetName = escapeHtml(targetEntry.displayName || "Participante");
  const totals = targetDetails.reduce((total, targetDetail) => {
    const currentDetail = currentDetails.get(targetDetail.matchId);
    return {
      currentPoints: total.currentPoints + (Number(currentDetail.points) || 0),
      targetPoints: total.targetPoints + (Number(targetDetail.points) || 0),
      currentExact: total.currentExact + (currentDetail.type === "exact" ? 1 : 0),
      targetExact: total.targetExact + (targetDetail.type === "exact" ? 1 : 0)
    };
  }, {
    currentPoints: 0,
    targetPoints: 0,
    currentExact: 0,
    targetExact: 0
  });

  const rows = targetDetails.map((targetDetail) => {
    const currentDetail = currentDetails.get(targetDetail.matchId);
    const diff = (Number(currentDetail.points) || 0) - (Number(targetDetail.points) || 0);
    const diffLabel = diff > 0 ? `+${diff} você` : diff < 0 ? `+${Math.abs(diff)} ${targetName}` : "empate";
    return `<div class="ranking-compare-row">
      <strong>${escapeHtml(targetDetail.home)} x ${escapeHtml(targetDetail.away)}</strong>
      <span>${currentName}: ${currentDetail.predictedHomeScore} x ${currentDetail.predictedAwayScore} · ${currentDetail.points} pts</span>
      <span>${targetName}: ${targetDetail.predictedHomeScore} x ${targetDetail.predictedAwayScore} · ${targetDetail.points} pts</span>
      <em>${diffLabel}</em>
    </div>`;
  }).join("");

  return `<details class="ranking-compare ranking-compare-toggle">
    <summary class="ranking-compare-summary">
      <div>
        <strong>Comparação com você</strong>
        <span>${targetDetails.length} jogo${targetDetails.length === 1 ? "" : "s"} em comum</span>
      </div>
      <div class="ranking-compare-score">
        <span>${currentName}: <strong>${totals.currentPoints}</strong> pts · ${totals.currentExact} exato${totals.currentExact === 1 ? "" : "s"}</span>
        <span>${targetName}: <strong>${totals.targetPoints}</strong> pts · ${totals.targetExact} exato${totals.targetExact === 1 ? "" : "s"}</span>
      </div>
      <span class="ranking-compare-cta">Ver duelo</span>
      <span class="ranking-compare-chevron" aria-hidden="true"></span>
    </summary>
    <div class="ranking-compare-list">${rows}</div>
  </details>`;
}

function renderRankingDetail(detail) {
  const labels = {
    exact: "Placar exato",
    outcome: "Resultado correto",
    miss: "Errou"
  };
  const safeHome = escapeHtml(detail.home || "");
  const safeAway = escapeHtml(detail.away || "");
  const type = ["exact", "outcome", "miss"].includes(detail.type)
    ? detail.type
    : "miss";

  return `<div class="ranking-detail result-${type}">
    <div class="ranking-detail-match">
      <strong>${safeHome} x ${safeAway}</strong>
      <span>Palpite: ${detail.predictedHomeScore} x ${detail.predictedAwayScore}</span>
    </div>
    <div class="ranking-detail-result">
      <span>Resultado oficial</span>
      <strong>${detail.actualHomeScore} x ${detail.actualAwayScore}</strong>
    </div>
    <span class="ranking-detail-status">${labels[type]} · ${detail.points} pts</span>
  </div>`;
}

function renderPersonAvatar(name, photoURL, className) {
  if (photoURL) {
    return `<img class="${className}" src="${escapeHtml(photoURL)}" alt="" referrerpolicy="no-referrer">`;
  }

  return `<span class="${className} fallback" aria-hidden="true">${escapeHtml(name.charAt(0).toUpperCase() || "P")}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
