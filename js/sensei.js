// --- AI SENSEI & AI PREKLADAČ ---

let currentSenseiTask = "";

async function callGemini(promptText) {
    // Kontrola kľúča
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "AIzaSyCJ6xqewNPqlsZsI8E3B5mTZYPF4WdWFuo" || GEMINI_API_KEY === "") {
        alert(currentLang === 'sk' ? "Chýba API kľúč v js/config.js!" : "Missing API Key in js/config.js!");
        return null;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();
        
        // Ak API vráti chybu (napr. zlý kľúč)
        if (data.error) {
            console.error("Gemini API Error Detail:", data.error);
            alert("Sensei Error: " + data.error.message);
            return null;
        }

        if (data.candidates && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        }
        
        return null;
    } catch (error) {
        console.error("Network/Fetch Error:", error);
        return null;
    }
}
// --- SEKCIA SENSEI (ZADANIA) ---
async function startSenseiSession() {
    let from = parseInt(document.getElementById('senseiFrom').value);
    let to = parseInt(document.getElementById('senseiTo').value);
    let count = parseInt(document.getElementById('senseiCount').value) || 3;
    if (from > to) [from, to] = [to, from];

    let allowedWords = db.filter(w => w.lekcia >= from && w.lekcia <= to)
                         .map(w => `${w.sk} (${w.romaji})`).join(", ");
    
    if (!allowedWords) return;

    document.getElementById('senseiSetup').classList.add('hidden');
    document.getElementById('senseiRun').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
    document.getElementById('senseiUserInput').disabled = false;
    document.getElementById('senseiUserInput').value = "";
    document.getElementById('btnSenseiSubmit').classList.remove('hidden');
    document.getElementById('senseiTaskText').innerHTML = `<span style="color:var(--primary);">${currentLang==='sk'?'Sensei premýšľa nad vetami...':'Sensei is thinking...'}</span>`;

    let avoidSentences = (state.usedSenseiSentences || []).slice(-10).join(" | ");

    let prompt = `Si učiteľ japončiny (Sensei). Vygeneruj ${count} krátkych viet na preklad do japončiny.
    PRAVIDLÁ:
    1. Vety musia byť poskladané VÝHRADNE z týchto slov a ich logických variácií: ${allowedWords}
    2. Nepoužívaj tieto vety: ${avoidSentences}
    3. Odpovedaj LEN slovenskými vetami, očíslovanými 1., 2... Žiadne kecy okolo.`;

    let aiResponse = await callGemini(prompt);
    if (aiResponse) {
        currentSenseiTask = aiResponse;
        document.getElementById('senseiTaskText').innerText = aiResponse;
        if(!state.usedSenseiSentences) state.usedSenseiSentences = [];
        state.usedSenseiSentences.push(aiResponse.substring(0, 100));
        saveState();
    }
}

async function submitToSensei() {
    let userAnswers = document.getElementById('senseiUserInput').value.trim();
    if (!userAnswers) return;

    document.getElementById('senseiUserInput').disabled = true;
    document.getElementById('btnSenseiSubmit').classList.add('hidden');
    document.getElementById('senseiEvaluation').classList.remove('hidden');
    document.getElementById('senseiEvalText').innerHTML = `<span style="color:var(--primary);">${currentLang==='sk'?'Sensei hodnotí...':'Evaluating...'}</span>`;

    let prompt = `Si učiteľ japončiny. Študent preložil tieto vety:
    Zadanie: ${currentSenseiTask}
    Odpovede: ${userAnswers}
    Zhodnoť presnosť (gramatika, slovosled, častice). Oprav chyby a vysvetli prečo. Odpovedaj v jazyku: ${currentLang === 'sk' ? 'Slovenčina' : 'English'}.`;

    let aiResponse = await callGemini(prompt);
    if (aiResponse) {
        document.getElementById('senseiEvalText').innerText = aiResponse;
    }
}

function closeSenseiSession() {
    document.getElementById('senseiRun').classList.add('hidden');
    document.getElementById('senseiSetup').classList.remove('hidden');
}

// --- SEKCIA PREKLADAČ ---
async function translateText() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    let dir = document.getElementById('transDirection').value;
    let out = document.getElementById('transOutput');
    out.innerText = currentLang === 'sk' ? "Prekladám..." : "Translating...";

    let prompt = `Prelož text "${text}" z ${dir.split('|')[0]} do ${dir.split('|')[1]}. 
    Ak ide o japončinu, uveď zápis v kandži/kana aj v rómadži. Odpovedaj len prekladom.`;

    let res = await callGemini(prompt);
    if(res) {
        out.innerText = res;
        document.getElementById('btnTransAudio').classList.remove('hidden');
    }
}

async function analyzeWithAI() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    
    document.getElementById('aiResponse').innerHTML = "⏳ AI Sensei analyzuje...";
    document.getElementById('overlayAI').style.display = 'flex';

    let prompt = `Analyzuj túto japonskú vetu alebo výraz: "${text}". 
    Vysvetli gramatiku, použité častice a význam jednotlivých slov. 
    Odpovedaj v jazyku: ${currentLang === 'sk' ? 'Slovenčina' : 'English'}.`;

    let res = await callGemini(prompt);
    if(res) document.getElementById('aiResponse').innerText = res;
}

function playTransAudio() {
    let text = document.getElementById('transOutput').innerText;
    if(!text) return;
    // Skúsime extrahovať japonskú časť (pred zátvorkou s romaji)
    let jaPart = text.split('(')[0].trim();
    playAudioText(jaPart, 'ja-JP');
}
