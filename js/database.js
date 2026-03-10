// --- DATABÁZA, CACHING A MAPA ---

async function fetchDatabaseFromCloud() {
    const cached = localStorage.getItem('cached_db');
    
    // Ak máme dáta v cache, skúsime ich použiť, ale preveríme, či obsahujú JLPT
    if (cached) {
        db = JSON.parse(cached);
        // Kontrola: Ak prvé slovo nemá jlpt, cache je stará a musíme ju premazat
        if (db.length > 0 && db[0].jlpt) {
            console.log("Databáza načítaná z cache.");
            finalizeDatabaseLoad();
            return;
        }
    }
    
    try {
        console.log("Sťahujem čerstvú databázu z cloudu...");
        // Stiahnutie Excelu s cache-busterom
        const res = await fetch('./Kompletna_Databaza_3000_Slov.xlsx?v=' + Date.now());
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), {type: 'array'});
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
            // PRIDANÉ: Mapovanie JLPT úrovne (predpokladá stĺpec "JLPT" v Exceli)
            jlpt: r['JLPT'] ? String(r['JLPT']).toUpperCase() : 'N5' 
        })).filter(w => w.sk && w.romaji && w.lekcia > 0);
        
        localStorage.setItem('cached_db', JSON.stringify(db));
        finalizeDatabaseLoad();
        
    } catch (e) { 
        console.error("Chyba pri načítaní Excelu:", e); 
    }
}

// Pomocná funkcia na spustenie UI po načítaní dát
function finalizeDatabaseLoad() {
    renderMap(); 
    populateSelects();
    if (typeof selectTestModeUI === 'function') selectTestModeUI('unlock');
    // Aktualizujeme profil, aby sa hneď prepočítali JLPT štatistiky
    if (typeof updateProfileStats === 'function') updateProfileStats();
}

function renderMap() {
    if (!db || db.length === 0) return;
    const map = document.getElementById('lessonMap');
    if (!map) return;
    map.innerHTML = '';
    
    const lessons = [...new Set(db.map(w => w.lekcia))].sort((a,b)=>a-b);
    
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
                const select = document.getElementById('learnLessonSelect');
                if (select) {
                    select.value = l; 
                    switchTab('learn'); 
                    if (typeof startLearn === 'function') startLearn('cards');
                }
            };
        }
        map.appendChild(div);
    });
}

function populateSelects() {
    if (!db || db.length === 0) return;
    let opts = "";
    let langPrefix = currentLang === 'sk' ? 'Lekcia' : 'Lesson';
    for (let i = 1; i <= state.unlockedLesson; i++) {
        opts += `<option value="${i}">${langPrefix} ${i}</option>`;
    }
    
    ['learnLessonSelect', 'quizFrom', 'quizTo', 'freeFrom', 'freeTo', 'senseiFrom', 'senseiTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opts;
    });

    // Nastavenie koncových lekcií na maximum
    const setToMax = (id) => {
        const el = document.getElementById(id);
        if (el) el.value = state.unlockedLesson;
    };

    setToMax('quizTo');
    setToMax('freeTo');
    setToMax('senseiTo');
}
