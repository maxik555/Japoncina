// --- PRIHLASOVANIE A SYNCHRONIZÁCIA ---

// Sledovanie stavu prihlásenia (Firebase Observer)
window.auth.onAuthStateChanged(async (user) => {
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

// --- GOOGLE PRIHLÁSENIE (Nové) ---
window.loginWithGoogle = async function() {
    const errEl = document.getElementById('authError');
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await window.auth.signInWithPopup(provider);
        // Ak je prihlásenie úspešné, onAuthStateChanged sa o zvyšok postará
    } catch (e) {
        console.error("Chyba pri Google prihlásení:", e);
        if (errEl) errEl.innerText = "Prihlásenie cez Google zlyhalo.";
    }
};

// --- PREHĽADNÉ NAČÍTANIE (Šuplíky) ---
async function loadUserData() {
    if (!window.currentUser) return;

    try {
        const userRef = window.dbFirestore.collection('users').doc(window.currentUser.uid);
        
        // Načítame všetky "šuplíky" z Firebase
        const profileSnap = await userRef.collection('data').doc('profile').get();
        const progressSnap = await userRef.collection('data').doc('progress').get();
        const statsSnap = await userRef.collection('data').doc('stats').get();
        const historySnap = await userRef.collection('data').doc('history').get();

        // 1. Ošetrenie: Má už používateľ uprataný nový systém (šuplíky)?
        if (profileSnap.exists) {
            console.log("Načítavam upratané dáta z dódžó...");
            window.state = { 
                ...window.state, 
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
                window.state = { ...window.state, ...oldSnap.data() };
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
        if (nickInput) nickInput.value = window.state.nickname || '';
        
        window.setLang(window.currentLang);
        updateUI();
        
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
    if (!window.currentUser) return;

    try {
        const userRef = window.dbFirestore.collection('users').doc(window.currentUser.uid);
        
        // Rozdelíme 'state' objekt na logické celky
        const profileData = {
            xp: window.state.xp || 0,
            streak: window.state.streak || 0,
            lastDate: window.state.lastDate || '',
            nickname: window.state.nickname || '',
            geminiKey: window.state.geminiKey || '' // API kľúč patrí do profilu
        };

        const progressData = {
            unlockedLesson: window.state.unlockedLesson || 1,
            unlockedGrammar: window.state.unlockedGrammar || 1
        };

        const wordStatsData = window.state.wordStats || {};
        const historyData = { records: window.state.history || [] };

        // Uložíme to do krásne oddelených dokumentov (šuplíkov)
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
    window.state.xp = (window.state.xp || 0) + amount;
    
    // Logika pre denný streak
    const today = new Date().toDateString();
    if (window.state.lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (window.state.lastDate === yesterday.toDateString()) {
            window.state.streak++;
        } else {
            window.state.streak = 1; // Prvý deň po pauze
        }
        window.state.lastDate = today;
    }
    
    updateUI();
    window.saveState();
};

// Komplexná aktualizácia UI prvkov
window.updateUI = function() {
    // Výpočet levelu (1 level = 500 XP)
    let level = Math.floor((window.state.xp || 0) / 500) + 1;
    let currentLevelXp = (window.state.xp || 0) % 500;
    let progress = (currentLevelXp / 500) * 100;
    
    // Hlavná horná lišta
    const lvlEl = document.getElementById('uiLevel');
    const xpBar = document.getElementById('xpBar');
    const streakEl = document.getElementById('uiStreak');
    
    if (lvlEl) lvlEl.innerText = level;
    if (xpBar) xpBar.style.width = Math.max(0, Math.min(100, progress)) + "%";
    if (streakEl) streakEl.innerText = (window.state.streak || 0) + " 🔥";
    
    // Prevolanie renderovania v ostatných moduloch, ak existujú
    if (typeof window.renderHistory === 'function') window.renderHistory();
    if (typeof window.renderMap === 'function') window.renderMap();
    if (typeof window.updateProfileStats === 'function') window.updateProfileStats();
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
        await window.auth.signInWithEmailAndPassword(email, pass); 
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
        await window.auth.createUserWithEmailAndPassword(email, pass); 
    } catch(e) { 
        if (errEl) errEl.innerText = "Tento email už niekto používa."; 
    } 
};

window.updateNickname = function() { 
    const nickInput = document.getElementById('profileNickname');
    if (nickInput) { 
        window.state.nickname = nickInput.value.trim(); 
        window.saveState(); 
        updateUI();
    }
};

window.logoutUser = function() { 
    const confirmMsg = window.currentLang === 'sk' ? "Naozaj sa chceš odhlásiť?" : "Logout?";
    if (confirm(confirmMsg)) {
        window.auth.signOut(); 
    }
};
