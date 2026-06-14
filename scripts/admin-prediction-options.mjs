export function parseAdminArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new Error(`Argumento inesperado: ${token}`);
    }

    const name = token.slice(2);
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Informe um valor para --${name}.`);
    }
    options[name] = value;
    index += 1;
  }

  return { command, options };
}

export function parseScore(value) {
  const match = String(value ?? "").match(/^(\d{1,2})[xX:-](\d{1,2})$/);
  if (!match) {
    throw new Error("Use o placar no formato 2x1.");
  }

  const homeScore = Number(match[1]);
  const awayScore = Number(match[2]);
  if (homeScore > 99 || awayScore > 99) {
    throw new Error("O placar deve ficar entre 0 e 99.");
  }

  return { homeScore, awayScore };
}

export function requireSetOptions(options) {
  if (!options.email && !options.uid) {
    throw new Error("Informe --email ou --uid.");
  }
  if (!options.match) {
    throw new Error("Informe o jogo com --match, por exemplo A-0.");
  }
  if (!options.score) {
    throw new Error("Informe o placar com --score, por exemplo 2x1.");
  }
  if (!options.reason || options.reason.trim().length < 5) {
    throw new Error("Informe uma justificativa com --reason.");
  }
}
