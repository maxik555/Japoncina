// --- KONFIGURÁCIA FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDEJcyJE7H9rlqWYPPit8r83sIgLG3w1OI", 
    authDomain: "learning-japanase.firebaseapp.com",
    projectId: "learning-japanase", 
    storageBucket: "learning-japanase.firebasestorage.app",
    messagingSenderId: "555713188608", 
    appId: "1:555713188608:web:d8375f9ef216321d2319e5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); 
const dbFirestore = firebase.firestore();

// --- GLOBÁLNY STAV ---
window.db = [];           
window.grammarDb = [];    
window.state = { 
    unlockedLesson: 1, 
    unlockedGrammarLesson: 1, // NOVÉ: Sledovanie progresu v gramatike
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
