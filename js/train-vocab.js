// --- LOGIKA SLOVÍČOK (KARTIČKY A TESTY) ---

let testQueue = []; 
let currentIdx = 0; 
let mistakes = 0; 
let currentUnlockTarget = 0; 
let currentTestType = '';
let fcQueue = []; 
let fcIdx = 0;
let quizOptions = [];

// Kartičky
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

// Slovné testy (Kvíz / Písanie)
function startTraining(type) {
    currentTestType = type; mistakes = 0; currentIdx = 0;
    let from = parseInt(document.getElementById(type+'From')?.value || 1);
    let to = parseInt(document.getElementById(type+'To')?.value || state.unlockedLesson);
    let countInput = document.getElementById(type+'Count');
    let count = countInput ? parseInt(countInput.value) : 10;
    
    if (from > to) [from, to] = [to, from];
    testQueue = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    
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
// ... (ostatné funkcie ako checkTrainAnswer, nextTrainWord, endTraining zostávajú rovnaké)
