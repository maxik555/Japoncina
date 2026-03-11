console.log("--- sensei.js načítané (Vylepšená osobnosť) ---");

let currentSenseiTask = "";
let chatHistory = []; 

window.callGemini = async function(promptText) {
    if (!window.state.geminiKey) {
        const userInput = prompt("Zadaj svoj Gemini API kľúč (uloží sa bezpečne do tvojho profilu):");
        if (!userInput || userInput.trim() === "") {
            alert("Bez API kľúča Sensei nemôže fungovať.");
            return null;
        }
        window.state.geminiKey = userInput.trim();
        if (typeof saveState === 'function') saveState();
    }

    const key = window.state.geminiKey;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            alert("Sensei API Error: " + data.error.message);
            if (data.error.code === 400 || data.error.code === 403) {
                window.state.geminiKey = null;
                if (typeof saveState === 'function') saveState();
            }
            return null;
        }

        if (data.candidates && data.candidates[0].content) {
            let text = data.candidates[0].content.parts[0].text;
            return text.replace(/\*/g, ""); // Čistíme hviezdičky kódom, nie kričaním na AI
        }
        
        return null;
    } catch (error) {
        console.error("Network Error:", error);
        return null;
    }
};

// --- SEKCIA SENSEI (TRÉNING VIET) ---

window.startSenseiSession = async function() {
    let from = parseInt(document.getElementById('senseiFrom').value);
    let to = parseInt(document.getElementById('senseiTo').value);
    let count = parseInt(document.getElementById('senseiCount').value) || 3;
    if (from > to) [from, to] = [to, from];

    let wordPool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to);
    if (wordPool.length === 0) {
        alert("Žiadne slová v tomto rozsahu lekcií!");
        return;
    }

    // Vyberieme viac slov (30), nech má z čoho vyberať, a posielame mu ich sk/romaji
    let sampleWords = wordPool.sort(() => 0.5 - Math.random())
                              .slice(0, 30)
                              .map(w => w.sk)
                              .join(", ");

    let grammarPool = (window.grammarDb || []).filter(g => g.lekcia >= from && g.lekcia <= to);
    let grammarHint = "";
    if (grammarPool.length > 0) {
        let sampleGrammar = grammarPool.sort(() => 0.5 - Math.random())
                                       .slice(0, 3)
                                       .map(g => g.sk)
                                       .join(" | ");
        grammarHint = `Tu je ukážka zložitejších viet, ktoré študent už ovláda, použi podobnú gramatiku: "${sampleGrammar}".`;
    }

    document.getElementById('senseiSetup').classList.add('hidden');
    document.getElementById('senseiRun').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
    document.getElementById('senseiUserInput').disabled = false;
    document.getElementById('senseiUserInput').value = "";
    document.getElementById('btnSenseiSubmit').classList.remove('hidden');
    document.getElementById('senseiTaskText').innerHTML = `<span style="color:var(--ai-glow);">Sensei pre teba vymýšľa zadanie... 🎋</span>`;

    let avoidSentences = (window.state.usedSenseiSentences || []).slice(-10).join(" | ");

    // ĽUDSKEJŠÍ PROMPT PRE ZADANIE
    let prompt = `Správaj sa ako priateľský, nadšený a mierne vtipný učiteľ japončiny (Sensei). 
    Tvoj študent si práve prešiel lekcie ${from} až ${to} (úroveň JLPT N5-N4).
    
    Priprav pre neho presne ${count} zmysluplných viet na preklad zo slovenčiny do japončiny.
    
    Tvoje pravidlá:
    1. Vety by mali byť prirodzené, občas vtipné alebo zo života (napr. o jedle, cestovaní, únave z učenia). Použi občas súvetia (pretože, ale).
    2. DÔLEŽITÉ: Snaž sa použiť PRIMÁRNE slovíčka z tohto zoznamu, aby si študent precvičil to, čo už vie: ${sampleWords}. Ak musíš pridať iné slovo, nech je to úplný základ z JLPT N5.
    3. ${grammarHint}
    4. Tieto vety už prekladal, vymysli iné: ${avoidSentences}.
    
    Začni krátkym, povzbudivým pozdravom (napríklad: "Konnichiwa! Pripravený na tréning? Tu sú tvoje vety:"). Potom napíš očíslovaný zoznam viet. Nepoužívaj hviezdičky na formátovanie.`;

    let aiResponse = await window.callGemini(prompt);
    
    if (aiResponse) {
        currentSenseiTask = aiResponse;
        document.getElementById('senseiTaskText').innerText = aiResponse;
        if(!window.state.usedSenseiSentences) window.state.usedSenseiSentences = [];
        window.state.usedSenseiSentences.push(aiResponse.substring(0, 100));
        if (typeof saveState === 'function') saveState();
    } else {
        document.getElementById('senseiTaskText').innerText = "Chyba pri spojení so Senseiom. Skús to znova.";
    }
};

