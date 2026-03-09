// --- KONFIGURÁCIA A STAV ---
const firebaseConfig = {
    apiKey: "AIzaSyDEJcyJE7H9rlqWYPPit8r83sIgLG3w1OI", 
    authDomain: "learning-japanase.firebaseapp.com",
    projectId: "learning-japanase", 
    storageBucket: "learning-japanase.firebasestorage.app",
    messagingSenderId: "555713188608", 
    appId: "1:555713188608:web:d8375f9ef216321d2319e5"
};

// !!! SEM VLOŽ SVOJ GEMINI KĽÚČ (ten dlhý začínajúci AIza...) !!!
window.GEMINI_API_KEY = "AIzaSyCJ6xqewNPqlsZsI8E3B5mTZYPF4WdWFuo";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); 
const dbFirestore = firebase.firestore();

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
    usedSenseiSentences: [] 
};

let currentUser = null; 
let currentLang = localStorage.getItem('finale_lang') || 'sk';
