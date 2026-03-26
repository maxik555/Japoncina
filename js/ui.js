console.log("--- ui.js načítané (Master v4.1 - Dictionary Fixed) ---");

// --- HLAVNÁ NAVIGÁCIA ---
window.switchTab = function(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + t);
    if (targetTab) targetTab.classList.remove('hidden'); 
    if (targetTab) targetTab.classList.add('active');
    
    const btnId = 'btnTab' + t.charAt(0).toUpperCase() + t.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
    
    document.querySelectorAll('.tab').forEach(el => {
        if (el.id !== 'tab-' + t) el.classList.add('hidden');
    });

    if (['train', 'learn', 'sensei', 'grammar', 'stories'].includes(t)) {
        if (typeof window.populateSelects === 'function') window.populateSelects();
    }
    
    if (t === 'profile') { 
        if (typeof window.renderHistory === 'function') window.renderHistory(); 
        if (typeof window.updateProfileStats === 'function') window.updateProfileStats(); 
        if (typeof window.checkThemeLocks === 'function') window.checkThemeLocks();
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

    // Ak je otvorený slovník, prekreslíme ho v novom jazyku
    if (document.getElementById('overlayDictionary') && document.getElementById('overlayDictionary').style.display !== 'none') {
        window.openMyDictionary();
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

// --- MÔJ SLOVNÍK (VRÁTENÝ KÓD) ---
window.openMyDictionary = function() {
    let dictOverlay = document.getElementById('overlayDictionary');
    let isEn = window.currentLang === 'en';
    let titleText = isEn ? "📖 My Dictionary" : "📖 Môj Slovník";
    let searchPlaceholder = isEn ? "Search..." : "Hľadať / Search...";

    if (!dictOverlay) {
        dictOverlay = document.createElement('div');
        dictOverlay.id = 'overlayDictionary';
        dictOverlay.className = 'overlay';
        dictOverlay.style = 'display:none; align-items:center; justify-content:center;';
        
        dictOverlay.innerHTML = `
            <div class="overlay-content" style="max-width: 800px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span id="dictTitle">${titleText}</span>
                    <button onclick="document.getElementById('overlayDictionary').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
                </h3>
                <input type="text" id="dictSearch" placeholder="${searchPlaceholder}" style="width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: white;" onkeyup="window.filterDictionary()">
                <div id="dictList" style="overflow-y: auto; overflow-x: auto; flex-grow: 1; border-radius: 8px;"></div>
            </div>
        `;
        document.body.appendChild(dictOverlay);
    } else {
        document.getElementById('dictTitle').innerText = titleText;
        document.getElementById('dictSearch').placeholder = searchPlaceholder;
    }
    
    window.renderDictionaryList();
    dictOverlay.style.display = 'flex';
    document.getElementById('dictSearch').value = ''; 
};

window.renderDictionaryList = function(searchQuery = '') {
    const listContainer = document.getElementById('dictList');
    if (!listContainer || !window.db) return;
    
    let isEn = window.currentLang === 'en';
    let unlockedWords = window.db.filter(w => w.lekcia <= (window.state.unlockedLesson || 1));
    
    if (searchQuery) {
        const query = searchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        unlockedWords = unlockedWords.filter(w => {
            let meaning = (isEn && w.en) ? w.en : w.sk;
            return meaning.toLowerCase().includes(query) || 
                   w.romaji.toLowerCase().includes(query) || 
                   w.kana.includes(searchQuery) || 
                   w.kanji.includes(searchQuery);
        });
    }
    
    if (unlockedWords.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 20px;">${isEn ? "No words found." : "Žiadne slovíčka neboli nájdené."}</p>`;
        return;
    }

    let hLekcia = isEn ? "Lesson" : "Lekcia";
    let hVyzn = isEn ? "Meaning" : "Význam";

    let html = `
        <table style="width:100%; font-size:14px; border-collapse: collapse; text-align: left; min-width: 600px;">
            <thead style="background: var(--bg-dark); position: sticky; top: 0; z-index: 1;">
                <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted);">
                    <th style="padding: 12px;">${hLekcia}</th>
                    <th style="padding: 12px;">${hVyzn}</th>
                    <th style="padding: 12px;">Romaji</th>
                    <th style="padding: 12px;">Kana</th>
                    <th style="padding: 12px;">Kanji</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    unlockedWords.sort((a, b) => a.lekcia - b.lekcia).forEach(w => {
        let audioText = w.romaji;
        let safeAudioText = audioText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let meaning = (isEn && w.en) ? w.en : w.sk;
        let kana = w.kana !== '-' ? w.kana : '';
        let kanji = w.kanji !== '-' ? w.kanji : '';

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer;" 
                onclick="if(typeof playAudioText === 'function') playAudioText('${safeAudioText}', 'ja-JP')"
                onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:12px; font-weight: bold; color: var(--primary);">${w.lekcia}</td>
                <td style="padding:12px; font-weight: bold;">${meaning}</td>
                <td style="padding:12px; color: var(--text-muted);">${w.romaji} 🔊</td>
                <td style="padding:12px; color: var(--success);">${kana}</td>
                <td style="padding:12px; color: var(--warning); font-size: 16px;">${kanji}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    listContainer.innerHTML = html;
};

window.filterDictionary = function() {
    const input = document.getElementById('dictSearch');
    if (input) window.renderDictionaryList(input.value);
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
    let isEn = window.currentLang === 'en';
    
    if (themeName === 'konoha' && lvl < 5) return alert(isEn ? "You need to reach Level 5!" : "Musíš dosiahnuť Level 5!");
    if (themeName === 'sharingan' && lvl < 10) return alert(isEn ? "You need to reach Level 10!" : "Musíš dosiahnuť Level 10!");
    if (themeName === 'nara' && lvl < 15) return alert(isEn ? "You need to reach Level 15!" : "Musíš dosiahnuť Level 15!");

    document.body.setAttribute('data-theme', themeName);
    window.state.theme = themeName;
    if (typeof saveState === 'function') window.saveState();

    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('theme-' + themeName);
    if (activeBtn) activeBtn.classList.add('active');
};

// --- ŠTATISTIKY A JLPT PROGRES ---
window.updateProfileStats = function() {
    if (!window.state) return;
    let lvl = Math.floor((window.state.xp || 0) / 500) + 1;
    let curXp = (window.state.xp || 0) % 500;
    
    if(document.getElementById('profLevelText')) document.getElementById('profLevelText').innerText = `Level ${lvl}`;
    if(document.getElementById('profXpText')) document.getElementById('profXpText').innerText = `${curXp} / 500 XP`;
    if(document.getElementById('profXpBar')) document.getElementById('profXpBar').style.width = `${(curXp/500)*100}%`;

    if (window.state.theme) {
        document.body.setAttribute('data-theme', window.state.theme);
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        let activeBtn = document.getElementById('theme-' + window.state.theme);
        if (activeBtn) activeBtn.classList.add('active');
    }

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
