// --- PRIHLASOVANIE A SYNCHRONIZÁCIA ---

// Sledovanie stavu prihlásenia (Firebase Observer)
auth.onAuthStateChanged(async (user) => {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    const loader = document.getElementById('loadingOverlay');

    if (user) {
        currentUser = user;
        if (authContainer) authContainer.style.display = 'none';
        if (mainApp) mainApp.style.display = 'flex';
        await loadUserData();
    } else {
        currentUser = null;
        if (authContainer) authContainer.style.display = 'block';
        if (mainApp) mainApp.style.display = 'none';
        if (loader) loader.style.display = 'none';
    }
});

// --- GOOGLE PRIHLÁSENIE (Nové) ---
window.loginWithGoogle = async function() {
    const errEl = document.getElementById('authError');
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        // Ak je prihlásenie úspešné, onAuthStateChanged sa o zvyšok postará
    } catch (e) {
        console.error("Chyba pri Google prihlásení:", e);
        if (errEl) errEl.innerText = "Prihlásenie cez Google zlyhalo.";
    }
};

// --- PREHĽADNÉ NAČÍTANIE (Šuplíky) ---
async function loadUserData() {
    if (!currentUser) return;

    try {
        const userRef = dbFirestore.collection('users').doc(currentUser.uid);
        
        // Načítame všetky "šuplíky" z Firebase
        const profileSnap = await userRef.collection('data').doc('profile').get();
        const progressSnap = await userRef.collection('data').doc('progress').get();
        const statsSnap = await userRef.collection('data').doc('stats').get();
        const historySnap = await userRef.collection('data').doc('history').get();

        // 1. Ošetrenie: Má už používateľ uprataný nový systém (šuplíky)?
        if (profileSnap.exists) {
            console.log("Načítavam upratané dáta z dódžó...");
            state = { 
                ...state, 
                ...profileSnap.data(), 
                ...(progressSnap.exists ? progressSnap.data() : {}),
                wordStats: statsSnap.exists ? statsSnap.data() : {},
                history: historySnap.exists ? historySnap.data().records : []
            };
        } 
        // 2. Ošetrenie: Je to starý používateľ so všetkým v jednom veľkom dokumente?
        else {
            const oldSnap = await userRef.get();
            if (oldSnap.exists) {
                console.log("Migrujem staré dáta do nových šuplíkov...");
                state = { ...state, ...oldSnap.data() };
                // Hneď mu to uložíme do nového, uprataného formátu
                await saveState(); 
            } else {
                // 3. Úplne nový používateľ
                console.log("Vytváram nový profil v dódžó...");
                await saveState();
            }
        }
        
        // Synchronizácia UI s načítanými dátami
        const nickInput = document.getElementById('profileNickname');
        if (nickInput) nickInput.value = state.nickname || '';
        
        if (typeof setLang === 'function') setLang(currentLang);
        if (typeof updateUI === 'function') updateUI();
        
        // Až po načítaní používateľa ťaháme slovíčka
        if (typeof fetchDatabaseFromCloud === 'function') {
            await fetchDatabaseFromCloud();
        }

    } catch (e) {
        console.error("Chyba pri načítaní dát používateľa:", e);
    }
    
    // Plynulé skrytie načítavacej obrazovky
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

// --- PREHĽADNÉ UKLADANIE (Šuplíky) ---
window.saveState = async function() {
    if (!currentUser) return;

    try {
        const userRef = dbFirestore.collection('users').doc(currentUser.uid);
        
        // Rozdelíme 'state' objekt na logické celky
        const profileData = {
            xp: state.xp || 0,
            streak: state.streak || 0,
            lastDate: state.lastDate || '',
            nickname: state.nickname || '',
            geminiKey: state.geminiKey || '' // API kľúč patrí do profilu
        };

        const progressData = {
            unlockedLesson: state.unlockedLesson || 1,
            unlockedGrammar: state.unlockedGrammar || 1
        };

        const wordStatsData = state.wordStats || {};
        const historyData = { records: state.history || [] };

        // Uložíme to do krásne oddelených dokumentov (šuplíky)
        await userRef.collection('data').doc('profile').set(profileData, { merge: true });
        await userRef.collection('data').doc('progress').set(progressData, { merge: true });
        
        // Štatistiky a históriu ukladáme, len ak tam reálne nejaké dáta sú (šetríme databázu)
        if (Object.keys(wordStatsData).length > 0) {
            await userRef.collection('data').doc('stats').set(wordStatsData);
        }
        if (historyData.records.length > 0) {
            await userRef.collection('data').doc('history').set(historyData);
        }

    } catch(e) {
        console.error("Chyba pri ukladaní do Firestore (Šuplíky):", e);
    }
};

// Funkcia na pridávanie XP s kontrolou streaku
window.addXP = function(amount) {
    state.xp = (state.xp || 0) + amount;
    
    // Logika pre denný streak
    const today = new Date().toDateString();
    if (state.lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (state.lastDate === yesterday.toDateString()) {
            state.streak++;
        } else {
            state.streak = 1; // Prvý deň po pauze
        }
        state.lastDate = today;
    }
    
    if (typeof updateUI === 'function') updateUI();
    saveState();
};

// Komplexná aktualizácia UI prvkov
window.updateUI = function() {
    // Výpočet levelu (1 level = 500 XP)
    let level = Math.floor((state.xp || 0) / 500) + 1;
    let currentLevelXp = (state.xp || 0) % 500;
    let progress = (currentLevelXp / 500) * 100;
    
    // Hlavná horná lišta
    const lvlEl = document.getElementById('uiLevel');
    const xpBar = document.getElementById('xpBar');
    const streakEl = document.getElementById('uiStreak');
    
    if (lvlEl) lvlEl.innerText = level;
    if (xpBar) xpBar.style.width = Math.max(0, Math.min(100, progress)) + "%";
    if (streakEl) streakEl.innerText = (state.streak || 0) + " 🔥";
    
    // Prevolanie renderovania v ostatných moduloch, ak existujú
    if (typeof renderHistory === 'function') renderHistory();
    if (typeof renderMap === 'function') renderMap();
    if (typeof updateProfileStats === 'function') updateProfileStats();
};

// Autentifikačné akcie (Email + Heslo)
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
        state.nickname = nickInput.value.trim(); 
        saveState(); 
        if (typeof updateUI === 'function') updateUI();
    }
};

window.logoutUser = function() { 
    const confirmMsg = (typeof currentLang !== 'undefined' && currentLang === 'sk') ? "Naozaj sa chceš odhlásiť?" : "Logout?";
    if (confirm(confirmMsg)) {
        auth.signOut(); 
    }
};
