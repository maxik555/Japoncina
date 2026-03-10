// --- AI SENSEI & AI PREKLADAČ ---

let currentSenseiTask = "";

async function callGemini(promptText) {
    // 1. Skontrolujeme, či už máme kľúč v profile (v cloude)
    if (!state.geminiKey) {
        const userInput = prompt("Zadaj svoj nový Gemini API kľúč (bezpečne sa uloží len do tvojho profilu):");
        
        if (!userInput || userInput.trim() === "") {
            alert("Bez API kľúča Sensei nemôže fungovať.");
            return null;
        }
        
        // Uložíme kľúč do stavu a odošleme do tvojej Firebase databázy
        state.geminiKey = userInput.trim();
        saveState();
    }

    const key = state.geminiKey;

    try {
        // Použijeme štandardnú adresu, problém bol v zablokovanom kľúči, nie v modeli
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

        // Ak API vráti chybu (napr. zlý alebo zablokovaný kľúč)
        if (data.error) {
            alert("Sensei API Error: " + data.error.message);
            // Ak je kľúč neplatný (400) alebo zakázaný (403), vymažeme ho z profilu
            if (data.error.code === 400 || data.error.code === 403) {
                state.geminiKey = null;
                saveState();
            }
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

// Nové inštrukcie pre Senseia - priateľský, bez formátovania a stručný
    let prompt = `Si môj priateľský učiteľ japončiny. Tykaj mi. 
    Zadanie na preklad bolo: "${currentSenseiTask}". 
    Môj preklad je: "${userAnswers}". 
    
    Tvoja úloha:
    1. ABSOLÚTNE ZAKAZUJEM používať formátovanie ako hviezdičky (**) alebo tučné písmo. Tvoj text musí byť čistý.
    2. Ak je môj preklad ÚPLNE SPRÁVNY, len ma krátko pochváľ (napr. "Super, máš to na 100% ✅") a už NIČ iné nevysvetľuj.
    3. Ak mám chybu, vysvetli mi ju jednoducho, stručne a ľudsky, ako kamošovi. 
    4. Použi zopár emoji pre lepšiu náladu.`;
    
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

// --- GLOBAL SENSEI CHAT ---
let chatHistory = []; // Sem si budeme ukladať kontext konverzácie

function toggleSenseiChat() {
    const chatWindow = document.getElementById('senseiChatWindow');
    if (chatWindow.classList.contains('hidden')) {
        chatWindow.classList.remove('hidden');
    } else {
        chatWindow.classList.add('hidden');
    }
}

async function sendChatMessage() {
    const inputField = document.getElementById('senseiChatInput');
    const msgText = inputField.value.trim();
    if (!msgText) return;

    // 1. Zobrazíme tvoju správu
    addChatMessage(msgText, 'user-msg');
    inputField.value = "";

    // 2. Pridáme ju do pamäte pre AI (uchováme len posledných 6 správ, aby sme ju nepreťažili)
    chatHistory.push(`Študent: ${msgText}`);
    if (chatHistory.length > 6) chatHistory.shift(); 

    // 3. Zobrazíme, že Sensei "píše..."
    addChatMessage("Sensei premýšľa... ⏳", 'sensei-msg', 'typing-indicator');

    // 4. Poskladáme zadanie vrátane histórie
    let prompt = `Si priateľský učiteľ japončiny. Tykáš mi. Odpovedaj LEN na otázky týkajúce sa japončiny, gramatiky alebo japonskej kultúry. ABSOLÚTNE NEPOUŽÍVAJ formátovanie ako hviezdičky (**). Buď stručný, ľudský a nápomocný.
    
    Tu je história našej doterajšej konverzácie:
    ${chatHistory.join("\n")}
    
    Učiteľ (tvoja odpoveď):`;

    // 5. Zavoláme Gemini (použije tvoj už hotový callGemini systém)
    let aiResponse = await callGemini(prompt);

    // 6. Odstránime indikátor "píše..."
    const typingInd = document.getElementById('typing-indicator');
    if (typingInd) typingInd.remove();

    // 7. Zobrazíme odpoveď
    if (aiResponse) {
        // Pre istotu vymažeme hviezdičky, ak by ich tam AI náhodou dala
        aiResponse = aiResponse.replace(/\*\*/g, ""); 
        addChatMessage(aiResponse, 'sensei-msg');
        chatHistory.push(`Učiteľ: ${aiResponse}`);
    } else {
        addChatMessage("Prepáč, niečo sa mi pomiešalo v hlave. Skús to znova.", 'sensei-msg');
    }
}

function addChatMessage(text, className, id = "") {
    const chatBox = document.getElementById('senseiChatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${className}`;
    if (id) msgDiv.id = id;
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    // Automatické scrollovanie dole
    chatBox.scrollTop = chatBox.scrollHeight;
}
