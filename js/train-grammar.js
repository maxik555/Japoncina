// --- LOGIKA GRAMATIKY ---
let grammarQueue = []; 
let grammarIdx = 0; 
let userSentence = []; 
let grammarLives = 3;
let grammarMode = 'click'; 

function setGrammarMode(mode) {
    grammarMode = mode;
    document.getElementById('btnGrammarModeClick').classList.toggle('active', mode === 'click');
    document.getElementById('btnGrammarModeWrite').classList.toggle('active', mode === 'write');
}

function startGrammarTest() {
    let l = parseInt(document.getElementById('grammarLessonSelect').value);
    grammarQueue = window.grammarDb.filter(v => v.lekcia === l).sort(() => 0.5 - Math.random()).slice(0, 5);
    if (grammarQueue.length < 5) { alert("Málo viet v Exceli pre túto lekciu."); return; }
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

    let cleanA = normalizeString(answer);
    let cleanC = normalizeString(correct);

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
