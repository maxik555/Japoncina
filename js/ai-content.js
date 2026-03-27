// ==========================================
// PWA: Japonský Tréning - Dódžó
// Súbor: js/ai-content.js
// Úloha: AI Čitáreň a Sensei Live (Hovory)
// Verzia: 4.0 (Plná integrácia na index.html)
// ==========================================

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioStream = null;
window.isLiveActive = false; // Na sledovanie stavu okna pri prepínaní tabov

// ==========================================
// 🎙️ SENSEI LIVE (Knižnica "Hovory")
// ==========================================

window.toggleLiveSensei = async function() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
};

async function startRecording() {
    const micBtn = document.getElementById('micBtn');
    const statusText = document.getElementById('liveStatus');

    try {
        // Vyžiadanie prístupu k mikrofónu
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });

        audioChunks = [];
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = processRecordedAudio;
        mediaRecorder.start();
        isRecording = true;
        window.isLiveActive = true;

        // V style.css má trieda .active nastavené pulzovanie pre mikrofón
        micBtn.classList.add('active'); 
        
        let isEn = window.currentLang === 'en';
        statusText.innerText = isEn ? "Listening..." : "Počúvam...";
        statusText.style.color = "var(--danger)";

    } catch (err) {
        console.error("⛔ Chyba mikrofónu:", err);
        let isEn = window.currentLang === 'en';
        statusText.innerText = isEn ? "⛔ Mic Error" : "⛔ Chyba mikrofónu";
        alert(isEn ? "Microphone access is required." : "Pre tento režim je potrebný prístup k mikrofónu. Povoľ ho v prehliadači.");
    }
}

function stopRecording() {
    if (!mediaRecorder) return;

    const micBtn = document.getElementById('micBtn');
    const statusText = document.getElementById('liveStatus');

    mediaRecorder.stop();
    isRecording = false;
    
    // Zastavenie streamu na úrovni hardvéru (zhasne ikonka v prehliadači)
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
    }

    micBtn.classList.remove('active');
    let isEn = window.currentLang === 'en';
    statusText.innerText = isEn ? "Processing..." : "Spracovávam...";
    statusText.style.color = "var(--primary)";
}

async function processRecordedAudio() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
    let isEn = window.currentLang === 'en';

    if (audioBlob.size === 0) {
        updateLiveStatus(isEn ? "Ready to talk..." : "Pripravený na rozhovor...");
        return;
    }

    // Pridanie 'loading' bubliny pre používateľa (využívame tvoj CSS spinner z indexu)
    const userBubbleId = "msg-" + Date.now();
    const spinnerHtml = `<div class="spinner" style="width:15px; height:15px; border-width:2px; margin:0; display:inline-block; border-top-color:white;"></div>`;
    addTranscriptBubble(spinnerHtml, 'user-msg', userBubbleId);

    try {
        const base64Audio = await blobToBase64(audioBlob);
        const response = await callGeminiWithAudio(base64Audio);

        if (response && response.transcription && response.senseiResponse) {
            // Aktualizácia používateľskej bubliny s prepisom hlasu
            updateTranscriptBubble(userBubbleId, response.transcription);

            // Pridanie odpovede Senseia a jej prečítanie nahlas
            addTranscriptBubble(response.senseiResponse, 'sensei-msg');
            speakResponse(response.senseiResponse);

            updateLiveStatus(isEn ? "Ready to talk..." : "Pripravený na rozhovor...");
        } else {
            throw new Error("⛔ Gemini API nevrátilo platné dáta.");
        }

    } catch (err) {
        console.error("⛔ Chyba pri spracovaní audia:", err);
        updateTranscriptBubble(userBubbleId, "⛔ " + (isEn ? "Failed to process audio." : "Nepodarilo sa spracovať tvoj hlas."));
        updateLiveStatus(isEn ? "Ready to talk..." : "Pripravený na rozhovor...");
    }
}

