console.log("--- ui.js načítané (Master v4.5 - History Details & UI Fixes) ---");

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

    // Ak je otvorený slovník alebo história, prekreslíme ich v novom jazyku
    if (document.getElementById('overlayDictionary') && document.getElementById('overlayDictionary').style.display !== 'none') {
        window.openMyDictionary();
    }
    
    // Zatvoríme otvorený detail histórie pri zmene jazyka, aby sa predišlo mixovaniu textov
    const historyOverlay = document.getElementById('overlayHistoryDetails');
    if (historyOverlay) historyOverlay.style.display = 'none';
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

// --- MÔJ SLOVNÍK ---
window.openMyDictionary = function() {
    let dictOverlay = document.getElementById('overlayDictionary');
    let isEn = window.currentLang === 'en';
    let titleText = isEn ? "📖 My Dictionary" : "📖 Môj Slovník";
    let searchPlaceholder = isEn ? "Search..." : "Hľadať / Search...";

    if (!dictOverlay) {
        dictOverlay = document.createElement('div');
        dictOverlay.id = 'overlayDictionary';
        dictOverlay.className = 'overlay';
        dictOverlay.style = 'display:none; align-items:center; justify-content:center; z-index: 4000;';
        
        dictOverlay.innerHTML = `
            <div class="overlay-content" style="max-width: 800px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span id="dictTitle">${titleText}</span>
                    <button onclick="document.getElementById('overlayDictionary').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:32px; cursor:pointer; padding:0; line-height:1; transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'">&times;</button>
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

// --- HISTÓRIA A JEJ DETAILY ---
window.renderHistory = function() {
    const cont = document.getElementById('historyList');
    if (!cont || !window.state || !window.state.history) return;
    cont.innerHTML = '';
    
    // Namapujeme si históriu s pôvodnými indexmi, aby sme pri .reverse() nestratili referenciu na správny test
    const historyWithIndex = window.state.history.map((h, i) => ({ ...h, originalIndex: i }));
    
    historyWithIndex.reverse().slice(0, 10).forEach((h) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style = `border-left: 4px solid ${h.passed ? 'var(--success)' : 'var(--danger)'}; background: rgba(255,255,255,0.05); padding: 12px 15px; margin-bottom: 10px; border-radius: 12px; font-size: 14px; cursor: pointer; transition: transform 0.2s, background 0.2s;`;
        
        // Hover efekty pre lepšie UX
        div.onmouseover = () => { div.style.background = 'rgba(255,255,255,0.1)'; div.style.transform = 'translateY(-2px)'; };
        div.onmouseout = () => { div.style.background = 'rgba(255,255,255,0.05)'; div.style.transform = 'translateY(0)'; };
        
        // Kliknutím sa otvorí detail testu
        div.onclick = () => window.openHistoryDetails(h.originalIndex);
        
        div.innerHTML = `<b>${h.type}</b> <span style="color:var(--text-muted); font-size: 12px; margin-left: 5px;">(${h.lesson})</span> <span style="float:right; font-weight:bold; color:${h.passed ? 'var(--success)' : 'var(--danger)'};">${h.score}%</span>`;
        cont.appendChild(div);
    });
};

window.openHistoryDetails = function(index) {
    const h = window.state.history[index];
    if (!h) return;

    let overlay = document.getElementById('overlayHistoryDetails');
    let isEn = window.currentLang === 'en';

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlayHistoryDetails';
        overlay.className = 'overlay';
        overlay.style = 'display:none; align-items:center; justify-content:center; z-index: 4000;';
        document.body.appendChild(overlay);
    }

    let titleText = isEn ? "Test Details" : "Detaily testu";
    let qText = isEn ? "Question" : "Otázka";
    let aText = isEn ? "Your Answer" : "Tvoja odpoveď";
    let cText = isEn ? "Correct" : "Správne";

    let detailsHtml = '';
    
    if (h.details && h.details.length > 0) {
        detailsHtml = `
            <table style="width:100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
                    <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted);">
                        <th style="padding: 10px;">${qText}</th>
                        <th style="padding: 10px;">${aText}</th>
                        <th style="padding: 10px;">${cText}</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        h.details.forEach(d => {
            let isCorrect = d.isCorrect;
            let answerColor = isCorrect ? 'var(--success)' : 'var(--danger)';
            let answerStyle = isCorrect ? '' : 'text-decoration: line-through; opacity: 0.8;';
            detailsHtml += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 10px; font-weight: bold;">${d.q}</td>
                    <td style="padding: 10px; color: ${answerColor}; ${answerStyle}">${d.a}</td>
                    <td style="padding: 10px; color: var(--success); font-weight: bold;">${d.correct}</td>
                </tr>
            `;
        });
        
        detailsHtml += `</tbody></table>`;
    } else {
        detailsHtml = `<p style="text-align:center; color: var(--text-muted); padding: 30px 0;">${isEn ? "No detailed history available for this older test." : "Pre tento starší test nie sú uložené detailné záznamy."}</p>`;
    }

    overlay.innerHTML = `
        <div class="overlay-content" style="max-width: 650px; width: 95%; max-height: 85vh; display: flex; flex-direction: column; background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 25px;">
            <h3 style="margin-top: 0; display: flex; justify-content: space-between; align-items: center; color: var(--text-main); border-bottom: 1px solid var(--border); padding-bottom: 15px;">
                <span>${titleText} <span style="font-size: 14px; color: var(--text-muted); font-weight: normal; margin-left: 10px;">${h.type} (${h.score}%)</span></span>
                <button onclick="document.getElementById('overlayHistoryDetails').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:32px; cursor:pointer; padding:0; line-height:1; transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'">&times;</button>
            </h3>
            <div style="overflow-y: auto; flex-grow: 1; margin-top: 10px;">
                ${detailsHtml}
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
};
