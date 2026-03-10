// --- TRÉNING, TESTY A KARTIČKY ---

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

// Premenné pre testy
let testQueue = []; 
let currentIdx = 0; 
let mistakes = 0; 
let currentUnlockTarget = 0; 
let isBossTest = false;
let currentTestMistakes = []; 
let currentFullResults = [];
let quizTimer; 
let timeLeft = 5.0; 
let quizOptions = [];
let fcQueue = []; 
let fcIdx = 0;
let currentTestType = '';

// Premenné pre gramatiku (DEKLAROVANÉ LEN RAZ)
let grammarQueue = []; 
let grammarIdx = 0; 
let userSentence = []; 
let grammarLives = 3;

// --- KARTIČKY (LEARN) ---
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

// --- LOGIKA SLOVNÝCH TESTOV ---
function selectTestModeUI(m) {
    document.querySelectorAll('.setup-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1))?.classList.remove('hidden');
}

function startTraining(type) {
    currentTestType = type; mistakes = 0; currentIdx = 0; currentTestMistakes = [];
    let pool = [];

    if (type === 'unlock') {
        currentUnlockTarget = state.unlockedLesson;
        pool = window.db.filter(w => w.lekcia === currentUnlockTarget).sort(()=>0.5-Math.random()).slice(0, 10);
    } else {
        let from = parseInt(document.getElementById(type+'From')?.value || 1);
        let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
        pool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, 20);
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
    
    if (currentTestType === 'quiz') {
        document.getElementById('classicInputArea').classList.add('hidden');
        document.getElementById('quizInputArea').classList.remove('hidden');
        let others = window.db.filter(x => x.sk !== w.sk).sort(()=>0.5-Math.random()).slice(0, 3);
        quizOptions = [w, ...others].sort(()=>0.5-Math.random());
        for(let i=0; i<4; i++) {
            let btn = document.getElementById('qb'+i);
            btn.innerText = quizOptions[i].romaji;
            btn.className = 'btn-quiz';
            btn.disabled = false;
        }
    } else {
        document.getElementById('classicInputArea').classList.remove('hidden');
        document.getElementById('quizInputArea').classList.add('hidden');
        document.getElementById('twInput').value = '';
        document.getElementById('twInput').disabled = false;
        document.getElementById('twInput').focus();
        document.getElementById('twSubmitBtn').classList.remove('hidden');
    }
}

function checkTrainAnswer() {
    let input = normalizeString(document.getElementById('twInput').value);
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
    let perc = Math.round(((testQueue.length - mistakes) / testQueue.length) * 100);
    document.getElementById('trScore').innerText = `${perc}%`;
    if (perc >= 90 && currentTestType === 'unlock') {
        state.unlockedLesson++;
        addXP(100);
        saveState();
    } else if (perc >= 80) {
        addXP(50);
    }
}

function closeTraining() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
}

// --- LOGIKA GRAMATIKY (VETY) ---
function startGrammarTest() {
    let l = parseInt(document.getElementById('grammarLessonSelect').value);
    grammarQueue = window.grammarDb.filter(v => v.lekcia === l).sort(() => 0.5 - Math.random());
    
    if (grammarQueue.length < 5) {
        alert("Pre túto lekciu máš v Exceli (Sheet 2) málo viet. Potrebuješ aspoň 5.");
        return;
    }
    
    grammarQueue = grammarQueue.slice(0, 5); 
    grammarIdx = 0;
    grammarLives = 3;
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
    document.getElementById('grammarSolution').innerHTML = '';
    document.getElementById('grammarFeedback').style.display = 'none';
    document.getElementById('btnNextGrammar').classList.add('hidden');
    document.getElementById('btnCheckGrammar').classList.remove('hidden');

    let words = veta.romaji.split(/\s+/).sort(() => 0.5 - Math.random());
    let html = '';
    words.forEach(w => {
        html += `<button class="btn-quiz" style="padding: 10px 15px; width: auto; font-size: 16px;" onclick="addWordToGrammar('${w}', this)">${w}</button>`;
    });
    document.getElementById('grammarOptions').innerHTML = html;
}

function addWordToGrammar(word, btn) {
    userSentence.push(word);
    btn.style.visibility = 'hidden'; 
    let solDiv = document.getElementById('grammarSolution');
    let span = document.createElement('span');
    span.className = 'btn-quiz';
    span.style = 'padding: 10px 15px; width: auto; background: var(--primary); color: white;';
    span.innerText = word;
    solDiv.appendChild(span);
}

function updateGrammarLives() {
    let hearts = "";
    for(let i=0; i<grammarLives; i++) hearts += "❤️";
    document.getElementById('grammarLives').innerText = hearts;
}

function checkGrammarAnswer() {
    let correct = grammarQueue[grammarIdx].romaji;
    let answer = userSentence.join(' ');
    let fb = document.getElementById('grammarFeedback');
    fb.style.display = 'block';
    
    if (answer.toLowerCase() === correct.toLowerCase()) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        document.getElementById('btnCheckGrammar').classList.add('hidden');
        document.getElementById('btnNextGrammar').classList.remove('hidden');
        playAudioText(grammarQueue[grammarIdx].ja, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Chyba! Správne: ${correct}`; fb.className = "feedback-box fb-wrong";
        grammarLives--;
        updateGrammarLives();
        setTimeout(() => {
            if (grammarLives <= 0) { alert("Stratil si životy! Začínaš odznova."); startGrammarTest(); }
            else { loadGrammarSentence(); }
        }, 1500);
    }
}

function nextGrammarSentence() {
    grammarIdx++;
    if (grammarIdx < 5) {
        loadGrammarSentence();
    } else {
        // ÚSPEŠNÉ DOKONČENIE VÝZVY
        alert("Výborne! Zvládol si gramatiku tejto lekcie! 🏆");
        if (typeof addXP === 'function') addXP(150);

        let currentL = parseInt(document.getElementById('grammarLessonSelect').value);

        // Ak používateľ dokončil svoju momentálne najvyššiu dostupnú lekciu, odomkneme mu ďalšiu
        if (currentL === state.unlockedGrammarLesson) {
            state.unlockedGrammarLesson++;
            console.log("Odomknutá nová lekcia gramatiky:", state.unlockedGrammarLesson);
            
            // Uložíme progres do Firebase a aktualizujeme menu
            if (typeof saveState === 'function') saveState();
            populateSelects(); 
        }

        document.getElementById('grammarRun').classList.add('hidden');
        document.getElementById('grammarSetup').classList.remove('hidden');
    }
}

function resetCurrentSentence() { loadGrammarSentence(); }
