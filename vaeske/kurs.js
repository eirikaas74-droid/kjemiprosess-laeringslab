/* Felles verktøy for kurset «Væske i prosessindustrien» */
(function(){
"use strict";
const K=window.K={};
const $=K.$=s=>document.querySelector(s);
K.nf=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('nb-NO',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
K.num=s=>{const v=parseFloat(String(s??'').replace(',','.').replace(/\s/g,''));return Number.isFinite(v)?v:NaN;};
K.css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
K.reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
K.g=9.81;
K.esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=K.nf,g=K.g;

/* ---------- Stoffdata som funksjon av temperatur (°C) ---------- */
const TK=t=>t+273.15;
K.FLUIDS={
  vann:{navn:'Vann',Tmin:0,Tmax:95,
    rho:t=>1000*(1-(t+288.9414)/(508929.2*(t+68.12963))*Math.pow(t-3.9863,2)),
    mu:t=>2.414e-5*Math.pow(10,247.8/(TK(t)-140))},
  glykol:{navn:'Glykol/vann 50 %',Tmin:-20,Tmax:90,rho:t=>1079-0.45*t,mu:t=>Math.exp(-14.492+2622/TK(t))},
  olje:{navn:'Hydraulikkolje ISO VG 46',Tmin:0,Tmax:100,rho:t=>870-0.65*(t-15),mu:t=>Math.exp(-15.402+3815/TK(t))},
  glyserol:{navn:'Glyserol (ren)',Tmin:10,Tmax:80,rho:t=>1261-0.65*(t-20),mu:t=>Math.exp(-23.453+6976/TK(t))}
};
K.fluid=(key,t)=>{const F=K.FLUIDS[key];return {navn:F.navn,rho:F.rho(t),mu:F.mu(t),nu:F.mu(t)/F.rho(t)};};
K.pvWater=t=>Math.pow(10,8.07131-1730.63/(233.426+t))*133.322; // Pa
K.MATS={pvc:{navn:'PVC/plast',eps:0.0015e-3},rustfritt:{navn:'Rustfritt stål',eps:0.015e-3},karbon:{navn:'Karbonstål, nytt',eps:0.045e-3},rust:{navn:'Karbonstål, korrodert',eps:0.5e-3}};
K.DN=[['DN15',16.0],['DN20',21.6],['DN25',27.3],['DN32',36.0],['DN40',41.9],['DN50',53.1],['DN65',68.9],['DN80',80.9],['DN100',105.3]];
K.KB=0.75;
const fTurb=(Re,eD)=>0.25/Math.pow(Math.log10(eD/3.7+5.74/Math.pow(Re,0.9)),2);
K.fric=(Re,eD)=>{if(!(Re>0))return 0;if(Re<2300)return 64/Re;if(Re>=4000)return fTurb(Re,eD);const t=(Re-2300)/1700;return 64/2300+(fTurb(4000,eD)-64/2300)*t;};
K.regime=Re=>Re<2300?['Laminær','lam']:Re<4000?['Overgang','ovg']:['Turbulent','tur'];
K.valveK=open=>{const pts=[[0,1e6],[5,800],[10,120],[25,24],[50,4.5],[75,0.9],[100,0.15]];
  for(let i=0;i<pts.length-1;i++){const[a,ka]=pts[i],[b,kb]=pts[i+1];if(open<=b){const t=(open-a)/(b-a);return Math.exp(Math.log(ka)+(Math.log(kb)-Math.log(ka))*t);}}return 0.15;};
/* Q i L/min, D i mm, L i m, rho/mu direkte */
K.pipe=({Q,D,L,sumK=0,rho,mu,eps=0.015e-3})=>{const q=Q/60000,d=D/1000,A=Math.PI*d*d/4,v=q/A,Re=rho*v*d/mu,f=K.fric(Re,eps/d),dyn=rho*v*v/2,dpF=f*(L/d)*dyn,dpK=sumK*dyn;return {q,v,Re,f,dyn,dpF,dpK,dp:dpF+dpK};};
K.tankArea=(shape,a,b)=>{a=K.num(a)/100;b=K.num(b)/100;return shape==='syl'?Math.PI*a*a/4:a*b;}; // cm -> m²

/* ---------- SVG-diagram ---------- */
const NS='http://www.w3.org/2000/svg';
const el=K.el=(tag,attrs,parent,text)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e;};
const niceStep=K.niceStep=(span,n)=>{const raw=Math.max(span,1e-9)/n,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;};
const dec=s=>s>=1?0:Math.min(3,Math.ceil(-Math.log10(s)-1e-9));
K.chart=(svg,o)=>{
  const vb=svg.viewBox.baseVal,W=vb.width,H=vb.height,m={l:o.ml||52,r:14,t:12,b:40};
  svg.innerHTML='';const iw=W-m.l-m.r,ih=H-m.t-m.b;
  const xMin0=o.xMin||0,xs=niceStep(o.xMax-xMin0,5),xMin=Math.floor(xMin0/xs+1e-9)*xs,xMax=Math.ceil(o.xMax/xs-1e-9)*xs||xs;
  const yMin0=(o.yMin!=null&&o.yMin>0)?o.yMin:Math.min(0,o.yMin??0),ys=niceStep((o.yMax||1)-yMin0,4),yMax=Math.ceil((o.yMax||1)/ys-1e-9)*ys||ys,yMin=Math.floor(yMin0/ys+1e-9)*ys;
  const X=x=>m.l+(x-xMin)/(xMax-xMin)*iw,Y=y=>m.t+ih-(y-yMin)/(yMax-yMin)*ih;
  for(let y=yMin;y<=yMax+1e-9;y+=ys){el('line',{x1:m.l,x2:m.l+iw,y1:Y(y),y2:Y(y),stroke:'var(--grid)','stroke-width':1},svg);el('text',{x:m.l-6,y:Y(y)+4,'text-anchor':'end'},svg,nf(y,dec(ys)));}
  for(let x=xMin;x<=xMax+1e-9;x+=xs)el('text',{x:X(x),y:m.t+ih+16,'text-anchor':'middle'},svg,nf(x,dec(xs)));
  el('line',{x1:m.l,x2:m.l+iw,y1:Y(Math.max(0,yMin)),y2:Y(Math.max(0,yMin)),stroke:'var(--muted)','stroke-width':1},svg);
  el('text',{x:m.l+iw/2,y:H-4,'text-anchor':'middle'},svg,o.xLabel||'');
  el('text',{x:12,y:m.t+ih/2,'text-anchor':'middle',transform:`rotate(-90 12 ${m.t+ih/2})`},svg,o.yLabel||'');
  const clipX=x=>Math.max(xMin,Math.min(xMax,x)),clipY=y=>Math.max(yMin,Math.min(yMax,y));
  (o.areas||[]).forEach(a=>{if(!a.pts.length)return;const d='M'+X(a.pts[0][0])+','+Y(Math.max(0,yMin))+a.pts.map(p=>'L'+X(clipX(p[0]))+','+Y(clipY(p[1]))).join('')+'L'+X(a.pts[a.pts.length-1][0])+','+Y(Math.max(0,yMin))+'Z';el('path',{d,fill:a.fill,'fill-opacity':a.op||0.15,stroke:'none'},svg);});
  (o.hlines||[]).forEach(h=>{if(h.y<yMin||h.y>yMax)return;el('line',{x1:m.l,x2:m.l+iw,y1:Y(h.y),y2:Y(h.y),stroke:h.color||'var(--muted)','stroke-width':1.5,'stroke-dasharray':'6 5'},svg);if(h.label)el('text',{x:h.right?m.l+iw-6:m.l+6,y:Y(h.y)+(h.below?14:-6),'text-anchor':h.right?'end':'start',style:'fill:'+(h.color||'var(--muted)')},svg,h.label);});
  (o.lines||[]).forEach(l=>{const pts=l.pts.filter(p=>Number.isFinite(p[1]));if(pts.length<2)return;const d=pts.map((p,i)=>(i?'L':'M')+X(clipX(p[0])).toFixed(1)+','+Y(clipY(p[1])).toFixed(1)).join('');
    el('path',{d,fill:'none',stroke:l.color,'stroke-width':l.w||2.2,'stroke-linejoin':'round','stroke-dasharray':l.dash||'none'},svg);
    if(l.label){const p=pts[pts.length-1];el('text',{x:Math.min(X(clipX(p[0])),W-m.r-2),y:Y(clipY(p[1]))-6,'text-anchor':'end',style:'fill:'+l.color},svg,l.label);}});
  (o.dots||[]).forEach(p=>{if(!Number.isFinite(p.y)||!Number.isFinite(p.x))return;el('circle',{cx:X(p.x),cy:Y(clipY(p.y)),r:p.r||5,fill:p.fill,stroke:'var(--surface)','stroke-width':2},svg);
    if(p.label)el('text',{x:X(p.x)>W-120?X(p.x)-8:X(p.x)+8,y:Y(clipY(p.y))-9,'text-anchor':X(p.x)>W-120?'end':'start',style:'fill:var(--ink)'},svg,p.label);});
  return {X,Y};
};

/* ---------- Lagring i nettleseren ---------- */
K.load=(key,def)=>{try{const s=localStorage.getItem(key);if(s)return JSON.parse(s);}catch(e){}return JSON.parse(JSON.stringify(def));};
K.save=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}};

