// ==========================================
// PWA: Japonský Tréning - Dódžó
// Súbor: js/database.js
// Úloha: Načítanie a spracovanie Excel databázy
// Verzia: 5.3 (Relatívna cesta k Excelu)
// ==========================================

async function fetchDatabaseFromCloud() {
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
        console.log("Sťahujem čerstvú databázu...");
        
        // 🚨 OPRAVA 404: Používame relatívnu cestu! 
        // Keďže je Excel priamo pri index.html, stačí zadať iba jeho názov.
        const url = 'Kompletna_Databaza_3000_Slov.xlsx?v=' + Date.now();
        const res = await fetch(url);
        
        // Ochrana pred 404: Ak sa súbor nenájde, kód sa hneď zastaví a nevyvolá kritickú chybu v XLSX
        if (!res.ok) {
            alert(`⛔ CHYBA 404: Excel databáza nebola nájdená!\n\nHľadal som súbor: ${url}\n\nUisti sa, že sa súbor na GitHube volá presne takto (záleží na veľkých/malých písmenách a nesmú tam byť medzery).`);
            hideLoadingScreen();
            return;
        }

        const ab = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), {type: 'array'});
        
        // SHEET 1: Slovíčka
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ""});
        window.db = rows.map((r, i) => ({
            id: i + 1, 
            lekcia: parseInt(r['Lekcia']) || 0, 
            sk: r['Slovenský'], 
            en: r['Anglický'] || r['English'] || '', 
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
                en: r['Anglický'] || r['English'] || '',
                romaji: String(r['Rómadži']).trim(), 
                ja: (r['Kandži'] && r['Kandži'] !== '-') ? r['Kandži'] : r['Hiragana / Katakana']
            })).filter(g => g.sk && g.romaji && g.lekcia > 0);
        }
        
        localStorage.setItem('cached_db_v3', JSON.stringify(window.db));
        localStorage.setItem('cached_grammar_v3', JSON.stringify(window.grammarDb));
        
        finalizeDatabaseLoad();

    } catch (e) { 
        console.error("Chyba Excelu:", e); 
        alert("⛔ Chyba pri sťahovaní/spracovaní Excelu: " + e.message);
        hideLoadingScreen();
    }
}

function finalizeDatabaseLoad() {
    if (typeof renderMap === 'function') renderMap(); 
    if (typeof populateSelects === 'function') populateSelects();
    if (typeof updateProfileStats === 'function') updateProfileStats();
    if (typeof setLang === 'function') setLang(window.currentLang);
    hideLoadingScreen(); // Uistíme sa, že po úspechu sa Loading schová
}

function hideLoadingScreen() {
    let loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}
