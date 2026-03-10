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

// Načítanie dát používateľa z Firestore
async function loadUserData() {
    if (!currentUser) return;

    try {
        const docRef = dbFirestore.collection('users').doc(currentUser.uid);
        const snap = await docRef.get();
        
        if (snap.exists) {
            // Zlúčenie predvoleného stavu s dátami z cloudu
            state = { ...state, ...snap.data() };
        } else {
            // Ak je to nový používateľ, vytvoríme mu prvý záznam
            console.log("Vytváram nový profil v dódžó...");
            await saveState();
        }
        
        // Synchronizácia UI s načítanými dátami
        const nickInput = document.getElementById('profileNickname');
        if (nickInput) nickInput.value = state.nickname || '';
        
        setLang(currentLang);
        updateUI();
        
        // Až po načítaní používateľa ťaháme slovíčka
        await fetchDatabaseFromCloud();

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

// Uloženie aktuálneho stavu do Firestore
async function saveState() {
    if (!currentUser) return;

    try {
        // Ukladáme celý objekt 'state'
        await dbFirestore.collection('users').doc(currentUser.uid).set(state);
    } catch(e) {
        console.error("Chyba pri ukladaní do Firestore:", e);
    }
}

// Funkcia na pridávanie XP s kontrolou streaku
function addXP(amount) {
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
    
    updateUI();
    saveState();
}

// Komplexná aktualizácia UI prvkov
function updateUI() {
    // Výpočet levelu (1 level = 500 XP)
    let level = Math.floor((state.xp || 0) / 500) + 1;
    let currentLevelXp = state.xp % 500;
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
}

// Autentifikačné akcie
async function loginUser() { 
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
}

async function registerUser() { 
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
}

function updateNickname() { 
    const nickInput = document.getElementById('profileNickname');
    if (nickInput) { 
        state.nickname = nickInput.value.trim(); 
        saveState(); 
        updateUI();
    }
}

function logoutUser() { 
    const confirmMsg = currentLang === 'sk' ? "Naozaj sa chceš odhlásiť?" : "Logout?";
    if (confirm(confirmMsg)) {
        auth.signOut(); 
    }
}
