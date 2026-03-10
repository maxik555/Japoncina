// --- KONFIGURÁCIA FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDEJcyJE7H9rlqWYPPit8r83sIgLG3w1OI", 
    authDomain: "learning-japanase.firebaseapp.com",
    projectId: "learning-japanase", 
    storageBucket: "learning-japanase.firebasestorage.app",
    messagingSenderId: "555713188608", 
    appId: "1:555713188608:web:d8375f9ef216321d2319e5"
};

// Inicializácia Firebase (cez compat verziu)
firebase.initializeApp(firebaseConfig);

// Globálne premenné pre služby
const auth = firebase.auth(); 
const dbFirestore = firebase.firestore();

// --- GLOBÁLNY STAV APLIKÁCIE ---
// Premenné sú definované globálne, aby k nim mali prístup všetky súbory (auth.js, ui.js, atď.)
let db = [];
let state = { 
    unlockedLesson: 1, 
    xp: 0, 
    streak: 0, 
    lastDate: null, 
    theme: 'dark', 
    history: [], 
    nickname: '', 
    perfectLessons: [],
    usedSenseiSentences: [],
    geminiKey: null // Tu sa bezpečne uloží kľúč používateľa po zadaní v Senseiovi
};

let currentUser = null; 
let currentLang = localStorage.getItem('finale_lang') || 'sk';

console.log("Konfigurácia dódžó úspešne načítaná.");
