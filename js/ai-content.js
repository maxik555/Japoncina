console.log("--- ai-content.js načítané (Furigana & SRS Edition) ---");

// --- 1. AI ČITÁREŇ (PRÍBEHY S FURIGANOU) ---

window.generateAIStory = async function() {
    const apiKey = window.state && window.state.geminiKey;
    const storyContent = document.getElementById('storyContent');
    const storyContainer = document.getElementById('storyContainer');
    const storyTranslation = document.getElementById('storyTranslation');

    if (!apiKey) return alert("Chýba API kľúč v profile!");

    storyContainer.classList.remove('hidden');
    storyContent.innerHTML = "<div style='text-align:center;'>⏳ Sensei pripravuje text s furiganou...</div>";
    storyTranslation.innerText = "Klikni na vetu pre preklad...";

    // SRS Logika: Vyberieme problémové slová
    let stats = window.state.wordStats || {};
    let problemWords = Object.keys(stats)
        .filter(sk => stats[sk].w > 0)
        .sort((a, b) => stats[b].w - stats[a].w)
        .slice(0, 7);

    if (problemWords.length < 3) {
        let unlocked = window.db.filter(w => w.lekcia <= window.state.unlockedLesson).map(w => w.sk);
        problemWords = [...new Set([...problemWords, ...unlocked.sort(() => 0.5 - Math.random()).slice(0, 5)])];
    }

    // Úprava promptu pre Furiganu: Kanji[reading]
    const promptText = `Si učiteľ japončiny. Vytvor krátky príbeh (4-6 viet) pre úroveň N5.
    Použi tieto slová: ${problemWords.join(", ")}.
    DÔLEŽITÉ: Pre KAŽDÉ Kandži v texte povinne uveď jeho čítanie v hiragane do hranatých zátvoriek hneď za znakom, napríklad: 先生[せんせい] alebo 日本[にほん].
    
    Odpovedz VÝHRADNE v tomto JSON formáte:
    {
      "story": [
        {"ja": "Veta s formátom Znak[hiragana]", "sk": "Slovenský preklad"},
        ...
      ]
    }`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        const result = JSON.parse(rawText);

        storyContent.innerHTML = "";
        
        result.story.forEach(veta => {
            const p = document.createElement('p');
            p.style.marginBottom = "15px";
            p.style.cursor = "pointer";
            
            // Logika pre zmenu Kanji[reading] na HTML Ruby tagy
            // Hľadá text pred zátvorkou a text v zátvorke
            let processedJa = veta.ja.replace(/([^\u3040-\u309F\u30A0-\u30FF\u0020-\u007E]+)\[([^\]]+)\]/g, '<ruby>$1<rt style="font-size: 0.55em; color: var(--success);">$2</rt></ruby>');

            p.innerHTML = processedJa;
            p.onclick = () => {
                storyTranslation.innerHTML = `<b>Preklad:</b> ${veta.sk}`;
                if (typeof window.playAudioText === 'function') {
                    // Pre audio vyčistíme text od zátvoriek
                    let audioText = veta.ja.replace(/\[([^\]]+)\]/g, ''); 
                    window.playAudioText(audioText, 'ja-JP');
                }
            };
            storyContent.appendChild(p);
        });

    } catch (e) {
        console.error("Story Error:", e);
        storyContent.innerHTML = "❌ Senseiovi došiel atrament. Skús to o chvíľu.";
    }
};

// --- 2. SENSEI LIVE (HLASOVÁ KONVERZÁCIA) ---

let recognition;
window.isLiveActive = false;

window.toggleLiveSensei = function() {
    if (!window.isLiveActive) startListening();
    else stopListening();
};

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Tvoj prehliadač nepodporuje rozpoznávanie hlasu.");

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
        window.isLiveActive = true;
        document.getElementById('micBtn').classList.add('active');
        document.getElementById('liveStatus').innerText = "Počúvam...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        addLiveMessage("Ty", transcript, "var(--text)");
        processLiveResponse(transcript);
    };

    recognition.onend = () => { if (window.isLiveActive) recognition.start(); };
    recognition.start();
}

function stopListening() {
    window.isLiveActive = false;
    if (recognition) recognition.stop();
    document.getElementById('micBtn').classList.remove('active');
    document.getElementById('liveStatus').innerText = "Pripravený...";
}

async function processLiveResponse(userInput) {
    const apiKey = window.state && window.state.geminiKey;
    if (!apiKey) return;

    const promptText = `Si konverzačný partner Sensei. Odpovedz na: "${userInput}" krátko po japonsky. Pridaj preklad v zátvorke.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text.trim();
        const jaText = aiResponse.split('(')[0].trim();
        
        addLiveMessage("Sensei", aiResponse, "var(--primary)");
        if (typeof window.playAudioText === 'function') window.playAudioText(jaText, 'ja-JP');
    } catch (e) { console.error(e); }
}

function addLiveMessage(sender, text, color) {
    const container = document.getElementById('liveTranscript');
    const msg = document.createElement('div');
    msg.style.marginBottom = "10px";
    msg.innerHTML = `<b style="color:${color}">${sender}:</b> ${text}`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}
