/* Felles motor for oppdragssider – Kjemiprosess læringslab
   Bruk: <body data-oppdrag="unik-nokkel">, faser som <section class="fase" data-p="1" data-title="…" data-sub="…">.
   Felt som skal lagres: data-f="nøkkel". Blokker som skal med i rapporten: class="rep" data-rep="Overskrift".
   Bilde: <input type="file" data-img="nøkkel"> + <div data-img-show="nøkkel">.
   Egentest: <div class="q" data-a="1"> med knapper i .opts (0-indeksert riktig svar) og <div class="fb" data-fb="…">.
   Beregninger: window.OPPDRAG_CALC = function(get){ … } kalles ved hver endring. */
(function(){
  const KEY = "oppdrag-" + document.body.dataset.oppdrag;
  let S = {f:{}, done:{}, img:{}};
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch(e) {}
  let warned = false;
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch(e){ if(!warned){ warned = true; note("Nettleseren klarte ikke å lagre alt. Lag oppdragsrapporten jevnlig, så mister du ikke arbeidet."); } }
  }
  function note(msg){ const n = document.getElementById("lagreinfo"); if(n){ n.textContent = msg; n.hidden = false; } }

  /* ---------- Felt ---------- */
  const fields = document.querySelectorAll("[data-f]");
  function readField(el){ return el.type === "checkbox" ? el.checked : el.value; }
  fields.forEach(el => {
    const k = el.dataset.f;
    if (k in S.f){ if (el.type === "checkbox") el.checked = !!S.f[k]; else el.value = S.f[k]; }
    el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => { S.f[k] = readField(el); save(); calc(); });
  });
  const get = k => { const el = document.querySelector('[data-f="'+k+'"]'); return el ? readField(el) : S.f[k]; };
  function calc(){ if (typeof window.OPPDRAG_CALC === "function") { try { window.OPPDRAG_CALC(get); } catch(e) {} } }

  /* ---------- Bilder ---------- */
  function showImg(k){
    document.querySelectorAll('[data-img-show="'+k+'"]').forEach(box => {
      box.innerHTML = S.img[k] ? '<img alt="Vedlagt bilde" src="'+S.img[k]+'">' : "";
    });
  }
  document.querySelectorAll("input[type=file][data-img]").forEach(inp => {
    const k = inp.dataset.img; showImg(k);
    inp.addEventListener("change", () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        const im = new Image();
        im.onload = () => {
          const max = 1400, sc = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement("canvas"); c.width = Math.round(im.width*sc); c.height = Math.round(im.height*sc);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          S.img[k] = c.toDataURL("image/jpeg", .8); save(); showImg(k);
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  });
  document.querySelectorAll("[data-img-clear]").forEach(b => b.addEventListener("click", () => { delete S.img[b.dataset.imgClear]; save(); showImg(b.dataset.imgClear); }));

  /* ---------- Faser ---------- */
  const fases = [...document.querySelectorAll("section.fase")];
  const nav = document.querySelector(".fnav ol");
  fases.forEach((sec, i) => {
    const p = sec.dataset.p;
    const li = document.createElement("li");
    li.innerHTML = '<button type="button" data-p="'+p+'"'+(sec.dataset.risk?' class="risk"':'')+'><span class="n"><span>'+p+'</span></span><span class="t">'+sec.dataset.title+'</span><span class="s">'+(sec.dataset.sub||"")+'</span></button>';
    nav.append(li);
    const foot = document.createElement("div"); foot.className = "fase-foot no-rep";
    const prev = fases[i-1], next = fases[i+1];
    foot.innerHTML =
      '<div>'+(prev?'<button type="button" class="btn ghost" data-go="'+prev.dataset.p+'">← '+prev.dataset.title+'</button>':'')+'</div>'+
      '<button type="button" class="btn done-btn" data-done="'+p+'" aria-pressed="false">Marker fasen som ferdig</button>'+
      '<div>'+(next?'<button type="button" class="btn pri" data-go="'+next.dataset.p+'">'+next.dataset.title+' →</button>':'')+'</div>';
    sec.append(foot);
  });
  function paintDone(){
    fases.forEach(sec => {
      const p = sec.dataset.p, d = !!S.done[p];
      const b = nav.querySelector('button[data-p="'+p+'"]'); b.classList.toggle("done", d);
      const db = sec.querySelector(".done-btn"); db.setAttribute("aria-pressed", d); db.textContent = d ? "✓ Fasen er ferdig" : "Marker fasen som ferdig";
    });
  }
  function show(p, scroll){
    if (!fases.some(s => s.dataset.p === p)) p = fases[0].dataset.p;
    fases.forEach(s => s.hidden = s.dataset.p !== p);
    nav.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", b.dataset.p === p ? "step" : "false"));
    if (scroll) window.scrollTo({top: document.querySelector(".fnav").offsetTop, behavior: "smooth"});
  }
  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go],.fnav button[data-p]");
    if (go){ const p = go.dataset.go || go.dataset.p; history.replaceState(null, "", "#fase-"+p); show(p, true); return; }
    const dn = e.target.closest("[data-done]");
    if (dn){ const p = dn.dataset.done; S.done[p] = !S.done[p]; save(); paintDone(); }
  });
  const h = (location.hash.match(/fase-(\w+)/) || [])[1];
  show(h || fases[0].dataset.p, false); paintDone();

  /* ---------- Egentest ---------- */
  document.querySelectorAll(".quiz .q").forEach(q => {
    const right = +q.dataset.a, btns = [...q.querySelectorAll(".opts button")], fb = q.querySelector(".fb");
    btns.forEach((b, i) => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.remove("right","wrong"));
      b.classList.add(i === right ? "right" : "wrong");
      if (i !== right) btns[right].classList.add("right");
      fb.textContent = (i === right ? "Riktig. " : "Ikke helt. ") + fb.dataset.fb;
    }));
  });

  /* ---------- Rapport ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function staticCopy(node){
    const c = node.cloneNode(true);
    const orig = node.querySelectorAll("input,textarea,select"), copy = c.querySelectorAll("input,textarea,select");
    copy.forEach((el, i) => {
      const o = orig[i]; if (!o || o.type === "file") return;
      let html;
      if (o.type === "checkbox") html = '<span>'+(o.checked ? "☑" : "☐")+'</span>';
      else if (o.tagName === "SELECT") html = '<span>'+esc((o.selectedIndex >= 0 && o.options[o.selectedIndex].text) || "–")+'</span>';
      else if (o.tagName === "TEXTAREA" && !o.closest("table")) html = o.value.trim() ? '<div class="rval">'+esc(o.value)+'</div>' : '<div class="rval rempty">Ikke fylt ut</div>';
      else html = o.value.trim() ? '<span>'+esc(o.value)+'</span>' : '<span class="rempty">–</span>';
      const w = document.createElement("span"); w.innerHTML = html; el.replaceWith(w.firstChild);
    });
    c.querySelectorAll(".no-rep,button,input[type=file],.fase-foot").forEach(x => x.remove());
    return c;
  }
  function buildReport(){
    const R = document.getElementById("rapport"); const body = R.querySelector(".rbody"); body.innerHTML = "";
    const today = new Date().toLocaleDateString("nb-NO");
    R.querySelector(".rmeta").innerHTML =
      '<div><small>Elev</small>'+esc(get("elev")||"–")+'</div>'+
      '<div><small>Gruppe</small>'+esc(get("gruppe")||"–")+'</div>'+
      '<div><small>Dato</small>'+today+'</div>';
    document.querySelectorAll(".rep").forEach(block => {
      const sec = document.createElement("section"); sec.className = "rsec";
      sec.innerHTML = '<h2>'+esc(block.dataset.rep)+'</h2>';
      const c = staticCopy(block);
      [...c.childNodes].forEach(n => sec.append(n));
      body.append(sec);
    });
    document.body.classList.add("show-report"); window.scrollTo(0,0);
  }
  document.querySelectorAll("[data-report]").forEach(b => b.addEventListener("click", buildReport));
  document.querySelectorAll("[data-report-close]").forEach(b => b.addEventListener("click", () => { document.body.classList.remove("show-report"); }));
  document.querySelectorAll("[data-print]").forEach(b => b.addEventListener("click", () => window.print()));

  /* Nullstill med to trykk (ingen dialogboks) */
  document.querySelectorAll("[data-reset]").forEach(b => {
    let armed = false, t;
    b.addEventListener("click", () => {
      if (!armed){ armed = true; b.textContent = "Trykk igjen for å slette alt"; t = setTimeout(() => { armed = false; b.textContent = "Nullstill oppdraget"; }, 4000); return; }
      clearTimeout(t); try { localStorage.removeItem(KEY); } catch(e) {} location.reload();
    });
  });

  calc();
})();
