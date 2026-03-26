console.log("--- 2. train-vocab.js načítané (Integrovaný AI Sensei Odvolací Súd v3 - AutoReset kľúča) ---");

let fcQueue = []; 
let fcIdx = 0;
let quizOptions = [];
window.quizTimerInterval = null;
window.currentDirection = 'sk2ja'; // Predvolený smer

// --- POMOCNÉ FUNKCIE ---
window.getPossibleAnswers = function(str) {
    if (!str || str === '-') return [];
    return str.split(/[\/,]+/).map(s => s.trim()).filter(s => s.length > 0);
};

window.removeDiacritics = function(str) {
    if (!str) return "";
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") 
        .replace(/\s{2,}/g, " ") 
        .toLowerCase()
        .trim();
};

window.recordWordStat = function(wordSk, isCorrect) {
    if (!window.state.wordStats) window.state.wordStats = {};
    if (!window.state.wordStats[wordSk]) window.state.wordStats[wordSk] = { c: 0, w: 0 };
    if (isCorrect) window.state.wordStats[wordSk].c++;
    else window.state.wordStats[wordSk].w++;
};

window.selectTestModeUI = function(m) {
    document.querySelectorAll('.setup-section').forEach(s => s.classList.add('hidden'));
    const setupEl = document.getElementById('setup' + m.charAt(0).toUpperCase() + m.slice(1));
    if (setupEl) setupEl.classList.remove('hidden');
    
    document.querySelectorAll('#trainSetup .btn-nav').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('btnMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
};

// --- KARTIČKY ---
window.startLearn = function(mode) {
    const select = document.getElementById('learnLessonSelect');
    if (!select) return;
    fcQueue = window.db.filter(w => w.lekcia === parseInt(select.value));
    if (fcQueue.length === 0) return alert("Pre túto lekciu nie sú zatiaľ žiadne slovíčka.");
    fcIdx = 0;
    document.getElementById('learnSetup').classList.add('hidden');
    document.getElementById('learnCardsRun').classList.remove('hidden');
    window.loadFc();
};

window.loadFc = function() {
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
};

window.flipCard = function() { document.getElementById('fcElement').classList.toggle('is-flipped'); };
window.nextFc = function() { if (fcIdx < fcQueue.length - 1) { fcIdx++; window.loadFc(); } else window.closeLearn(); };
window.prevFc = function() { if (fcIdx > 0) { fcIdx--; window.loadFc(); } };
window.closeLearn = function() { 
    document.getElementById('learnCardsRun').classList.add('hidden'); 
    document.getElementById('learnSetup').classList.remove('hidden'); 
};
window.playCurrentAudioFC = function() { if (fcQueue[fcIdx]) playAudioText(fcQueue[fcIdx].romaji, 'ja-JP'); };

// --- VIZUÁLNE AKTUALIZÁCIE TESTU ---
window.updateScoreDisplay = function() {
    let scoreEl = document.getElementById('testScoreDisplay');
    let correct = window.currentIdx - window.mistakes;
    if(correct < 0) correct = 0; 
    if(scoreEl) scoreEl.innerText = `✅ ${correct} | ❌ ${window.mistakes}`;
};

window.abortTraining = function() {
    clearInterval(window.quizTimerInterval);
    document.getElementById('trainRun').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
};

window.closeTraining = function() {
    document.getElementById('trainResult').classList.add('hidden');
    document.getElementById('trainSetup').classList.remove('hidden');
};

// --- TESTY (KVÍZ / PÍSANIE / ODOMKNUTIE / CHYTRÝ) ---
window.startTraining = function(type) {
    window.currentTestType = type; 
    window.mistakes = 0; 
    window.currentIdx = 0;
    window.currentFullResults = [];
    
    window.currentDirection = 'sk2ja';
    if (type === 'free') {
        let dirSelect = document.getElementById('freeDirection');
        if (dirSelect) window.currentDirection = dirSelect.value;
    }

    let pool = [];

    if (type === 'unlock') {
        window.currentUnlockTarget = window.state.unlockedLesson;
        pool = window.db.filter(w => w.lekcia === window.currentUnlockTarget).sort(()=>0.5-Math.random()).slice(0, 10);
    } else {
        let from = parseInt(document.getElementById(type+'From')?.value || 1);
        let to = parseInt(document.getElementById(type+'To')?.value || window.state.unlockedLesson);
        let count = parseInt(document.getElementById(type+'Count')?.value || 10);
        if (from > to) [from, to] = [to, from];
        pool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to).sort(()=>0.5-Math.random()).slice(0, count);
    }

    window.testQueue = pool;
    if (window.testQueue.length === 0) return alert("Nenašli sa žiadne slovíčka.");
    
    document.getElementById('trainRun').classList.remove('hidden');
    window.loadTrainWord();
};