/* ---------- Kopiering ---------- */
K.copy=(text,statusEl,fallbackEl,okMsg)=>{
  const done=()=>{statusEl.textContent=okMsg||'Kopiert. Lim inn i innleveringen din.';fallbackEl.hidden=true;};
  const fail=()=>{fallbackEl.value=text;fallbackEl.hidden=false;fallbackEl.focus();fallbackEl.select();statusEl.textContent='Marker teksten under og kopier den selv.';};
  try{navigator.clipboard.writeText(text).then(done,fail);}catch(e){fail();}
};
/* Bekreftelse uten dialog */
K.confirm=(btn,box,yes,no,action)=>{btn.addEventListener('click',()=>{box.hidden=false;});no.addEventListener('click',()=>{box.hidden=true;});yes.addEventListener('click',()=>{box.hidden=true;action();});};

/* ---------- Flervalgsquiz ---------- */
K.quiz=(box,scoreEl,items)=>{
  const answered={};
  items.forEach((it,i)=>{
    const d=document.createElement('fieldset');d.className='q';d.style.margin='0';
    d.innerHTML=`<legend style="font-weight:700;padding:0;float:left;width:100%">${i+1}. ${it.q}</legend><div class="opts">${it.o.map((o,j)=>`<label><input type="radio" name="${box.id}${i}" id="${box.id}${i}o${j}" value="${j}"><span>${o}</span></label>`).join('')}</div><div class="fb" hidden></div>`;
    d.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{
      const j=+inp.value,ok=j===it.a;answered[i]=ok;
      d.querySelectorAll('label').forEach((l,k)=>{l.classList.remove('right','wrong');if(k===j)l.classList.add(ok?'right':'wrong');if(!ok&&k===it.a)l.classList.add('right');});
      const fb=d.querySelector('.fb');fb.hidden=false;fb.className='fb '+(ok?'ok':'no');fb.innerHTML=(ok?'<b>Riktig.</b> ':'<b>Ikke helt.</b> ')+it.e;
      const n=Object.keys(answered).length,c=Object.values(answered).filter(Boolean).length;
      if(scoreEl)scoreEl.textContent=`${c} av ${n} riktige`+(n===items.length?' – alle besvart':'');
    }));
    box.appendChild(d);
  });
};

