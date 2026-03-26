console.log("--- ui.js načítané (Giga Master v3.0) ---");

// --- HLAVNÁ NAVIGÁCIA ---
window.switchTab = function(t) {
    // Deaktivácia všetkých tabov a tlačidiel
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    
    // Aktivácia cieľového tabu
    const targetTab = document.getElementById('tab-' + t);
    if (targetTab) targetTab.classList.add('active');
    
    // Aktivácia tlačidla
    const btn = document.getElementById('btnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.add('active');
    
    // Špecifická logika pre taby
    if (['train', 'learn', 'sensei', 'grammar', 'stories'].includes(t)) {
        if (typeof window.populateSelects === 'function') window.populateSelects();
    }
    
    if (t === 'profile') { 
        if (typeof window.renderHistory === 'function') window.renderHistory(); 
        if (typeof window.updateProfileStats === 'function') window.updateProfileStats(); 
    }

    // Automatické vypnutie mikrofónu pri odchode z Live tabu
    if (t !== 'live' && window.isLiveActive) {
        if (typeof window.toggleLiveSensei === 'function') window.toggleLiveSensei();
    }
};

// --- PREPÍNANIE JAZYKOV (Opravené) ---
window.setLang = function(lang) {
    window.currentLang = lang; 
    localStorage.setItem('finale_lang', lang);
    
    // Vizuálna odozva na vlajkách
    const fSk = document.getElementById('flag-sk');
    const fEn = document.getElementById('flag-en');
    if(fSk) fSk.style.opacity = (lang === 'sk') ? '1' : '0.3';
    if(fEn) fEn.style.opacity = (lang === 'en') ? '1' : '0.3';
    
    // Preklad všetkých elementov s atribútmi data-sk/en
    document.querySelectorAll('[data-sk], [data-en]').forEach(el => { 
        const txt = el.getAttribute('data-' + lang);
        if (txt) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.setAttribute('placeholder', txt);
            } else {
                el.innerHTML = txt; 
            }
        }
    });
    
    // Re-render selectov a UI v novom jazyku
    if (window.db && window.db.length > 0) {
        if (typeof window.populateSelects === 'function') window.populateSelects();
    }
    if (typeof window.updateUI === 'function') window.updateUI(); 
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
    
    document.querySelectorAll('#tab-train .btn-nav').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (btn) btn.classList.add('active');
};

window.switchProfileTab = function(tabId) {
    document.querySelectorAll('.prof-tab').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById('prof-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('#tab-profile .btn-nav').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('btnProf' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
};

// --- RENDER STATS & HISTÓRIA ---
window.updateProfileStats = function() {
    if (!window.state) return;
    
    let lvl = Math.floor((window.state.xp || 0) / 500) + 1;
    let curXp = (window.state.xp || 0) % 500;
    
    if(document.getElementById('profLevelText')) document.getElementById('profLevelText').innerText = `Level ${lvl}`;
    if(document.getElementById('profXpText')) document.getElementById('profXpText').innerText = `${curXp} / 500 XP`;
    if(document.getElementById('profXpBar')) document.getElementById('profXpBar').style.width = `${(curXp/500)*100}%`;

    if (window.db && window.db.length > 0) {
        const n5Total = window.db.filter(w => (w.jlpt||'N5').trim().toUpperCase() === 'N5').length;
        const n5Unlocked = window.db.filter(w => (w.jlpt||'N5').trim().toUpperCase() === 'N5' && w.lekcia <= window.state.unlockedLesson).length;
        const n5Perc = Math.round((n5Unlocked / n5Total) * 100) || 0;

        if(document.getElementById('profN5Text')) document.getElementById('profN5Text').innerText = `${n5Perc}%`;
        if(document.getElementById('profN5Bar')) document.getElementById('profN5Bar').style.width = `${n5Perc}%`;
    }
};

window.renderHistory = function() {
    const cont = document.getElementById('historyList');
    if (!cont || !window.state || !window.state.history) return;
    cont.innerHTML = '';
    
    [...window.state.history].reverse().forEach((h, idx) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style = `border-left: 4px solid ${h.passed ? 'var(--success)' : 'var(--danger)'}; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 8px; font-size: 13px;`;
        div.innerHTML = `<b>${h.type}</b> (${h.lesson}) <span style="float:right;">${h.score}%</span>`;
        cont.appendChild(div);
    });
};
