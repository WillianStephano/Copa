import { readFile } from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  parseAdminArgs,
  parseScore,
  requireSetOptions
} from "./admin-prediction-options.mjs";
import { updateRanking } from "./admin-ranking.mjs";

const HELP = `
Uso:
  npm run admin:prediction -- list-users --service-account CAMINHO
  npm run admin:prediction -- list-matches --service-account CAMINHO
  npm run admin:prediction -- set --service-account CAMINHO --email EMAIL --match A-0 --score 2x1 --reason "Justificativa"

Também é possível usar --uid no lugar de --email.
`;

async function loadServiceAccount(path) {
  const credentialsJson = path
    ? await readFile(path, "utf8")
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!credentialsJson) {
    throw new Error(
      "Informe --service-account CAMINHO ou defina FIREBASE_SERVICE_ACCOUNT_JSON."
    );
  }

  try {
    return JSON.parse(credentialsJson);
  } catch {
    throw new Error("A credencial informada não contém um JSON válido.");
  }
}

async function findUser(db, options) {
  if (options.uid) {
    const snapshot = await db.collection("users").doc(options.uid).get();
    return snapshot.exists
      ? { uid: snapshot.id, ...snapshot.data() }
      : null;
  }

  const snapshot = await db
    .collection("users")
    .where("email", "==", options.email)
    .limit(2)
    .get();

  if (snapshot.size > 1) {
    throw new Error("Mais de um perfil usa esse e-mail. Execute usando --uid.");
  }
  if (snapshot.empty) return null;

  const item = snapshot.docs[0];
  return { uid: item.id, ...item.data() };
}

async function listUsers(db) {
  const snapshot = await db.collection("users").get();
  const users = snapshot.docs
    .map((item) => ({
      nome: item.data().displayName || "Participante",
      email: item.data().email || "",
      uid: item.data().uid || item.id
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (!users.length) {
    console.log("Nenhum usuário encontrado.");
    return;
  }
  console.table(users);
}

async function listFinishedMatches(db) {
  const snapshot = await db
    .collection("matches")
    .where("status", "==", "FINISHED")
    .get();
  const matches = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!matches.length) {
    console.log("Nenhuma partida encerrada encontrada.");
    return;
  }

  console.table(matches.map((match) => ({
    id: match.id,
    jogo: `${match.home} x ${match.away}`,
    resultado: `${match.homeScore} x ${match.awayScore}`
  })));
}

async function setPrediction(db, options) {
  requireSetOptions(options);
  const { homeScore, awayScore } = parseScore(options.score);
  const [user, matchSnapshot] = await Promise.all([
    findUser(db, options),
    db.collection("matches").doc(options.match).get()
  ]);

  if (!user) throw new Error("Usuário não encontrado.");
  if (!matchSnapshot.exists) {
    throw new Error(`Jogo ${options.match} não encontrado.`);
  }

  const match = matchSnapshot.data();
  const predictionId = `${user.uid}_${options.match}`;
  const predictionReference = db.collection("predictions").doc(predictionId);
  const previousSnapshot = await predictionReference.get();

  await predictionReference.set({
    uid: user.uid,
    matchId: options.match,
    groupId: match.groupId,
    matchIndex: Number(match.matchIndex),
    home: match.home,
    away: match.away,
    homeScore,
    awayScore,
    confirmedAt: previousSnapshot.exists
      ? previousSnapshot.data().confirmedAt || FieldValue.serverTimestamp()
      : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    adminAdjusted: true,
    adminAdjustedAt: FieldValue.serverTimestamp(),
    adminAdjustmentReason: options.reason.trim()
  });

  const ranking = await updateRanking(db);
  const userRanking = ranking.find((entry) => entry.uid === user.uid);
  console.log(
    `Palpite ${previousSnapshot.exists ? "atualizado" : "criado"}: `
    + `${user.displayName || user.email || user.uid}, ${match.home} ${homeScore} x ${awayScore} ${match.away}.`
  );
  console.log(
    `Ranking recalculado: ${userRanking?.points || 0} pontos, posição ${userRanking?.position || "-"}.`
  );
}

const { command, options } = parseAdminArgs(process.argv.slice(2));
if (!command || command === "help") {
  console.log(HELP.trim());
  process.exit(0);
}

const serviceAccount = await loadServiceAccount(options["service-account"]);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

if (command === "list-users") {
  await listUsers(db);
} else if (command === "list-matches") {
  await listFinishedMatches(db);
} else if (command === "set") {
  await setPrediction(db, options);
} else {
  throw new Error(`Comando desconhecido: ${command}\n${HELP}`);
}
