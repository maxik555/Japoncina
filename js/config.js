import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- KONFIGURÁCIA ---
const firebaseConfig = {
    apiKey: "AIzaSyDEJcyJE7H9rlqWYPPit8r83sIgLG3w1OI", 
    authDomain: "learning-japanase.firebaseapp.com",
    projectId: "learning-japanase", 
    storageBucket: "learning-japanase.firebasestorage.app",
    messagingSenderId: "555713188608", 
    appId: "1:555713188608:web:d8375f9ef216321d2319e5"
};

// Inicializácia Firebase
const app = initializeApp(firebaseConfig);

// Export do globálneho okna (aby to videli ostatné skripty)
window.auth = getAuth(app);
window.dbFirestore = getFirestore(app);

// --- GLOBÁLNY STAV APLIKÁCIE ---
window.db = [];
window.state = { 
    unlockedLesson: 1, 
    xp: 0, 
    streak: 0, 
    lastDate: null, 
    theme: 'dark', 
    history: [], 
    nickname: '', 
    perfectLessons: [],
    usedSenseiSentences: [],
    geminiKey: null
};

window.currentUser = null; 
window.currentLang = localStorage.getItem('finale_lang') || 'sk';
