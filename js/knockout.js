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
  ["KO-R32-2", 76, "Brasil", "Japão", "2026-06-29T17:00:00.000Z"],
  ["KO-R32-3", 74, "Alemanha", "Paraguai", "2026-06-29T20:30:00.000Z"],
  ["KO-R32-4", 75, "Holanda", "Marrocos", "2026-06-30T01:00:00.000Z"],
  ["KO-R32-5", 78, "Costa do Marfim", "Noruega", "2026-06-30T17:00:00.000Z"],
  ["KO-R32-6", 77, "França", "Suécia", "2026-06-30T21:00:00.000Z"],
  ["KO-R32-7", 79, "México", "Equador", "2026-07-01T01:00:00.000Z"],
  ["KO-R32-8", 80, "Inglaterra", "RD Congo", "2026-07-01T16:00:00.000Z"],
  ["KO-R32-9", 82, "Bélgica", "Senegal", "2026-07-01T20:00:00.000Z"],
  ["KO-R32-10", 81, "Estados Unidos", "Bósnia", "2026-07-02T00:00:00.000Z"],
  ["KO-R32-11", 84, "Espanha", "Áustria", "2026-07-02T19:00:00.000Z"],
  ["KO-R32-12", 83, "Portugal", "Croácia", "2026-07-02T23:00:00.000Z"],
  ["KO-R32-13", 85, "Suíça", "Argélia", "2026-07-03T03:00:00.000Z"],
  ["KO-R32-14", 88, "Austrália", "Egito", "2026-07-03T18:00:00.000Z"],
  ["KO-R32-15", 86, "Argentina", "Cabo Verde", "2026-07-03T22:00:00.000Z"],
  ["KO-R32-16", 87, "Colômbia", "Gana", "2026-07-04T01:30:00.000Z"]
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

const futureKnockoutReferenceMatches = [
  ["KO-R16-1", 89, "round-of-16", "Oitavas de final", 1],
  ["KO-R16-2", 90, "round-of-16", "Oitavas de final", 2],
  ["KO-R16-3", 91, "round-of-16", "Oitavas de final", 3],
  ["KO-R16-4", 92, "round-of-16", "Oitavas de final", 4],
  ["KO-R16-5", 93, "round-of-16", "Oitavas de final", 5],
  ["KO-R16-6", 94, "round-of-16", "Oitavas de final", 6],
  ["KO-R16-7", 95, "round-of-16", "Oitavas de final", 7],
  ["KO-R16-8", 96, "round-of-16", "Oitavas de final", 8],
  ["KO-QF-1", 97, "quarter-final", "Quartas de final", 1],
  ["KO-QF-2", 98, "quarter-final", "Quartas de final", 2],
  ["KO-QF-3", 99, "quarter-final", "Quartas de final", 3],
  ["KO-QF-4", 100, "quarter-final", "Quartas de final", 4],
  ["KO-SF-1", 101, "semi-final", "Semifinais", 1],
  ["KO-SF-2", 102, "semi-final", "Semifinais", 2],
  ["KO-TP-1", 103, "third-place", "Disputa de 3o lugar", 1],
  ["KO-FINAL-1", 104, "final", "Final", 1]
].map(([id, sourceMatchNumber, stage, stageTitle, matchNumber]) => ({
  id,
  sourceMatchNumber,
  phase: "knockout",
  stage,
  stageTitle,
  matchNumber,
  homePlaceholder: "A definir",
  awayPlaceholder: "A definir",
  status: "PENDING",
  source: "static-knockout-skeleton"
}));

const knockoutReferenceBySourceMatchNumber = new Map(
  [...roundOf32Matches, ...futureKnockoutReferenceMatches]
    .map((match) => [Number(match.sourceMatchNumber), match])
);

export function findKnockoutMatchBySourceMatchNumber(sourceMatchNumber) {
  return knockoutReferenceBySourceMatchNumber.get(Number(sourceMatchNumber)) || null;
}

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
