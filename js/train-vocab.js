console.log("--- 2. train-vocab.js načítané (S opraveným časovačom) ---");

let fcQueue = []; 
let fcIdx = 0;
let quizOptions = [];
window.quizTimerInterval = null;

// Pomocná funkcia na rozdelenie možností (napr. "yon / shi" -> ["yon", "shi"])
window.getPossibleAnswers = function(str) {
    if (!str || str === '-') return [];
    return str.split(/[\/,]+/).map(s => s.trim()).filter(s => s.length > 0);
};

// --- UI PREPÍNANIE REŽIMOV TESTU ---
window.selectTestModeUI = function(m) {
    document.querySelectorAll('.setup-section').forEach(s => s.classList.add('hidden'));
    const setupEl = document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1));
    if (setupEl) setupEl.classList.remove('hidden');
    
    document.querySelectorAll('#trainSetup .btn-nav').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
};

// --- KARTIČKY (LEARN) ---
window.startLearn = function(mode) {
    const select = document.getElementById('learnLessonSelect');
    if (!select) return;
    fcQueue = window.db.filter(w => w.lekcia === parseInt(select.value));
    if (fcQueue.length === 0) {
        alert("Pre túto lekciu nie sú zatiaľ žiadne slovíčka.");
        return;
    }
    fcIdx = 0;
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnCardsRun').classList.remove('hidden');
    window.loadFc();
};

