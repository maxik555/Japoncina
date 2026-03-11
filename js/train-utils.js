console.log("Nástroje tréningu načítané.");

// --- GLOBÁLNE PREMENNÉ (Zdieľané medzi vocab a grammar) ---
window.testQueue = []; 
window.currentIdx = 0; 
window.mistakes = 0; 
window.currentUnlockTarget = 0; 
window.currentTestType = '';
window.quizTimer = null;

// --- POMOCNÉ FUNKCIE ---

window.normalizeString = function(str) {
    if (!str) return "";
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[.!?]/g, "") 
        .trim();
};

window.getLevenshteinDistance = function(a, b) {
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
    if (typeof renderHistory === 'function') renderHistory();
};
