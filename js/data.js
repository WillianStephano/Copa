export const STORAGE_PREFIX = "copa2026:";

export const VALID_TABS = ["overview", "simulator", "knockout", "ranking", "standings", "calendar", "rules"];

export const flagCodes = {
  "México": "mx",
  "África do Sul": "za",
  "Coreia do Sul": "kr",
  "Tchéquia": "cz",
  "Canadá": "ca",
  "Bósnia": "ba",
  "Catar": "qa",
  "Suíça": "ch",
  Brasil: "br",
  Marrocos: "ma",
  Haiti: "ht",
  "Escócia": "gb-sct",
  "Estados Unidos": "us",
  Paraguai: "py",
  Austrália: "au",
  Turquia: "tr",
  Alemanha: "de",
  "Curaçao": "cw",
  "Costa do Marfim": "ci",
  Equador: "ec",
  Holanda: "nl",
  Japão: "jp",
  Suécia: "se",
  Tunísia: "tn",
  Bélgica: "be",
  Egito: "eg",
  Irã: "ir",
  "Nova Zelândia": "nz",
  Espanha: "es",
  "Cabo Verde": "cv",
  "Arábia Saudita": "sa",
  Uruguai: "uy",
  França: "fr",
  Senegal: "sn",
  Iraque: "iq",
  Noruega: "no",
  Argentina: "ar",
  Argélia: "dz",
  Áustria: "at",
  Jordânia: "jo",
  Portugal: "pt",
  "RD Congo": "cd",
  "Uzbequistão": "uz",
  Colômbia: "co",
  Inglaterra: "gb-eng",
  Croácia: "hr",
  Gana: "gh",
  Panamá: "pa"
};

