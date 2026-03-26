// --- NAČÍTANIE DÁT Z EXCELU ---

async function fetchDatabaseFromCloud() {
    // Zmenil som kľúč na v3, aby si aplikácia VYNÚTILA stiahnutie novej verzie s angličtinou
    const cached = localStorage.getItem('cached_db_v3');
    const cachedGrammar = localStorage.getItem('cached_grammar_v3');
    
    if (cached && cachedGrammar) {
        window.db = JSON.parse(cached);
        window.grammarDb = JSON.parse(cachedGrammar);
        
        if (window.db.length > 0) {
            console.log("Dáta úspešne načítané z cache v3.");
            finalizeDatabaseLoad();
            return;
        }
    }
    
    try {
        console.log("Sťahujem čerstvú databázu (s podporou EN)...");
        const res = await fetch('./Kompletna_Databaza_3000_Slov.xlsx?v=' + Date.now());
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), {type: 'array'});
        
        // SHEET 1: Slovíčka
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ""});
        window.db = rows.map((r, i) => ({
            id: i + 1, 
            lekcia: parseInt(r['Lekcia']) || 0, 
            sk: r['Slovenský'], 
            en: r['Anglický'] || r['English'] || '', // OPRAVA: Pridané ťahanie EN jazyka
            romaji: String(r['Rómadži']), 
            kana: r['Hiragana / Katakana'] || '-', 
            kanji: r['Kandži'] || '-', 
            img: r['Obrázok'] || '',
            jlpt: r['JLPT'] ? String(r['JLPT']).toUpperCase() : 'N5' 
        })).filter(w => w.sk && w.romaji && w.lekcia > 0);

        // SHEET 2: Gramatika
        if (wb.SheetNames[1]) {
            const gRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], {defval: ""});
            window.grammarDb = gRows.map((r, i) => ({
                id: i + 1,
                lekcia: parseInt(r['Lekcia']) || 0,
                sk: r['Slovenský'],
                en: r['Anglický'] || r['English'] || '', // OPRAVA
                romaji: String(r['Rómadži']).trim(), 
                ja: (r['Kandži'] && r['Kandži'] !== '-') ? r['Kandži'] : r['Hiragana / Katakana']
            })).filter(g => g.sk && g.romaji && g.lekcia > 0);
        }
        
        localStorage.setItem('cached_db_v3', JSON.stringify(window.db));
        localStorage.setItem('cached_grammar_v3', JSON.stringify(window.grammarDb));
        
        finalizeDatabaseLoad();

    } catch (e) { 
        console.error("Chyba Excelu:", e); 
    }
}

function finalizeDatabaseLoad() {
    renderMap(); 
    populateSelects();
    if (typeof updateProfileStats === 'function') updateProfileStats();
    // Ak bol jazyk už nastavený na EN, pre-renderujeme s novými dátami
    if (typeof setLang === 'function') setLang(window.currentLang);
}

function renderMap() {
    const map = document.getElementById('lessonMap');
    if (!map) return;
    map.innerHTML = '';
    
    if (!window.db || window.db.length === 0) return;
    
    const lessons = [...new Set(window.db.map(w => w.lekcia))].sort((a,b)=>a-b);
    
    lessons.forEach(l => {
        let unlocked = l <= window.state.unlockedLesson;
        let div = document.createElement('div');
        div.className = `lesson-node ${unlocked ? 'node-unlocked' : 'node-locked'}`;
        div.innerHTML = `L${l}`;
        if (unlocked) {
            div.onclick = () => { 
                switchTab('learn'); 
                const sel = document.getElementById('learnLessonSelect');
                if (sel) { sel.value = l; window.startLearn('cards'); }
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
    // Pridáme preklad pre slovo "Lekcia"
    let lessonText = window.currentLang === 'en' ? 'Lesson' : 'Lekcia';
    
    for (let i = 1; i <= window.state.unlockedLesson; i++) {
        opts += `<option value="${i}">${lessonText} ${i}</option>`;
    }
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = opts;
            if (currentValues[id]) el.value = currentValues[id];
        }
    });

    if (typeof window.selectTestModeUI === 'function') window.selectTestModeUI('unlock');
}
