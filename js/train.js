// --- PREMENNÉ PRE TESTY SLOVÍČOK ---
let testQueue = []; 
let currentIdx = 0; 
let mistakes = 0; 
let currentUnlockTarget = 0; 
let isBossTest = false;
let currentTestMistakes = []; 
let currentFullResults = [];
let quizTimer = null; 
let timeLeft = 5.0; 
let quizOptions = [];
let currentTestType = '';

// --- PREMENNÉ PRE KARTIČKY ---
let fcQueue = []; 
let fcIdx = 0;

// --- PREMENNÉ PRE GRAMATIKU ---
let grammarQueue = []; 
let grammarIdx = 0; 
let userSentence = []; 
let grammarLives = 3;
let grammarMode = 'click'; // Predvolený režim 'click' (bubliny)

// --- POMOCNÉ FUNKCIE (LOGIKA) ---

function getLevenshteinDistance(a, b) {
    if (!a) return b ? b.length : 0;
    if (!b) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, 
                    matrix[i][j - 1] + 1,     
                    matrix[i - 1][j] + 1      
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function updateScoreDisplay() {
    const scoreEl = document.getElementById('testScoreDisplay');
    if (scoreEl) {
        let correct = currentIdx - mistakes;
        scoreEl.innerText = `✅ ${correct < 0 ? 0 : correct} | ❌ ${mistakes}`;
    }
}

// --- KARTIČKY (TAB LEARN) ---

function startLearn(mode) {
    const select = document.getElementById('learnLessonSelect');
    if (!select) return;
    let l = parseInt(select.value);
    fcQueue = window.db.filter(w => w.lekcia === l);
    if (fcQueue.length === 0) return;
    fcIdx = 0;
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnCardsRun').classList.remove('hidden');
    document.getElementById('learnListRun').classList.add('hidden');
    loadFc();
}

function loadFc() {
    if (!fcQueue[fcIdx]) return;
    let w = fcQueue[fcIdx];
    const card = document.getElementById('fcElement');
    if (card) card.classList.remove('is-flipped');
    setTimeout(() => {
        document.getElementById('fcProgress').innerText = `${fcIdx + 1} / ${fcQueue.length}`;
        document.getElementById('fcFrontSk').innerText = currentLang === 'sk' ? w.sk : w.en;
        document.getElementById('fcImg').innerText = w.img || '🇯🇵';
        document.getElementById('fcBackRomaji').innerText = w.romaji;
        document.getElementById('fcBackKana').innerText = w.kana !== '-' ? w.kana : '';
        document.getElementById('fcBackKanji').innerText = w.kanji !== '-' ? w.kanji : '';
    }, 150);
}

function flipCard() { 
    const card = document.getElementById('fcElement');
    if (card) card.classList.toggle('is-flipped'); 
}

function nextFc() { 
    if (fcIdx < fcQueue.length - 1) { fcIdx++; loadFc(); } 
    else { closeLearn(); }
}

function prevFc() { if (fcIdx > 0) { fcIdx--; loadFc(); } }

function closeLearn() { 
    document.getElementById('learnCardsRun').classList.add('hidden'); 
    document.getElementById('learnSetup').classList.remove('hidden'); 
}

function playCurrentAudioFC() { 
    if (fcQueue[fcIdx]) playAudioText(fcQueue[fcIdx].romaji, 'ja-JP'); 
}

function showUnlockedList() {
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnListRun').classList.remove('hidden');
    let pool = window.db.filter(w => w.lekcia <= state.unlockedLesson);
    let tbody = document.getElementById('vocabListBody');
    let table = `<table class="detail-table"><tr><th>Lekcia</th><th>Význam</th><th>Romaji</th></tr>`;
    pool.forEach(w => {
        table += `<tr><td>${w.lekcia}</td><td>${w.sk}</td><td>${w.romaji}</td></tr>`;
    });
    table += `</table><button class="btn btn-outline" style="margin-top:15px;" onclick="closeLearn()">Zatvoriť</button>`;
    tbody.innerHTML = table;
}

// --- SLOVNÉ TESTY (TAB TRAIN) ---

function selectTestModeUI(m) {
    document.querySelectorAll('.setup-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1))?.classList.remove('hidden');
    document.querySelectorAll('#trainSetup .btn-nav').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1))?.classList.add('active');
}

function startTraining(type) {
    currentTestType = type; 
    mistakes = 0; 
    currentIdx = 0; 
    currentTestMistakes = [];
    let pool = [];

    if (type === 'unlock') {
        currentUnlockTarget = state.unlockedLesson;
        pool = window.db.filter(w => w.lekcia === currentUnlockTarget).sort(()=>0.5-Math.random()).slice(0, 10);
    } else {
        let from = parseInt(document.getElementById(type+'From')?.value || 1);
        let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
        let countInput = document.getElementById(type+'Count');
        let count = countInput ? parseInt(countInput.value) : 20; 
        
        if (from > to) [from, to] = [to, from];
        pool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    }

    testQueue = pool;
    if (testQueue.length === 0) return;
    document.getElementById('trainSetup').classList.add('hidden');
    document.getElementById('trainRun').classList.remove('hidden');
    loadTrainWord();
}

