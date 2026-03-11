console.log("--- sensei.js načítané ---");

let currentSenseiTask = "";
let chatHistory = []; 

// Hlavná funkcia na volanie Gemini API
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
            // Odstránime hviezdičky pre čistý dizajn
            return text.replace(/\*/g, "");
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

    // 1. Náhodný výber max 15 slovíčok pre inšpiráciu (aby sme nepreplnili prompt)
    let sampleWords = wordPool.sort(() => 0.5 - Math.random())
                              .slice(0, 15)
                              .map(w => w.sk)
                              .join(", ");

    // 2. Náhodný výber gramatiky z daných lekcií pre nastavenie náročnosti
    let grammarPool = (window.grammarDb || []).filter(g => g.lekcia >= from && g.lekcia <= to);
    let grammarHint = "";
    if (grammarPool.length > 0) {
        let sampleGrammar = grammarPool.sort(() => 0.5 - Math.random())
                                       .slice(0, 3)
                                       .map(g => g.sk)
                                       .join(" | ");
        grammarHint = `Ako inšpiráciu pre zložitosť gramatiky si pozri tieto vety, ktoré študent už ovláda: "${sampleGrammar}".`;
    }

    // Reset UI
    document.getElementById('senseiSetup').classList.add('hidden');
    document.getElementById('senseiRun').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
    document.getElementById('senseiUserInput').disabled = false;
    document.getElementById('senseiUserInput').value = "";
    document.getElementById('btnSenseiSubmit').classList.remove('hidden');
    document.getElementById('senseiTaskText').innerHTML = `<span style="color:var(--ai-glow);">Sensei pre teba vymýšľa komplexné vety... 🎋</span>`;

    let avoidSentences = (window.state.usedSenseiSentences || []).slice(-10).join(" | ");

    // 3. Nový, inteligentnejší prompt
    let prompt = `Si priateľský, ale náročný učiteľ japončiny. Vygeneruj presne ${count} zmysluplných a prirodzených viet na preklad zo slovenčiny do japončiny.
    Študent momentálne trénuje lekcie ${from} až ${to}, čo zodpovedá úrovni JLPT N5 až N4.
    
    Tvoje pravidlá:
    1. Vety NESMÚ byť len jednoduché trojslovné spojenia (napr. nie "Ja som študent" alebo "Mám jablko").
    2. Používaj rozvité vety, súvetia, spájaj myšlienky pomocou spojok (pretože, ale, a), používaj príslovky času a miesta.
    3. Zakomponuj do viet niektoré z týchto slovíčok (vyber si len tie, ktoré sa ti hodia): ${sampleWords}.
    4. ${grammarHint}
    5. Vyhni sa týmto vetám, tie už prekladal: ${avoidSentences}. 
    6. Odpovedaj LEN očíslovaným zoznamom viet v slovenčine. Nepíš žiadny iný text, žiadne úvody ani závery.
    7. ZÁKAZ používať hviezdičky (**) alebo iné formátovanie.`;

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
    document.getElementById('senseiEvalText').innerHTML = `<span style="color:var(--ai-glow);">Sensei analyzuje tvoju gramatiku a kandži... 🧐</span>`;

    let prompt = `Si môj priateľský sensei, tykáš mi. 
    Zadanie, ktoré som mal preložiť, bolo:
    "${currentSenseiTask}"
    
    Môj japonský preklad je:
    "${userAnswers}"
    
    Tvoja úloha:
    1. Dôkladne skontroluj gramatiku, častice (ha/ga/wo/ni/de) a výber slov.
    2. Ak sú moje vety dokonalé, len ma krátko a milo pochváľ a pridaj emoji.
    3. Ak tam sú chyby, rozpíš mi pre každú vetu, čo som spravil zle a vysvetli mi to ľudsky a pochopiteľne. Ukáž mi aj správny japonský preklad (Kandži + Hiragana + Romaji).
    4. ABSOLÚTNE nepoužívaj hviezdičky (**) ani tučné písmo. Všetko píš čistým textom.`;
    
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

    let prompt = `Prelož text "${text}" z ${dir.split('|')[0]} do ${dir.split('|')[1]}. 
    Uveď japonský zápis (kandži/kana) a pod to rómadži. Nepoužívaj hviezdičky ani markdown formátovanie.`;

    let res = await window.callGemini(prompt);
    if(res) {
        out.innerText = res;
        document.getElementById('btnTransAudio').classList.remove('hidden');
    }
};

window.analyzeWithAI = async function() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    
    document.getElementById('aiResponse').innerHTML = "⏳ Sensei rozoberá vetu na kúsky...";
    document.getElementById('overlayAI').style.display = 'flex';

    let prompt = `Analyzuj túto japonskú vetu: "${text}". 
    Vysvetli význam jednotlivých slov, prelož ich, vysvetli použité častice a gramatiku. 
    Všetko vysvetľuj v slovenčine, buď stručný a zrozumiteľný. Nepoužívaj hviezdičky (**) v texte.`;

    let res = await window.callGemini(prompt);
    if(res) document.getElementById('aiResponse').innerText = res;
};

window.playTransAudio = function() {
    let text = document.getElementById('transOutput').innerText;
    if(!text) return;
    // Výber japonskej časti
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

    let prompt = `Si priateľský a povzbudivý učiteľ japončiny (Sensei). Tykáš mi. 
    Odpovedaj stručne a k veci. Ak sa pýtam na niečo iné ako japončinu, diplomaticky ma vráť k téme učenia.
    ZÁKAZ používať hviezdičky (**) alebo iné formátovanie.
    
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
