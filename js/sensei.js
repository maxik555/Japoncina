// --- AI SENSEI & AI PREKLADAČ ---

let currentSenseiTask = "";

async function callGemini(promptText) {
    // Skúsime vziať kľúč z okna (window) alebo priamo z premennej
    const key = window.GEMINI_API_KEY || (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : "");

    if (!key || key === "" || key.includes("TVOJ_")) {
        alert("Sensei nevidí API kľúč v config.js! Skús Ctrl+F5.");
        return null;
    }

    try {
const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {        
    method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Gemini Error:", data.error);
            alert("Sensei API Error: " + data.error.message);
            return null;
        }

        if (data.candidates && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        }
        return null;
    } catch (error) {
        console.error("Network Error:", error);
        return null;
    }
}

// --- SEKCIA SENSEI ---
async function startSenseiSession() {
    let from = parseInt(document.getElementById('senseiFrom').value);
    let to = parseInt(document.getElementById('senseiTo').value);
    let count = parseInt(document.getElementById('senseiCount').value) || 3;
    if (from > to) [from, to] = [to, from];

    let allowedWords = db.filter(w => w.lekcia >= from && w.lekcia <= to)
                         .map(w => `${w.sk} (${w.romaji})`).join(", ");
    
    if (!allowedWords) {
        alert("Žiadne slová v tomto rozsahu lekcií!");
        return;
    }

    document.getElementById('senseiSetup').classList.add('hidden');
    document.getElementById('senseiRun').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
    document.getElementById('senseiUserInput').disabled = false;
    document.getElementById('senseiUserInput').value = "";
    document.getElementById('btnSenseiSubmit').classList.remove('hidden');
    document.getElementById('senseiTaskText').innerHTML = `<span style="color:var(--primary);">Sensei premýšľa nad vetami...</span>`;

    let avoidSentences = (state.usedSenseiSentences || []).slice(-10).join(" | ");

    let prompt = `Si učiteľ japončiny. Vygeneruj ${count} krátkych viet na preklad do japončiny. 
    Používaj len slová: ${allowedWords}. Nepoužívaj: ${avoidSentences}. Odpovedaj LEN očíslovanými vetami v slovenčine.`;

    // TU BOL PROBLÉM - await musí byť vo vnútri async funkcie (čo tu je)
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
    document.getElementById('senseiEvalText').innerHTML = `<span style="color:var(--primary);">Sensei hodnotí...</span>`;

    let prompt = `Študent preložil: ${userAnswers}. Zadanie bolo: ${currentSenseiTask}. Zhodnoť to ako učiteľ japončiny v slovenčine.`;

    let aiResponse = await callGemini(prompt);
    if (aiResponse) {
        document.getElementById('senseiEvalText').innerText = aiResponse;
    }
}

function closeSenseiSession() {
    document.getElementById('senseiRun').classList.add('hidden');
    document.getElementById('senseiSetup').classList.remove('hidden');
}

// --- AI PREKLADAČ ---
async function translateText() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    let dir = document.getElementById('transDirection').value;
    let out = document.getElementById('transOutput');
    out.innerText = "Prekladám...";

    let prompt = `Prelož "${text}" z ${dir.split('|')[0]} do ${dir.split('|')[1]}. Uveď aj rómadži.`;

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

    let prompt = `Analyzuj japonskú vetu: "${text}". Vysvetli gramatiku a častice v slovenčine.`;

    let res = await callGemini(prompt);
    if(res) document.getElementById('aiResponse').innerText = res;
}

function playTransAudio() {
    let text = document.getElementById('transOutput').innerText;
    if(!text) return;
    let jaPart = text.split('(')[0].trim();
    playAudioText(jaPart, 'ja-JP');
}
