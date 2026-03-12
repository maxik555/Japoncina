console.log("--- ui.js načítané ---");

window.switchTab = function(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + t);
    if (targetTab) targetTab.classList.add('active');
    
    const btn = document.getElementById('btnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.add('active');
    
    // Ak ideme do učenia/testovania, aktualizujeme selecty
    if (['train', 'learn', 'sensei', 'grammar'].includes(t)) {
        if (typeof populateSelects === 'function') populateSelects();
    }
    
    // Ak ideme do profilu, hneď prekreslíme štatistiky a históriu
    if (t === 'profile') { 
        if (typeof window.renderHistory === 'function') window.renderHistory(); 
        if (typeof window.updateProfileStats === 'function') window.updateProfileStats(); 
    }
};

window.setLang = function(lang) {
    window.currentLang = lang; 
    localStorage.setItem('finale_lang', lang);
    
    if(document.getElementById('flag-sk')) document.getElementById('flag-sk').className = lang === 'sk' ? '' : 'inactive'; 
    if(document.getElementById('flag-en')) document.getElementById('flag-en').className = lang === 'en' ? '' : 'inactive';
    
    document.querySelectorAll('[data-sk], [data-en]').forEach(el => { 
        let txt = el.getAttribute('data-' + lang);
        if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.setAttribute('placeholder', txt);
        } else {
            el.innerHTML = txt; 
        }
    });
    
    if (window.db && window.db.length > 0) {
        if (typeof populateSelects === 'function') populateSelects();
    }
    if (typeof updateUI === 'function') updateUI(); 
};

window.closeOverlay = function(id) { 
    const el = document.getElementById(id);
    if (el) el.style.display = 'none'; 
};

// --- LOGIKA PROFILU A HISTÓRIE ---

