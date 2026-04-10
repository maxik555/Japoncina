console.log("--- sensei.js načítané (Master v4.9 - API Key Fix) ---");

let currentSenseiTask = "";
let chatHistory = []; 

window.callGemini = async function(promptText) {
    if (!window.state || !window.state.geminiKey) {
        const userInput = prompt("Zadaj svoj Gemini API kľúč / Enter Gemini API Key:");
        if (!userInput || userInput.trim() === "") return null;
        window.state.geminiKey = userInput.trim();
        if (typeof window.saveState === 'function') window.saveState();
    }
    const key = window.state.geminiKey;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        
        // OPRAVA: Ak Gemini vráti chybu, ukážeme ju používateľovi a až potom kľúč vymažeme
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            alert("⛔ Gemini API odmietlo tvoj kľúč!\nDôvod: " + data.error.message + "\n\nKľúč bol vymazaný, pri ďalšom pokuse zadaj platný.");
            window.state.geminiKey = null;
            if (typeof window.saveState === 'function') window.saveState();
            return null;
        }
        if (data.candidates && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text.replace(/\*/g, ""); 
        }
        return null;
    } catch (error) { 
        console.error("Gemini Fetch Error:", error);
        return null; 
    }
};

window.startSenseiSession = async function() {
    let from = parseInt(document.getElementById('senseiFrom').value);
    let to = parseInt(document.getElementById('senseiTo').value);
    let count = parseInt(document.getElementById('senseiCount').value) || 3;
    if (from > to) [from, to] = [to, from];

    let wordPool = window.db.filter(w => w.lekcia >= from && w.lekcia <= to);
    if (wordPool.length === 0) return;

    let isEn = window.currentLang === 'en';
    let sampleWords = wordPool.sort(() => 0.5 - Math.random()).slice(0, 30).map(w => isEn && w.en ? w.en : w.sk).join(", ");

    document.getElementById('senseiSetup').classList.add('hidden');
    document.getElementById('senseiRun').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
    document.getElementById('senseiUserInput').disabled = false;
    document.getElementById('senseiUserInput').value = "";
    document.getElementById('btnSenseiSubmit').classList.remove('hidden');
    document.getElementById('senseiTaskText').innerHTML = `<span style="color:var(--ai-glow);">⏳ ${isEn ? 'Sensei is generating task...' : 'Sensei pre teba vymýšľa zadanie...'} 🎋</span>`;

    let prompt = isEn 
        ? `Act as a friendly Japanese teacher. Prepare exactly ${count} meaningful sentences for translation from English to Japanese. Use these words: ${sampleWords}. Provide a numbered list without stars.`
        : `Správaj sa ako priateľský učiteľ japončiny. Priprav presne ${count} zmysluplných viet na preklad zo slovenčiny do japončiny. Použi tieto slová: ${sampleWords}. Daj to ako očíslovaný zoznam bez hviezdičiek.`;

    let aiResponse = await window.callGemini(prompt);
    if (aiResponse) {
        currentSenseiTask = aiResponse;
        document.getElementById('senseiTaskText').innerText = aiResponse;
    }
};

window.submitToSensei = async function() {
    let userAnswers = document.getElementById('senseiUserInput').value.trim();
    if (!userAnswers) return;

    let isEn = window.currentLang === 'en';
    document.getElementById('senseiUserInput').disabled = true;
    document.getElementById('btnSenseiSubmit').classList.add('hidden');
    document.getElementById('senseiEvaluation').classList.remove('hidden');
    document.getElementById('senseiEvalText').innerHTML = `<span style="color:var(--ai-glow);">🍵 ${isEn ? 'Sensei is evaluating...' : 'Sensei hodnotí tvoj preklad...'}</span>`;

    let prompt = isEn
        ? `You are my friendly Japanese Sensei. Here is the task you gave me: "${currentSenseiTask}". Here is my translation: "${userAnswers}". Evaluate it kindly in English. Correct my mistakes. Don't use star formatting.`
        : `Si môj priateľský Sensei japončiny. Zadanie: "${currentSenseiTask}". Môj preklad: "${userAnswers}". Ohodnoť ho milo po slovensky. Oprav chyby a vysvetli. Nepoužívaj formátovanie hviezdičkami.`;
    
    let aiResponse = await window.callGemini(prompt);
    if (aiResponse) document.getElementById('senseiEvalText').innerText = aiResponse;
};

window.closeSenseiSession = function() {
    document.getElementById('senseiRun').classList.add('hidden');
    document.getElementById('senseiSetup').classList.remove('hidden');
    document.getElementById('senseiEvaluation').classList.add('hidden');
};

window.translateText = async function() {
    let text = document.getElementById('transInput').value.trim();
    if(!text) return;
    let dir = document.getElementById('transDirection').value;
    let out = document.getElementById('transOutput');
    let isEn = window.currentLang === 'en';
    out.innerText = "⏳...";
    
    let sourceLang = dir.split('|')[0] === 'sk' ? (isEn ? 'English' : 'Slovak') : 'Japanese';
    let targetLang = dir.split('|')[1] === 'sk' ? (isEn ? 'English' : 'Slovak') : 'Japanese';
    
    let prompt = `Translate "${text}" from ${sourceLang} to ${targetLang}. Provide Japanese script and Romaji below it. No stars.`;
    let res = await window.callGemini(prompt);
    if(res) { out.innerText = res; document.getElementById('btnTransAudio')?.classList.remove('hidden'); }
};

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
    
    let isEn = window.currentLang === 'en';
    chatHistory.push(`Student: ${msgText}`);
    if (chatHistory.length > 8) chatHistory.shift(); 
    window.addChatMessage("...", 'sensei-msg', 'typing-indicator');

    let prompt = isEn
        ? `Act as a friendly Japanese teacher. Reply naturally in English. History: ${chatHistory.join("\n")} Sensei:`
        : `Správaj sa ako priateľský učiteľ japončiny. Odpovedaj po slovensky. História: ${chatHistory.join("\n")} Sensei:`;

    let aiResponse = await window.callGemini(prompt);
    const typingInd = document.getElementById('typing-indicator');
    if (typingInd) typingInd.remove();
    if (aiResponse) {
        window.addChatMessage(aiResponse, 'sensei-msg');
        chatHistory.push(`Sensei: ${aiResponse}`);
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
