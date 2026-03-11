// --- PREMENNÉ PRE TESTY SLOVÍČOK ---
let testQueue = []; 
let currentIdx = 0; 
let mistakes = 0; 
let currentUnlockTarget = 0; 
let currentTestType = '';

// --- PREMENNÉ PRE KARTIČKY ---
let fcQueue = []; 
let fcIdx = 0;

// --- PREMENNÉ PRE GRAMATIKU ---
let grammarQueue = []; 
let grammarIdx = 0; 
let userSentence = []; 
let grammarLives = 3;
let grammarMode = 'click'; 

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

// --- HISTÓRIA TESTOV ---

function saveToHistory(lesson, type, score, passed) {
    if (!state.history) state.history = [];
    
    const entry = {
        date: Date.now(),
        lesson: lesson,
        type: type, // 'Slovíčka', 'Kvíz', 'Odomknutie', 'Gramatika'
        score: score,
        passed: passed
    };
    
    state.history.push(entry);
    // Udržíme len posledných 50 záznamov
    if (state.history.length > 50) state.history.shift();
    
    if (typeof saveState === 'function') saveState();
    if (typeof renderHistory === 'function') renderHistory();
}

function renderHistory() {
    const cont = document.getElementById('historyList');
    if (!cont) return;
    cont.innerHTML = '';
    
    if (!state.history || state.history.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Zatiaľ žiadne záznamy.</p>`;
        return;
    }
    
    // Zobrazenie od najnovšieho po najstaršie
    [...state.history].reverse().forEach(h => {
        let dateStr = new Date(h.date).toLocaleDateString() + " " + new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        let div = document.createElement('div');
        div.className = `history-item ${h.passed ? 'passed' : 'failed'}`;
        div.style = "background:var(--bg-dark); padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid " + (h.passed ? 'var(--success)' : 'var(--danger)');
        
        div.innerHTML = `
            <div>
                <div style="font-weight:bold;">${h.type} - ${h.lesson}</div>
                <div style="font-size:12px; color:var(--text-muted);">${dateStr}</div>
            </div>
            <div style="font-weight:bold; font-size:18px;">${h.score}%</div>
        `;
        cont.appendChild(div);
    });
}

// --- KARTIČKY ---

function startLearn(mode) {
    const select = document.getElementById('learnLessonSelect');
    if (!select) return;
    let l = parseInt(select.value);
    fcQueue = window.db.filter(w => w.lekcia === l);
    if (fcQueue.length === 0) return;
    fcIdx = 0;
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnCardsRun').classList.remove('hidden');
    loadFc();
}

function loadFc() {
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
}

function flipCard() { document.getElementById('fcElement').classList.toggle('is-flipped'); }
function nextFc() { if (fcIdx < fcQueue.length - 1) { fcIdx++; loadFc(); } else closeLearn(); }
function prevFc() { if (fcIdx > 0) { fcIdx--; loadFc(); } }
function closeLearn() { 
    document.getElementById('learnCardsRun').classList.add('hidden'); 
    document.getElementById('learnSetup').classList.remove('hidden'); 
}
function playCurrentAudioFC() { if (fcQueue[fcIdx]) playAudioText(fcQueue[fcIdx].romaji, 'ja-JP'); }

// --- SLOVNÉ TESTY ---

function startTraining(type) {
    currentTestType = type; mistakes = 0; currentIdx = 0;
    let from = parseInt(document.getElementById(type+'From')?.value || 1);
    let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
    let countInput = document.getElementById(type+'Count');
    let count = countInput ? parseInt(countInput.value) : 10;
    
    if (from > to) [from, to] = [to, from];
    let pool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    
    testQueue = pool;
    if (testQueue.length === 0) return;
    document.getElementById('trainSetup').classList.add('hidden');
    document.getElementById('trainRun').classList.remove('hidden');
    loadTrainWord();
}

function loadTrainWord() {
    let w = testQueue[currentIdx];
    document.getElementById('twWord').innerText = w.sk;
    document.getElementById('testProgress').innerText = `${currentIdx + 1} / ${testQueue.length}`;
    document.getElementById('twFeedback').style.display = 'none';
    document.getElementById('twNextBtn').classList.add('hidden');
    updateScoreDisplay();

    if (currentTestType === 'quiz') {
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
}

function checkTrainAnswer() {
    let input = normalizeString(document.getElementById('twInput').value);
    let w = testQueue[currentIdx];
    let correct = normalizeString(w.romaji);
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    let isCorrect = (input === correct || getLevenshteinDistance(input, correct) <= 1);
    if (isCorrect) {
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
    let w = testQueue[currentIdx];
    let isCorrect = (quizOptions[idx].sk === w.sk);
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    if (isCorrect) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        playAudioText(w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Chyba! Je to: ${w.romaji}`; fb.className = "feedback-box fb-wrong";
        mistakes++;
    }
    updateScoreDisplay();
    for(let i=0; i<4; i++) document.getElementById('qb'+i).disabled = true;
    document.getElementById('twNextBtn').classList.remove('hidden');
}