/* ---------- Regneoppgaver med sjekk ---------- */
K.calcs=(box,items)=>{
  items.forEach((it,i)=>{
    const d=document.createElement('div');d.className='q calc';
    d.innerHTML=`<p style="font-weight:700">${it.t}</p>${it.hint?`<details><summary>Hint</summary><div class="ans">${it.hint}</div></details>`:''}<div class="row"><input type="text" inputmode="decimal" id="${box.id}${i}" placeholder="Ditt svar" aria-label="Svar på oppgave ${String.fromCharCode(97+i)}"><span class="unit">${it.u||''}</span><button type="button" class="small">Sjekk</button></div><div class="fb" hidden></div><details><summary>Vis løsning</summary><div class="ans">${it.s}</div></details>`;
    const inp=d.querySelector('input'),fb=d.querySelector('.fb');
    const check=()=>{const v=K.num(inp.value);fb.hidden=false;
      if(!Number.isFinite(v)){fb.className='fb no';fb.textContent='Skriv inn et tall.';return;}
      const ok=Math.abs(v-it.a)/Math.abs(it.a)<=(it.tol||0.03);fb.className='fb '+(ok?'ok':'no');
      const unitErr=[1000,0.001,100,0.01,60,1/60].some(f=>Math.abs(v*f-it.a)/Math.abs(it.a)<=(it.tol||0.03));
      fb.innerHTML=ok?'<b>Riktig.</b> Godt regnet.':unitErr?'<b>Sjekk enhetene.</b> Tallet ser nesten riktig ut, men en omregningsfaktor er feil.':'<b>Ikke helt.</b> Sjekk utregningen og enhetene, og prøv igjen.';};
    d.querySelector('button').addEventListener('click',check);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')check();});
    box.appendChild(d);
  });
};

