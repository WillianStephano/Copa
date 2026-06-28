export const knockoutStages = [
  { id: "round-of-32", title: "16 avos de final", prefix: "R32", count: 16 },
  { id: "round-of-16", title: "Oitavas de final", prefix: "R16", count: 8 },
  { id: "quarter-final", title: "Quartas de final", prefix: "QF", count: 4 },
  { id: "semi-final", title: "Semifinais", prefix: "SF", count: 2 },
  { id: "third-place", title: "Disputa de 3o lugar", prefix: "TP", count: 1 },
  { id: "final", title: "Final", prefix: "FINAL", count: 1 }
];

function kickoffUtc(isoText) {
  return new Date(isoText);
}

function knockoutLockAt(kickoffDate) {
  return new Date(kickoffDate.getTime() - 30 * 60_000);
}

export const roundOf32Matches = [
  ["KO-R32-1", 73, "África do Sul", "Canadá", "2026-06-28T19:00:00.000Z"],
  ["KO-R32-2", 74, "Brasil", "Japão", "2026-06-29T17:00:00.000Z"],
  ["KO-R32-3", 75, "Alemanha", "Paraguai", "2026-06-29T20:30:00.000Z"],
  ["KO-R32-4", 76, "Holanda", "Marrocos", "2026-06-30T01:00:00.000Z"],
  ["KO-R32-5", 77, "Costa do Marfim", "Noruega", "2026-06-30T17:00:00.000Z"],
  ["KO-R32-6", 78, "França", "Suécia", "2026-06-30T21:00:00.000Z"],
  ["KO-R32-7", 79, "México", "Equador", "2026-07-01T01:00:00.000Z"],
  ["KO-R32-8", 80, "Inglaterra", "RD Congo", "2026-07-01T16:00:00.000Z"],
  ["KO-R32-9", 81, "Bélgica", "Senegal", "2026-07-01T20:00:00.000Z"],
  ["KO-R32-10", 82, "Estados Unidos", "Bósnia", "2026-07-02T00:00:00.000Z"],
  ["KO-R32-11", 83, "Espanha", "Áustria", "2026-07-02T19:00:00.000Z"],
  ["KO-R32-12", 84, "Portugal", "Croácia", "2026-07-02T23:00:00.000Z"],
  ["KO-R32-13", 85, "Suíça", "Argélia", "2026-07-03T03:00:00.000Z"],
  ["KO-R32-14", 86, "Austrália", "Egito", "2026-07-03T18:00:00.000Z"],
  ["KO-R32-15", 87, "Argentina", "Cabo Verde", "2026-07-03T22:00:00.000Z"],
  ["KO-R32-16", 88, "Colômbia", "Gana", "2026-07-04T01:30:00.000Z"]
].map(([id, sourceMatchNumber, home, away, kickoffText], index) => {
  const kickoffDate = kickoffUtc(kickoffText);
  return {
    id,
    sourceMatchNumber,
    phase: "knockout",
    stage: "round-of-32",
    stageTitle: "16 avos de final",
    matchNumber: index + 1,
    home,
    away,
    kickoff: kickoffDate,
    kickoffDate,
    kickoffAt: kickoffDate,
    lockAt: knockoutLockAt(kickoffDate),
    status: "SCHEDULED",
    source: "static-knockout-bracket"
  };
});

export function buildKnockoutSkeleton() {
  return knockoutStages.flatMap((stage) =>
    Array.from({ length: stage.count }, (_, index) => {
      const number = index + 1;
      return {
        id: `KO-${stage.prefix}-${number}`,
        phase: "knockout",
        stage: stage.id,
        stageTitle: stage.title,
        matchNumber: number,
        homePlaceholder: "A definir",
        awayPlaceholder: "A definir",
        status: "PENDING"
      };
    })
  );
}

export function knockoutStageTitle(stageId) {
  return knockoutStages.find((stage) => stage.id === stageId)?.title || "Mata-mata";
}

export function isKnockoutMatch(match) {
  return match?.phase === "knockout" || Boolean(match?.stage && !match?.groupId);
}

export function mergeKnockoutMatches(officialMatches = {}) {
  const staticById = new Map(roundOf32Matches.map((match) => [match.id, match]));
  const officialById = new Map(
    Object.values(officialMatches)
      .filter(isKnockoutMatch)
      .map((match) => [match.id, match])
  );

  return buildKnockoutSkeleton().map((fallback) => {
    const staticMatch = staticById.get(fallback.id);
    const official = officialById.get(fallback.id);
    return {
      ...fallback,
      ...(staticMatch || {}),
      ...(official || {}),
      phase: "knockout",
      stage: official?.stage || staticMatch?.stage || fallback.stage,
      stageTitle: knockoutStageTitle(official?.stage || staticMatch?.stage || fallback.stage),
      home: official?.home || official?.homeTeam || staticMatch?.home || official?.homePlaceholder || fallback.homePlaceholder,
      away: official?.away || official?.awayTeam || staticMatch?.away || official?.awayPlaceholder || fallback.awayPlaceholder
    };
  });
}