function nextTrainWord() {
    if (currentIdx < testQueue.length - 1) { currentIdx++; loadTrainWord(); }
    else endTraining();
}

function endTraining() {
    document.getElementById('trainRun').classList.add('hidden');
    document.getElementById('trainResult').classList.remove('hidden');
    let correct = testQueue.length - mistakes;
    let perc = Math.round((correct / testQueue.length) * 100);
    document.getElementById('trScore').innerText = `${perc}%`;
    
    let typeName = currentTestType === 'quiz' ? 'Kvíz' : 'Slovíčka';
    saveToHistory(`Lekcia ${testQueue[0].lekcia}`, typeName, perc, perc >= 80);
    
    if (perc >= 90 && currentTestType === 'unlock') {
        if(state.unlockedLesson === currentUnlockTarget) state.unlockedLesson++;
        addXP(100); saveState();
    } else if (perc >= 80) addXP(50);
}

// --- GRAMATIKA ---

function setGrammarMode(mode) {
    grammarMode = mode;
    document.getElementById('btnGrammarModeClick').classList.toggle('active', mode === 'click');
    document.getElementById('btnGrammarModeWrite').classList.toggle('active', mode === 'write');
}

function startGrammarTest() {
    let l = parseInt(document.getElementById('grammarLessonSelect').value);
    grammarQueue = window.grammarDb.filter(v => v.lekcia === l).sort(() => 0.5 - Math.random()).slice(0, 5);
    if (grammarQueue.length < 5) { alert("Málo viet."); return; }
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
        document.getElementById('grammarInput').value = ''; document.getElementById('grammarInput').disabled = false;
        setTimeout(() => document.getElementById('grammarInput').focus(), 200);
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
        playAudioText(grammarQueue[grammarIdx].ja, 'ja-JP');
    } else {
        grammarLives--;
        updateGrammarLives();
        if (grammarLives <= 0) {
            fb.innerHTML = `❌ Neúspech! <br> Správne: <br> <strong style="color:white;">${correct}</strong>`;
            fb.className = "feedback-box fb-wrong";
            document.getElementById('btnCheckGrammar').classList.add('hidden');
            saveToHistory(`Lekcia ${grammarQueue[0].lekcia}`, 'Gramatika', Math.round((grammarIdx/5)*100), false);
            setTimeout(() => { 
                document.getElementById('grammarRun').classList.add('hidden');
                document.getElementById('grammarSetup').classList.remove('hidden');
            }, 4000);
        } else {
            fb.innerHTML = `❌ Skús to znova!`; fb.className = "feedback-box fb-wrong";
            setTimeout(loadGrammarSentence, 1200);
        }
    }
}

function nextGrammarSentence() {
    if (grammarIdx < 4) { grammarIdx++; loadGrammarSentence(); }
    else {
        alert("Gramatika zvládnutá! +150 XP");
        addXP(150);
        let cur = parseInt(document.getElementById('grammarLessonSelect').value);
        if(cur === state.unlockedGrammarLesson) { state.unlockedGrammarLesson++; saveState(); populateSelects(); }
        saveToHistory(`Lekcia ${cur}`, 'Gramatika', 100, true);
        document.getElementById('grammarRun').classList.add('hidden');
        document.getElementById('grammarSetup').classList.remove('hidden');
    }
}

function closeTraining() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
}