window.startSmartTraining = function() {
    window.currentTestType = 'smart'; 
    window.mistakes = 0; 
    window.currentIdx = 0;
    window.currentFullResults = [];
    
    let dirSelect = document.getElementById('smartDirection');
    window.currentDirection = dirSelect ? dirSelect.value : 'sk2ja';
    
    if (!window.state.wordStats) window.state.wordStats = {};
    let unlockedWords = window.db.filter(w => w.lekcia <= window.state.unlockedLesson);
    if (unlockedWords.length === 0) return alert("Nemáš odomknuté žiadne lekcie.");

    let badWords = [], newWords = [], goodWords = [];

    unlockedWords.forEach(w => {
        let stats = window.state.wordStats[w.sk];
        if (!stats) newWords.push(w);
        else if (stats.w > 0 && stats.w >= stats.c) badWords.push(w);
        else goodWords.push(w);
    });

    const shuffle = arr => arr.sort(() => 0.5 - Math.random());
    shuffle(badWords); shuffle(newWords); shuffle(goodWords);

    let selected = [];
    let takeBad = Math.min(25, badWords.length);
    selected.push(...badWords.slice(0, takeBad));

    let rem = 50 - selected.length;
    let takeNew = Math.min(Math.floor(rem * 0.6), newWords.length);
    selected.push(...newWords.slice(0, takeNew));

    rem = 50 - selected.length;
    let takeGood = Math.min(rem, goodWords.length);
    selected.push(...goodWords.slice(0, takeGood));

    rem = 50 - selected.length;
    if (rem > 0) {
        let leftover = [...badWords.slice(takeBad), ...newWords.slice(takeNew), ...goodWords.slice(takeGood)];
        shuffle(leftover);
        selected.push(...leftover.slice(0, rem));
    }

    shuffle(selected);
    window.testQueue = selected;

    document.getElementById('trainRun').classList.remove('hidden');
    window.loadTrainWord();
};

window.loadTrainWord = function() {
    let w = window.testQueue[window.currentIdx];
    let wordDiv = document.getElementById('twWord');
    let isEn = window.currentLang === 'en';
    let meaning = isEn && w.en ? w.en : w.sk;

    if (window.currentDirection === 'ja2sk') {
        let kanjiText = w.kanji !== '-' ? w.kanji : w.kana;
        let kanaText = w.kanji !== '-' && w.kana !== '-' ? w.kana : '';
        
        wordDiv.innerHTML = `
            <div style="font-size: 3.5rem; font-weight: bold; color: var(--warning); line-height: 1.1;">${kanjiText}</div>
            ${kanaText ? `<div style="font-size: 1.5rem; color: var(--success); margin-top: 5px;">${kanaText}</div>` : ''}
            <div style="font-size: 1rem; color: var(--text-muted); margin-top: 5px;">${w.romaji}</div>
        `;
    } else {
        wordDiv.innerHTML = `<div style="font-size: 2rem;">${meaning}</div>`;
    }

    document.getElementById('testProgress').innerText = `${window.currentIdx + 1} / ${window.testQueue.length}`;
    document.getElementById('twFeedback').style.display = 'none';
    document.getElementById('twNextBtn').classList.add('hidden');
    window.updateScoreDisplay();

    clearInterval(window.quizTimerInterval);
    let timerContainer = document.getElementById('quizTimerContainer');

    if (window.currentTestType === 'quiz') {
        document.getElementById('classicInputArea').classList.add('hidden');
        document.getElementById('quizInputArea').classList.remove('hidden');
        if (timerContainer) timerContainer.classList.remove('hidden');
        
        let others = window.db.filter(x => x.sk !== w.sk).sort(()=>0.5-Math.random()).slice(0, 3);
        quizOptions = [w, ...others].sort(()=>0.5-Math.random());
        for(let i=0; i<4; i++) {
            let btn = document.getElementById('qb'+i);
            btn.innerText = quizOptions[i].romaji;
            btn.className = 'btn-quiz'; btn.disabled = false;
        }
        window.startQuizTimer(10);
    } else {
        document.getElementById('classicInputArea').classList.remove('hidden');
        document.getElementById('quizInputArea').classList.add('hidden');
        if (timerContainer) timerContainer.classList.add('hidden');
        
        let inputEl = document.getElementById('twInput');
        inputEl.value = ''; 
        inputEl.disabled = false;
        inputEl.focus(); 
        document.getElementById('twSubmitBtn').classList.remove('hidden');
    }
};

