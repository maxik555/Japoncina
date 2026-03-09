// --- AUDIO ENGINE ---
let japaneseVoice = null; 

function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    // Firefox má hlasy často pod názvom "Microsoft Ichiro" alebo "Google 日本語"
    japaneseVoice = voices.find(v => v.lang.includes('ja')) || 
                    voices.find(v => v.name.toLowerCase().includes('japanese'));
    
    if (japaneseVoice) console.log("Japonský hlas načítaný:", japaneseVoice.name);
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function playAudioText(text, lang = 'ja-JP') {
    if (!text) return;
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = lang;
    
    // Ak sme našli hlas, priradíme ho, inak necháme systém, nech sa snaží
    if (japaneseVoice) {
        speech.voice = japaneseVoice;
    }
    
    speech.rate = 0.85; 
    window.speechSynthesis.speak(speech);
}
