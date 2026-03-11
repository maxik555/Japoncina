// --- UI A JAZYKOVÁ LOGIKA ---

function switchTab(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + t);
    if (targetTab) targetTab.classList.add('active');
    
    const btn = document.getElementById('btnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.add('active');

    // Ak prepíname na testy, učenie alebo gramatiku, aktualizujeme selecty
    if (['train', 'learn', 'sensei', 'grammar'].includes(t)) {
        if (typeof populateSelects === 'function') populateSelects();
    }

    // NOVÉ: Ak prepneme na profil, vykreslíme históriu a štatistiky
    if (t === 'profile') {
        window.renderHistory();
        updateProfileStats();
    }
}

function setLang(lang) {
    currentLang = lang; 
    localStorage.setItem('finale_lang', lang);
    
    if(document.getElementById('flag-sk')) document.getElementById('flag-sk').className = lang === 'sk' ? '' : 'inactive'; 
    if(document.getElementById('flag-en')) document.getElementById('flag-en').className = lang === 'en' ? '' : 'inactive';
    
    document.querySelectorAll('[data-sk], [data-en]').forEach(el => { 
        if(el.hasAttribute('data-' + lang)) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.setAttribute('placeholder', el.getAttribute(`data-${lang}`));
            } else {
                el.innerHTML = el.getAttribute(`data-${lang}`); 
            }
        }
    });
    
    if (window.db && window.db.length > 0) populateSelects();
    if (typeof updateUI === 'function') updateUI(); 
}

function closeOverlay(id) { 
    document.getElementById(id).style.display = 'none'; 
}

// --- LOGIKA PROFILU ---

function switchProfileTab(tabId) {
    document.querySelectorAll('.prof-tab').forEach(el => el.classList.add('hidden'));
    document.getElementById('prof-' + tabId).classList.remove('hidden');
    
    document.querySelectorAll('#tab-profile .btn-nav').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = 'var(--bg-dark)';
        btn.style.color = 'var(--text-muted)';
    });
    
    let activeBtn = document.getElementById('btnProf' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.backgroundColor = 'var(--primary)';
        activeBtn.style.color = 'white';
    }

    // Ak klikne na pod-tab história, vykreslíme ju
    if (tabId === 'history') window.renderHistory();
}

function updateProfileStats() {
    let currentLevel = Math.floor(state.xp / 500) + 1;
    let currentLevelXp = state.xp % 500; 
    let xpPercent = (currentLevelXp / 500) * 100;

    let levelEl = document.getElementById('profLevelText');
    let xpEl = document.getElementById('profXpText');
    let barEl = document.getElementById('profXpBar');
    
    if(levelEl) levelEl.innerText = `Level ${currentLevel}`;
    if(xpEl) xpEl.innerText = `${currentLevelXp} / 500 XP`;
    if(barEl) barEl.style.width = `${xpPercent}%`;

    if (window.db && window.db.length > 0) {
        let n5Total = window.db.filter(w => w.jlpt === 'N5').length;
        let n4Total = window.db.filter(w => w.jlpt === 'N4').length;
        let n5Unlocked = window.db.filter(w => w.jlpt === 'N5' && w.lekcia <= state.unlockedLesson).length;
        let n4Unlocked = window.db.filter(w => w.jlpt === 'N4' && w.lekcia <= state.unlockedLesson).length;

        let n5Percent = n5Total > 0 ? Math.round((n5Unlocked / n5Total) * 100) : 0;
        let n4Percent = n4Total > 0 ? Math.round((n4Unlocked / n4Total) * 100) : 0;

        if(document.getElementById('profN5Text')) document.getElementById('profN5Text').innerText = `${n5Percent}% (${n5Unlocked}/${n5Total} slov)`;
        if(document.getElementById('profN5Bar')) document.getElementById('profN5Bar').style.width = `${n5Percent}%`;
        if(document.getElementById('profN4Text')) document.getElementById('profN4Text').innerText = `${n4Percent}% (${n4Unlocked}/${n4Total} slov)`;
        if(document.getElementById('profN4Bar')) document.getElementById('profN4Bar').style.width = `${n4Percent}%`;
    }
    renderBadges();
}

// NOVÉ: Funkcia pre vykreslenie histórie
window.renderHistory = function() {
    const cont = document.getElementById('historyList');
    if (!cont) return;
    cont.innerHTML = '';
    
    if (!state.history || state.history.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px;">Zatiaľ žiadne záznamy o skúškach.</p>`;
        return;
    }
    
    const sorted = [...state.history].sort((a, b) => b.date - a.date);
    sorted.forEach(h => {
        const dateStr = new Date(h.date).toLocaleDateString() + " " + new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style = `background: var(--bg-dark); padding: 12px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${h.passed ? 'var(--success)' : 'var(--danger)'};`;
        
        div.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:14px;">${h.type} - ${h.lesson}</div>
                <div style="font-size:11px; color:var(--text-muted);">${dateStr}</div>
            </div>
            <div style="font-weight:bold; color:${h.passed ? 'var(--success)' : 'var(--danger)'};">${h.score}%</div>
        `;
        cont.appendChild(div);
    });
};

function renderBadges() {
    const badges = [
        { id: 'first_step', icon: '🐣', title: 'Prvý krok', desc: 'Odomkni Lekciu 2', condition: () => state.unlockedLesson >= 2 },
        { id: 'streak_5', icon: '🔥', title: 'Vytrvalec', desc: 'Získaj 5-dňový streak', condition: () => state.streak >= 5 },
        { id: 'perfect_test', icon: '🎯', title: 'Perfekcionista', desc: 'Daj test na 100%', condition: () => state.history && state.history.some(h => h.score === 100 && h.passed) },
        { id: 'boss_1', icon: '👹', title: 'Základy za mnou', desc: 'Odomkni Lekciu 40', condition: () => state.unlockedLesson >= 40 }
    ];

    let grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    badges.forEach(b => {
        let isUnlocked = b.condition();
        let div = document.createElement('div');
        div.className = `badge-item ${isUnlocked ? '' : 'badge-locked'}`;
        div.innerHTML = `
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-title">${b.title}</div>
            <div class="badge-desc">${b.desc}</div>
        `;
        grid.appendChild(div);
    });
}
