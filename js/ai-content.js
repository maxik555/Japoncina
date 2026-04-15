// ==========================================
// PWA: Japonský Tréning - Dódžó
// Súbor: js/ai-content.js
// Úloha: AI Čitáreň a Sensei Live (Hovory)
// Verzia: 4.1 (Interactive Translation Bubble)
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

            // Pridanie odpovede Senseia (spolu s prekladom) a jej prečítanie nahlas
            addTranscriptBubble(response.senseiResponse, 'sensei-msg', '', response.translation);
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

    // Aktualizovaný prompt pre vyžiadanie prekladu
    const promptText = isEnglish
        ? `You are Sensei, a Japanese learning app guide. Listen to the user's audio. Transcribe their spoken words in Japanese (Kanji/Kana), and then provide a friendly, encouraging Japanese response (Kanji/Kana). Format the response strictly as a valid JSON object: { "transcription": "...", "senseiResponse": "...", "translation": "..." } where 'translation' is the English translation of your senseiResponse. Maintain a natural flow of conversation for beginner to intermediate learners.`
        : `Si Sensei, sprievodca v aplikácii na učenie sa japončiny. Vypočuj si audio používateľa. Prepis ich hovorené slová do japončiny (Kandži/Kana) a potom poskytni priateľskú, povzbudivú japonskú odpoveď (Kandži/Kana). Odpoveď naformátuj striktne ako platný JSON objekt: { "transcription": "...", "senseiResponse": "...", "translation": "..." } kde 'translation' je presný slovenský preklad tvojej senseiResponse. Udržuj prirodzený tok konverzácie pre začínajúcich až mierne pokročilých študentov.`;

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

// Aktualizovaná funkcia pre podporu interaktívneho prekladu
function addTranscriptBubble(text, className, id = "", translation = "") {
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

    // Ak ide o odpoveď Senseia a máme preklad, vytvoríme klikateľnú štruktúru
    if (translation && className === 'sensei-msg') {
        bubble.style.cursor = "pointer";
        bubble.innerHTML = `
            <div style="font-size: 16px;">${text}</div>
            <div class="sensei-translation hidden" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.2); font-size: 14px; color: var(--success);">
                ${translation}
            </div>
        `;
        // Po kliknutí prepneme triedu 'hidden' (tá je definovaná v tvojom style.css)
        bubble.onclick = function() {
            const transDiv = this.querySelector('.sensei-translation');
            if (transDiv) transDiv.classList.toggle('hidden');
        };
    } else {
        bubble.innerHTML = text;
    }

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
    let isEn = window.currentLang === 'en';
    let btn = document.querySelector('#tab-stories .btn-ai');
    let contentDiv = document.getElementById('storyContent');
    let transDiv = document.getElementById('storyTranslation');
    let container = document.getElementById('storyContainer');

    if (btn) btn.innerHTML = `⏳ ${isEn ? 'Generating...' : 'Generujem...'}`;
    container.classList.remove('hidden');
    contentDiv.innerHTML = `<span style="color:var(--text-muted);">⏳ ${isEn ? 'Sensei is writing a story...' : 'Sensei pre teba píše príbeh...'}</span>`;
    transDiv.innerHTML = "";

    let unlockedWords = window.db.filter(w => w.lekcia <= (window.state.unlockedLesson || 1));
    let sampleWords = unlockedWords.sort(() => 0.5 - Math.random()).slice(0, 10).map(w => w.sk).join(", ");

    let prompt = isEn 
        ? `Write a very short, simple Japanese story (JLPT N5 level) using some of these words if possible: ${sampleWords}. Format the response strictly like this: First, write the story in Japanese. You MUST use standard HTML ruby tags for EVERY Kanji character (e.g., <ruby>水<rt>みず</rt></ruby>). Do not provide a separate Romaji version. Then add an empty line. Finally, write "TRANSLATION:" and the English translation.`
        : `Napíš veľmi krátky a jednoduchý japonský príbeh (úroveň JLPT N5). Ak je to možné, použi aj tieto slovíčka: ${sampleWords}. Odpoveď naformátuj presne takto: Najprv napíš príbeh v japončine. Pre KAŽDÝ znak Kandži MUSÍŠ použiť štandardné HTML ruby tagy pre furiganu (napríklad <ruby>水<rt>みず</rt></ruby>). Nevytváraj už oddelenú Romadži verziu. Potom vynechaj prázdny riadok. Nakoniec napíš "PREKLAD:" a slovenský preklad príbehu. Nepoužívaj Markdown hviezdičky.`;

    let aiResponse = await window.callGemini(prompt);
    
    if (btn) btn.innerHTML = isEn ? "GENERATE NEW STORY" : "GENEROVAŤ NOVÝ PRÍBEH";

    if (aiResponse) {
        let splitText = aiResponse.split(/(?:PREKLAD:|TRANSLATION:)/i);
        let rawStory = splitText[0] ? splitText[0].trim() : "Chyba generovania.";
        let transPart = splitText[1] ? splitText[1].trim().replace(/\n/g, '<br>') : "";

        // Rozsekáme príbeh na vety podľa japonskej bodky "。"
        let storySentences = rawStory.split('。').filter(s => s.trim().length > 0);
        
        // Zabalíme každú vetu do klikateľného spanu s jemným podsvietením pri hoveri
        let interactiveStoryHtml = storySentences.map(sentence => {
            let cleanSentence = sentence.trim().replace(/\n/g, '<br>');
            return `<span onclick="window.readStorySentence(this.innerHTML)" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.borderRadius='5px'" onmouseout="this.style.background='transparent'" style="cursor: pointer; transition: 0.2s; display: inline; line-height: 2.5; padding: 2px;">${cleanSentence}。</span>`;
        }).join(' ');

        // Vytvorenie tlačidla na prečítanie celého textu
        let readAllBtn = `<button class="btn btn-outline" style="margin-bottom: 20px; width: 100%; border-color: var(--success); color: var(--success);" onclick="window.readStorySentence(document.getElementById('storyTextData').innerHTML)">🔊 ${isEn ? 'READ FULL STORY' : 'PREČÍTAŤ CELÝ PRÍBEH'}</button>`;

        contentDiv.innerHTML = `${readAllBtn}<div id="storyTextData" style="font-size: 18px;">${interactiveStoryHtml}</div>`;
        
        if (transPart) {
            transDiv.innerHTML = transPart;
            transDiv.classList.remove('hidden');
        } else {
            transDiv.classList.add('hidden');
        }
    } else {
        contentDiv.innerHTML = `❌ ${isEn ? 'Failed to generate story.' : 'Nepodarilo sa vygenerovať príbeh.'}`;
    }
};

// Funkcia na vyčistenie a prečítanie textu
window.readStorySentence = function(htmlText) {
    if (!htmlText) return;
    
    // 1. Zmaže kompletne tagy <rt> aj s ich obsahom (odstráni furiganu z čítania)
    let textWithoutFurigana = htmlText.replace(/<rt>.*?<\/rt>/gi, '');
    
    // 2. Zmaže všetky ostatné HTML tagy (ako <ruby>, <span>, <br>)
    let cleanText = textWithoutFurigana.replace(/<[^>]+>/g, '');
    
    // 3. Pošle čistý text do audio enginu
    if (typeof playAudioText === 'function') {
        playAudioText(cleanText.trim(), 'ja-JP');
    }
};
