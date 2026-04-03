console.log("--- 2. train-vocab.js načítané (Giga Master v4.7 - Hub Edition) ---");

let fcQueue = []; 
let fcIdx = 0;
let quizOptions = [];
window.quizTimerInterval = null;
window.currentDirection = 'sk2ja'; 

window.getPossibleAnswers = function(str) {
    if (!str || str === '-') return [];
    return str.split(/[\/,]+/).map(s => s.trim()).filter(s => s.length > 0);
};

window.removeDiacritics = function(str) {
    if (!str) return "";
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") 
        .replace(/\s{2,}/g, " ") 
        .toLowerCase()
        .trim();
};

window.recordWordStat = function(wordSk, isCorrect) {
    if (!window.state.wordStats) window.state.wordStats = {};
    if (!window.state.wordStats[wordSk]) window.state.wordStats[wordSk] = { c: 0, w: 0 };
    if (isCorrect) window.state.wordStats[wordSk].c++;
    else window.state.wordStats[wordSk].w++;
};

// --- KARTIČKY (CEZ MAPU) ---
window.startLearn = function(lessonNum) {
    fcQueue = window.db.filter(w => w.lekcia === lessonNum);
    if (fcQueue.length === 0) return alert(window.currentLang === 'en' ? "No words in this lesson yet." : "Pre túto lekciu nie sú zatiaľ žiadne slovíčka.");
    
    fcIdx = 0;
    const overlay = document.getElementById('overlayFlashcards');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }
    window.loadFc();
};

window.loadFc = function() {
    let w = fcQueue[fcIdx];
    document.getElementById('fcElement').classList.remove('is-flipped');
    setTimeout(() => {
        let isEn = window.currentLang === 'en';
        document.getElementById('fcProgress').innerText = `${fcIdx + 1} / ${fcQueue.length}`;
        document.getElementById('fcFrontSk').innerText = (isEn && w.en) ? w.en : w.sk;
        document.getElementById('fcImg').innerText = w.img || '🇯🇵';
        document.getElementById('fcBackRomaji').innerText = w.romaji;
        document.getElementById('fcBackKana').innerText = w.kana !== '-' ? w.kana : '';
        document.getElementById('fcBackKanji').innerText = w.kanji !== '-' ? w.kanji : '';
    }, 150);
};

window.flipCard = function() { document.getElementById('fcElement').classList.toggle('is-flipped'); };
window.nextFc = function() { if (fcIdx < fcQueue.length - 1) { fcIdx++; window.loadFc(); } else window.closeOverlay('overlayFlashcards'); };
window.prevFc = function() { if (fcIdx > 0) { fcIdx--; window.loadFc(); } };

// ... (zvyšok logiky testov window.startTraining atď. zostáva bezo zmien z v4.7) ...

window.startTraining = function(type) {
    window.currentTestType = type; 
    window.mistakes = 0; 
    window.currentIdx = 0;
    window.currentFullResults = [];
    window.currentDirection = 'sk2ja';
    if (type === 'free') {
        let dirSelect = document.getElementById('freeDirection');
        if (dirSelect) window.currentDirection = dirSelect.value;
    }
    let pool = [];
    if (type === 'unlock') {
        window.currentUnlockTarget = window.state.unlockedLesson;
        pool = window.db.filter(w => w.lekcia === window.currentUnlockTarget).sort(()=>0.5-Math.random()).slice(0, 10);
    } else {
        let from = 1, to = window.state.unlockedLesson || 1;
        let count = parseInt(document.getElementById(type + 'Count')?.value || 10);
        let singleBox = document.getElementById(type + 'SingleBox');
        if (singleBox && !singleBox.classList.contains('hidden')) {
            let singleSelect = document.getElementById(type + 'Single');
            from = parseInt(singleSelect.value); to = from;
        } else {
            from = parseInt(document.getElementById(type + 'From').value);
            to = parseInt(document.getElementById(type + 'To').value);
        }
        if (from > to) [from, to] = [to, from];
        pool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    }
    window.testQueue = pool;
    if (window.testQueue.length === 0) return alert(window.currentLang === 'en' ? "No words found." : "Nenašli sa žiadne slovíčka.");
    document.getElementById('trainRun').classList.remove('hidden');
    document.getElementById('trainRun').style.display = 'flex';
    window.loadTrainWord();
};
