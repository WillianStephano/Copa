import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBf9wcHdmjDfp2MVnlw3c9NQRi5uLMXv2g",
    authDomain: "copa2026-bolao-2b10d.firebaseapp.com",
    projectId: "copa2026-bolao-2b10d",
    storageBucket: "copa2026-bolao-2b10d.firebasestorage.app",
    messagingSenderId: "660403474492",
    appId: "1:660403474492:web:236aa2050535c03ca1f339"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const db = getFirestore(app);