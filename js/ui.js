console.log("--- ui.js načítané (Master v4.0 - Témy & JLPT) ---");

// --- HLAVNÁ NAVIGÁCIA ---
window.switchTab = function(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + t);
    if (targetTab) targetTab.classList.remove('hidden'); // Ošetrené nové skrývanie
    if (targetTab) targetTab.classList.add('active');
    
    const btnId = 'btnTab' + t.charAt(0).toUpperCase() + t.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
    
    // Skrytie ostatných tabov
    document.querySelectorAll('.tab').forEach(el => {
        if (el.id !== 'tab-' + t) el.classList.add('hidden');
    });

    if (['train', 'learn', 'sensei', 'grammar', 'stories'].includes(t)) {
        if (typeof window.populateSelects === 'function') window.populateSelects();
    }
    
    if (t === 'profile') { 
        if (typeof window.renderHistory === 'function') window.renderHistory(); 
        if (typeof window.updateProfileStats === 'function') window.updateProfileStats(); 
        window.checkThemeLocks(); // Skontroluje odomknutie tém
    }

    if (t !== 'live' && window.isLiveActive) {
        if (typeof window.toggleLiveSensei === 'function') window.toggleLiveSensei();
    }
};

// --- PREPÍNANIE JAZYKOV ---
window.setLang = function(lang) {
    window.currentLang = lang; 
    localStorage.setItem('finale_lang', lang);

    const fSk = document.getElementById('flag-sk');
    const fEn = document.getElementById('flag-en');
    if(fSk) fSk.style.opacity = (lang === 'sk') ? '1' : '0.3';
    if(fEn) fEn.style.opacity = (lang === 'en') ? '1' : '0.3';
    
    document.querySelectorAll('[data-sk], [data-en]').forEach(el => { 
        const translation = el.getAttribute('data-' + lang);
        if (translation) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.setAttribute('placeholder', translation);
            } else {
                el.innerHTML = translation; 
            }
        }
    });
    
    if (window.db && window.db.length > 0) {
        if (typeof window.populateSelects === 'function') window.populateSelects();
    }
};

// --- POMOCNÉ UI FUNKCIE ---
window.closeOverlay = function(id) { 
    const el = document.getElementById(id);
    if (el) el.style.display = 'none'; 
};

window.selectTestModeUI = function(m) {
    document.querySelectorAll('#tab-train .setup-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1));
    if (target) target.classList.remove('hidden');
    
    document.querySelectorAll('.test-nav .btn-nav').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (btn) btn.classList.add('active');
};

window.switchProfileTab = function(tabId) {
    document.querySelectorAll('.prof-tab').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById('prof-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('.prof-nav .btn-nav').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('btnProf' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
};

// --- TÉMY (NASTAVENIA VZHĽADU) ---
window.checkThemeLocks = function() {
    let lvl = Math.floor((window.state.xp || 0) / 500) + 1;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        let reqLvl = parseInt(btn.getAttribute('data-lvl') || 0);
        if (lvl >= reqLvl) {
            btn.classList.remove('locked');
        } else {
            btn.classList.add('locked');
        }
    });
};

window.setTheme = function(themeName) {
    let lvl = Math.floor((window.state.xp || 0) / 500) + 1;
    
    if (themeName === 'konoha' && lvl < 5) return alert("Musíš dosiahnuť Level 5!");
    if (themeName === 'sharingan' && lvl < 10) return alert("Musíš dosiahnuť Level 10!");
    if (themeName === 'nara' && lvl < 15) return alert("Musíš dosiahnuť Level 15!");

    document.body.setAttribute('data-theme', themeName);
    window.state.theme = themeName;
    if (typeof saveState === 'function') window.saveState();

    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('theme-' + themeName);
    if (activeBtn) activeBtn.classList.add('active');
};

// --- ŠTATISTIKY A JLPT PROGRES (OPRAVENÉ) ---
window.updateProfileStats = function() {
    if (!window.state) return;
    let lvl = Math.floor((window.state.xp || 0) / 500) + 1;
    let curXp = (window.state.xp || 0) % 500;
    
    if(document.getElementById('profLevelText')) document.getElementById('profLevelText').innerText = `Level ${lvl}`;
    if(document.getElementById('profXpText')) document.getElementById('profXpText').innerText = `${curXp} / 500 XP`;
    if(document.getElementById('profXpBar')) document.getElementById('profXpBar').style.width = `${(curXp/500)*100}%`;

    // Aplikujeme uloženú tému
    if (window.state.theme) {
        document.body.setAttribute('data-theme', window.state.theme);
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        let activeBtn = document.getElementById('theme-' + window.state.theme);
        if (activeBtn) activeBtn.classList.add('active');
    }

    // Výpočet JLPT (N5 a N4)
    if (window.db && window.db.length > 0) {
        let n5Total = window.db.filter(w => (w.jlpt || 'N5').trim().toUpperCase() === 'N5').length;
        let n4Total = window.db.filter(w => (w.jlpt || 'N5').trim().toUpperCase() === 'N4').length;
        
        let n5Unlocked = window.db.filter(w => (w.jlpt || 'N5').trim().toUpperCase() === 'N5' && w.lekcia <= window.state.unlockedLesson).length;
        let n4Unlocked = window.db.filter(w => (w.jlpt || 'N5').trim().toUpperCase() === 'N4' && w.lekcia <= window.state.unlockedLesson).length;

        let n5Perc = n5Total > 0 ? Math.round((n5Unlocked / n5Total) * 100) : 0;
        let n4Perc = n4Total > 0 ? Math.round((n4Unlocked / n4Total) * 100) : 0;

        if(document.getElementById('profN5Text')) document.getElementById('profN5Text').innerText = `${n5Perc}%`;
        if(document.getElementById('profN5Bar')) document.getElementById('profN5Bar').style.width = `${n5Perc}%`;
        
        if(document.getElementById('profN4Text')) document.getElementById('profN4Text').innerText = `${n4Perc}%`;
        if(document.getElementById('profN4Bar')) document.getElementById('profN4Bar').style.width = `${n4Perc}%`;
    }
};

window.renderHistory = function() {
    const cont = document.getElementById('historyList');
    if (!cont || !window.state || !window.state.history) return;
    cont.innerHTML = '';
    
    [...window.state.history].reverse().slice(0, 10).forEach((h) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style = `border-left: 4px solid ${h.passed ? 'var(--success)' : 'var(--danger)'}; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 8px; font-size: 13px;`;
        div.innerHTML = `<b>${h.type}</b> (${h.lesson}) <span style="float:right;">${h.score}%</span>`;
        cont.appendChild(div);
    });
};