function loadTrainWord() {
    let w = testQueue[currentIdx];
    document.getElementById('twWord').innerText = w.sk;
    document.getElementById('twFeedback').style.display = 'none';
    document.getElementById('twNextBtn').classList.add('hidden');
    document.getElementById('testProgress').innerText = `${currentIdx + 1} / ${testQueue.length}`;
    updateScoreDisplay();

    if (currentTestType === 'quiz') {
        document.getElementById('classicInputArea').classList.add('hidden');
        document.getElementById('quizInputArea').classList.remove('hidden');
        document.getElementById('quizTimerContainer').classList.remove('hidden');
        
        let others = window.db.filter(x => x.sk !== w.sk).sort(()=>0.5-Math.random()).slice(0, 3);
        quizOptions = [w, ...others].sort(()=>0.5-Math.random());
        for(let i=0; i<4; i++) {
            let btn = document.getElementById('qb'+i);
            btn.innerText = quizOptions[i].romaji;
            btn.className = 'btn-quiz';
            btn.disabled = false;
        }
        startQuizTimer();
    } else {
        document.getElementById('classicInputArea').classList.remove('hidden');
        document.getElementById('quizInputArea').classList.add('hidden');
        document.getElementById('quizTimerContainer').classList.add('hidden');
        const input = document.getElementById('twInput');
        input.value = ''; input.disabled = false; input.focus();
        document.getElementById('twSubmitBtn').classList.remove('hidden');
    }
}

function startQuizTimer() {
    clearInterval(quizTimer);
    timeLeft = 5.0;
    const bar = document.getElementById('quizTimerBar');
    if (bar) bar.style.width = '100%';
    quizTimer = setInterval(() => {
        timeLeft -= 0.1;
        if (bar) bar.style.width = (timeLeft / 5.0) * 100 + "%";
        if (timeLeft <= 0) { clearInterval(quizTimer); checkQuizAnswer(-1); }
    }, 100);
}

