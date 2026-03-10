// --- NAČÍTANIE DÁT Z EXCELU ---

async function fetchDatabaseFromCloud() {
    const cached = localStorage.getItem('cached_db');
    const cachedGrammar = localStorage.getItem('cached_grammar');
    
    if (cached && cachedGrammar) {
        db = JSON.parse(cached);
        grammarDb = JSON.parse(cachedGrammar);
        if (db.length > 0 && db[0].jlpt) {
            finalizeDatabaseLoad();
            return;
        }
    }
    
    try {
        const res = await fetch('./Kompletna_Databaza_3000_Slov.xlsx?v=' + Date.now());
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), {type: 'array'});
        
        // SHEET 1: Slovíčka
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ""});
        db = rows.map((r, i) => ({
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
            const gRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], {defval: ""});
            grammarDb = gRows.map((r, i) => ({
                id: i + 1,
                lekcia: parseInt(r['Lekcia']) || 0,
                sk: r['Slovenský'],
                romaji: String(r['Rómadži']), 
                ja: (r['Kandži'] && r['Kandži'] !== '-') ? r['Kandži'] : r['Hiragana / Katakana']
            })).filter(g => g.sk && g.romaji && g.lekcia > 0);
        }
        
        localStorage.setItem('cached_db', JSON.stringify(db));
        localStorage.setItem('cached_grammar', JSON.stringify(grammarDb));
        finalizeDatabaseLoad();
    } catch (e) { 
        console.error("Chyba pri sťahovaní databázy:", e); 
    }
}

function finalizeDatabaseLoad() {
    renderMap(); 
    populateSelects();
    if (typeof updateProfileStats === 'function') updateProfileStats();
}

function renderMap() {
    const map = document.getElementById('lessonMap');
    if (!map || !db || db.length === 0) return;
    map.innerHTML = '';
    
    const lessons = [...new Set(db.map(w => w.lekcia))].sort((a,b)=>a-b);
    lessons.forEach(l => {
        let unlocked = l <= state.unlockedLesson;
        let div = document.createElement('div');
        div.className = `lesson-node ${unlocked ? 'node-unlocked' : 'node-locked'}`;
        div.innerHTML = `L${l}`;
        if (unlocked) {
            div.onclick = () => { 
                switchTab('learn'); 
                const sel = document.getElementById('learnLessonSelect');
                if (sel) { sel.value = l; startLearn('cards'); }
            };
        }
        map.appendChild(div);
    });
}

function populateSelects() {
    const ids = ['learnLessonSelect', 'quizFrom', 'quizTo', 'freeFrom', 'freeTo', 'senseiFrom', 'senseiTo', 'grammarLessonSelect'];
    const currentValues = {};
    ids.forEach(id => { const el = document.getElementById(id); if (el) currentValues[id] = el.value; });

    let opts = "";
    for (let i = 1; i <= state.unlockedLesson; i++) {
        opts += `<option value="${i}">Lekcia ${i}</option>`;
    }
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = opts;
            if (currentValues[id]) el.value = currentValues[id];
        }
    });
}
