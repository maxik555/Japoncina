// Výpočet preklepov (Levenshtein)
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

// --- TRÉNING, TESTY A KARTIČKY ---

let testQueue = []; let currentIdx = 0; let mistakes = 0; 
let currentTestMistakes = []; let currentFullResults = [];
let quizTimer; let timeLeft = 5.0; let quizOptions = [];
let fcQueue = []; let fcIdx = 0;
let currentTestType = '';

// --- KARTIČKY (LEARN) ---
function startLearn(mode) {
    let l = parseInt(document.getElementById('learnLessonSelect').value);
    fcQueue = db.filter(w => w.lekcia === l);
    if(fcQueue.length === 0) return;
    fcIdx = 0;
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnCardsRun').classList.remove('hidden');
    document.getElementById('learnListRun').classList.add('hidden');
    loadFc();
}

function loadFc() {
    let w = fcQueue[fcIdx];
    document.getElementById('fcElement').classList.remove('is-flipped');
    setTimeout(() => {
        document.getElementById('fcProgress').innerText = `${fcIdx + 1} / ${fcQueue.length}`;
        document.getElementById('fcFrontSk').innerText = currentLang === 'sk' ? w.sk : w.en;
        document.getElementById('fcImg').innerText = w.img || '🇯🇵';
        document.getElementById('fcBackRomaji').innerText = w.romaji;
        document.getElementById('fcBackKana').innerText = w.kana !== '-' ? w.kana : '';
        document.getElementById('fcBackKanji').innerText = w.kanji !== '-' ? w.kanji : '';
    }, 150);
}

function flipCard() { document.getElementById('fcElement').classList.toggle('is-flipped'); }
function nextFc() { if(fcIdx < fcQueue.length -1) { fcIdx++; loadFc(); } else closeLearn(); }
function prevFc() { if(fcIdx > 0) { fcIdx--; loadFc(); } }

function closeLearn() { 
    document.getElementById('learnCardsRun').classList.add('hidden'); 
    document.getElementById('learnListRun').classList.add('hidden'); 
    document.getElementById('learnSetup').classList.remove('hidden'); 
}

function playCurrentAudioFC() { playAudioText(fcQueue[fcIdx].romaji, 'ja-JP'); }

function showUnlockedList() {
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnListRun').classList.remove('hidden');
    let pool = db.filter(w => w.lekcia <= state.unlockedLesson);
    let tbody = document.getElementById('vocabListBody');
    let table = `<table class="detail-table"><tr><th>Lekcia</th><th>${currentLang==='sk'?'Význam':'Meaning'}</th><th>Romaji</th><th>Kana</th></tr>`;
    pool.forEach(w => {
        let meaning = currentLang === 'sk' ? w.sk : w.en;
        table += `<tr><td>${w.lekcia}</td><td style="font-weight:bold;">${meaning}</td><td>${w.romaji}</td><td>${w.kana !== '-' ? w.kana : ''}</td></tr>`;
    });
    table += `</table><button class="btn btn-outline" style="margin-top:15px;" onclick="closeLearn()">${currentLang==='sk'?'Zatvoriť':'Close'}</button>`;
    tbody.innerHTML = table;
}

// --- LOGIKA TESTOV ---
function selectTestModeUI(m) {
    document.querySelectorAll('.setup-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('#trainSetup .btn-nav').forEach(btn => {
        btn.style.backgroundColor = 'var(--bg-dark)';
        btn.style.color = 'var(--text-muted)';
    });
    const setupEl = document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1));
    if (setupEl) setupEl.classList.remove('hidden');
    const activeBtn = document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (activeBtn) {
        activeBtn.style.backgroundColor = 'var(--primary)';
        activeBtn.style.color = 'white';
    }
}

function startTraining(type) {
    currentTestType = type; mistakes = 0; currentIdx = 0; 
    currentTestMistakes = []; currentFullResults = [];
    let pool = [];

    if (type === 'unlock') {
        pool = db.filter(w => w.lekcia === state.unlockedLesson).sort(()=>0.5-Math.random()).slice(0, 10);
    } else {
        let from = parseInt(document.getElementById(type+'From')?.value || 1);
        let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
        let count = parseInt(document.getElementById(type+'Count')?.value) || 20;
        if (from > to) [from, to] = [to, from];
        pool = db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random());
        if (count > 0 && count < pool.length) pool = pool.slice(0, count);
    }

    testQueue = pool;
    if(testQueue.length === 0) return;
    document.getElementById('trainSetup').classList.add('hidden');
    document.getElementById('trainRun').classList.remove('hidden');
    loadTrainWord();
}

