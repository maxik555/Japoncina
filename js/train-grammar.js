// --- LOGIKA GRAMATIKY (VETY) ---

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
// ... (ostatné funkcie ako checkGrammarAnswer, nextGrammarSentence zostávajú rovnaké)
