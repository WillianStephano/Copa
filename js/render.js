import { flagCodes, groups, matchVenues } from "./data.js";
import { allGroupIds, allMatches, getScore } from "./storage.js";
import {
  getPredictionFeedback,
  getPredictionLockTime,
  isPredictionLocked
} from "./scoring.js";

export function flagUrl(team) {
  return `https://flagcdn.com/w40/${flagCodes[team] || "un"}.png`;
}

export function normalize(text) {
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function getMatchVenue(groupId, index) {
  return matchVenues[`${groupId}:${index}`] || null;
}

export function renderGroupFilter(state) {
  const buttons = [
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

export function renderGroupCard(state, standings, groupId, includeMatches = true) {
  const group = groups[groupId];
  const finished = group.matches.filter((_, index) => getScore(groupId, index, "home") !== "" && getScore(groupId, index, "away") !== "").length;
  const progress = Math.round((finished / group.matches.length) * 100);
  const expanded = !includeMatches || state.expandedGroups.has(groupId);
  const cardClass = ["card", includeMatches ? "simulator-card" : "", expanded ? "expanded" : "", groupId === "C" ? "brazil-card" : ""].filter(Boolean).join(" ");

  const matchesHtml = group.matches.map(([date, home, away], index) => {
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

    return `<div class="match-block ${confirmedPrediction ? "has-confirmed-prediction" : ""} ${officialResultHtml ? "has-official-result" : ""}">
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
        <span class="badge">${finished}/6 jogos</span>
        ${includeMatches ? `<button class="table-toggle" type="button" data-toggle-table="${groupId}" aria-expanded="${expanded}" aria-controls="table-${groupId}">${expanded ? "Ocultar tabela" : "Ver tabela"}</button>` : ""}
      </div>
    </div>
    ${includeMatches ? `<div class="matches">${matchesHtml}</div>` : ""}
    ${renderStandingsTable(standings, groupId, includeMatches && !expanded)}
  </article>`;
}

export function renderSimulator(state, standings) {
  const visibleGroups = filteredGroupIds(state);
  return {
    html: visibleGroups.map((groupId) => renderGroupCard(state, standings, groupId, true)).join(""),
    empty: visibleGroups.length === 0,
    meta: `${visibleGroups.length} de ${allGroupIds().length} grupos visíveis`
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

export function renderOverview(standings) {
  const totalMatches = allMatches().length;
  const filled = allMatches().filter(({ groupId, index }) => getScore(groupId, index, "home") !== "" && getScore(groupId, index, "away") !== "").length;
  const totalTeams = allGroupIds().reduce((sum, groupId) => sum + groups[groupId].teams.length, 0);
  const leaders = allGroupIds()
    .map((groupId) => {
      const leader = standings[groupId][0];
      return `<article class="${groupId === "C" ? "card brazil-card" : "card"}">
        <div class="card-header">
          <div>
            <h3>${groups[groupId].name}</h3>
            <p class="meta-line">${leader.team} lidera com ${leader.points} ponto${leader.points === 1 ? "" : "s"}.</p>
          </div>
          <span class="badge">${leader.goalDiff >= 0 ? "+" : ""}${leader.goalDiff} SG</span>
        </div>
        ${renderStandingsTable(standings, groupId)}
      </article>`;
    })
    .join("");

  return {
    leaders,
    metrics: [
      ["Grupos", allGroupIds().length],
      ["Seleções", totalTeams],
      ["Jogos", totalMatches],
      ["Preenchidos", `${filled}/${totalMatches}`]
    ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join(""),
    meta: `${Math.round((filled / totalMatches) * 100)}% dos jogos preenchidos`,
    heroGroups: allGroupIds().length,
    heroTeams: totalTeams,
    heroFilled: `${filled}/${totalMatches}`
  };
}

export function renderRanking(ranking, currentUid) {
  if (!ranking.length) {
    return { html: "", empty: true, meta: "Aguardando resultados oficiais" };
  }

  const html = ranking.map((entry) => {
    const isCurrentUser = entry.uid === currentUid;
    const safeName = escapeHtml(entry.displayName || "Participante");
    const photo = entry.photoURL
      ? `<img class="ranking-avatar" src="${escapeHtml(entry.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="ranking-avatar fallback" aria-hidden="true">${safeName.charAt(0).toUpperCase()}</span>`;

    return `<div class="ranking-row ${isCurrentUser ? "current-user" : ""}">
      <strong class="ranking-position">${entry.position}º</strong>
      <div class="ranking-person">${photo}<span>${safeName}${isCurrentUser ? " (você)" : ""}</span></div>
      <strong>${entry.points || 0}</strong>
      <span>${entry.exactHits || 0}</span>
      <span>${entry.outcomeHits || 0}</span>
    </div>`;
  }).join("");

  return {
    html,
    empty: false,
    meta: `${ranking.length} participante${ranking.length === 1 ? "" : "s"}`
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
