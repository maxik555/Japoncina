// --- GLOBÁLNE DATABÁZY ---
let db = [];          // Slovíčka (Sheet 1)
let grammarDb = [];   // Vety (Sheet 2)

// --- NAČÍTANIE DÁT, CACHING A INICIALIZÁCIA ---

async function fetchDatabaseFromCloud() {
    const cached = localStorage.getItem('cached_db');
    const cachedGrammar = localStorage.getItem('cached_grammar');
    
    // Ak máme obe časti v cache a obsahujú potrebné dáta (JLPT), načítame ich lokálne
    if (cached && cachedGrammar) {
        db = JSON.parse(cached);
        grammarDb = JSON.parse(cachedGrammar);
        
        if (db.length > 0 && db[0].jlpt) {
            console.log("Dátové moduly načítané z cache.");
            finalizeDatabaseLoad();
            return;
        }
    }
    
    try {
        console.log("Sťahujem čerstvú databázu z Excelu...");
        const res = await fetch('./Kompletna_Databaza_3000_Slov.xlsx?v=' + Date.now());
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), {type: 'array'});
        
        // --- SPRACOVANIE SHEET 1: Slovíčka ---
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ""});
        db = rows.map((r, i) => ({
            id: i + 1, 
            lekcia: parseInt(r['Lekcia']) || 0, 
            sk: r['Slovenský'], 
            en: r['Anglický'] || r['Slovenský'],
            romaji: String(r['Rómadži']), 
            kana: r['Hiragana / Katakana'] || '-', 
            kanji: r['Kandži'] || '-', 
            img: r['Obrázok'] || '',
            jlpt: r['JLPT'] ? String(r['JLPT']).toUpperCase() : 'N5' 
        })).filter(w => w.sk && w.romaji && w.lekcia > 0);

        // --- SPRACOVANIE SHEET 2: Gramatika ---
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
        
        // Uloženie do lokálnej pamäte
        localStorage.setItem('cached_db', JSON.stringify(db));
        localStorage.setItem('cached_grammar', JSON.stringify(grammarDb));
        
        finalizeDatabaseLoad();
        
    } catch (e) { 
        console.error("Kritická chyba pri spracovaní Excelu:", e); 
    }
}

function finalizeDatabaseLoad() {
    renderMap(); 
    populateSelects();
    // Ak existujú funkcie v iných súboroch, zavoláme ich
    if (typeof selectTestModeUI === 'function') selectTestModeUI('unlock');
    if (typeof updateProfileStats === 'function') updateProfileStats();
}

// --- RENDER MAPY LEKCIÍ ---

function renderMap() {
    if (!db || db.length === 0) return;
    const map = document.getElementById('lessonMap');
    if (!map) return;
    map.innerHTML = '';
    
    // Získame unikátne čísla lekcií
    const lessons = [...new Set(db.map(w => w.lekcia))].sort((a,b) => a - b);
    
    lessons.forEach(l => {
        let unlocked = l <= state.unlockedLesson;
        let isPerfect = state.perfectLessons && state.perfectLessons.includes(l);
        let isBoss = (l === 40 || l === 115);
        
        let div = document.createElement('div');
        div.className = `lesson-node ${unlocked ? 'node-unlocked' : 'node-locked'} ${isPerfect ? 'node-perfect' : ''}`;
        if (isBoss && unlocked) div.classList.add('boss-node');
        
        div.innerHTML = `L${l}${isBoss ? '<br><small>BOSS</small>' : ''}`;
        
        if (unlocked) {
            div.onclick = () => { 
                // Najprv prepneme tab (vyvolá populateSelects), potom nastavíme konkrétnu lekciu
                switchTab('learn'); 
                const select = document.getElementById('learnLessonSelect');
                if (select) {
                    select.value = l; 
                    if (typeof startLearn === 'function') startLearn('cards');
                }
            };
        }
        map.appendChild(div);
    });
}

// --- SYNCHRONIZÁCIA VÝBEROVÝCH MENU (SELECTS) ---

function populateSelects() {
    if (!db || db.length === 0) return;

    // Zoznam všetkých ID selectov v celej appke
    const ids = [
        'learnLessonSelect', 
        'quizFrom', 'quizTo', 
        'freeFrom', 'freeTo', 
        'senseiFrom', 'senseiTo', 
        'grammarLessonSelect'
    ];
    
    // 1. Uložíme si, čo mal používateľ práve vybraté (aby sme mu to po aktualizácii neresetli)
    const currentValues = {};
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) currentValues[id] = el.value;
    });

    // 2. Vygenerujeme HTML zoznam lekcií (podľa toho, čo má používateľ odomknuté)
    let opts = "";
    let langPrefix = currentLang === 'sk' ? 'Lekcia' : 'Lesson';
    for (let i = 1; i <= state.unlockedLesson; i++) {
        opts += `<option value="${i}">${langPrefix} ${i}</option>`;
    }
    
    // 3. Naplníme všetky selecty a vrátime im pôvodnú hodnotu
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = opts;
            if (currentValues[id]) {
                el.value = currentValues[id];
            }
        }
    });

    // Špeciálne nastavenie koncových lekcií na maximum pri prvom načítaní
    const setToMaxIfEmpty = (id) => {
        const el = document.getElementById(id);
        if (el && !currentValues[id]) {
            el.value = state.unlockedLesson;
        }
    };

    ['quizTo', 'freeTo', 'senseiTo'].forEach(id => setToMaxIfEmpty(id));
}
