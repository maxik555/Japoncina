console.log("--- 2. train-vocab.js načítané ---");

let fcQueue = []; 
let fcIdx = 0;
let quizOptions = [];

// --- PREPÍNANIE REŽIMOV UI (OPRAVA CHYBY) ---
window.selectTestModeUI = function(m) {
    // Schováme všetky sekcie nastavení
    document.querySelectorAll('.setup-section').forEach(s => s.classList.add('hidden'));
    
    // Zobrazíme tú správnu
    const setupEl = document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1));
    if (setupEl) setupEl.classList.remove('hidden');
    
    // Aktualizujeme vizuál tlačidiel
    document.querySelectorAll('#trainSetup .btn-nav').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
};

// --- KARTIČKY ---
window.startLearn = function(mode) {
    const select = document.getElementById('learnLessonSelect');
    if (!select) return;
    let l = parseInt(select.value);
    fcQueue = window.db.filter(w => w.lekcia === l);
    if (fcQueue.length === 0) return;
    fcIdx = 0;
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnCardsRun').classList.remove('hidden');
    window.loadFc();
};

window.loadFc = function() {
    let w = fcQueue[fcIdx];
    if (!w) return;
    document.getElementById('fcElement').classList.remove('is-flipped');
    setTimeout(() => {
        document.getElementById('fcProgress').innerText = `${fcIdx + 1} / ${fcQueue.length}`;
        document.getElementById('fcFrontSk').innerText = w.sk;
        document.getElementById('fcImg').innerText = w.img || '🇯🇵';
        document.getElementById('fcBackRomaji').innerText = w.romaji;
        document.getElementById('fcBackKana').innerText = (w.kana && w.kana !== '-') ? w.kana : '';
        document.getElementById('fcBackKanji').innerText = (w.kanji && w.kanji !== '-') ? w.kanji : '';
    }, 150);
};

window.flipCard = function() { document.getElementById('fcElement').classList.toggle('is-flipped'); };
window.nextFc = function() { if (fcIdx < fcQueue.length - 1) { fcIdx++; window.loadFc(); } else window.closeLearn(); };
window.prevFc = function() { if (fcIdx > 0) { fcIdx--; window.loadFc(); } };
window.closeLearn = function() { 
    document.getElementById('learnCardsRun').classList.add('hidden'); 
    document.getElementById('learnSetup').classList.remove('hidden'); 
};
window.playCurrentAudioFC = function() { if (fcQueue[fcIdx]) playAudioText(fcQueue[fcIdx].romaji, 'ja-JP'); };

// --- TESTY (KVÍZ / PÍSANIE) ---
window.startTraining = function(type) {
    window.currentTestType = type; window.mistakes = 0; window.currentIdx = 0;
    let from = parseInt(document.getElementById(type+'From')?.value || 1);
    let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
    let count = parseInt(document.getElementById(type+'Count')?.value || 10);
    
    if (from > to) [from, to] = [to, from];
    window.testQueue = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    
    if (window.testQueue.length === 0) {
        alert("Žiadne slová pre tento výber.");
        return;
    }
    document.getElementById('trainSetup').classList.add('hidden');
    document.getElementById('trainRun').classList.remove('hidden');
    window.loadTrainWord();
};

window.loadTrainWord = function() {
    let w = window.testQueue[window.currentIdx];
    document.getElementById('twWord').innerText = w.sk;
    document.getElementById('testProgress').innerText = `${window.currentIdx + 1} / ${window.testQueue.length}`;
    document.getElementById('twFeedback').style.display = 'none';
    document.getElementById('twNextBtn').classList.add('hidden');
    window.updateScoreDisplay();

    if (window.currentTestType === 'quiz') {
        document.getElementById('classicInputArea').classList.add('hidden');
        document.getElementById('quizInputArea').classList.remove('hidden');
        let others = window.db.filter(x => x.sk !== w.sk).sort(()=>0.5-Math.random()).slice(0, 3);
        quizOptions = [w, ...others].sort(()=>0.5-Math.random());
        for(let i=0; i<4; i++) {
            let btn = document.getElementById('qb'+i);
            btn.innerText = quizOptions[i].romaji;
            btn.className = 'btn-quiz'; btn.disabled = false;
        }
    } else {
        document.getElementById('classicInputArea').classList.remove('hidden');
        document.getElementById('quizInputArea').classList.add('hidden');
        document.getElementById('twInput').value = ''; document.getElementById('twInput').disabled = false;
        document.getElementById('twInput').focus(); document.getElementById('twSubmitBtn').classList.remove('hidden');
    }
};


window.checkTrainAnswer = function() {
    let inputRaw = document.getElementById('twInput').value.trim();
    let inputNorm = window.normalizeString(inputRaw);
    let w = window.testQueue[window.currentIdx];
    
    let correctRomaji = window.normalizeString(w.romaji);
    let correctKana = w.kana.trim();
    let correctKanji = w.kanji.trim();

    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    // OPRAVA VOLANIA: Tu musí byť window.getLevenshteinDistance
    let isCorrect = (inputNorm === correctRomaji || window.getLevenshteinDistance(inputNorm, correctRomaji) <= 1);
    
    if (!isCorrect && (inputRaw === correctKana || inputRaw === correctKanji)) {
        isCorrect = true;
    }

    if (isCorrect) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        if (typeof playAudioText === 'function') playAudioText(w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Nesprávne! <br> ${w.romaji}`; fb.className = "feedback-box fb-wrong";
        window.mistakes++;
    }
    window.updateScoreDisplay();
    document.getElementById('twInput').disabled = true;
    document.getElementById('twSubmitBtn').classList.add('hidden');
    document.getElementById('twNextBtn').classList.remove('hidden');
};

window.checkQuizAnswer = function(idx) {
    let w = window.testQueue[window.currentIdx];
    let isCorrect = (quizOptions[idx].sk === w.sk);
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    if (isCorrect) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        playAudioText(w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Chyba! Je to: ${w.romaji}`; fb.className = "feedback-box fb-wrong";
        window.mistakes++;
    }
    window.updateScoreDisplay();
    for(let i=0; i<4; i++) document.getElementById('qb'+i).disabled = true;
    document.getElementById('twNextBtn').classList.remove('hidden');
};

window.nextTrainWord = function() {
    if (window.currentIdx < window.testQueue.length - 1) { window.currentIdx++; window.loadTrainWord(); }
    else window.endTraining();
};

window.endTraining = function() {
    document.getElementById('trainRun').classList.add('hidden');
    document.getElementById('trainResult').classList.remove('hidden');
    let correct = window.testQueue.length - window.mistakes;
    let perc = Math.round((correct / window.testQueue.length) * 100);
    document.getElementById('trScore').innerText = `${perc}%`;
    window.saveToHistory(`Lekcia ${window.testQueue[0].lekcia}`, window.currentTestType === 'quiz' ? 'Kvíz' : 'Slovíčka', perc, perc >= 80);
    if (perc >= 90 && window.currentTestType === 'unlock') {
        if(state.unlockedLesson === window.currentUnlockTarget) state.unlockedLesson++; 
        addXP(100); saveState();
    } else if (perc >= 80) addXP(50);
};

window.closeTraining = function() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
};
