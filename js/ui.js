// --- UI A JAZYKOVÁ LOGIKA ---
function switchTab(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + t).classList.add('active');
    const btn = document.getElementById('btnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.add('active');
    if (t === 'train' || t === 'learn' || t === 'sensei') populateSelects();
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
    
    if (db.length > 0) populateSelects();
    updateUI(); 
}

function closeOverlay(id) { 
    document.getElementById(id).style.display = 'none'; 
}

function normalizeString(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[\s\-\!\?\,\.\"\']/g, "").trim();
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
}

function updateProfileStats() {
    // 1. Výpočet XP a Levelu
    let currentLevel = Math.floor(state.xp / 500) + 1;
    let currentLevelXp = state.xp % 500; 
    let xpPercent = (currentLevelXp / 500) * 100;

    let levelEl = document.getElementById('profLevelText');
    let xpEl = document.getElementById('profXpText');
    let barEl = document.getElementById('profXpBar');
    
    if(levelEl) levelEl.innerText = `Level ${currentLevel}`;
    if(xpEl) xpEl.innerText = `${currentLevelXp} / 500 XP`;
    if(barEl) barEl.style.width = `${xpPercent}%`;

    // 2. Výpočet JLPT N5 a N4
    if (db.length > 0) {
        let n5Total = db.filter(w => w.jlpt === 'N5').length;
        let n4Total = db.filter(w => w.jlpt === 'N4').length;

        let n5Unlocked = db.filter(w => w.jlpt === 'N5' && w.lekcia <= state.unlockedLesson).length;
        let n4Unlocked = db.filter(w => w.jlpt === 'N4' && w.lekcia <= state.unlockedLesson).length;

        let n5Percent = n5Total > 0 ? Math.round((n5Unlocked / n5Total) * 100) : 0;
        let n4Percent = n4Total > 0 ? Math.round((n4Unlocked / n4Total) * 100) : 0;

        let profN5Text = document.getElementById('profN5Text');
        let profN5Bar = document.getElementById('profN5Bar');
        if(profN5Text) profN5Text.innerText = `${n5Percent}% (${n5Unlocked}/${n5Total} slov)`;
        if(profN5Bar) profN5Bar.style.width = `${n5Percent}%`;

        let profN4Text = document.getElementById('profN4Text');
        let profN4Bar = document.getElementById('profN4Bar');
        if(profN4Text) profN4Text.innerText = `${n4Percent}% (${n4Unlocked}/${n4Total} slov)`;
        if(profN4Bar) profN4Bar.style.width = `${n4Percent}%`;
    }

    renderBadges();
}

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
