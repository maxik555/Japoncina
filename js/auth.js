// --- PRIHLASOVANIE A SYNCHRONIZÁCIA ---

auth.onAuthStateChanged(async (user) => {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    const loader = document.getElementById('loadingOverlay');

    if (user) {
        window.currentUser = user;
        if (authContainer) authContainer.style.display = 'none';
        if (mainApp) mainApp.style.display = 'flex';
        await loadUserData();
    } else {
        window.currentUser = null;
        if (authContainer) authContainer.style.display = 'block';
        if (mainApp) mainApp.style.display = 'none';
        if (loader) loader.style.display = 'none';
    }
});

window.loginWithGoogle = async function() {
    const errEl = document.getElementById('authError');
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (e) {
        console.error("Chyba pri Google prihlásení:", e);
        if (errEl) errEl.innerText = "Prihlásenie cez Google zlyhalo.";
    }
};

async function loadUserData() {
    if (!window.currentUser) return;

    try {
        const userRef = dbFirestore.collection('users').doc(window.currentUser.uid);
        const profileSnap = await userRef.collection('data').doc('profile').get();
        const progressSnap = await userRef.collection('data').doc('progress').get();
        const statsSnap = await userRef.collection('data').doc('stats').get();
        const historySnap = await userRef.collection('data').doc('history').get();

        if (profileSnap.exists) {
            window.state = { 
                ...window.state, 
                ...profileSnap.data(), 
                ...(progressSnap.exists ? progressSnap.data() : {}),
                wordStats: statsSnap.exists ? statsSnap.data() : {},
                history: historySnap.exists ? historySnap.data().records : []
            };
        } else {
            const oldSnap = await userRef.get();
            if (oldSnap.exists) {
                window.state = { ...window.state, ...oldSnap.data() };
            }
            await window.saveState();
        }
        
        const nickInput = document.getElementById('profileNickname');
        if (nickInput) nickInput.value = window.state.nickname || '';

        // Aplikovanie témy
        if (window.state.theme) {
            document.body.setAttribute('data-theme', window.state.theme);
        }
        
        if (typeof setLang === 'function') window.setLang(window.currentLang);
        if (typeof updateUI === 'function') window.updateUI();
        
        if (typeof fetchDatabaseFromCloud === 'function') {
            await fetchDatabaseFromCloud();
        }

    } catch (e) {
        console.error("Chyba pri načítaní dát používateľa:", e);
    }
    
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

window.saveState = async function() {
    if (!window.currentUser) return;

    try {
        const userRef = dbFirestore.collection('users').doc(window.currentUser.uid);
        
        const profileData = {
            xp: window.state.xp || 0,
            streak: window.state.streak || 0,
            lastDate: window.state.lastDate || '',
            nickname: window.state.nickname || '',
            geminiKey: window.state.geminiKey || '',
            theme: window.state.theme || 'dark' // Ukladáme tému!
        };

        const progressData = {
            unlockedLesson: window.state.unlockedLesson || 1,
            unlockedGrammar: window.state.unlockedGrammar || 1
        };

        const wordStatsData = window.state.wordStats || {};
        const historyData = { records: window.state.history || [] };

        await userRef.collection('data').doc('profile').set(profileData, { merge: true });
        await userRef.collection('data').doc('progress').set(progressData, { merge: true });
        
        if (Object.keys(wordStatsData).length > 0) {
            await userRef.collection('data').doc('stats').set(wordStatsData);
        }
        if (historyData.records.length > 0) {
            await userRef.collection('data').doc('history').set(historyData);
        }

    } catch(e) {
        console.error("Chyba pri ukladaní do Firestore:", e);
    }
};

window.addXP = function(amount) {
    window.state.xp = (window.state.xp || 0) + amount;
    
    const today = new Date().toDateString();
    if (window.state.lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (window.state.lastDate === yesterday.toDateString()) {
            window.state.streak++;
        } else {
            window.state.streak = 1;
        }
        window.state.lastDate = today;
    }
    
    if (typeof updateUI === 'function') window.updateUI();
    window.saveState();
};

window.updateUI = function() {
    let level = Math.floor((window.state.xp || 0) / 500) + 1;
    let currentLevelXp = (window.state.xp || 0) % 500;
    let progress = (currentLevelXp / 500) * 100;
    
    const lvlEl = document.getElementById('uiLevel');
    const xpBar = document.getElementById('xpBar');
    const streakEl = document.getElementById('uiStreak');
    
    if (lvlEl) lvlEl.innerText = level;
    if (xpBar) xpBar.style.width = Math.max(0, Math.min(100, progress)) + "%";
    if (streakEl) streakEl.innerText = (window.state.streak || 0) + " 🔥";
    
    if (typeof renderHistory === 'function') window.renderHistory();
    if (typeof renderMap === 'function') window.renderMap();
    if (typeof updateProfileStats === 'function') window.updateProfileStats();
};

window.loginUser = async function() { 
    const errEl = document.getElementById('authError');
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    
    if (!email || !pass) {
        if (errEl) errEl.innerText = "Doplň údaje.";
        return;
    }

    try { 
        await auth.signInWithEmailAndPassword(email, pass); 
    } catch(e) { 
        if (errEl) errEl.innerText = "Nesprávny email alebo heslo."; 
    } 
};

window.registerUser = async function() { 
    const errEl = document.getElementById('authError');
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;

    if (!email || pass.length < 6) {
        if (errEl) errEl.innerText = "Email musí byť platný a heslo aspoň 6 znakov.";
        return;
    }

    try { 
        await auth.createUserWithEmailAndPassword(email, pass); 
    } catch(e) { 
        if (errEl) errEl.innerText = "Tento email už niekto používa."; 
    } 
};

window.updateNickname = function() { 
    const nickInput = document.getElementById('profileNickname');
    if (nickInput) { 
        window.state.nickname = nickInput.value.trim(); 
        window.saveState(); 
        if (typeof updateUI === 'function') window.updateUI();
    }
};

window.logoutUser = function() { 
    const confirmMsg = (typeof currentLang !== 'undefined' && currentLang === 'en') ? "Logout?" : "Naozaj sa chceš odhlásiť?";
    if (confirm(confirmMsg)) {
        auth.signOut(); 
    }
};