window.startQuizTimer = function(seconds) {
    let timeLeft = seconds;
    let timerBar = document.getElementById('quizTimerBar'); 
    if(timerBar) { timerBar.style.width = '100%'; timerBar.style.transition = 'none'; }
    window.quizTimerInterval = setInterval(() => {
        timeLeft -= 0.1; 
        if (timerBar) timerBar.style.width = (timeLeft / seconds * 100) + '%';
        if (timeLeft <= 0) { clearInterval(window.quizTimerInterval); window.handleQuizTimeout(); }
    }, 100);
};

window.handleQuizTimeout = function() {
    let w = window.testQueue[window.currentIdx];
    window.mistakes++;
    window.currentFullResults.push({ q: w.sk, a: "⏱️ Čas vypršal", correct: w.romaji, isCorrect: false });
    window.recordWordStat(w.sk, false);
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    fb.innerHTML = `❌ Čas vypršal! <br> Je to: ${w.romaji}`; fb.className = "feedback-box fb-wrong"; 
    window.updateScoreDisplay();
    for(let i=0; i<4; i++) { let btn = document.getElementById('qb'+i); if (btn) btn.disabled = true; }
    document.getElementById('twNextBtn').classList.remove('hidden');
};

// --- AI SENSEI ODVOLACÍ SÚD ---
window.appealToSensei = async function() {
    let apiKey = (window.state && (window.state.geminiApiKey || window.state.apiKey || window.state.geminiKey || window.state.gemini_api_key)) 
                 || localStorage.getItem('gemini_api_key') 
                 || localStorage.getItem('geminiApiKey');
    
    if (!apiKey) {
        apiKey = prompt("Pre použitie AI Senseia prosím zadaj svoj Gemini API kľúč (bez medzier):");
        if (!apiKey) return;
        apiKey = apiKey.trim(); // Automaticky odstránime medzery, ak by tam nejaké boli
        localStorage.setItem('gemini_api_key', apiKey); 
    }

    let appealBtn = document.getElementById('btnAppeal');
    if (appealBtn) {
        appealBtn.innerText = "⏳ Sensei analyzuje...";
        appealBtn.disabled = true;
    }

    let w = window.testQueue[window.currentIdx];
    let inputRaw = document.getElementById('twInput').value.trim();
    let isEn = window.currentLang === 'en';
    let meaning = isEn && w.en ? w.en : w.sk;
    
    let expectedAnswer = window.currentDirection === 'ja2sk' ? meaning : w.romaji;
    let questionText = window.currentDirection === 'ja2sk' ? (w.kanji !== '-' ? w.kanji : w.kana) : meaning;

    let promptText = `Si prísny, ale spravodlivý učiteľ japončiny.
Otázka v teste bola: "${questionText}".
Očakávaná správna odpoveď: "${expectedAnswer}".
Používateľ napísal: "${inputRaw}".

Rozhodni, či je odpoveď používateľa akceptovateľná. Zohľadni: synonymá, iný vid slovesa (napr. napiť sa vs. piť), drobný preklep bez zmeny významu, alebo chýbajúce častice.
Odpovedz striktne v tomto formáte:
Ak uznávaš: "ANO: <jedna veta vysvetlenia v slovenčine>"
Ak neuznávaš: "NIE: <jedna veta vysvetlenia v slovenčine prečo je to zle>"`;

    try {
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        let data = await response.json();
        
        // Ak API vráti chybu (neplatný kľúč, limit atď.)
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            if (appealBtn) { 
                appealBtn.innerText = "❌ Skús znova (Neplatný kľúč)"; 
                appealBtn.disabled = false; 
            }
            // ZMAZANIE CHYBNÉHO KĽÚČA Z PAMÄTE!
            localStorage.removeItem('gemini_api_key');
            localStorage.removeItem('geminiApiKey');
            alert(`Google API odmietlo tvoj kľúč. Zrejme obsahuje preklep. Pri ďalšom kliknutí si ho appka vypýta nanovo.\n\nDetail chyby: ${data.error.message}`);
            return;
        }

        let aiText = data.candidates[0].content.parts[0].text.trim();
        let fb = document.getElementById('twFeedback');

        if (aiText.toUpperCase().startsWith("ANO")) {
            window.mistakes--;
            let lastResult = window.currentFullResults[window.currentFullResults.length - 1];
            if (lastResult) lastResult.isCorrect = true;
            
            if (window.state.wordStats && window.state.wordStats[w.sk]) {
                window.state.wordStats[w.sk].w--;
                window.state.wordStats[w.sk].c++;
            }

            let explanation = aiText.substring(aiText.indexOf(':') + 1).trim();
            fb.innerHTML = `✅ <b>Správne! (Sensei uznal)</b><br><span style="font-size: 13px; color: #fff;">${explanation}</span>`;
            fb.className = "feedback-box fb-correct";
            window.updateScoreDisplay();
            
        } else {
            let explanation = aiText.includes(':') ? aiText.substring(aiText.indexOf(':') + 1).trim() : aiText;
            fb.innerHTML = `❌ <b>Nesprávne!</b> <br> ${expectedAnswer} <br><div style="margin-top: 10px; font-size: 13px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px; color: #ffcccc;"><b>Sensei:</b> ${explanation}</div>`;
            fb.className = "feedback-box fb-wrong";
        }
    } catch (error) {
        console.error("AI Error:", error);
        if (appealBtn) {
            appealBtn.innerText = "❌ Chyba pripojenia";
            appealBtn.disabled = false;
        }
    }
};

