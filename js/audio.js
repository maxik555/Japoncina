// --- AUDIO ENGINE ---
let japaneseVoice = null; 

function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    japaneseVoice = voices.find(v => v.lang.includes('ja-JP') && v.name.includes('Female')) || 
                    voices.find(v => v.lang.includes('ja-JP'));
}

if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

function playAudioText(text, lang = 'ja-JP') {
    if (!text) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = lang;
    speech.rate = lang === 'ja-JP' ? 0.9 : 1.0;
    if (lang === 'ja-JP' && japaneseVoice) speech.voice = japaneseVoice;
    window.speechSynthesis.speak(speech);
}
