console.log("Logika gramatiky načítaná.");

window.grammarQueue = []; 
window.grammarIdx = 0; 
window.userSentence = []; 
window.grammarLives = 3;
window.grammarMode = 'click'; 

window.setGrammarMode = function(mode) {
    window.grammarMode = mode;
    document.getElementById('btnGrammarModeClick').classList.toggle('active', mode === 'click');
    document.getElementById('btnGrammarModeWrite').classList.toggle('active', mode === 'write');
};

window.startGrammarTest = function() {
    let l = parseInt(document.getElementById('grammarLessonSelect').value);
    window.grammarQueue = window.grammarDb.filter(v => v.lekcia === l).sort(() => 0.5 - Math.random()).slice(0, 5);
    if (window.grammarQueue.length < 5) { alert("Málo viet v Exceli pre túto lekciu."); return; }
    window.grammarIdx = 0; window.grammarLives = 3;
    window.updateGrammarLives();
    document.getElementById('grammarSetup').classList.add('hidden');
    document.getElementById('grammarRun').classList.remove('hidden');
    window.loadGrammarSentence();
};

window.loadGrammarSentence = function() {
    let veta = window.grammarQueue[window.grammarIdx];
    window.userSentence = [];
    document.getElementById('grammarProgress').innerText = `Veta ${window.grammarIdx + 1} / 5`;
    document.getElementById('grammarTask').innerText = veta.sk;
    document.getElementById('grammarFeedback').style.display = 'none';
    document.getElementById('btnNextGrammar').classList.add('hidden');
    document.getElementById('btnCheckGrammar').classList.remove('hidden');

    if (window.grammarMode === 'click') {
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
        setTimeout(() => document.getElementById('grammarInput').focus(), 200);
    }
};

window.addWordToGrammar = function(word, btn) {
    window.userSentence.push(word);
    btn.style.visibility = 'hidden'; 
    let span = document.createElement('span');
    span.className = 'btn-quiz';
    span.style = 'padding: 10px 15px; width: auto; background: var(--primary); color: white;';
    span.innerText = word;
    document.getElementById('grammarSolution').appendChild(span);
};

window.updateGrammarLives = function() {
    document.getElementById('grammarLives').innerText = "❤️".repeat(window.grammarLives);
};

window.checkGrammarAnswer = function() {
    let correct = window.grammarQueue[window.grammarIdx].romaji;
    let answer = (window.grammarMode === 'click') ? window.userSentence.join(' ') : document.getElementById('grammarInput').value.trim();
    let fb = document.getElementById('grammarFeedback');
    fb.style.display = 'block';

    let cleanA = window.normalizeString(answer);
    let cleanC = window.normalizeString(correct);

    if (cleanA === cleanC) {
        fb.innerHTML = "✅ Správne!"; fb.className = "feedback-box fb-correct";
        document.getElementById('btnCheckGrammar').classList.add('hidden');
        document.getElementById('btnNextGrammar').classList.remove('hidden');
        playAudioText(window.grammarQueue[window.grammarIdx].ja, 'ja-JP');
    } else {
        window.grammarLives--;
        window.updateGrammarLives();
        if (window.grammarLives <= 0) {
            fb.innerHTML = `❌ Neúspech! <br> Správne: <br> <strong style="color:white;">${correct}</strong>`;
            fb.className = "feedback-box fb-wrong";
            document.getElementById('btnCheckGrammar').classList.add('hidden');
            window.saveToHistory(`Lekcia ${window.grammarQueue[0].lekcia}`, 'Gramatika', Math.round((window.grammarIdx/5)*100), false);
            setTimeout(() => { 
                document.getElementById('grammarRun').classList.add('hidden');
                document.getElementById('grammarSetup').classList.remove('hidden');
            }, 4000);
        } else {
            fb.innerHTML = `❌ Skús to znova!`; fb.className = "feedback-box fb-wrong";
            setTimeout(window.loadGrammarSentence, 1200);
        }
    }
};

window.nextGrammarSentence = function() {
    if (window.grammarIdx < 4) { window.grammarIdx++; window.loadGrammarSentence(); }
    else {
        alert("Gramatika zvládnutá! +150 XP");
        addXP(150);
        let cur = parseInt(document.getElementById('grammarLessonSelect').value);
        if(cur === state.unlockedGrammarLesson) { state.unlockedGrammarLesson++; saveState(); populateSelects(); }
        window.saveToHistory(`Lekcia ${cur}`, 'Gramatika', 100, true);
        document.getElementById('grammarRun').classList.add('hidden');
        document.getElementById('grammarSetup').classList.remove('hidden');
    }
};

window.resetCurrentSentence = function() { window.loadGrammarSentence(); };