window.submitToSensei = async function() {
    let userAnswers = document.getElementById('senseiUserInput').value.trim();
    if (!userAnswers) return;

    document.getElementById('senseiUserInput').disabled = true;
    document.getElementById('btnSenseiSubmit').classList.add('hidden');
    document.getElementById('senseiEvaluation').classList.remove('hidden');
    document.getElementById('senseiEvalText').innerHTML = `<span style="color:var(--ai-glow);">Sensei číta tvoj preklad a pije pri tom matchu... 🍵</span>`;

    // ĽUDSKEJŠÍ PROMPT PRE HODNOTENIE
    let prompt = `Si môj nadšený a priateľský Sensei japončiny. Tykáš mi. Vyjadruješ sa veľmi prirodzene, občas použiješ bežný hovorový výraz (napr. "Super práca!", "Paráda", "Fúha", "Skoro!").
    
    Tu je zadanie, ktoré si mi dal na preklad:
    "${currentSenseiTask}"
    
    A tu je môj japonský preklad:
    "${userAnswers}"
    
    Tvoja úloha:
    1. Ohodnoť môj preklad s empatiou a pochopením, ako skutočný učiteľ.
    2. Ak je to úplne bez chýb, riadne ma pochváľ a daj najavo nadšenie (použi nejaké fajn emoji).
    3. Ak je tam chyba (v gramatike, časticiach, výbere slov), milo ma oprav. Ukáž mi správnu verziu (Kandži + Hiragana + Romaji) a ľudskou rečou mi vysvetli prečo som spravil chybu. Netvár sa ako robot, buď ako kamoš, ktorý mi to vysvetľuje pri káve.
    4. Nepoužívaj formátovanie pomocou hviezdičiek.`;
    
    let aiResponse = await window.callGemini(prompt);
    if (aiResponse) {
        document.getElementById('senseiEvalText').innerText = aiResponse;
    }
};

window.closeSenseiSession = function() {
    document.getElementById('senseiRun').classList.add('hidden');
    document.getElementById('senseiSetup').classList.remove('hidden');
};

// --- AI PREKLADAČ A ANALÝZA ---
window.translateText = async function() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    let dir = document.getElementById('transDirection').value;
    let out = document.getElementById('transOutput');
    out.innerText = "Prekladám... 🏮";
    let prompt = `Prelož text "${text}" z ${dir.split('|')[0]} do ${dir.split('|')[1]}. Uveď japonský zápis (kandži/kana) a pod to rómadži. Nepoužívaj hviezdičky.`;
    let res = await window.callGemini(prompt);
    if(res) { out.innerText = res; document.getElementById('btnTransAudio').classList.remove('hidden'); }
};

window.analyzeWithAI = async function() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    document.getElementById('aiResponse').innerHTML = "⏳ Sensei rozoberá vetu na kúsky...";
    document.getElementById('overlayAI').style.display = 'flex';
    let prompt = `Analyzuj túto japonskú vetu: "${text}". Vysvetli význam slov, prelož ich, vysvetli častice a gramatiku. Vysvetľuj prirodzene a ľudsky v slovenčine. Nepoužívaj hviezdičky.`;
    let res = await window.callGemini(prompt);
    if(res) document.getElementById('aiResponse').innerText = res;
};

window.playTransAudio = function() {
    let text = document.getElementById('transOutput').innerText;
    if(!text) return;
    let jaPart = text.split('\n')[0].split('(')[0].trim();
    if (typeof playAudioText === 'function') playAudioText(jaPart, 'ja-JP');
};

// --- POP-UP CHAT SO SENSEIOM ---
window.toggleSenseiChat = function() {
    const chatWindow = document.getElementById('senseiChatWindow');
    if (chatWindow) chatWindow.classList.toggle('hidden');
};

window.sendChatMessage = async function() {
    const inputField = document.getElementById('senseiChatInput');
    const msgText = inputField.value.trim();
    if (!msgText) return;
    window.addChatMessage(msgText, 'user-msg');
    inputField.value = "";
    chatHistory.push(`Študent: ${msgText}`);
    if (chatHistory.length > 8) chatHistory.shift(); 
    window.addChatMessage("Sensei premýšľa... 💭", 'sensei-msg', 'typing-indicator');

    let prompt = `Si priateľský, vtipný a povzbudzujúci Sensei japončiny. Tykáš mi.
    Odpovedaj prirodzene, ako človek v chate. Smej sa, používaj emoji.
    Ak sa pýtam na veci mimo japončiny, s humorom ma vráť k učeniu.
    Nepoužívaj žiadne formátovanie pomocou hviezdičiek.
    
    História konverzácie:
    ${chatHistory.join("\n")}
    
    Sensei:`;

    let aiResponse = await window.callGemini(prompt);
    const typingInd = document.getElementById('typing-indicator');
    if (typingInd) typingInd.remove();
    if (aiResponse) {
        window.addChatMessage(aiResponse, 'sensei-msg');
        chatHistory.push(`Sensei: ${aiResponse}`);
    } else {
        window.addChatMessage("Prepáč, stratil som niť. Skús to ešte raz, prosím. 🎋", 'sensei-msg');
    }
};

window.addChatMessage = function(text, className, id = "") {
    const chatBox = document.getElementById('senseiChatMessages');
    if (!chatBox) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${className}`;
    if (id) msgDiv.id = id;
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
};