/* ---------- Forklar for hverandre ---------- */
K.peer=(box,cfg)=>{
  const LV={3:['Sikker','l3'],2:['Delvis','l2'],1:['Ikke ennå','l1']};
  const cards=cfg.cards,who=i=>i%2===0?'A':'B';
  const aList=cards.map((_,i)=>i).filter(i=>who(i)==='A').map(i=>i+1).join(', ').replace(/, (\d+)$/,' og $1');
  const bList=cards.map((_,i)=>i).filter(i=>who(i)==='B').map(i=>i+1).join(', ').replace(/, (\d+)$/,' og $1');
  let st=K.load(cfg.key,{});
  const ps=i=>st[i]||(st[i]={chk:[],lv:0,good:'',work:''});
  const save=()=>K.save(cfg.key,st);
  box.innerHTML=`<div class="prose stack" style="margin-bottom:18px"><p>Du har ikke forstått noe skikkelig før du kan forklare det for andre. Jobb i par. Dere bytter på å forklare ${cards.length} kjernebegreper fra uken, og den som lytter vurderer forklaringen. Regn med ${cfg.min||'20–25'} minutter.</p></div>
    <div class="roles">
      <div class="role"><span class="tag">Den som forklarer</span><b>Snakk uten notater</b><p>Forklar med egne ord i ca. ett minutt. Bruk fagbegreper, og gi gjerne et eksempel fra riggen eller simuleringen. Du kan tegne.</p></div>
      <div class="role"><span class="tag">Den som vurderer</span><b>Lytt først, vurder etterpå</b><p>Ikke avbryt. Når forklaringen er ferdig, åpner du sjekklisten, krysser av det som var med og velger et nivå.</p></div>
      <div class="role"><span class="tag">Tilbakemeldingen</span><b>Én ting bra, én ting å jobbe med</b><p>Vær konkret. «Du forklarte godt hvorfor …» hjelper mer enn «bra». Snakk sammen før dere går videre.</p></div>
    </div>
    <p class="status" style="margin:12px 0 18px">Elev A forklarer kort ${aList}. Elev B forklarer kort ${bList}. Det dere fyller inn blir bare lagret i nettleseren på denne enheten.</p>
    <div class="pcards"></div>
    <h3 style="margin:30px 0 12px">Resultat: hva bør dere repetere?</h3>
    <div class="result"></div>
    <div class="btnrow" style="margin-top:14px">
      <button type="button" class="pcopy">Kopier resultatet</button>
      <button type="button" class="ghost preset">Start på nytt</button>
      <span class="status pconf" hidden>Slette alle vurderinger? <button type="button" class="small pyes">Ja, slett</button> <button type="button" class="small ghost pno">Avbryt</button></span>
      <span class="status pstatus" role="status"></span>
    </div>
    <textarea class="pfb" hidden readonly style="margin-top:10px;min-height:160px;font-family:var(--f-mono);font-size:.8rem"></textarea>`;
  const pc=box.querySelector('.pcards'),res=box.querySelector('.result'),pid=box.id;
  function result(){
    res.innerHTML=['A','B'].map(w=>{
      const idx=cards.map((_,i)=>i).filter(i=>who(i)===w);
      const rows=idx.map(i=>{const l=ps(i).lv;return `<div class="row"><span>${i+1}. ${cards[i].t}</span><span class="chip ${l?LV[l][1]:''}">${l?LV[l][0]:'Ikke vurdert'}</span></div>`;}).join('');
      const rep=idx.filter(i=>ps(i).lv&&ps(i).lv<3),done=idx.filter(i=>ps(i).lv).length;
      const txt=rep.length?`<div class="repeat"><b>Repeter dette:</b><ul>${rep.map(i=>`<li><a href="${cards[i].link}">${cards[i].ln}</a> (${cards[i].t.toLowerCase()})</li>`).join('')}</ul></div>`
        :done===idx.length?'<p class="repeat"><b>Alt vurdert som sikkert.</b> Prøv å forklare et av kortene til den andre eleven også.</p>':'<p class="repeat status">Repetisjonslisten fylles ut etter hvert som kortene vurderes.</p>';
      return `<div class="col"><div class="tag">Elev ${w}</div>${rows}${txt}</div>`;}).join('');
  }
  function render(){
    pc.innerHTML='';
    cards.forEach((it,i)=>{const s=ps(i),w=who(i),open=s.open||s.chk.some(Boolean)||s.lv;
      const d=document.createElement('article');d.className='pc';
      d.innerHTML=`<div class="pc-head"><span class="n">${i+1}</span><h3>${it.t}</h3><span class="who ${w==='B'?'b':''}">Elev ${w} forklarer · Elev ${w==='A'?'B':'A'} vurderer</span></div>
        <p class="prompt">${it.p}</p><p class="hint">Hjelp hvis dere står fast: ${it.h} <a href="${it.link}">Gå tilbake til ${it.ln}</a></p>
        <button type="button" class="ghost small pshow" ${open?'hidden':''}>Forklaringen er ferdig – vis sjekklisten</button>
        <div class="pbody stack" ${open?'':'hidden'}>
          <div class="tag">Dette bør være med</div>
          <div class="checklist">${it.c.map((c,j)=>`<label><input type="checkbox" id="${pid}c${i}_${j}" ${s.chk[j]?'checked':''}><span>${c}</span></label>`).join('')}</div>
          <div><div class="tag" style="margin-bottom:6px">Hvor sikker var forklaringen?</div>
            <div class="levels" role="radiogroup" aria-label="Nivå for kort ${i+1}">${[3,2,1].map(l=>`<label class="l${l}"><input type="radio" name="${pid}lv${i}" id="${pid}lv${i}_${l}" value="${l}" ${s.lv==l?'checked':''}><span>${LV[l][0]}</span></label>`).join('')}</div>
            <p class="suggest" style="margin-top:6px"></p></div>
          <div class="pc-foot">
            <div class="ctrl"><label for="${pid}g${i}">Dette var bra</label><input type="text" id="${pid}g${i}" value="${K.esc(s.good)}"></div>
            <div class="ctrl"><label for="${pid}w${i}">Dette kan du jobbe med</label><input type="text" id="${pid}w${i}" value="${K.esc(s.work)}"></div>
          </div>
        </div>`;
      const sug=d.querySelector('.suggest');
      const upd=()=>{const n=s.chk.filter(Boolean).length,tot=it.c.length;sug.textContent=`${n} av ${tot} punkter krysset av. Forslag: ${n===tot?'Sikker':n>=Math.ceil(tot/2)?'Delvis':'Ikke ennå'}.`;};
      d.querySelector('.pshow').addEventListener('click',e=>{s.open=true;e.target.hidden=true;d.querySelector('.pbody').hidden=false;save();d.querySelector('.checklist input').focus();});
      d.querySelectorAll('.checklist input').forEach((c,j)=>c.addEventListener('change',()=>{s.chk[j]=c.checked;upd();save();}));
      d.querySelectorAll('.levels input').forEach(r=>r.addEventListener('change',()=>{s.lv=+r.value;save();result();}));
      d.querySelector(`#${pid}g${i}`).addEventListener('input',e=>{s.good=e.target.value;save();});
      d.querySelector(`#${pid}w${i}`).addEventListener('input',e=>{s.work=e.target.value;save();});
      upd();pc.appendChild(d);
    });
    result();
  }
  box.querySelector('.pcopy').addEventListener('click',()=>{
    let t=`Forklar for hverandre – ${cfg.title}\n`;
    ['A','B'].forEach(w=>{t+=`\nElev ${w}\n`;cards.forEach((it,i)=>{if(who(i)!==w)return;const s=ps(i);
      t+=`${i+1}. ${it.t}: ${s.lv?LV[s.lv][0]:'ikke vurdert'} (${s.chk.filter(Boolean).length}/${it.c.length} punkter)\n`;
      if(s.good)t+=`   Bra: ${s.good}\n`;if(s.work)t+=`   Jobbe med: ${s.work}\n`;});});
    K.copy(t,box.querySelector('.pstatus'),box.querySelector('.pfb'),'Kopiert.');
  });
  K.confirm(box.querySelector('.preset'),box.querySelector('.pconf'),box.querySelector('.pyes'),box.querySelector('.pno'),()=>{st={};save();render();});
  render();
};