window.loadFc = function() {
    let w = fcQueue[fcIdx];
    document.getElementById('fcElement').classList.remove('is-flipped');
    setTimeout(() => {
        document.getElementById('fcProgress').innerText = `${fcIdx + 1} / ${fcQueue.length}`;
        document.getElementById('fcFrontSk').innerText = w.sk;
        document.getElementById('fcImg').innerText = w.img || '🇯🇵';
        document.getElementById('fcBackRomaji').innerText = w.romaji;
        document.getElementById('fcBackKana').innerText = w.kana !== '-' ? w.kana : '';
        document.getElementById('fcBackKanji').innerText = w.kanji !== '-' ? w.kanji : '';
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

// --- TESTY (KVÍZ / PÍSANIE / ODOMKNUTIE) ---
window.startTraining = function(type) {
    window.currentTestType = type; 
    window.mistakes = 0; 
    window.currentIdx = 0;
    window.currentFullResults = [];
    
    let pool = [];

    if (type === 'unlock') {
        window.currentUnlockTarget = window.state.unlockedLesson;
        pool = window.db.filter(w => w.lekcia === window.currentUnlockTarget).sort(()=>0.5-Math.random()).slice(0, 10);
    } else {
        let from = parseInt(document.getElementById(type+'From')?.value || 1);
        let to = parseInt(document.getElementById(type+'To')?.value || window.state.unlockedLesson);
        let count = parseInt(document.getElementById(type+'Count')?.value || 10);
        
        if (from > to) [from, to] = [to, from];
        pool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    }

    window.testQueue = pool;
    
    if (window.testQueue.length === 0) {
        alert("Nenašli sa žiadne slovíčka. Skontroluj, či má táto lekcia slová v Exceli.");
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

    // Vyčistíme starý časovač
    clearInterval(window.quizTimerInterval);

    let timerContainer = document.getElementById('quizTimerContainer');

    if (window.currentTestType === 'quiz') {
        document.getElementById('classicInputArea').classList.add('hidden');
        document.getElementById('quizInputArea').classList.remove('hidden');
        
        // ZOBRAZÍME časovač
        if (timerContainer) timerContainer.classList.remove('hidden');
        
        let others = window.db.filter(x => x.sk !== w.sk).sort(()=>0.5-Math.random()).slice(0, 3);
        quizOptions = [w, ...others].sort(()=>0.5-Math.random());
        for(let i=0; i<4; i++) {
            let btn = document.getElementById('qb'+i);
            btn.innerText = quizOptions[i].romaji;
            btn.className = 'btn-quiz'; btn.disabled = false;
        }
        
        // Spustíme 10 sekundový odpočet
        window.startQuizTimer(5);
        
    } else {
        document.getElementById('classicInputArea').classList.remove('hidden');
        document.getElementById('quizInputArea').classList.add('hidden');
        
        // SKRYJEME časovač pri klasickom písaní
        if (timerContainer) timerContainer.classList.add('hidden');
        
        document.getElementById('twInput').value = ''; document.getElementById('twInput').disabled = false;
        document.getElementById('twInput').focus(); document.getElementById('twSubmitBtn').classList.remove('hidden');
    }
};

window.startQuizTimer = function(seconds) {
    let timeLeft = seconds;
    let timerBar = document.getElementById('quizTimerBar'); 
    
    if(timerBar) {
        timerBar.style.width = '100%';
        timerBar.style.transition = 'none'; 
    }
    
    window.quizTimerInterval = setInterval(() => {
        timeLeft -= 0.1; 
        
        if (timerBar) {
            timerBar.style.width = (timeLeft / seconds * 100) + '%';
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.quizTimerInterval);
            window.handleQuizTimeout();
        }
    }, 100);
};

window.handleQuizTimeout = function() {
    let w = window.testQueue[window.currentIdx];
    window.mistakes++;
    
    window.currentFullResults.push({ q: w.sk, a: "⏱️ Čas vypršal", correct: w.romaji, isCorrect: false });
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    fb.innerHTML = `❌ Čas vypršal! <br> Je to: ${w.romaji}`; 
    fb.className = "feedback-box fb-wrong"; 
    
    window.updateScoreDisplay();
    
    for(let i=0; i<4; i++) {
        let btn = document.getElementById('qb'+i);
        if (btn) btn.disabled = true;
    }
    
    document.getElementById('twNextBtn').classList.remove('hidden');
};

window.checkTrainAnswer = function() {
    let inputRaw = document.getElementById('twInput').value.trim();
    let inputNorm = window.normalizeString(inputRaw);
    let w = window.testQueue[window.currentIdx];
    
    let possibleRomaji = window.getPossibleAnswers(w.romaji).map(s => window.normalizeString(s));
    let possibleKana = window.getPossibleAnswers(w.kana);
    let possibleKanji = window.getPossibleAnswers(w.kanji);

    let isCorrect = false;

    for (let r of possibleRomaji) {
        if (inputNorm === r || window.getLevenshteinDistance(inputNorm, r) <= 1) {
            isCorrect = true;
            break;
        }
    }

    if (!isCorrect) {
        if (possibleKana.includes(inputRaw) || possibleKanji.includes(inputRaw) || inputRaw === w.kana.trim() || inputRaw === w.kanji.trim()) {
            isCorrect = true;
        }
    }

    window.currentFullResults.push({ q: w.sk, a: inputRaw || "(nič)", correct: w.romaji, isCorrect: isCorrect });
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    if (isCorrect) { 
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct"; 
        if (typeof playAudioText === 'function') playAudioText(possibleRomaji[0] || w.romaji, 'ja-JP'); 
    }
    else { 
        fb.innerHTML = `❌ Nesprávne! <br> ${w.romaji}`; fb.className = "feedback-box fb-wrong"; 
        window.mistakes++; 
    }
    window.updateScoreDisplay();
    document.getElementById('twInput').disabled = true;
    document.getElementById('twSubmitBtn').classList.add('hidden');
    document.getElementById('twNextBtn').classList.remove('hidden');
};

window.checkQuizAnswer = function(idx) {
    clearInterval(window.quizTimerInterval);
    
    let w = window.testQueue[window.currentIdx];
    let isCorrect = (quizOptions[idx].sk === w.sk);
    
    window.currentFullResults.push({ q: w.sk, a: quizOptions[idx].romaji, correct: w.romaji, isCorrect: isCorrect });
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    if (isCorrect) { 
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct"; 
        let audioText = window.getPossibleAnswers(w.romaji)[0] || w.romaji;
        if (typeof playAudioText === 'function') playAudioText(audioText, 'ja-JP'); 
    }
    else { 
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
    let perc = Math.round(((window.testQueue.length - window.mistakes) / window.testQueue.length) * 100);
    document.getElementById('trScore').innerText = `${perc}%`;
    
    let typeName = window.currentTestType === 'unlock' ? 'Odomknutie' : (window.currentTestType === 'quiz' ? 'Kvíz' : 'Slovíčka');
    window.saveToHistory(`Lekcia ${window.testQueue[0].lekcia}`, typeName, perc, perc >= 80, window.currentFullResults);
    
    if (perc >= 90 && window.currentTestType === 'unlock') {
        if(window.state.unlockedLesson === window.currentUnlockTarget) {
            window.state.unlockedLesson++;
            if (typeof addXP === 'function') addXP(100); 
            if (typeof saveState === 'function') saveState();
            
            if (typeof renderMap === 'function') renderMap();
            if (typeof populateSelects === 'function') populateSelects();
            
            setTimeout(() => alert("🎉 Výborne! Odomkol si novú lekciu!"), 300);
        } else {
            if (typeof addXP === 'function') addXP(100); 
            if (typeof saveState === 'function') saveState();
        }
    } else if (perc >= 80) {
        if (typeof addXP === 'function') addXP(50); 
        if (typeof saveState === 'function') saveState();
    }
};

window.closeTraining = function() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
};