function loadTrainWord() {
    let w = testQueue[currentIdx];
    document.getElementById('twWord').innerText = currentLang === 'sk' ? w.sk : w.en;
    document.getElementById('testProgress').innerText = `${currentIdx+1} / ${testQueue.length}`;
    document.getElementById('twFeedback').style.display = 'none';
    document.getElementById('twNextBtn').classList.add('hidden');
    document.getElementById('testScoreDisplay').innerText = `✅ ${currentIdx - mistakes} | ❌ ${mistakes}`;

    if(currentTestType === 'quiz') {
        document.getElementById('classicInputArea').classList.add('hidden');
        document.getElementById('quizInputArea').classList.remove('hidden');
        document.getElementById('quizTimerContainer').classList.remove('hidden');
        let others = db.filter(x => x.sk !== w.sk).sort(()=>0.5-Math.random()).slice(0, 3);
        quizOptions = [w, ...others].sort(()=>0.5-Math.random());
        for(let i=0; i<4; i++) {
            let btn = document.getElementById('qb'+i);
            btn.innerText = quizOptions[i].romaji.split('/')[0];
            btn.className = 'btn-quiz';
            btn.disabled = false;
        }
        startQuizTimer();
    } else {
        document.getElementById('classicInputArea').classList.remove('hidden');
        document.getElementById('quizInputArea').classList.add('hidden');
        document.getElementById('quizTimerContainer').classList.add('hidden');
        document.getElementById('twInput').value = '';
        document.getElementById('twInput').disabled = false;
        document.getElementById('twInput').focus();
        document.getElementById('twSubmitBtn').classList.remove('hidden');
    }
}

function startQuizTimer() {
    timeLeft = 5.0;
    let bar = document.getElementById('quizTimerBar');
    bar.style.width = '100%';
    clearInterval(quizTimer);
    quizTimer = setInterval(() => {
        timeLeft -= 0.1;
        bar.style.width = (timeLeft / 5.0) * 100 + "%";
        if (timeLeft <= 0) { clearInterval(quizTimer); checkQuizAnswer(-1); }
    }, 100);
}