window.checkTrainAnswer = function() {
    let inputRaw = document.getElementById('twInput').value.trim();
    let inputNorm = window.removeDiacritics(inputRaw); 
    let w = window.testQueue[window.currentIdx];
    let isEn = window.currentLang === 'en';
    let meaning = isEn && w.en ? w.en : w.sk;
    
    let isCorrect = false;
    let expectedAnswer = "";
    let questionText = "";

    if (window.currentDirection === 'ja2sk') {
        questionText = w.kanji !== '-' ? w.kanji : w.kana;
        expectedAnswer = meaning;
        
        let possibleMeanings = window.getPossibleAnswers(meaning).map(s => window.removeDiacritics(s));
        for (let m of possibleMeanings) {
            if (inputNorm === m || window.getLevenshteinDistance(inputNorm, m) <= 1) {
                isCorrect = true; break;
            }
        }
    } else {
        questionText = meaning;
        expectedAnswer = w.romaji;
        
        let possibleRomaji = window.getPossibleAnswers(w.romaji).map(s => window.removeDiacritics(s));
        let possibleKana = window.getPossibleAnswers(w.kana);
        let possibleKanji = window.getPossibleAnswers(w.kanji);

        for (let r of possibleRomaji) {
            if (inputNorm === r || window.getLevenshteinDistance(inputNorm, r) <= 1) { isCorrect = true; break; }
        }
        if (!isCorrect) {
            if (possibleKana.includes(inputRaw) || possibleKanji.includes(inputRaw) || inputRaw === w.kana.trim() || inputRaw === w.kanji.trim()) {
                isCorrect = true;
            }
        }
    }

    window.currentFullResults.push({ q: questionText, a: inputRaw || "(nič)", correct: expectedAnswer, isCorrect: isCorrect });
    window.recordWordStat(w.sk, isCorrect);
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    
    if (isCorrect) { 
        let extraVisual = "";
        if (window.currentDirection === 'sk2ja') {
            let displayChar = w.kanji !== '-' ? w.kanji : (w.kana !== '-' ? w.kana : '');
            if (displayChar) {
                extraVisual = `<div style="font-size: 2.5rem; color: var(--warning); margin-top: 8px; line-height: 1.1;">${displayChar}</div>`;
            }
        }
        
        fb.innerHTML = "✅ Správne!" + extraVisual; 
        fb.className = "feedback-box fb-correct"; 
        
        if (typeof playAudioText === 'function') {
            let audioText = window.getPossibleAnswers(w.romaji)[0] || w.romaji;
            playAudioText(audioText, 'ja-JP'); 
        }
    } else { 
        fb.innerHTML = `❌ Nesprávne! <br> ${expectedAnswer} 
        <button id="btnAppeal" class="btn btn-outline" style="margin-top: 15px; font-size: 12px; padding: 6px 12px; width: 100%; border-color: var(--warning); color: var(--warning);" onclick="window.appealToSensei()">⚖️ Uznaj mi to (AI Sensei)</button>`; 
        fb.className = "feedback-box fb-wrong"; 
        window.mistakes++; 
    }
    
    window.updateScoreDisplay();
    document.getElementById('twInput').disabled = true;
    document.getElementById('twSubmitBtn').classList.add('hidden');
    document.getElementById('twNextBtn').classList.remove('hidden');
};

