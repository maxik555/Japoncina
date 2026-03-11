// --- LOGIKA SLOVÍČOK ---
let fcQueue = []; 
let fcIdx = 0;
let quizOptions = [];
let timeLeft = 5.0;

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
        document.getElementById('fcBackKana').innerText = (w.kana && w.kana !== '-') ? w.kana : '';
        document.getElementById('fcBackKanji').innerText = (w.kanji && w.kanji !== '-') ? w.kanji : '';
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

function startTraining(type) {
    window.currentTestType = type; window.mistakes = 0; window.currentIdx = 0;
    let from = parseInt(document.getElementById(type+'From')?.value || 1);
    let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
    let count = parseInt(document.getElementById(type+'Count')?.value || 10);
    
    if (from > to) [from, to] = [to, from];
    window.testQueue = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    
    if (window.testQueue.length === 0) return;
    document.getElementById('trainSetup').classList.add('hidden');
    document.getElementById('trainRun').classList.remove('hidden');
    loadTrainWord();
}

function loadTrainWord() {
    let w = window.testQueue[window.currentIdx];
    document.getElementById('twWord').innerText = w.sk;
    document.getElementById('testProgress').innerText = `${window.currentIdx + 1} / ${window.testQueue.length}`;
    document.getElementById('twFeedback').style.display = 'none';
    document.getElementById('twNextBtn').classList.add('hidden');
    updateScoreDisplay();

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
}

function checkTrainAnswer() {
    let input = normalizeString(document.getElementById('twInput').value);
    let w = window.testQueue[window.currentIdx];
    let correct = normalizeString(w.romaji);
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';

    if (input === correct || getLevenshteinDistance(input, correct) <= 1) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        playAudioText(w.romaji, 'ja-JP');
    } else {
        fb.innerHTML = `❌ Nesprávne! <br> ${w.romaji}`; fb.className = "feedback-box fb-wrong";
        window.mistakes++;
    }
    updateScoreDisplay();
    document.getElementById('twInput').disabled = true;
    document.getElementById('twSubmitBtn').classList.add('hidden');
    document.getElementById('twNextBtn').classList.remove('hidden');
}

function checkQuizAnswer(idx) {
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
    updateScoreDisplay();
    for(let i=0; i<4; i++) document.getElementById('qb'+i).disabled = true;
    document.getElementById('twNextBtn').classList.remove('hidden');
}

function nextTrainWord() {
    if (window.currentIdx < window.testQueue.length - 1) { window.currentIdx++; loadTrainWord(); }
    else endTraining();
}

function endTraining() {
    document.getElementById('trainRun').classList.add('hidden');
    document.getElementById('trainResult').classList.remove('hidden');
    let correct = window.testQueue.length - window.mistakes;
    let perc = Math.round((correct / window.testQueue.length) * 100);
    document.getElementById('trScore').innerText = `${perc}%`;
    saveToHistory(`Lekcia ${window.testQueue[0].lekcia}`, window.currentTestType === 'quiz' ? 'Kvíz' : 'Slovíčka', perc, perc >= 80);
    if (perc >= 90 && window.currentTestType === 'unlock') {
        state.unlockedLesson++; addXP(100); saveState();
    } else if (perc >= 80) addXP(50);
}

function closeTraining() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
}
