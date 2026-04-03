console.log("--- ui.js načítané (Master v4.7 - Hub Map Optimization) ---");

let selectedLessonFromMap = 1; // Na sledovanie, na ktorú lekciu sa kliklo na mape

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

    if (['train', 'sensei', 'grammar', 'stories'].includes(t)) {
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

    if (document.getElementById('overlayDictionary') && document.getElementById('overlayDictionary').style.display !== 'none') {
        window.openMyDictionary();
    }
};

window.closeOverlay = function(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden'); 
    if (el) el.style.display = 'none';
};

// --- LOGIKA MAPY (HUB) ---
window.openLessonChoice = function(lessonNum) {
    selectedLessonFromMap = lessonNum;
    const overlay = document.getElementById('overlayLessonChoice');
    const title = document.getElementById('choiceTitle');
    let lessonText = window.currentLang === 'en' ? 'Lesson' : 'Lekcia';
    
    if (title) title.innerText = `${lessonText} ${lessonNum}`;
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }
};

window.startLessonFromMap = function(mode) {
    window.closeOverlay('overlayLessonChoice');
    
    if (mode === 'cards') {
        window.startLearn(selectedLessonFromMap);
    } else {
        window.openMyDictionary(selectedLessonFromMap);
    }
};

// --- MÔJ SLOVNÍK (S FILTROM) ---
window.openMyDictionary = function(filterLesson = null) {
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
                    <button onclick="document.getElementById('overlayDictionary').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:32px; cursor:pointer; padding:0; line-height:1;">&times;</button>
                </h3>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <select id="dictLessonFilter" style="flex:1; margin-bottom:0;" onchange="window.renderDictionaryList(document.getElementById('dictSearch').value)">
                    </select>
                    <input type="text" id="dictSearch" placeholder="${searchPlaceholder}" style="flex:2; padding: 12px; margin-bottom: 0; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: white;" onkeyup="window.filterDictionary()">
                </div>
                <div id="dictList" style="overflow-y: auto; overflow-x: auto; flex-grow: 1; border-radius: 8px;"></div>
            </div>
        `;
        document.body.appendChild(dictOverlay);
    }

    // Aktualizácia možností filtra lekcií
    const filterSelect = document.getElementById('dictLessonFilter');
    let filterOpts = `<option value="all">${isEn ? "All Lessons" : "Všetky lekcie"}</option>`;
    for (let i = 1; i <= (window.state.unlockedLesson || 1); i++) {
        filterOpts += `<option value="${i}">${isEn ? "Lesson" : "Lekcia"} ${i}</option>`;
    }
    filterSelect.innerHTML = filterOpts;

    // Ak prichádzame z mapy, nastavíme konkrétnu lekciu
    if (filterLesson) {
        filterSelect.value = filterLesson;
    } else {
        filterSelect.value = "all";
    }
    
    dictOverlay.style.display = 'flex';
    document.getElementById('dictSearch').value = ''; 
    window.renderDictionaryList();
};

window.renderDictionaryList = function(searchQuery = '') {
    const listContainer = document.getElementById('dictList');
    const lessonFilter = document.getElementById('dictLessonFilter').value;
    if (!listContainer || !window.db) return;
    
    let isEn = window.currentLang === 'en';
    let words = window.db.filter(w => w.lekcia <= (window.state.unlockedLesson || 1));
    
    // Filter podľa lekcie
    if (lessonFilter !== 'all') {
        words = words.filter(w => w.lekcia === parseInt(lessonFilter));
    }

    // Filter podľa vyhľadávania
    if (searchQuery) {
        const query = searchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        words = words.filter(w => {
            let meaning = (isEn && w.en) ? w.en : w.sk;
            return meaning.toLowerCase().includes(query) || 
                   w.romaji.toLowerCase().includes(query) || 
                   w.kana.includes(searchQuery) || 
                   w.kanji.includes(searchQuery);
        });
    }
    
    if (words.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 20px;">${isEn ? "No words found." : "Žiadne slovíčka neboli nájdené."}</p>`;
        return;
    }

    let html = `<table style="width:100%; font-size:14px; border-collapse: collapse; text-align: left; min-width: 600px;">
        <thead style="background: var(--bg-dark); position: sticky; top: 0; z-index: 1;">
            <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted);">
                <th style="padding: 12px;">${isEn ? "Lesson" : "Lekcia"}</th>
                <th style="padding: 12px;">${isEn ? "Meaning" : "Význam"}</th>
                <th style="padding: 12px;">Romaji</th>
                <th style="padding: 12px;">Kana</th>
                <th style="padding: 12px;">Kanji</th>
            </tr>
        </thead><tbody>`;
    
    words.sort((a, b) => a.lekcia - b.lekcia).forEach(w => {
        let safeAudioText = w.romaji.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let meaning = (isEn && w.en) ? w.en : w.sk;
        html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="if(typeof playAudioText === 'function') playAudioText('${safeAudioText}', 'ja-JP')">
                <td style="padding:12px; font-weight: bold; color: var(--primary);">${w.lekcia}</td>
                <td style="padding:12px; font-weight: bold;">${meaning}</td>
                <td style="padding:12px; color: var(--text-muted);">${w.romaji} 🔊</td>
                <td style="padding:12px; color: var(--success);">${w.kana !== '-' ? w.kana : ''}</td>
                <td style="padding:12px; color: var(--warning); font-size: 16px;">${w.kanji !== '-' ? w.kanji : ''}</td>
            </tr>`;
    });
    
    html += `</tbody></table>`;
    listContainer.innerHTML = html;
};

window.filterDictionary = function() {
    const input = document.getElementById('dictSearch');
    if (input) window.renderDictionaryList(input.value);
};

// ... (zvyšok ui.js zostáva: setTheme, updateProfileStats, renderHistory, atď.) ...

window.setLessonMode = function(mode, tab) {
    let btnSingle = document.getElementById('btn' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Single');
    let btnRange = document.getElementById('btn' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Range');
    let singleBox = document.getElementById(tab + 'SingleBox');
    let rangeBox = document.getElementById(tab + 'RangeBox');

    if (btnSingle && btnRange && singleBox && rangeBox) {
        btnSingle.classList.toggle('active', mode === 'single');
        btnRange.classList.toggle('active', mode === 'range');
        if (mode === 'single') { singleBox.classList.remove('hidden'); rangeBox.classList.add('hidden'); } 
        else { singleBox.classList.add('hidden'); rangeBox.classList.remove('hidden'); }
    }
};

window.switchProfileTab = function(tabId) {
    document.querySelectorAll('.prof-tab').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById('prof-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    document.querySelectorAll('.prof-nav .btn-nav').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('btnProf' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
};