window.checkQuizAnswer = function(idx) {
    clearInterval(window.quizTimerInterval);
    let w = window.testQueue[window.currentIdx];
    let isCorrect = (quizOptions[idx].sk === w.sk);
    
    window.currentFullResults.push({ q: w.sk, a: quizOptions[idx].romaji, correct: w.romaji, isCorrect: isCorrect });
    window.recordWordStat(w.sk, isCorrect);
    
    let fb = document.getElementById('twFeedback');
    fb.style.display = 'block';
    
    if (isCorrect) { 
        let extraVisual = "";
        if (window.currentDirection === 'sk2ja') {
            let displayChar = w.kanji !== '-' ? w.kanji : (w.kana !== '-' ? w.kana : '');
            if (displayChar) {
                extraVisual = `<div style="font-size: 2.5rem; color: var(--warning); margin-top: 8px; line-height: 1.1;">${displayChar}</div>`;
            }
        }
        
        fb.innerHTML = "✅ Správne!" + extraVisual; 
        fb.className = "feedback-box fb-correct"; 
        
        let audioText = window.getPossibleAnswers(w.romaji)[0] || w.romaji;
        if (typeof playAudioText === 'function') playAudioText(audioText, 'ja-JP'); 
    } else { 
        fb.innerHTML = `❌ Chyba! Je to: ${w.romaji}`; fb.className = "feedback-box fb-wrong"; 
        window.mistakes++; 
    }
    
    window.updateScoreDisplay();
    for(let i=0; i<4; i++) document.getElementById('qb'+i).disabled = true;
    document.getElementById('twNextBtn').classList.remove('hidden');
};

window.nextTrainWord = function() {
    window.currentIdx++; 
    if (window.currentIdx < window.testQueue.length) { 
        window.loadTrainWord(); 
    } else { 
        window.endTraining(); 
    }
};

