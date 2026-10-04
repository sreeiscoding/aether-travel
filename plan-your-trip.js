(function(){
  const form = document.getElementById('tripForm');
  const steps = Array.from(document.querySelectorAll('.step'));
  const stepDots = Array.from(document.querySelectorAll('.step-dot'));
  const progressBar = document.getElementById('progressBar');
  const currentStepLabel = document.getElementById('currentStep');
  const actionToolbar = document.getElementById('actionToolbar');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const suggestions = document.getElementById('suggestions');
  const prefs = document.getElementById('preferences');
  const summaryBox = document.getElementById('summaryBox');

  let current = 0; // index in steps
  // autosave scheduling (debounced)
  let autosaveTimer = null;
  function scheduleSave(){
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(()=>{
      try{
        const payload = { form: gatherForm(), current, savedAt: new Date().toISOString() };
        localStorage.setItem('aether-trip-draft', JSON.stringify(payload));
        updateAutosaveStatus(payload.savedAt);
      }catch(e){}
    }, 250);
  }
  // save on form input/change events
  form.addEventListener('input', ()=> scheduleSave());
  form.addEventListener('change', ()=> scheduleSave());

  function showStep(index){
    steps.forEach((s,i)=> s.classList.toggle('active', i===index));
    stepDots.forEach((d,i)=> d.classList.toggle('is-active', i===index));
    currentStepLabel.textContent = index+1;
    const pct = Math.round(((index) / (steps.length - 1)) * 100);
    progressBar.style.width = pct + '%';
    prevBtn.disabled = index === 0;
    nextBtn.textContent = (index === steps.length -1) ? 'Request My Itinerary' : 'Next';
    // focus first input in step
    const first = steps[index].querySelector('input,textarea,button,select');
    if (first) first.focus();
  }

  function validateStep(index){
    const inputs = Array.from(steps[index].querySelectorAll('input[required], textarea[required], select[required]'));
    for (const el of inputs){
      if (!el.value.trim()){
        el.classList.add('invalid');
        el.focus();
        showError(el, 'This field is required');
        return false;
      }
      clearError(el);
    }

    // simple email validation on contact step
    if (index === 3){
      const email = form.querySelector('#email');
      if (email && email.value){
        const ok = /\S+@\S+\.\S+/.test(email.value);
        if (!ok){ email.classList.add('invalid'); showError(email,'Please enter a valid email'); email.focus(); return false; }
      }
    }

    return true;
  }

  function showError(el,msg){
    clearError(el);
    const small = document.createElement('small');
    small.className = 'field-error';
    small.style.color = 'crimson';
    small.textContent = msg;
    el.insertAdjacentElement('afterend', small);
  }
  function clearError(el){
    const next = el.nextElementSibling;
    if (next && next.classList && next.classList.contains('field-error')) next.remove();
    el.classList.remove('invalid');
  }

  nextBtn.addEventListener('click', ()=>{
    if (!validateStep(current)) return;
    if (current < steps.length -1){
      current++;
      showStep(current);
      if (current === steps.length -1) buildSummary();
      scheduleSave();
    } else {
      // final submit simulation
      submitForm();
    }
  });

  prevBtn.addEventListener('click', ()=>{
    if (current > 0){ current--; showStep(current); }
    scheduleSave();
  });

  saveDraftBtn.addEventListener('click', ()=>{
    const data = gatherForm();
    const payload = { form: data, current, savedAt: new Date().toISOString() };
    localStorage.setItem('aether-trip-draft', JSON.stringify(payload));
    updateAutosaveStatus(payload.savedAt);
    saveDraftBtn.textContent = 'Draft saved';
    setTimeout(()=> saveDraftBtn.textContent = 'Save draft',1400);
  });

  // destination suggestion click
  suggestions.addEventListener('click', (e)=>{
    const card = e.target.closest('.dest-card');
    if (!card) return;
    const val = card.dataset.value;
    const primary = document.getElementById('primaryDestination');
    primary.value = val;
    // quick highlight
    Array.from(suggestions.children).forEach(c=> c.style.outline='none');
    card.style.outline = '3px solid rgba(118,148,167,0.18)';
    scheduleSave();
  });

  // preferences toggles
  prefs.addEventListener('click', (e)=>{
    const p = e.target.closest('.pref');
    if (!p) return;
    p.classList.toggle('is-selected');
    scheduleSave();
  });

  // number control buttons (plus/minus) for adults/children — bind directly to buttons
  (function bindNumberControls(){
    const live = document.getElementById('srLive');

    function announce(forId, value){
      try{
        const label = (document.querySelector('label[for="'+forId+'"]') || {}).innerText || forId;
        if (live) live.textContent = label + ' ' + value;
      }catch(e){}
    }

    function updateInput(input, delta){
      const step = Number(input.getAttribute('step') || 1);
      const min = Number(input.getAttribute('min') || 0);
      let val = Number(input.value);
      if (Number.isNaN(val)) val = min || 0;
      val = val + delta * step;
      if (min !== undefined) val = Math.max(min, val);
      if (step === 1) val = Math.round(val);
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      announce(input.id, val);
      scheduleSave();
    }

    const buttons = Array.from(document.querySelectorAll('.num-btn'));
    buttons.forEach(btn=>{
      let holdTimeout = null;
      let holdInterval = null;

      const forId = btn.dataset.for;
      const input = document.getElementById(forId);
      if (!input) return;

      const singleDelta = btn.classList.contains('num-increase') ? 1 : -1;

      const clearHold = ()=>{
        if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
      };

      // click/tap: single step
      btn.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        updateInput(input, singleDelta);
        clearHold();
      });

      // pointerdown to start auto-increment after a short delay
      btn.addEventListener('pointerdown', (e)=>{
        e.preventDefault(); e.stopPropagation();
        // small delay before auto-repeat
        holdTimeout = setTimeout(()=>{
          // run immediate extra step
          updateInput(input, singleDelta);
          // then start interval for repeated steps
          holdInterval = setInterval(()=> updateInput(input, singleDelta), 120);
        }, 450);
      });

      ['pointerup','pointercancel','pointerleave'].forEach(ev=> btn.addEventListener(ev, (e)=>{ clearHold(); }));
      // ensure clearing on window blur
      window.addEventListener('blur', clearHold);

      // announce manual input changes too
      input.addEventListener('input', ()=> { announce(input.id, input.value); scheduleSave(); });
    });
  })();

  // autosave status UI
  function formatSavedAt(iso){
    try{
      const d = new Date(iso);
      const now = Date.now();
      const diff = Math.floor((now - d.getTime())/1000);
      if (diff < 5) return 'Draft saved just now';
      if (diff < 60) return `Draft saved ${diff}s ago`;
      if (diff < 3600) return `Draft saved ${Math.floor(diff/60)}m ago`;
      // otherwise show local short time
      return 'Draft saved at ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }catch(e){ return 'Draft saved'; }
  }

  function updateAutosaveStatus(iso){
    try{
      const el = document.getElementById('autosaveStatus');
      if (!el) return;
      el.textContent = formatSavedAt(iso);
      el.dataset.savedAt = iso;
    }catch(e){}
  }

  function gatherForm(){
    const data = {};
    const fd = new FormData(form);
    for (const [k,v] of fd.entries()){ data[k]=v; }
    // collect preferences
    data.preferences = Array.from(prefs.querySelectorAll('.pref.is-selected')).map(el=>el.dataset.value);
    return data;
  }

  function buildSummary(){
    const data = gatherForm();
    const html = `
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <h4 style="margin:0 0 0.25rem;">Destination</h4>
          <div>${escapeHtml(data.primaryDestination||'—')}</div>
          <div class="muted-small">Alt: ${escapeHtml(data.altDestination||'—')}</div>

          <h4 style="margin-top:0.8rem;">Dates & travelers</h4>
          <div>${escapeHtml(data.departDate||'—')} <span class="muted-small">to ${escapeHtml(data.returnDate||'—')}</span></div>
          <div class="muted-small">Adults: ${escapeHtml(data.adults||'1')} · Children: ${escapeHtml(data.children||'0')}</div>
        </div>

        <div style="flex:1;min-width:240px;">
          <h4 style="margin:0 0 0.25rem;">Preferences</h4>
          <div>${(data.preferences && data.preferences.length) ? data.preferences.join(', ') : '—'}</div>

          <h4 style="margin-top:0.8rem;">Contact</h4>
          <div>${escapeHtml(data.fullName||'—')}</div>
          <div class="muted-small">${escapeHtml(data.email||'—')} · ${escapeHtml(data.phone||'—')}</div>
        </div>
      </div>
      <div style="margin-top:0.8rem;color:var(--muted);">Notes: ${escapeHtml(data.notes||'—')}</div>
    `;
    summaryBox.innerHTML = html;
  }

  function escapeHtml(text){ return (''+text).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

  function submitForm(){
    // simple simulated submission
    nextBtn.disabled = true; nextBtn.textContent = 'Sending...';
    const data = gatherForm();
    setTimeout(()=>{
      nextBtn.disabled = false;
      nextBtn.textContent = 'Request My Itinerary';
      if (actionToolbar) actionToolbar.style.display = 'none';
      // show success
      summaryBox.innerHTML = `<div style="text-align:center;padding:2rem;"><h3>Thanks, ${escapeHtml(data.fullName||'traveller')}!</h3><p class="muted-small">We received your request and will email a tailored itinerary within 48 hours.</p><button class="btn btn-primary" id="doneBtn">Back to home</button></div>`;
      document.getElementById('doneBtn').addEventListener('click', ()=> {
        window.location.href = 'index.html';
      });
      // clear draft
      localStorage.removeItem('aether-trip-draft');
    }, 1200);
  }

  // restore draft if present
  (function restore(){
    const raw = localStorage.getItem('aether-trip-draft');
    if (!raw) return;
    try{
      const payload = JSON.parse(raw);
      const data = payload && payload.form ? payload.form : payload;
      Object.keys(data).forEach(k=>{ const el = form.querySelector('[name="'+k+'"]'); if (el) el.value = data[k]; });
      if (data.preferences){ data.preferences.forEach(pref=>{ const el = Array.from(prefs.children).find(p=>p.dataset.value===pref); if(el) el.classList.add('is-selected'); }); }
      if (payload && typeof payload.current === 'number'){
        current = Math.max(0, Math.min(steps.length - 1, payload.current));
      }
      if (payload && payload.savedAt){ updateAutosaveStatus(payload.savedAt); }
    }catch(e){}
  })();

  // keyboard: Enter to advance when not in textarea
  form.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea'){
      e.preventDefault();
      nextBtn.click();
    }
  });

  // init
  showStep(current);
})();

// Open native date picker where supported when date fields are focused/clicked
(function(){
  try{
    const dates = document.querySelectorAll('input[type="date"]');
    dates.forEach((inp)=>{
      // focus will open picker in supporting browsers
      inp.addEventListener('focus', ()=>{
        if (typeof inp.showPicker === 'function'){
          try{ inp.showPicker(); }catch(e){}
        }
      });

      // pointerdown/click for better touch response
      inp.addEventListener('pointerdown', (e)=>{
        if (typeof inp.showPicker === 'function'){
          e.preventDefault();
          try{ inp.showPicker(); }catch(e){ inp.focus(); }
        }
      });
    });
  }catch(e){}
})();
