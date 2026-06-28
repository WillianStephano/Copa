export const knockoutStages = [
  { id: "round-of-32", title: "16 avos de final", prefix: "R32", count: 16 },
  { id: "round-of-16", title: "Oitavas de final", prefix: "R16", count: 8 },
  { id: "quarter-final", title: "Quartas de final", prefix: "QF", count: 4 },
  { id: "semi-final", title: "Semifinais", prefix: "SF", count: 2 },
  { id: "third-place", title: "Disputa de 3o lugar", prefix: "TP", count: 1 },
  { id: "final", title: "Final", prefix: "F", count: 1 }
];

export function buildKnockoutSkeleton() {
  return knockoutStages.flatMap((stage) =>
    Array.from({ length: stage.count }, (_, index) => {
      const number = index + 1;
      return {
        id: `${stage.prefix}-${number}`,
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
  const officialById = new Map(
    Object.values(officialMatches)
      .filter(isKnockoutMatch)
      .map((match) => [match.id, match])
  );

  return buildKnockoutSkeleton().map((fallback) => {
    const official = officialById.get(fallback.id);
    return {
      ...fallback,
      ...(official || {}),
      phase: "knockout",
      stage: official?.stage || fallback.stage,
      stageTitle: knockoutStageTitle(official?.stage || fallback.stage),
      home: official?.home || official?.homeTeam || official?.homePlaceholder || fallback.homePlaceholder,
      away: official?.away || official?.awayTeam || official?.awayPlaceholder || fallback.awayPlaceholder
    };
  });
}