export const groups = {
  A: {
    name: "Grupo A",
    teams: ["México", "África do Sul", "Coreia do Sul", "Tchéquia"],
    matches: [
      ["11/06", "México", "África do Sul"],
      ["11/06", "Coreia do Sul", "Tchéquia"],
      ["18/06", "Tchéquia", "África do Sul"],
      ["18/06", "México", "Coreia do Sul"],
      ["24/06", "Tchéquia", "México"],
      ["24/06", "África do Sul", "Coreia do Sul"]
    ]
  },
  B: {
    name: "Grupo B",
    teams: ["Canadá", "Bósnia", "Catar", "Suíça"],
    matches: [
      ["12/06", "Canadá", "Bósnia"],
      ["13/06", "Catar", "Suíça"],
      ["18/06", "Suíça", "Bósnia"],
      ["18/06", "Canadá", "Catar"],
      ["24/06", "Suíça", "Canadá"],
      ["24/06", "Bósnia", "Catar"]
    ]
  },
  C: {
    name: "Grupo C",
    teams: ["Brasil", "Marrocos", "Haiti", "Escócia"],
    matches: [
      ["13/06", "Brasil", "Marrocos"],
      ["13/06", "Haiti", "Escócia"],
      ["19/06", "Escócia", "Marrocos"],
      ["19/06", "Brasil", "Haiti"],
      ["24/06", "Escócia", "Brasil"],
      ["24/06", "Marrocos", "Haiti"]
    ]
  },
  D: {
    name: "Grupo D",
    teams: ["Estados Unidos", "Paraguai", "Austrália", "Turquia"],
    matches: [
      ["12/06", "Estados Unidos", "Paraguai"],
      ["13/06", "Austrália", "Turquia"],
      ["19/06", "Estados Unidos", "Austrália"],
      ["20/06", "Turquia", "Paraguai"],
      ["25/06", "Turquia", "Estados Unidos"],
      ["25/06", "Paraguai", "Austrália"]
    ]
  },
  E: {
    name: "Grupo E",
    teams: ["Alemanha", "Curaçao", "Costa do Marfim", "Equador"],
    matches: [
      ["14/06", "Alemanha", "Curaçao"],
      ["14/06", "Costa do Marfim", "Equador"],
      ["20/06", "Alemanha", "Costa do Marfim"],
      ["20/06", "Equador", "Curaçao"],
      ["25/06", "Equador", "Alemanha"],
      ["25/06", "Curaçao", "Costa do Marfim"]
    ]
  },
  F: {
    name: "Grupo F",
    teams: ["Holanda", "Japão", "Suécia", "Tunísia"],
    matches: [
      ["14/06", "Holanda", "Japão"],
      ["14/06", "Suécia", "Tunísia"],
      ["20/06", "Holanda", "Suécia"],
      ["21/06", "Tunísia", "Japão"],
      ["25/06", "Japão", "Suécia"],
      ["25/06", "Tunísia", "Holanda"]
    ]
  },
  G: {
    name: "Grupo G",
    teams: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
    matches: [
      ["15/06", "Bélgica", "Egito"],
      ["15/06", "Irã", "Nova Zelândia"],
      ["21/06", "Bélgica", "Irã"],
      ["21/06", "Nova Zelândia", "Egito"],
      ["27/06", "Egito", "Irã"],
      ["27/06", "Nova Zelândia", "Bélgica"]
    ]
  },
  H: {
    name: "Grupo H",
    teams: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
    matches: [
      ["15/06", "Espanha", "Cabo Verde"],
      ["15/06", "Arábia Saudita", "Uruguai"],
      ["21/06", "Espanha", "Arábia Saudita"],
      ["21/06", "Uruguai", "Cabo Verde"],
      ["26/06", "Cabo Verde", "Arábia Saudita"],
      ["26/06", "Uruguai", "Espanha"]
    ]
  },
  I: {
    name: "Grupo I",
    teams: ["França", "Senegal", "Iraque", "Noruega"],
    matches: [
      ["16/06", "França", "Senegal"],
      ["16/06", "Iraque", "Noruega"],
      ["22/06", "França", "Iraque"],
      ["22/06", "Noruega", "Senegal"],
      ["26/06", "Noruega", "França"],
      ["26/06", "Senegal", "Iraque"]
    ]
  },
  J: {
    name: "Grupo J",
    teams: ["Argentina", "Argélia", "Áustria", "Jordânia"],
    matches: [
      ["16/06", "Argentina", "Argélia"],
      ["17/06", "Áustria", "Jordânia"],
      ["22/06", "Argentina", "Áustria"],
      ["23/06", "Jordânia", "Argélia"],
      ["27/06", "Argélia", "Áustria"],
      ["27/06", "Jordânia", "Argentina"]
    ]
  },
  K: {
    name: "Grupo K",
    teams: ["Portugal", "RD Congo", "Uzbequistão", "Colômbia"],
    matches: [
      ["17/06", "Portugal", "RD Congo"],
      ["17/06", "Uzbequistão", "Colômbia"],
      ["23/06", "Portugal", "Uzbequistão"],
      ["23/06", "Colômbia", "RD Congo"],
      ["27/06", "Colômbia", "Portugal"],
      ["27/06", "RD Congo", "Uzbequistão"]
    ]
  },
  L: {
    name: "Grupo L",
    teams: ["Inglaterra", "Croácia", "Gana", "Panamá"],
    matches: [
      ["17/06", "Inglaterra", "Croácia"],
      ["17/06", "Gana", "Panamá"],
      ["23/06", "Inglaterra", "Gana"],
      ["23/06", "Panamá", "Croácia"],
      ["27/06", "Panamá", "Inglaterra"],
      ["27/06", "Croácia", "Gana"]
    ]
  }
};

export const matchVenues = {
  "A:0": { stadium: "Mexico City Stadium (Estádio Azteca)", city: "Cidade do México", country: "México" },
  "A:1": { stadium: "Estadio Guadalajara (Estádio Akron)", city: "Guadalajara", country: "México" },
  "B:0": { stadium: "Toronto Stadium (BMO Field)", city: "Toronto", country: "Canadá" },
  "D:0": { stadium: "Los Angeles Stadium (SoFi Stadium)", city: "Los Angeles", country: "Estados Unidos" },
  "B:1": { stadium: "San Francisco Bay Area Stadium (Levi's Stadium)", city: "Santa Clara", country: "Estados Unidos" },
  "C:0": { stadium: "New York New Jersey Stadium (MetLife Stadium)", city: "East Rutherford", country: "Estados Unidos" },
  "C:1": { stadium: "Boston Stadium (Gillette Stadium)", city: "Foxborough", country: "Estados Unidos" },
  "D:1": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  final: {
    date: "19/07",
    match: "Disputa do título (a definir)",
    stadium: "New York New Jersey Stadium (MetLife Stadium)",
    city: "East Rutherford",
    country: "Estados Unidos"
  }
};
