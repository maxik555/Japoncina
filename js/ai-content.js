// ==========================================
// PWA: Japonský Tréning - Dódžó
// Súbor: js/ai-content.js
// Úloha: AI Čitáreň a Sensei Live (Hovory)
// Verzia: 3.0 (MediaRecorder + Gemini Multimodal Audio)
// ==========================================

// --- Globálne premenné pre nahrávanie ---
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioStream = null;

// --- Inicializácia pri načítaní stránky ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ AI Content modul načítaný.");
    initRecordingControls();
    // Možná inicializácia Čitárne tu, ak je potrebná
});

// ==========================================
// 🎙️ SENSEI LIVE (Knižnica "Hovory")
// ==========================================

// Inicializácia ovládacích prvkov pre nahrávanie
function initRecordingControls() {
    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) return; // Ak nie sme na karte Hovory

    micBtn.addEventListener('click', toggleRecording);
}

// Funkcia na prepínanie nahrávania (štart/stop)
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

// Spustenie nahrávania
async function startRecording() {
    const micBtn = document.getElementById('mic-btn');
    const statusText = document.getElementById('chat-status');

    try {
        // Požiadanie o prístup k mikrofónu
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' }); // WebM je dobrý pre Gemini

        audioChunks = []; // Vyčistiť predošlé nahrávky
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        // Keď sa nahrávanie zastaví, spracuj audio
        mediaRecorder.onstop = processRecordedAudio;

        mediaRecorder.start();
        isRecording = true;

        // UI Aktualizácia (napr. pulzovanie)
        micBtn.classList.add('recording');
        statusText.innerText = getTranslation('chat_status_listening'); // "Počúvam..." alebo "Listening..."

    } catch (err) {
        console.error("⛔ Chyba pri prístupe k mikrofónu:", err);
        statusText.innerText = getTranslation('chat_status_mic_error'); // "Chyba mikrofónu"
        alert("⛔ Pre tento režim je potrebný prístup k mikrofónu. Povoľ ho v nastaveniach prehliadača.");
    }
}

// Zastavenie nahrávania
function stopRecording() {
    if (!mediaRecorder) return;

    const micBtn = document.getElementById('mic-btn');
    const statusText = document.getElementById('chat-status');

    mediaRecorder.stop();
    isRecording = false;

    // Zastavenie streamu, aby zhasla ikonka mikrofónu v prehliadači
    audioStream.getTracks().forEach(track => track.stop());

    // UI Aktualizácia
    micBtn.classList.remove('recording');
    statusText.innerText = getTranslation('chat_status_processing'); // "Spracovávam..." nebo "Processing..."
}

// Hlavná funkcia na spracovanie audia a odoslanie do Gemini
async function processRecordedAudio() {
    const chatWindow = document.getElementById('chat-window');
    
    // Vytvorenie blobu zo zvuku
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });

    if (audioBlob.size === 0) {
        console.error("⛔ Prázdna nahrávka.");
        updateChatStatus('chat_status_ready'); // "Pripravený na rozhovor..."
        return;
    }

    // Pridanie 'loading' bubliny pre používateľa (zatiaľ bez textu)
    const userBubble = addUserBubble('', true); // text, isAudioLoading

    try {
        // 1. Konverzia blobu na base64 (potrebné pre Gemini API)
        const base64Audio = await blobToBase64(audioBlob);

        // 2. Volanie Gemini API s audiom
        const response = await callGeminiWithAudio(base64Audio);

        if (response && response.transcription && response.senseiResponse) {
            // 3. Aktualizácia používateľskej bubliny s prepisom hlasu
            updateBubble(userBubble, response.transcription);

            // 4. Pridanie odpovede Senseia a jej prečítanie
            addSenseiBubble(response.senseiResponse);
            speakResponse(response.senseiResponse); // Hlasový výstup

            updateChatStatus('chat_status_ready'); // Pripravený na ďalšie hovorenie
        } else {
            throw new Error("⛔ Gemini API nevrátilo platné dáta.");
        }

    } catch (err) {
        console.error("⛔ Chyba pri spracovaní audia:", err);
        updateBubble(userBubble, "⛔ Nepodarilo sa spracovať tvoj hlas.");
        updateChatStatus('chat_status_ready');
    }
}

// --- Pomocné funkcie pre Sensei Live ---