// --- Pomocné funkcie pre Sensei Live ---

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function callGeminiWithAudio(base64Audio) {
    // Overenie prítomnosti API kľúča (rovnaká logika ako v sensei.js)
    if (!window.state || !window.state.geminiKey) {
        const userInput = prompt("Zadaj svoj Gemini API kľúč / Enter Gemini API Key:");
        if (!userInput || userInput.trim() === "") return null;
        window.state.geminiKey = userInput.trim();
        if (typeof window.saveState === 'function') window.saveState();
    }
    
    const API_KEY = window.state.geminiKey;
    const isEnglish = window.currentLang === 'en';

    const promptText = isEnglish
        ? `You are Sensei, a Japanese learning app guide. Listen to the user's audio. Transcribe their spoken words in Japanese (Kanji/Kana), and then provide a friendly, encouraging Japanese response (Kanji/Kana). Format the response strictly as a valid JSON object: { "transcription": "...", "senseiResponse": "..." }. Maintain a natural flow of conversation for beginner to intermediate learners.`
        : `Si Sensei, sprievodca v aplikácii na učenie sa japončiny. Vypočuj si audio používateľa. Prepis ich hovorené slová do japončiny (Kandži/Kana) a potom poskytni priateľskú, povzbudivú japonskú odpoveď (Kandži/Kana). Odpoveď naformátuj striktne ako platný JSON objekt: { "transcription": "...", "senseiResponse": "..." }. Udržuj prirodzený tok konverzácie pre začínajúcich až mierne pokročilých študentov.`;

    const requestBody = {
        contents: [{
            role: "user",
            parts: [
                { text: promptText },
                { inlineData: { mimeType: 'audio/webm;codecs=opus', data: base64Audio } }
            ]
        }],
        generationConfig: { response_mime_type: "application/json" }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error("⛔ Chyba Gemini API:", response.status);
            // Ak je kľúč neplatný, vymažeme ho, aby si ho appka pri ďalšom pokuse vypýtala znova
            if(response.status === 400 || response.status === 403) {
                window.state.geminiKey = null;
                if (typeof window.saveState === 'function') window.saveState();
            }
            return null;
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);

    } catch (err) {
        console.error("⛔ Volanie callGeminiWithAudio zlyhalo:", err);
        return null;
    }
}

function speakResponse(japaneseText) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    
    // Očistenie od HTML a pomocných znakov
    const cleanText = japaneseText.replace(/<[^>]*>/g, '').replace(/\|/g, ' '); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.pitch = 1.0;
    utterance.rate = 1.1;

    // Detekcia tvojho globálneho japonského hlasu z audio.js, ak je načítaný
    if (typeof japaneseVoice !== 'undefined' && japaneseVoice) {
        utterance.voice = japaneseVoice;
    } else {
        const voices = speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
        if (jaVoice) utterance.voice = jaVoice;
    }

    speechSynthesis.speak(utterance);
}

// --- UI Pomocné funkcie pre Hovory ---

function updateLiveStatus(text) {
    const statusText = document.getElementById('liveStatus');
    if (statusText) {
        statusText.innerText = text;
        statusText.style.color = "var(--text-muted)";
    }
}

function addTranscriptBubble(text, className, id = "") {
    const transcriptWindow = document.getElementById('liveTranscript');
    if (!transcriptWindow) return;

    const bubble = document.createElement('div');
    // Využijeme tvoje existujúce štýly chatu (.msg, .user-msg, .sensei-msg)
    bubble.className = `msg ${className}`;
    bubble.style.marginBottom = "10px";
    bubble.style.display = "inline-block";
    bubble.style.clear = "both";
    bubble.style.float = className === 'user-msg' ? 'right' : 'left';
    
    if (id) bubble.id = id;
    bubble.innerHTML = text;

    // Vytvoríme obal, ktorý drží clear pre správne zarovnanie (float fix)
    const wrapper = document.createElement('div');
    wrapper.style.width = "100%";
    wrapper.style.overflow = "hidden";
    wrapper.appendChild(bubble);

    transcriptWindow.appendChild(wrapper);
    transcriptWindow.scrollTop = transcriptWindow.scrollHeight;
}

function updateTranscriptBubble(id, text) {
    const bubble = document.getElementById(id);
    if (bubble) {
        bubble.innerHTML = text;
    }
}

// ==========================================
// 📖 AI ČITÁREŇ 
// ==========================================

window.generateAIStory = async function() {
    console.log("🛠️ AI Čitáreň spustená");
    // Tu budeš môcť neskôr pridať svoju logiku pre AI Čitáreň
};