function checkTrainAnswer() {
    let inputRaw = document.getElementById('twInput').value;
    let input = normalizeString(inputRaw);
    let w = testQueue[currentIdx];
    let correct = normalizeString(w.romaji);
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    if (input === correct || getLevenshteinDistance(input, correct) <= 1) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        playAudioText(w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Nesprávne! <br> ${w.romaji}`; fb.className = "feedback-box fb-wrong";
        mistakes++;
    }
    updateScoreDisplay();
    document.getElementById('twInput').disabled = true;
    document.getElementById('twSubmitBtn').classList.add('hidden');
    document.getElementById('twNextBtn').classList.remove('hidden');
}

function checkQuizAnswer(idx) {
    clearInterval(quizTimer);
    let w = testQueue[currentIdx];
    let isCorrect = (idx !== -1 && quizOptions[idx].sk === w.sk);
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    if (isCorrect) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        playAudioText(w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = idx === -1 ? `⏰ Čas vypršal! <br> ${w.romaji}` : `❌ Chyba! Je to: ${w.romaji}`;
        fb.className = "feedback-box fb-wrong";
        mistakes++;
    }
    updateScoreDisplay();
    for(let i=0; i<4; i++) document.getElementById('qb'+i).disabled = true;
    document.getElementById('twNextBtn').classList.remove('hidden');
}

function nextTrainWord() {
    currentIdx++;
    if (currentIdx < testQueue.length) loadTrainWord();
    else endTraining();
}

function endTraining() {
    document.getElementById('trainRun').classList.add('hidden');
    document.getElementById('trainResult').classList.remove('hidden');
    let correctCount = testQueue.length - mistakes;
    let perc = Math.round((correctCount / testQueue.length) * 100);
    document.getElementById('trScore').innerText = `${perc}%`;
    const msg = document.getElementById('trMessage');
    if (perc >= 90 && currentTestType === 'unlock') {
        if(state.unlockedLesson === currentUnlockTarget) state.unlockedLesson++;
        addXP(100); msg.innerText = "🎉 Nová úroveň odomknutá!";
        saveState();
    } else if (perc >= 80) {
        addXP(50); msg.innerText = "✅ Skvelý výkon!";
    } else { msg.innerText = "Skús to znova pre zisk XP."; }
}

function closeTraining() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
}

// --- GRAMATIKA (TAB GRAMMAR) ---

function setGrammarMode(mode) {
    grammarMode = mode;
    document.getElementById('btnGrammarModeClick').classList.toggle('active', mode === 'click');
    document.getElementById('btnGrammarModeWrite').classList.toggle('active', mode === 'write');
}

function startGrammarTest() {
    let l = parseInt(document.getElementById('grammarLessonSelect').value);
    grammarQueue = window.grammarDb.filter(v => v.lekcia === l).sort(() => 0.5 - Math.random());
    if (grammarQueue.length < 5) { alert("V Exceli (Sheet 2) je pre túto lekciu málo viet."); return; }
    grammarQueue = grammarQueue.slice(0, 5); 
    grammarIdx = 0; grammarLives = 3;
    updateGrammarLives();
    document.getElementById('grammarSetup').classList.add('hidden');
    document.getElementById('grammarRun').classList.remove('hidden');
    loadGrammarSentence();
}

function loadGrammarSentence() {
    let veta = grammarQueue[grammarIdx];
    userSentence = [];
    document.getElementById('grammarProgress').innerText = `Veta ${grammarIdx + 1} / 5`;
    document.getElementById('grammarTask').innerText = veta.sk;
    document.getElementById('grammarFeedback').style.display = 'none';
    document.getElementById('btnNextGrammar').classList.add('hidden');
    document.getElementById('btnCheckGrammar').classList.remove('hidden');

    if (grammarMode === 'click') {
        document.getElementById('grammarClickArea').classList.remove('hidden');
        document.getElementById('grammarWriteArea').classList.add('hidden');
        document.getElementById('grammarSolution').innerHTML = '';
        let words = veta.romaji.split(/\s+/).sort(() => 0.5 - Math.random());
        let html = '';
        words.forEach(w => {
            html += `<button class="btn-quiz" style="padding: 10px 15px; width: auto;" onclick="addWordToGrammar('${w}', this)">${w}</button>`;
        });
        document.getElementById('grammarOptions').innerHTML = html;
    } else {
        document.getElementById('grammarClickArea').classList.add('hidden');
        document.getElementById('grammarWriteArea').classList.remove('hidden');
        const input = document.getElementById('grammarInput');
        input.value = ''; input.disabled = false;
        setTimeout(() => input.focus(), 200);
    }
}

function addWordToGrammar(word, btn) {
    userSentence.push(word);
    btn.style.visibility = 'hidden'; 
    let span = document.createElement('span');
    span.className = 'btn-quiz';
    span.style = 'padding: 10px 15px; width: auto; background: var(--primary); color: white;';
    span.innerText = word;
    document.getElementById('grammarSolution').appendChild(span);
}

function updateGrammarLives() {
    document.getElementById('grammarLives').innerText = "❤️".repeat(grammarLives);
}

function checkGrammarAnswer() {
    let correct = grammarQueue[grammarIdx].romaji;
    let answer = (grammarMode === 'click') ? userSentence.join(' ') : document.getElementById('grammarInput').value.trim();
    let fb = document.getElementById('grammarFeedback');
    fb.style.display = 'block';

    let cleanA = answer.replace(/[.!?]$/, "").toLowerCase().trim();
    let cleanC = correct.replace(/[.!?]$/, "").toLowerCase().trim();

    if (cleanA === cleanC) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        document.getElementById('btnCheckGrammar').classList.add('hidden');
        document.getElementById('btnNextGrammar').classList.remove('hidden');
        if (grammarMode === 'write') document.getElementById('grammarInput').disabled = true;
        playAudioText(grammarQueue[grammarIdx].ja, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Chyba!`; fb.className = "feedback-box fb-wrong";
        grammarLives--; updateGrammarLives();
        setTimeout(() => { if (grammarLives <= 0) startGrammarTest(); else loadGrammarSentence(); }, 1200);
    }
}

function nextGrammarSentence() {
    grammarIdx++;
    if (grammarIdx < 5) loadGrammarSentence();
    else {
        alert("Výborne! Gramatika lekcie zvládnutá! +150 XP");
        addXP(150);
        let cur = parseInt(document.getElementById('grammarLessonSelect').value);
        if(cur === state.unlockedGrammarLesson) { state.unlockedGrammarLesson++; saveState(); populateSelects(); }
        document.getElementById('grammarRun').classList.add('hidden');
        document.getElementById('grammarSetup').classList.remove('hidden');
    }
}

function resetCurrentSentence() { loadGrammarSentence(); }

// Globálny Enter
document.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        const trainRun = document.getElementById('trainRun');
        const grammarRun = document.getElementById('grammarRun');
        if (trainRun && !trainRun.classList.contains('hidden') && currentTestType !== 'quiz') { 
            if (document.getElementById('twNextBtn').classList.contains('hidden')) checkTrainAnswer(); 
            else nextTrainWord(); 
        } else if (grammarRun && !grammarRun.classList.contains('hidden')) {
            if (document.getElementById('btnNextGrammar').classList.contains('hidden')) checkGrammarAnswer();
            else nextGrammarSentence();
        }
    }
});
