import { auth, db, provider } from "./firebase-config.js";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export let currentUser = null;
const authSubscribers = new Set();
let authReady = false;

const authScreen = document.getElementById("authScreen");
const appShell = document.querySelector(".app-shell");
const loginBtn = document.getElementById("loginBtn");
const googleBtn = document.getElementById("googleBtn");
const logoutBtn = document.getElementById("logoutBtnTop");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

function showApp() {
  if (authScreen) authScreen.style.display = "none";
  if (appShell) appShell.style.display = "block";
}

function showLogin() {
  if (authScreen) authScreen.style.display = "flex";
  if (appShell) appShell.style.display = "none";
}

export function subscribeToAuth(callback) {
  authSubscribers.add(callback);
  if (authReady) callback(currentUser);
  return () => authSubscribers.delete(callback);
}

async function saveUserProfile(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName: user.displayName || "Usuário",
    email: user.email || "",
    photoURL: user.photoURL || "",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

if (authScreen && appShell) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    authReady = true;
    if (user) {
      if (userPhoto) {
        userPhoto.src = user.photoURL || "";
        userPhoto.alt = user.displayName ? `Foto de ${user.displayName}` : "Foto do usuário";
        userPhoto.style.visibility = user.photoURL ? "visible" : "hidden";
      }
      if (userName) userName.textContent = user.displayName || "Usuário logado";
      if (userEmail) userEmail.textContent = user.email || "";
      showApp();
      try {
        await saveUserProfile(user);
      } catch (error) {
        console.error("Não foi possível atualizar o perfil do usuário.", error);
      }
    } else {
      if (userPhoto) {
        userPhoto.removeAttribute("src");
        userPhoto.style.visibility = "hidden";
      }
      if (userName) userName.textContent = "Usuário";
      if (userEmail) userEmail.textContent = "-";
      showLogin();
    }
    authSubscribers.forEach((callback) => callback(user));
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
      alert(error.message);
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert(error.message);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  });
}
