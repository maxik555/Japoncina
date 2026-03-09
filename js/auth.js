// --- PRIHLASOVANIE A SYNCHRONIZÁCIA ---

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        await loadUserData();
    } else {
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
        if (document.getElementById('loadingOverlay')) {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }
});

async function loadUserData() {
    try {
        const snap = await dbFirestore.collection('users').doc(currentUser.uid).get();
        if (snap.exists) {
            state = { ...state, ...snap.data() };
        }
        
        const nickInput = document.getElementById('profileNickname');
        if (nickInput) nickInput.value = state.nickname || '';
        
        setLang(currentLang);
        updateUI();
        
        // Načítame databázu
        await fetchDatabaseFromCloud();

    } catch (e) {
        console.error("Chyba pri načítaní dát používateľa:", e);
    }
    
    // SKRYTIE NAČÍTAVACEJ OBRAZOVKY
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

async function saveState() {
    updateUI();
    if (currentUser) {
        try {
            await dbFirestore.collection('users').doc(currentUser.uid).set(state);
        } catch(e) {
            console.error("Chyba pri ukladaní do Firestore:", e);
        }
    }
}

function updateUI() {
    let level = Math.floor(state.xp / 500) + 1;
    let nextLevelXp = level * 500;
    let prevLevelXp = (level - 1) * 500;
    let progress = ((state.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;
    
    const lvlEl = document.getElementById('uiLevel');
    const xpEl = document.getElementById('xpBar');
    const strEl = document.getElementById('uiStreak');
    
    if (lvlEl) lvlEl.innerText = level;
    if (xpEl) xpEl.style.width = Math.max(0, Math.min(100, progress)) + "%";
    if (strEl) strEl.innerText = (state.streak || 0) + " 🔥";
    
    if (typeof renderHistory === 'function') renderHistory();
    if (typeof renderMap === 'function') renderMap();
}

async function loginUser() { 
    const errEl = document.getElementById('authError');
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPass').value;
    try { await auth.signInWithEmailAndPassword(email, pass); } 
    catch(e) { if (errEl) errEl.innerText = "Chyba prihlásenia."; } 
}

async function registerUser() { 
    const errEl = document.getElementById('authError');
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPass').value;
    try { await auth.createUserWithEmailAndPassword(email, pass); } 
    catch(e) { if (errEl) errEl.innerText = "Chyba registrácie."; } 
}

function updateNickname() { 
    const nickInput = document.getElementById('profileNickname');
    if (nickInput) { state.nickname = nickInput.value.trim(); saveState(); }
}

function logoutUser() { auth.signOut(); }