window.switchProfileTab = function(tabId) {
    document.querySelectorAll('.prof-tab').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById('prof-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('#tab-profile .btn-nav').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('btnProf' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    
    if (tabId === 'history') {
        if (typeof window.renderHistory === 'function') window.renderHistory();
    }
};

window.renderHistory = function() {
    const cont = document.getElementById('historyList');
    if (!cont) return;
    cont.innerHTML = '';
    
    if (!window.state || !window.state.history || window.state.history.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px;">Zatiaľ žiadne záznamy.</p>`;
        return;
    }
    
    [...window.state.history].reverse().forEach((h) => {
        const actualIndex = window.state.history.indexOf(h);
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => window.showHistoryDetail(actualIndex);
        div.style = `cursor:pointer; background: var(--bg-dark); padding: 12px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${h.passed ? 'var(--success)' : 'var(--danger)'};`;
        
        const dateStr = new Date(h.date).toLocaleDateString() + " " + new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        div.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:14px;">${h.type} - ${h.lesson} 🔍</div>
                <div style="font-size:11px; color:var(--text-muted);">${dateStr}</div>
            </div>
            <div style="font-weight:bold; color:${h.passed ? 'var(--success)' : 'var(--danger)'};">${h.score}%</div>
        `;
        cont.appendChild(div);
    });
};

window.showHistoryDetail = function(idx) {
    if (!window.state || !window.state.history) return;
    const h = window.state.history[idx];
    
    if (!h || !h.details || h.details.length === 0) { 
        alert("Pre tento starší test nie sú dostupné podrobnosti."); 
        return; 
    }
    
    const statsDiv = document.getElementById('detailStats');
    const listDiv = document.getElementById('detailList');
    if (!statsDiv || !listDiv) return;

    statsDiv.innerHTML = `<strong>${h.type}</strong> | ${h.lesson}<br>Skóre: ${h.score}%`;
    
    let html = `<table style="width:100%; font-size:13px; border-spacing:0 5px;">`;
    h.details.forEach(item => {
        html += `<tr style="background:rgba(255,255,255,0.05);">
            <td style="padding:10px; border-radius: 8px 0 0 8px;">${item.q}</td>
            <td style="padding:10px; border-radius: 0 8px 8px 0; color:${item.isCorrect ? 'var(--success)' : 'var(--danger)'};">
                ${item.a} ${item.isCorrect ? '' : '<br><small style="opacity:0.6; color:white;">Správne: '+item.correct+'</small>'}
            </td>
        </tr>`;
    });
    html += `</table>`;
    
    listDiv.innerHTML = html;
    document.getElementById('overlayDetail').style.display = 'flex';
};

window.updateProfileStats = function() {
    if (!window.state) return;
    
    // 1. Výpočet XP a Levelu
    let lvl = Math.floor(window.state.xp / 500) + 1;
    let curXp = window.state.xp % 500;
    
    let levelEl = document.getElementById('profLevelText');
    let xpEl = document.getElementById('profXpText');
    let barEl = document.getElementById('profXpBar');
    
    if(levelEl) levelEl.innerText = `Level ${lvl}`;
    if(xpEl) xpEl.innerText = `${curXp} / 500 XP`;
    if(barEl) barEl.style.width = `${(curXp/500)*100}%`;

    // 2. Výpočet JLPT N5 a N4
    if (window.db && window.db.length > 0) {
        // Bezpečné určenie JLPT tagu (ak v Exceli nie je, berie sa ako N5; odstraňuje medzery)
        const getJlpt = (w) => (w.jlpt ? w.jlpt.trim().toUpperCase() : 'N5');

        let n5Total = window.db.filter(w => getJlpt(w) === 'N5').length;
        let n4Total = window.db.filter(w => getJlpt(w) === 'N4').length;

        let n5Unlocked = window.db.filter(w => getJlpt(w) === 'N5' && w.lekcia <= window.state.unlockedLesson).length;
        let n4Unlocked = window.db.filter(w => getJlpt(w) === 'N4' && w.lekcia <= window.state.unlockedLesson).length;

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
    
    if (typeof window.renderBadges === 'function') window.renderBadges();
};

window.renderBadges = function() {
    if (!window.state) return;
    const badges = [
        { id: 'first_step', icon: '🐣', title: 'Prvý krok', desc: 'Odomkni Lekciu 2', condition: () => window.state.unlockedLesson >= 2 },
        { id: 'streak_5', icon: '🔥', title: 'Vytrvalec', desc: 'Získaj 5-dňový streak', condition: () => window.state.streak >= 5 },
        { id: 'perfect_test', icon: '🎯', title: 'Perfekcionista', desc: 'Daj test na 100%', condition: () => window.state.history && window.state.history.some(h => h.score === 100 && h.passed) },
        { id: 'boss_1', icon: '👹', title: 'Základy za mnou', desc: 'Odomkni Lekciu 40', condition: () => window.state.unlockedLesson >= 40 }
    ];
    
    let grid = document.getElementById('badgesGrid'); 
    if (!grid) return; 
    grid.innerHTML = '';
    
    badges.forEach(b => {
        let ok = false;
        try { ok = b.condition(); } catch(e) {} // Ochrana pre prípad, že state.history ešte neexistuje
        
        let div = document.createElement('div');
        div.className = `badge-item ${ok ? '' : 'badge-locked'}`;
        div.innerHTML = `<div class="badge-icon">${b.icon}</div><div class="badge-title">${b.title}</div><div class="badge-desc">${b.desc}</div>`;
        grid.appendChild(div);
    });
};
// --- MÔJ SLOVNÍK (DYNAMICKÝ OVERLAY S TABUĽKOU) ---

window.openMyDictionary = function() {
    let dictOverlay = document.getElementById('overlayDictionary');
    
    if (!dictOverlay) {
        dictOverlay = document.createElement('div');
        dictOverlay.id = 'overlayDictionary';
        dictOverlay.className = 'overlay';
        dictOverlay.style = 'display:none; align-items:center; justify-content:center;';
        
        dictOverlay.innerHTML = `
            <div class="overlay-content" style="max-width: 800px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span data-sk="📖 Môj Slovník" data-en="📖 My Dictionary">📖 Môj Slovník</span>
                    <button onclick="document.getElementById('overlayDictionary').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
                </h3>
                
                <input type="text" id="dictSearch" placeholder="Hľadať / Search..." 
                       style="width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: white;"
                       onkeyup="window.filterDictionary()">
                
                <div id="dictList" style="overflow-y: auto; overflow-x: auto; flex-grow: 1; border-radius: 8px;">
                    </div>
            </div>
        `;
        document.body.appendChild(dictOverlay);
    }
    
    window.renderDictionaryList();
    dictOverlay.style.display = 'flex';
    document.getElementById('dictSearch').value = ''; 
};

window.renderDictionaryList = function(searchQuery = '') {
    const listContainer = document.getElementById('dictList');
    if (!listContainer || !window.db) return;
    
    // Zistíme aktuálny jazyk
    let isEn = window.currentLang === 'en';
    
    // Zoberieme len odomknuté slovíčka
    let unlockedWords = window.db.filter(w => w.lekcia <= window.state.unlockedLesson);
    
    // Aplikujeme filter
    if (searchQuery) {
        const query = window.normalizeString(searchQuery);
        unlockedWords = unlockedWords.filter(w => {
            let meaning = isEn && w.en ? w.en : w.sk;
            return window.normalizeString(meaning).includes(query) || 
                   window.normalizeString(w.romaji).includes(query) || 
                   w.kana.includes(searchQuery) || 
                   w.kanji.includes(searchQuery);
        });
    }
    
    if (unlockedWords.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 20px;">${isEn ? 'No words found.' : 'Žiadne slovíčka neboli nájdené.'}</p>`;
        return;
    }

    // Hlavičky tabuľky podľa jazyka
    let hLekcia = isEn ? "Lesson" : "Lekcia";
    let hVyzn = isEn ? "Meaning" : "Význam";

    // Vytvoríme štruktúru tabuľky
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
    
    // Zoradíme slovíčka podľa lekcie (od najmenšej po najväčšiu)
    unlockedWords.sort((a, b) => a.lekcia - b.lekcia).forEach(w => {
        
        let audioText = window.getPossibleAnswers ? window.getPossibleAnswers(w.romaji)[0] : w.romaji;
        if (!audioText) audioText = w.romaji;
        let safeAudioText = audioText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        let meaning = isEn && w.en ? w.en : w.sk;
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
    if (input) {
        window.renderDictionaryList(input.value);
    }
};
