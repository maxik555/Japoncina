// --- UI A JAZYKOVÁ LOGIKA ---
function switchTab(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + t).classList.add('active');
    const btn = document.getElementById('btnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.add('active');
    if (t === 'train' || t === 'learn' || t === 'sensei') populateSelects();
}

function setLang(lang) {
    currentLang = lang; 
    localStorage.setItem('finale_lang', lang);
    
    if(document.getElementById('flag-sk')) document.getElementById('flag-sk').className = lang === 'sk' ? '' : 'inactive'; 
    if(document.getElementById('flag-en')) document.getElementById('flag-en').className = lang === 'en' ? '' : 'inactive';
    
    document.querySelectorAll('[data-sk], [data-en]').forEach(el => { 
        if(el.hasAttribute('data-' + lang)) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.setAttribute('placeholder', el.getAttribute(`data-${lang}`));
            } else {
                el.innerHTML = el.getAttribute(`data-${lang}`); 
            }
        }
    });
    
    if (db.length > 0) populateSelects();
    updateUI(); 
}

function closeOverlay(id) { 
    document.getElementById(id).style.display = 'none'; 
}

function normalizeString(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[\s\-\!\?\,\.\"\']/g, "").trim();
}