window.endTraining = function() {
    document.getElementById('trainRun').classList.add('hidden');
    let resultContainer = document.getElementById('trainResult');
    resultContainer.classList.remove('hidden');
    
    let total = window.testQueue.length;
    let wrong = window.mistakes;
    let correct = total - wrong;
    let perc = Math.round((correct / total) * 100);
    
    document.getElementById('trScore').innerText = `${perc}%`;
    
    let summaryDiv = document.getElementById('testSummaryContainer');
    if (!summaryDiv) {
        summaryDiv = document.createElement('div');
        summaryDiv.id = 'testSummaryContainer';
        summaryDiv.style = 'margin: 20px auto; width: 100%; text-align: left;';
        let btn = resultContainer.querySelector('.btn-action');
        if (btn) resultContainer.querySelector('.test-modal').insertBefore(summaryDiv, btn);
        else resultContainer.querySelector('.test-modal').appendChild(summaryDiv);
    }
    
    let msg = "";
    if (perc === 100) msg = "Perfektné! Úplne bez chýb. 🥷";
    else if (perc >= 90) msg = "Skvelá práca! Len malinké zaváhania. 🔥";
    else if (perc >= 80) msg = "Dobrý výkon! Ešte trochu tréningu a dáš to na 100%. 👍";
    else msg = "Na chybách sa učíme! Pozri si ich nižšie a skús to znova. 💪";

    let summaryHtml = `
        <div style="text-align:center; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
            <p style="font-size: 16px; color: var(--text-muted); margin-top: 0;">${msg}</p>
            <div style="display:flex; justify-content:center; gap: 30px; font-size: 18px;">
                <span style="color:var(--success); font-weight:bold;">✅ ${correct}</span>
                <span style="color:var(--danger); font-weight:bold;">❌ ${wrong}</span>
            </div>
        </div>
    `;

    if (wrong > 0) {
        summaryHtml += `<h4 style="border-bottom: 1px solid var(--border); padding-bottom: 5px; color: var(--text-muted); text-align: left;">Čo ti ušlo:</h4>`;
        summaryHtml += `<div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; text-align: left;">`;
        let mistakesList = window.currentFullResults.filter(r => !r.isCorrect);
        mistakesList.forEach(m => {
            summaryHtml += `
                <div style="background: rgba(255,0,0,0.05); padding: 12px; border-radius: 8px; border-left: 4px solid var(--danger);">
                    <div style="font-weight:bold; margin-bottom:4px; font-size: 15px;">${m.q}</div>
                    <div style="font-size:13px; color:var(--text-muted);">Tvoja odpoveď: <span style="text-decoration:line-through; color:var(--danger);">${m.a}</span></div>
                    <div style="font-size:14px; color:var(--success); font-weight:bold; margin-top: 4px;">Správne: ${m.correct}</div>
                </div>
            `;
        });
        summaryHtml += `</div>`;
    }
    summaryDiv.innerHTML = summaryHtml;

    let typeName = window.currentTestType === 'unlock' ? 'Odomknutie' : (window.currentTestType === 'smart' ? 'Chytrý test' : 'Slovíčka');
    if (window.currentTestType === 'quiz') typeName = 'Kvíz';
    
    let lessonInfo = window.currentTestType === 'smart' ? `Mix Lekcií (1-${window.state.unlockedLesson})` : `Lekcia ${window.testQueue[0].lekcia}`;
    window.saveToHistory(lessonInfo, typeName, perc, perc >= 80, window.currentFullResults);
    
    if (perc >= 90 && window.currentTestType === 'unlock') {
        if(window.state.unlockedLesson === window.currentUnlockTarget) {
            window.state.unlockedLesson++;
            if (typeof addXP === 'function') addXP(100); 
            if (typeof renderMap === 'function') renderMap();
            if (typeof populateSelects === 'function') populateSelects();
            setTimeout(() => alert("🎉 Výborne! Odomkol si novú lekciu!"), 300);
        } else {
            if (typeof addXP === 'function') addXP(100); 
        }
    } else if (perc >= 80) {
        if (typeof addXP === 'function') addXP(50); 
    }
    
    if (typeof saveState === 'function') saveState();
};
