// --- NAČÍTANIE DÁT Z EXCELU ---

async function fetchDatabaseFromCloud() {
    // Zmena kľúča cache, aby sme vynútili načítanie Sheet 2 po aktualizácii
    const cached = localStorage.getItem('cached_db_v2');
    const cachedGrammar = localStorage.getItem('cached_grammar_v2');
    
    if (cached && cachedGrammar) {
        window.db = JSON.parse(cached);
        window.grammarDb = JSON.parse(cachedGrammar);
        if (window.db.length > 0) {
            console.log("Dáta načítané z cache.");
            finalizeDatabaseLoad();
            return;
        }
    }
    
    try {
        console.log("Sťahujem Excel databázu...");
        const res = await fetch('./Kompletna_Databaza_3000_Slov.xlsx?v=' + Date.now());
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), {type: 'array'});
        
        // SHEET 1: Slovíčka
        const sheet1Name = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet1Name], {defval: ""});
        window.db = rows.map((r, i) => ({
            id: i + 1, 
            lekcia: parseInt(r['Lekcia']) || 0, 
            sk: r['Slovenský'], 
            romaji: String(r['Rómadži']), 
            kana: r['Hiragana / Katakana'] || '-', 
            kanji: r['Kandži'] || '-', 
            img: r['Obrázok'] || '',
            jlpt: r['JLPT'] ? String(r['JLPT']).toUpperCase() : 'N5' 
        })).filter(w => w.sk && w.romaji && w.lekcia > 0);

        // SHEET 2: Gramatika
        if (wb.SheetNames[1]) {
            const sheet2Name = wb.SheetNames[1];
            const gRows = XLSX.utils.sheet_to_json(wb.Sheets[sheet2Name], {defval: ""});
            window.grammarDb = gRows.map((r, i) => ({
                id: i + 1,
                lekcia: parseInt(r['Lekcia']) || 0,
                sk: r['Slovenský'],
                romaji: String(r['Rómadži']).trim(), 
                ja: (r['Kandži'] && r['Kandži'] !== '-') ? r['Kandži'] : r['Hiragana / Katakana']
            })).filter(g => g.sk && g.romaji && g.lekcia > 0);
        }
        
        localStorage.setItem('cached_db_v2', JSON.stringify(window.db));
        localStorage.setItem('cached_grammar_v2', JSON.stringify(window.grammarDb));
        
        console.log("Slovíčka:", window.db.length, "Vety:", window.grammarDb.length);
        finalizeDatabaseLoad();

    } catch (e) { 
        console.error("Chyba pri sťahovaní alebo spracovaní Excelu:", e); 
        // V núdzi skúsime vykresliť mapu aspoň prázdnu
        renderMap();
    }
}

function finalizeDatabaseLoad() {
    renderMap(); 
    populateSelects();
    if (typeof updateProfileStats === 'function') updateProfileStats();
}

function renderMap() {
    const map = document.getElementById('lessonMap');
    if (!map) return;
    map.innerHTML = '';
    
    if (!window.db || window.db.length === 0) {
        console.warn("Mapa nemá žiadne dáta na zobrazenie.");
        return;
    }
    
    const lessons = [...new Set(window.db.map(w => w.lekcia))].sort((a,b)=>a-b);
    
    lessons.forEach(l => {
        let unlocked = l <= state.unlockedLesson;
        let div = document.createElement('div');
        div.className = `lesson-node ${unlocked ? 'node-unlocked' : 'node-locked'}`;
        div.innerHTML = `L${l}`;
        
        if (unlocked) {
            div.onclick = () => { 
                switchTab('learn'); 
                const sel = document.getElementById('learnLessonSelect');
                if (sel) {
                    sel.value = l; 
                    if (typeof startLearn === 'function') startLearn('cards');
                }
            };
        }
        map.appendChild(div);
    });
}

function populateSelects() {
    if (!window.db || window.db.length === 0) return;

    const ids = ['learnLessonSelect', 'quizFrom', 'quizTo', 'freeFrom', 'freeTo', 'senseiFrom', 'senseiTo', 'grammarLessonSelect'];
    const currentValues = {};
    ids.forEach(id => { 
        const el = document.getElementById(id); 
        if (el) currentValues[id] = el.value; 
    });

    // 1. Menu pre slovíčka (všetko okrem gramatiky)
    let vocabOpts = "";
    for (let i = 1; i <= state.unlockedLesson; i++) {
        vocabOpts += `<option value="${i}">Lekcia ${i}</option>`;
    }

    // 2. Menu pre gramatiku (má vlastný progres)
    let grammarOpts = "";
    const maxGrammar = state.unlockedGrammarLesson || 1;
    for (let i = 1; i <= maxGrammar; i++) {
        grammarOpts += `<option value="${i}">Lekcia ${i}</option>`;
    }
    
    // Naplníme všetky selecty okrem gramatiky
    ids.filter(id => id !== 'grammarLessonSelect').forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = vocabOpts;
            if (currentValues[id]) el.value = currentValues[id];
        }
    });

    // Naplníme špeciálne select pre gramatiku
    const gSel = document.getElementById('grammarLessonSelect');
    if (gSel) {
        gSel.innerHTML = grammarOpts;
        if (currentValues['grammarLessonSelect']) gSel.value = currentValues['grammarLessonSelect'];
    }

    const setToMax = (id) => {
        const el = document.getElementById(id);
        if (el && (!el.value || el.value === "")) el.value = state.unlockedLesson;
    };
    ['quizTo', 'freeTo', 'senseiTo'].forEach(setToMax);
}