function checkQuizAnswer(idx) {
    clearInterval(quizTimer);
    let w = testQueue[currentIdx];
    let correctIdx = quizOptions.findIndex(o => o.sk === w.sk);
    let userAns = idx !== -1 ? quizOptions[idx].romaji.split('/')[0] : (currentLang==='sk'?"Čas vypršal":"Time's up");
    let isCorrect = (idx !== -1 && quizOptions[idx].sk === w.sk);
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    if(isCorrect) {
        fb.innerHTML = currentLang === 'sk' ? "✅ Správne!" : "✅ Correct!"; 
        fb.className = 'feedback-box fb-correct';
        playAudioText((w.kana && w.kana !== '-') ? w.kana : w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ ${currentLang==='sk'?'Chyba!':'Wrong!'} <br><strong>${w.romaji}</strong>`; 
        fb.className = 'feedback-box fb-wrong';
        mistakes++;
        currentTestMistakes.push(w);
    }
    
    currentFullResults.push({ sk: (currentLang==='sk'?w.sk:w.en), romaji: w.romaji.split('/')[0], userAns, isCorrect });

    for(let i=0; i<4; i++) {
        document.getElementById('qb'+i).disabled = true;
        if(i === correctIdx) document.getElementById('qb'+i).classList.add('correct');
        else if(i === idx) document.getElementById('qb'+i).classList.add('wrong');
    }
    document.getElementById('twNextBtn').classList.remove('hidden');
}

function checkTrainAnswer() {
    let input = normalizeString(document.getElementById('twInput').value); 
    let w = testQueue[currentIdx]; 
    let fb = document.getElementById('twFeedback');
    
    if(input === '') return;

    let mainCorrectAnswer = normalizeString(w.romaji.split('/')[0]);
    let validAnswers = w.romaji.toLowerCase().split('/').map(s=>normalizeString(s));
    if(w.kana && w.kana !== '-') validAnswers = validAnswers.concat(w.kana.split('/').map(s=>normalizeString(s)));

    let isCorrect = false;
    let isTypo = false;

    if(validAnswers.includes(input)) {
        isCorrect = true;
    } else { 
        let distance = getLevenshteinDistance(input, mainCorrectAnswer);
        let allowedTypos = (mainCorrectAnswer.length > 7) ? 2 : (mainCorrectAnswer.length > 4 ? 1 : 0);

        if (distance > 0 && distance <= allowedTypos) {
            isCorrect = true; 
            isTypo = true;
        } 
    }
    
    fb.style.display = 'block';
    
    if (isCorrect && !isTypo) {
        fb.innerHTML = `✅ <strong>Správne!</strong>`; 
        fb.className = 'feedback-box fb-correct'; 
        playAudioText((w.kana && w.kana !== '-') ? w.kana : w.romaji, 'ja-JP');
    } else if (isCorrect && isTypo) {
        fb.innerHTML = `⚠️ <strong>Uznané (preklep)!</strong><br><small>Malo byť: ${w.romaji}</small>`; 
        fb.className = 'feedback-box fb-typo'; 
        playAudioText((w.kana && w.kana !== '-') ? w.kana : w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Správne: <br><span style="font-size:24px; color:#fff;">${w.romaji}</span>`; 
        fb.className = 'feedback-box fb-wrong'; 
        mistakes++; 
        currentTestMistakes.push(w);
    }

    currentFullResults.push({ sk: (currentLang==='sk'?w.sk:w.en), romaji: w.romaji.split('/')[0], userAns: input, isCorrect: isCorrect });

    document.getElementById('twInput').disabled = true; 
    document.getElementById('twSubmitBtn').classList.add('hidden'); 
    document.getElementById('twNextBtn').classList.remove('hidden'); 
    
    const audioBtn = document.getElementById('twAudioBtn');
    if (audioBtn) audioBtn.classList.remove('hidden');
}

function nextTrainWord() {
    currentIdx++;
    if(currentIdx < testQueue.length) loadTrainWord();
    else endTraining();
}

function endTraining() {
    document.getElementById('trainRun').classList.add('hidden'); 
    document.getElementById('trainResult').classList.remove('hidden');
    
    let correctCount = testQueue.length - mistakes;
    let perc = Math.round((correctCount / testQueue.length) * 100); 
    document.getElementById('trScore').innerText = `${perc}%`;
    let msg = document.getElementById('trMessage');
    
    let userStreak = state.streak || 0; 
    let xpPerWord = (userStreak >= 5) ? 5 : 2; 
    let gainedXP = correctCount * xpPerWord;

    if (currentTestType === 'unlock') {
        if (perc >= 90) { 
            msg.innerHTML = "🎉 Odomkol si novú úroveň!"; 
            msg.style.color = "var(--success)"; 
            if(state.unlockedLesson === currentUnlockTarget) state.unlockedLesson++; 
            addXP(100); saveState(); 
        } else { 
            msg.innerHTML = "❌ Potrebuješ aspoň 90%. Skús to znova."; 
            msg.style.color = "var(--danger)"; 
        }
    } else {
        if (perc >= 80) {
            msg.innerHTML = `✅ Test úspešný! Získavaš <strong>${gainedXP} XP</strong><br><small>(Bonus za streak: ${xpPerWord} XP/slovo)</small>`;
            msg.style.color = "var(--success)";
            addXP(gainedXP);
        } else {
            msg.innerHTML = `❌ Test neúspešný. Na zisk bodov potrebuješ aspoň 80%.`;
            msg.style.color = "var(--warning)";
        }
    }
}

function retryMistakes() {
    testQueue = [...currentTestMistakes];
    currentIdx = 0; mistakes = 0; currentTestMistakes = []; currentFullResults = [];
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainRun').classList.remove('hidden');
    loadTrainWord();
}

function closeTraining() {
    document.getElementById('trainRun').classList.add('hidden');
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
}

// --- HISTÓRIA A PROFIL ---
function renderHistory() {
    const cont = document.getElementById('historyList');
    if (!cont) return;
    cont.innerHTML = '';
    if(!state.history) state.history = [];
    state.history.forEach((h, i) => {
        let div = document.createElement('div');
        div.className = `history-item ${h.passed ? 'passed' : ''}`;
        div.innerHTML = `<div><strong>${h.lesson}</strong> <small>${new Date(h.date).toLocaleDateString()}</small><br><span>${h.score}%</span></div><button onclick="showDetail(${i})">DETAIL</button>`;
        cont.appendChild(div);
    });
}

function showDetail(idx) {
    let h = state.history[idx];
    document.getElementById('detailTitle').innerText = h.lesson;
    let html = `<table class="detail-table">`;
    h.fullResults.forEach(r => {
        html += `<tr><td>${r.sk}</td><td>${r.isCorrect ? '' : `<span class="res-wrong">${r.userAns}</span> `}<span class="res-correct">${r.romaji}</span></td><td>${r.isCorrect ? '✅' : '❌'}</td></tr>`;
    });
    document.getElementById('detailList').innerHTML = html + `</table>`;
    document.getElementById('overlayDetail').style.display = 'flex';
}

// Global Enter Key
document.addEventListener('keypress', e => {
    if(e.key === 'Enter') {
        if (!document.getElementById('trainRun').classList.contains('hidden') && currentTestType !== 'quiz') { 
            if(document.getElementById('twNextBtn').classList.contains('hidden')) checkTrainAnswer(); 
            else nextTrainWord(); 
        } else if (!document.getElementById('learnCardsRun').classList.contains('hidden')) { 
            if(!document.getElementById('fcElement').classList.contains('is-flipped')) flipCard(); 
            else nextFc(); 
        }
    }
});
