import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const CONFIG_URL = "/__/firebase/init.json";

const response = await fetch(CONFIG_URL);
if (!response.ok) {
  throw new Error(`Não foi possível carregar a configuração do Firebase (${response.status}).`);
}

const firebaseConfig = await response.json();

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const db = getFirestore(app);