// Prevod Blob na Base64 (Gemini vyžaduje čistý base64 reťazec)
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1]; // Odstrániť 'data:audio/...;base64,' prefix
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Hlavná funkcia na volanie Gemini API s audiom
async function callGeminiWithAudio(base64Audio) {
    // ⚠️ POZOR: V produkcii by mali byť API kľúče zabezpečené! (napr. Firebase Cloud Functions alebo proxy)
    const API_KEY = window.state?.config?.geminiKey || localStorage.getItem('geminiKey'); // Načítaj kľúč
    if (!API_KEY) {
        console.error("⛔ Chýba Gemini API kľúč.");
        return null;
    }

    const currentLang = document.documentElement.lang;
    const isEnglish = currentLang === 'en';

    // Multimodálny Prompt - pýtame sa Gemini na prepis a odpoveď v jednom kroku
    const promptText = isEnglish
        ? `You are Sensei, a Japanese learning app guide. Listen to the user's audio. Transcribe their spoken words in Japanese (Kanji/Kana), and then provide a friendly, encouraging Japanese response (Kanji/Kana). Format the response as a JSON object: { \"transcription\": \"...\", \"senseiResponse\": \"...\" }. Maintain a natural flow of conversation for beginner to intermediate learners.`
        : `Si Sensei, sprievodca v aplikácii na učenie sa japončiny. Vypočuj si audio používateľa. Prepis ich hovorené slová do japončiny (Kandži/Kana) a potom poskytni priateľskú, povzbudivú japonskú odpoveď (Kandži/Kana). Odpoveď naformátuj ako JSON objekt: { \"transcription\": \"...\", \"senseiResponse\": \"...\" }. Udržuj prirodzený tok konverzácie pre začínajúcich až mierne pokročilých študentov.`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: promptText },
                    {
                        inlineData: {
                            mimeType: 'audio/webm;codecs=opus', // Musí sa zhodovať s MediaRecorder!
                            data: base64Audio
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            // Konfigurujeme JSON výstup, aby sme ho mohli ľahko parsovať
            response_mime_type: "application/json"
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("⛔ Chyba Gemini API:", response.status, errorBody);
            throw new Error(`⛔ Gemini API chyba: ${response.status}`);
        }

        const data = await response.json();
        // Vytiahnutie vygenerovaného JSON textu
        const jsonText = data.candidates[0].content.parts[0].text;
        // Parsovanie na objekt
        const parsedResponse = JSON.parse(jsonText);

        return parsedResponse; // Vráti { transcription, senseiResponse }

    } catch (err) {
        console.error("⛔ Volanie callGeminiWithAudio zlyhalo:", err);
        return null;
    }
}

// Funkcia na Text-to-Speech (Čítanie odpovede Senseia)
function speakResponse(japaneseText) {
    if (!('speechSynthesis' in window)) {
        console.warn("⚠️ Tento prehliadač nepodporuje Speech Synthesis.");
        return;
    }

    // Cancel previous speech if still talking
    speechSynthesis.cancel();

    // Vyčistiť text od furigany (rubi tagy) a ďalších pomocných znakov, ak tam sú
    // Prečítame len Kandži/Kana
    const cleanText = japaneseText.replace(/<[^>]*>/g, '').replace(/\|/g, ' '); 

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP'; // Nastaviť japončinu
    utterance.pitch = 1.0;
    utterance.rate = 1.1; // Mierne rýchlejšie pre plynulosť

    // Skús nájsť dobrý japonský hlas, ak je k dispozícii
    const voices = speechSynthesis.getVoices();
    const jaVoice = voices.find(voice => voice.lang === 'ja-JP' || voice.lang === 'ja_JP');
    if (jaVoice) {
        utterance.voice = jaVoice;
    }

    speechSynthesis.speak(utterance);
}

// --- UI Pomocné funkcie pre Chat ---
function updateChatStatus(translationKey) {
    const statusText = document.getElementById('chat-status');
    if (statusText) {
        statusText.innerText = getTranslation(translationKey);
    }
}

function addUserBubble(text, isAudioLoading = false) {
    const chatWindow = document.getElementById('chat-window');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user-bubble';

    if (isAudioLoading) {
        bubble.classList.add('audio-loading');
        // Pridať spinner alebo puls, kým čakáme
        bubble.innerHTML = `<span class="dot-flashing"></span>`;
    } else {
        bubble.innerText = text;
    }

    chatWindow.appendChild(bubble);
    scrollChatToEnd();
    return bubble;
}

function addSenseiBubble(text) {
    const chatWindow = document.getElementById('chat-window');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble sensei-bubble';
    bubble.innerText = text; // Gemini vráti len text (nevieme o furigane)
    chatWindow.appendChild(bubble);
    scrollChatToEnd();
}

// Aktualizácia existujúcej bubliny (napr. zmeníme spinner na text)
function updateBubble(bubble, text) {
    if (bubble) {
        bubble.classList.remove('audio-loading');
        bubble.innerHTML = '';
        bubble.innerText = text;
    }
}

function scrollChatToEnd() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

// --- Jazyková mutácia (getTranslation - predpokladám, že je implementované v ui.js) ---
// Ak nemáš globálnu funkciu getTranslation, tu je fallback
function getTranslation(key) {
    if (window.ui?.getTranslation) {
        return window.ui.getTranslation(key);
    }

    // Fallback databáza, ak ui.js nie je pripravené
    const fallbackTranslations = {
        sk: {
            chat_status_ready: "Pripravený na rozhovor...",
            chat_status_listening: "Počúvam...",
            chat_status_processing: "Spracovávam...",
            chat_status_mic_error: "⛔ Chyba mikrofónu"
        },
        en: {
            chat_status_ready: "Ready to talk...",
            chat_status_listening: "Listening...",
            chat_status_processing: "Processing...",
            chat_status_mic_error: "⛔ Mic Error"
        }
    };
    const lang = document.documentElement.lang || 'sk';
    return fallbackTranslations[lang][key] || key;
}

// ==========================================
// 📖 AI ČITÁREŇ (Zostáva zo starej verzie)
// ==========================================

// Tu bude tvoja pôvodná logika pre Čitáreň (generovanie príbehov s furiganou).
// Keďže sme ju teraz neriešili, nechávam tu placeholder.

async function generateAIStory(topic) {
    console.log("🛠️ AI Čitáreň pre tému:", topic);
    // Pôvodná logika...
}