/* ---------- Aktiv lenke i innholdsmenyen ---------- */
K.toc=()=>{const links=[...document.querySelectorAll('#toc a')];if(!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id));});},{rootMargin:'-40% 0px -55% 0px'});
  document.querySelectorAll('main section').forEach(s=>io.observe(s));};

/* ---------- Animasjonsløkke som pauser utenfor skjermen ---------- */
K.animate=(canvas,draw)=>{
  let visible=true,last=0;
  const dpr=()=>window.devicePixelRatio||1;
  const ctx=canvas.getContext('2d');
  const size=()=>{const r=canvas.getBoundingClientRect(),h=+canvas.dataset.h||300;canvas.width=Math.max(280,r.width)*dpr();canvas.height=h*dpr();canvas.style.height=h+'px';ctx.setTransform(dpr(),0,0,dpr(),0,0);return {W:Math.max(280,r.width),H:h};};
  let dim=size();
  window.addEventListener('resize',()=>{dim=size();draw(ctx,dim,0);});
  if('IntersectionObserver' in window)new IntersectionObserver(e=>{visible=e[0].isIntersecting;},{threshold:0}).observe(canvas);
  const loop=t=>{const dt=Math.min(0.05,(t-last)/1000||0);last=t;if(visible)draw(ctx,dim,dt);requestAnimationFrame(loop);};
  draw(ctx,dim,0);
  if(!K.reduce)requestAnimationFrame(loop);
  return {redraw:()=>draw(ctx,dim,0),dim:()=>dim};
};
})();
