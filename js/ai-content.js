console.log("--- ai-content.js načítané (SRS Príbehy & Live Mode) ---");

// --- 1. AI ČITÁREŇ (SRS PRÍBEHY) ---

window.generateAIStory = async function() {
    const apiKey = window.state && window.state.geminiKey;
    const storyContent = document.getElementById('storyContent');
    const storyContainer = document.getElementById('storyContainer');
    const storyTranslation = document.getElementById('storyTranslation');

    if (!apiKey) return alert("Chýba API kľúč v profile!");

    storyContainer.classList.remove('hidden');
    storyContent.innerHTML = "⏳ Sensei píše príbeh na mieru...";
    storyTranslation.innerText = "Klikni na vetu pre preklad...";

    // SRS Logika: Vyberieme top 7 slov, v ktorých robíš najviac chýb
    let stats = window.state.wordStats || {};
    let problemWords = Object.keys(stats)
        .filter(sk => stats[sk].w > 0)
        .sort((a, b) => stats[b].w - stats[a].w)
        .slice(0, 7);

    // Ak nemáš dosť chýb, pridáme náhodné odomknuté slovíčka
    if (problemWords.length < 3) {
        let unlocked = window.db.filter(w => w.lekcia <= window.state.unlockedLesson).map(w => w.sk);
        problemWords = [...new Set([...problemWords, ...unlocked.sort(() => 0.5 - Math.random()).slice(0, 5)])];
    }

    const promptText = `Si učiteľ japončiny. Vytvor krátky, pútavý príbeh (4-6 viet) pre úroveň JLPT N5.
    Príbeh musí obsahovať tieto slová: ${problemWords.join(", ")}.
    Použi prirodzenú japončinu (mix kanji, kana).
    
    Odpovedz VÝHRADNE v tomto JSON formáte:
    {
      "story": [
        {"ja": "Japonská veta", "sk": "Slovenský preklad"},
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
            const span = document.createElement('span');
            span.className = "story-word";
            span.innerText = veta.ja + " ";
            span.onclick = () => {
                storyTranslation.innerHTML = `<b>Preklad:</b> ${veta.sk}`;
                if (typeof window.playAudioText === 'function') window.playAudioText(veta.ja, 'ja-JP');
            };
            storyContent.appendChild(span);
        });

    } catch (e) {
        console.error("Story Error:", e);
        storyContent.innerHTML = "❌ Nepodarilo sa vygenerovať príbeh. Skontroluj konzolu.";
    }
};

// --- 2. SENSEI LIVE (HLASOVÁ KONVERZÁCIA) ---

let recognition;
window.isLiveActive = false;

window.toggleLiveSensei = function() {
    const btn = document.getElementById('micBtn');
    const status = document.getElementById('liveStatus');

    if (!window.isLiveActive) {
        startListening();
    } else {
        stopListening();
    }
};

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Tvoj prehliadač nepodporuje rozpoznávanie hlasu.");

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP'; // Počúvame japončinu
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
        window.isLiveActive = true;
        document.getElementById('micBtn').classList.add('active');
        document.getElementById('liveStatus').innerText = "Počúvam (hovor po japonsky)...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        addLiveMessage("Ty", transcript, "var(--text)");
        processLiveResponse(transcript);
    };

    recognition.onerror = (e) => {
        console.error("Speech Error:", e);
        stopListening();
    };

    recognition.onend = () => {
        if (window.isLiveActive) recognition.start(); // Automatický restart pre plynulosť
    };

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

    const promptText = `Si konverzačný partner v japončine (Sensei). 
    Používateľ povedal: "${userInput}".
    Odpovedz krátko a prirodzene po japonsky (1 veta). 
    Potom pridaj do zátvorky rómadži a slovenský preklad.
    Príklad: "こんにちは！ (Konnichiwa! - Ahoj!)"`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text.trim();

        // Extrahujeme čistú japončinu pre zvuk (pred prvou zátvorkou)
        const jaText = aiResponse.split('(')[0].trim();
        
        addLiveMessage("Sensei", aiResponse, "var(--primary)");
        
        // Sensei prehovorí
        if (typeof window.playAudioText === 'function') {
            window.playAudioText(jaText, 'ja-JP');
        }

    } catch (e) {
        console.error("Live AI Error:", e);
    }
}

function addLiveMessage(sender, text, color) {
    const container = document.getElementById('liveTranscript');
    const msg = document.createElement('div');
    msg.style.marginBottom = "10px";
    msg.innerHTML = `<b style="color:${color}">${sender}:</b> ${text}`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}
