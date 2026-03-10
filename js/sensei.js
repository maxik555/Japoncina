// --- AI SENSEI & AI PREKLADAČ (Verzia 2026 / Gemini 2.5 Flash) ---

let currentSenseiTask = "";
let chatHistory = []; 

// Hlavná funkcia na volanie Gemini API
async function callGemini(promptText) {
    if (!state.geminiKey) {
        const userInput = prompt("Zadaj svoj Gemini API kľúč (uloží sa bezpečne do tvojho profilu):");
        if (!userInput || userInput.trim() === "") {
            alert("Bez API kľúča Sensei nemôže fungovať.");
            return null;
        }
        state.geminiKey = userInput.trim();
        saveState();
    }

    const key = state.geminiKey;

    try {
        // Používame model gemini-2.5-flash podľa tvojho zadania
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            alert("Sensei API Error: " + data.error.message);
            if (data.error.code === 400 || data.error.code === 403) {
                state.geminiKey = null;
                saveState();
            }
            return null;
        }

        if (data.candidates && data.candidates[0].content) {
            let text = data.candidates[0].content.parts[0].text;
            // Globálna poistka: Odstránime všetky hviezdičky pre čistý dizajn
            return text.replace(/\*/g, "");
        }
        
        return null;
    } catch (error) {
        console.error("Network Error:", error);
        return null;
    }
}

// --- SEKCIA SENSEI (TRÉNING VIET) ---

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

    // Reset UI
    document.getElementById('senseiSetup').classList.add('hidden');
    document.getElementById('senseiRun').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
    document.getElementById('senseiUserInput').disabled = false;
    document.getElementById('senseiUserInput').value = "";
    document.getElementById('btnSenseiSubmit').classList.remove('hidden');
    document.getElementById('senseiTaskText').innerHTML = `<span style="color:var(--ai-glow);">Sensei pripravuje zadanie... 🎋</span>`;

    let avoidSentences = (state.usedSenseiSentences || []).slice(-10).join(" | ");

    // Prompt nastavený na "priateľského učiteľa"
    let prompt = `Si priateľský učiteľ japončiny. Vygeneruj ${count} krátkych a jednoduchých viet na preklad do japončiny pre svojho študenta.
    Používaj výhradne tieto slová: ${allowedWords}. Vyhni sa týmto vetám: ${avoidSentences}. 
    Odpovedaj LEN očíslovaným zoznamom viet v slovenčine. Nepoužívaj žiadne formátovanie (hviezdičky).`;

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
    document.getElementById('senseiEvalText').innerHTML = `<span style="color:var(--ai-glow);">Sensei kontroluje tvoje vedomosti... 🧐</span>`;

    let prompt = `Si môj priateľský sensei, tykáš mi. 
    Zadanie bolo: "${currentSenseiTask}". 
    Môj preklad je: "${userAnswers}". 
    
    Tvoja úloha:
    1. Skontroluj gramatiku, častice a výber slov.
    2. Ak je to na 100%, len ma krátko a milo pochváľ.
    3. Ak tam sú chyby, vysvetli ich stručne a ľudsky (ako kamoš).
    4. ABSOLÚTNE nepoužívaj hviezdičky ani tučné písmo.
    5. Použi nejaké japonské emoji.`;
    
    let aiResponse = await callGemini(prompt);
    if (aiResponse) {
        document.getElementById('senseiEvalText').innerText = aiResponse;
    }
}

function closeSenseiSession() {
    document.getElementById('senseiRun').classList.add('hidden');
    document.getElementById('senseiSetup').classList.remove('hidden');
}

// --- AI PREKLADAČ A ANALÝZA ---

async function translateText() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    let dir = document.getElementById('transDirection').value;
    let out = document.getElementById('transOutput');
    out.innerText = "Prekladám... 🏮";

    let prompt = `Prelož text "${text}" z ${dir.split('|')[0]} do ${dir.split('|')[1]}. 
    Uveď japonský zápis (kandži/kana) a pod to rómadži. Nepoužívaj hviezdičky.`;

    let res = await callGemini(prompt);
    if(res) {
        out.innerText = res;
        document.getElementById('btnTransAudio').classList.remove('hidden');
    }
}

async function analyzeWithAI() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    
    document.getElementById('aiResponse').innerHTML = "⏳ Sensei rozoberá vetu na kúsky...";
    document.getElementById('overlayAI').style.display = 'flex';

    let prompt = `Analyzuj japonskú vetu: "${text}". 
    Vysvetli význam jednotlivých slov, častíc a gramatiku v slovenčine. 
    Buď stručný a nepoužívaj žiadne hviezdičky v texte.`;

    let res = await callGemini(prompt);
    if(res) document.getElementById('aiResponse').innerText = res;
}

function playTransAudio() {
    let text = document.getElementById('transOutput').innerText;
    if(!text) return;
    // Skúsime vybrať len japonskú časť (pred zátvorkou alebo novým riadkom)
    let jaPart = text.split('\n')[0].split('(')[0].trim();
    playAudioText(jaPart, 'ja-JP');
}

// --- POP-UP CHAT SO SENSEIOM ---

function toggleSenseiChat() {
    const chatWindow = document.getElementById('senseiChatWindow');
    chatWindow.classList.toggle('hidden');
}

async function sendChatMessage() {
    const inputField = document.getElementById('senseiChatInput');
    const msgText = inputField.value.trim();
    if (!msgText) return;

    addChatMessage(msgText, 'user-msg');
    inputField.value = "";

    chatHistory.push(`Študent: ${msgText}`);
    if (chatHistory.length > 8) chatHistory.shift(); 

    addChatMessage("Sensei premýšľa... 💭", 'sensei-msg', 'typing-indicator');

    let prompt = `Si priateľský učiteľ japončiny (Sensei). Tykáš mi. 
    Odpovedaj stručne a k veci. Ak sa pýtam na niečo iné ako japončinu, diplomaticky ma vráť k téme.
    ZÁKAZ používať hviezdičky (**).
    
    História:
    ${chatHistory.join("\n")}
    
    Sensei:`;

    let aiResponse = await callGemini(prompt);

    const typingInd = document.getElementById('typing-indicator');
    if (typingInd) typingInd.remove();

    if (aiResponse) {
        addChatMessage(aiResponse, 'sensei-msg');
        chatHistory.push(`Sensei: ${aiResponse}`);
    } else {
        addChatMessage("Prepáč, stratil som niť. Skús to ešte raz, prosím. 🎋", 'sensei-msg');
    }
}

function addChatMessage(text, className, id = "") {
    const chatBox = document.getElementById('senseiChatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${className}`;
    if (id) msgDiv.id = id;
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}
