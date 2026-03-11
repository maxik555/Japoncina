console.log("Nástroje tréningu načítané.");

window.testQueue = []; 
window.currentIdx = 0; 
window.mistakes = 0; 
window.currentUnlockTarget = 0; 
window.currentTestType = '';

// POMOCNÉ FUNKCIE
window.normalizeString = function(str) {
    if (!str) return "";
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Odstráni dĺžne/mäkčene (pre romaji)
        .trim();
};

window.updateScoreDisplay = function() {
    const scoreEl = document.getElementById('testScoreDisplay');
    if (scoreEl) {
        let correct = window.currentIdx - window.mistakes;
        scoreEl.innerText = `✅ ${correct < 0 ? 0 : correct} | ❌ ${window.mistakes}`;
    }
};

window.saveToHistory = function(lesson, type, score, passed) {
    if (!state.history) state.history = [];
    const entry = {
        date: Date.now(),
        lesson: lesson,
        type: type,
        score: score,
        passed: passed
    };
    state.history.push(entry);
    if (state.history.length > 50) state.history.shift();
    
    if (typeof saveState === 'function') saveState();
    // Voláme renderHistory v ui.js
    if (typeof window.renderHistory === 'function') window.renderHistory();
};

// --- OPRAVA: GLOBÁLNY ENTER ---
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const trainRun = document.getElementById('trainRun');
        const grammarRun = document.getElementById('grammarRun');

        // Ak sme v teste slovíčok
        if (trainRun && !trainRun.classList.contains('hidden') && window.currentTestType !== 'quiz') {
            const nextBtn = document.getElementById('twNextBtn');
            if (nextBtn && nextBtn.classList.contains('hidden')) {
                window.checkTrainAnswer();
            } else {
                window.nextTrainWord();
            }
        }
        // Ak sme v gramatike (režim písania)
        else if (grammarRun && !grammarRun.classList.contains('hidden') && window.grammarMode === 'write') {
            const nextBtnG = document.getElementById('btnNextGrammar');
            if (nextBtnG && nextBtnG.classList.contains('hidden')) {
                window.checkGrammarAnswer();
            } else {
                window.nextGrammarSentence();
            }
        }
    }
});
