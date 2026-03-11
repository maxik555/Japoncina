// --- UI A JAZYKOVÁ LOGIKA ---

function switchTab(t) {
    document.querySelectorAll('.tab, .btn-nav').forEach(el => el.classList.remove('active'));
    if(document.getElementById('tab-' + t)) document.getElementById('tab-' + t).classList.add('active');
    const btn = document.getElementById('btnTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.add('active');
    if (['train', 'learn', 'sensei', 'grammar'].includes(t)) populateSelects();
    if (t === 'profile') { window.renderHistory(); updateProfileStats(); }
}

function setLang(lang) {
    currentLang = lang; localStorage.setItem('finale_lang', lang);
    document.querySelectorAll('[data-sk], [data-en]').forEach(el => { 
        let txt = el.getAttribute('data-' + lang);
        if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.setAttribute('placeholder', txt);
        else el.innerHTML = txt; 
    });
    if (window.db && window.db.length > 0) populateSelects();
    if (typeof updateUI === 'function') updateUI(); 
}

function closeOverlay(id) { document.getElementById(id).style.display = 'none'; }

// --- LOGIKA PROFILU A HISTÓRIE ---

function switchProfileTab(tabId) {
    document.querySelectorAll('.prof-tab').forEach(el => el.classList.add('hidden'));
    document.getElementById('prof-' + tabId).classList.remove('hidden');
    document.querySelectorAll('#tab-profile .btn-nav').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('btnProf' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    if (tabId === 'history') window.renderHistory();
}

window.renderHistory = function() {
    const cont = document.getElementById('historyList');
    if (!cont) return;
    cont.innerHTML = '';
    if (!state.history || state.history.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Zatiaľ žiadne záznamy.</p>`;
        return;
    }
    [...state.history].reverse().forEach((h, i) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => window.showHistoryDetail(state.history.indexOf(h));
        div.style = `cursor:pointer; background: var(--bg-dark); padding: 12px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; border-left: 4px solid ${h.passed ? 'var(--success)' : 'var(--danger)'};`;
        div.innerHTML = `<div><strong>${h.type} - ${h.lesson} 🔍</strong><br><small>${new Date(h.date).toLocaleDateString()}</small></div><div style="font-weight:bold; color:${h.passed ? 'var(--success)' : 'var(--danger)'};">${h.score}%</div>`;
        cont.appendChild(div);
    });
};

window.showHistoryDetail = function(idx) {
    const h = state.history[idx];
    if (!h || !h.details) { alert("Detaily nie sú dostupné pre tento záznam."); return; }
    document.getElementById('detailStats').innerHTML = `<strong>${h.type}</strong> | ${h.lesson}<br>Skóre: ${h.score}%`;
    let html = `<table style="width:100%; font-size:13px; border-spacing:0 5px;">`;
    h.details.forEach(item => {
        html += `<tr style="background:rgba(255,255,255,0.05);">
            <td style="padding:10px;">${item.q}</td>
            <td style="padding:10px; color:${item.isCorrect ? 'var(--success)' : 'var(--danger)'};">
                ${item.a} ${item.isCorrect ? '' : '<br><small style="opacity:0.6;">Správne: '+item.correct+'</small>'}
            </td>
        </tr>`;
    });
    document.getElementById('detailList').innerHTML = html + `</table>`;
    document.getElementById('overlayDetail').style.display = 'flex';
};

function updateProfileStats() {
    let lvl = Math.floor(state.xp / 500) + 1;
    let curXp = state.xp % 500;
    if(document.getElementById('profLevelText')) document.getElementById('profLevelText').innerText = `Level ${lvl}`;
    if(document.getElementById('profXpText')) document.getElementById('profXpText').innerText = `${curXp} / 500 XP`;
    if(document.getElementById('profXpBar')) document.getElementById('profXpBar').style.width = `${(curXp/500)*100}%`;
    renderBadges();
}

function renderBadges() {
    const badges = [
        { id: 'first_step', icon: '🐣', title: 'Prvý krok', desc: 'Odomkni Lekciu 2', condition: () => state.unlockedLesson >= 2 },
        { id: 'perfect_test', icon: '🎯', title: 'Perfekcionista', desc: 'Daj test na 100%', condition: () => state.history && state.history.some(h => h.score === 100) }
    ];
    let grid = document.getElementById('badgesGrid'); if (!grid) return; grid.innerHTML = '';
    badges.forEach(b => {
        let ok = b.condition();
        let div = document.createElement('div');
        div.className = `badge-item ${ok ? '' : 'badge-locked'}`;
        div.innerHTML = `<div class="badge-icon">${b.icon}</div><div class="badge-title">${b.title}</div><div class="badge-desc">${b.desc}</div>`;
        grid.appendChild(div);
    });
}
