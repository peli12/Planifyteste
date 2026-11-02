const DAYS=['Lun','Mar','Mié','Jue','Vie'],DAYS_FULL=['Lunes','Martes','Miércoles','Jueves','Viernes'];
const PER=10,TIMES=new Array(20).fill(''),ENDS=new Array(20).fill(''),REC={M:'',V:''},P=20,KEY='relevo.v2';
let CFG={M:{ini:'07:00',dur:50,n:8,rec:3,recDur:30},V:{ini:'14:10',dur:50,n:0,rec:3,recDur:30},periodo:''};
const hm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'),mmn=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
function buildTimes(){for(const sh of ['M','V']){const c=CFG[sh];let t=mmn(c.ini);REC[sh]='';
  for(let k=0;k<PER;k++){const p=(sh==='V'?PER:0)+k;if(k>=c.n){TIMES[p]='';ENDS[p]='';continue}
    if(c.rec>0&&c.recDur>0&&k===c.rec){REC[sh]=hm(t)+'–'+hm(t+c.recDur);t+=c.recDur}
    TIMES[p]=hm(t);t+=c.dur;ENDS[p]=hm(t)}}}
const shiftOf=p=>p<PER?'M':'V',valid=p=>p%PER<CFG[shiftOf(p)].n;buildTimes();
const RC=p=>REC[shiftOf(p)],isRecAfter=p=>{const c=CFG[shiftOf(p)];return c.rec>0&&c.recDur>0&&c.rec<c.n&&p%PER===c.rec-1},turnoP=p=>p<PER?'Matutino':'Vespertino',covers=(t,p)=>!t.turno||t.turno==='Ambos'||t.turno===turnoP(p);
function seeded(s){return()=>(s=(s*1664525+1013904223)%4294967296)/4294967296}
function generate(st){for(let s=1;s<500;s++){const r=gen1(st,s);if(r)return r}return null}
const capOf=t=>{const b=t.maxf||t.base;return b?b+(t.exa||0):null};
const nombLabel=t=>({medio:'Medio tiempo · 20 h',tres:'Tres cuartos de tiempo · 30 h',tc:'Tiempo completo · 40 h',asig:'Por horas de asignatura'})[t.nomb]||'Nombramiento sin definir';
const baseFor=(st,g)=>{const cat=(st.catalog||[]).filter(x=>x.sem===(st.gsem||{})[g]);return [...(cat.length?cat.map(x=>({n:x.n,h:x.h})):st.subjects),...(st.sm||[]).filter(x=>x.spec&&x.spec===(st.gspec||{})[g]&&x.sem===(st.gsem||{})[g]).map(x=>({n:x.n,h:x.h}))]};
const subsFor=(st,g)=>{const own=(st.gsub||{})[g],L=own&&own.length?own.map(x=>({n:x.n,h:x.h})):baseFor(st,g);if((st.gtutor||{})[g]&&!L.some(x=>x.n==='Tutoría'))L.push({n:'Tutoría',h:1});return L};function gen1(st,seed){const GT=st.gt||{};st._w=[];
  const rnd=seeded(seed*7919),load={};st.teachers.forEach(t=>load[t.id]=0);const jobs=[];
  for(const g of st.groups)for(const s of subsFor(st,g)){
    if(!(s.h>0))continue;if(s.n==='Tutoría'){const tt=(st.gtutor||{})[g];if(!tt||!(tt in load))continue;load[tt]+=s.h;jobs.push({g,s:s.n,t:tt,h:s.h});continue}
    const el=st.teachers.filter(t=>t.subjects.includes(s.n)&&(!GT[g]||!t.turno||t.turno==='Ambos'||t.turno===GT[g]));if(!el.length)return null;
    const cp=t=>capOf(t)||40,ok=el.filter(t=>!capOf(t)||load[t.id]+s.h<=capOf(t));if(!ok.length)st._w.push(g+' · '+s.n);const pool=ok.length?ok:el;pool.sort((a,b)=>load[a.id]/cp(a)-load[b.id]/cp(b)||rnd()-.5);const mn=load[pool[0].id]/cp(pool[0]),pf=pool.find(t=>(t.prefs||[]).includes(g)&&load[t.id]/cp(t)<=mn+.12),ch=pf||pool[0];load[ch.id]+=s.h;jobs.push({g,s:s.n,t:ch.id,h:s.h});
  }
  jobs.sort((a,b)=>load[b.t]-load[a.t]||rnd()-.5);
  const gb=new Set,tb=new Set,sd={},td={},out=[];
  for(const j of jobs)for(let k=0;k<j.h;k++){
    let best=null,bs=1e9;
    for(let d=0;d<5;d++)for(let p=(GT[j.g]==='Vespertino'?PER:0);p<(GT[j.g]==='Vespertino'?2*PER:PER);p++){if(!valid(p))continue;
      if(gb.has(j.g+'|'+d+'|'+p)||tb.has(j.t+'|'+d+'|'+p))continue;
      const sc=(sd[j.g+'|'+j.s+'|'+d]||0)*100+(td[j.t+'|'+d]||0)*3+rnd()*8+p*.6;if(sc<bs){bs=sc;best=[d,p]}
    }
    if(!best)return null;
    const [d,p]=best;gb.add(j.g+'|'+d+'|'+p);tb.add(j.t+'|'+d+'|'+p);
    sd[j.g+'|'+j.s+'|'+d]=(sd[j.g+'|'+j.s+'|'+d]||0)+1;td[j.t+'|'+d]=(td[j.t+'|'+d]||0)+1;
    out.push({g:j.g,s:j.s,t:j.t,d,p});
  }
  return out;
}
function seedState(logo){
  const wd=new Date().getDay();
  const st={school:'',logo:logo||'',real:false,
    subjects:[{n:'Matemáticas',h:5},{n:'Español',h:5},{n:'Inglés',h:3},{n:'Ciencias',h:4},{n:'Historia',h:3},{n:'Geografía',h:2},{n:'Educación Física',h:2},{n:'Artes',h:2},{n:'Informática',h:2},{n:'Formación Cívica',h:2}],
    teachers:[['Ana Ramírez','Matemáticas'],['Luis Torres','Matemáticas'],['Marta López','Español'],['Hugo Mendoza','Español'],['Sofía Hernández','Inglés'],['Diego Cruz','Inglés'],['Laura García','Ciencias'],['Raúl Ortiz','Ciencias'],['Paola Salinas','Historia,Geografía'],['Iván Vega','Geografía,Formación Cívica'],['Rosa Soto','Formación Cívica,Historia'],['Carlos Ríos','Educación Física'],['Elena Luna','Artes'],['Jorge Peña','Informática']].map((x,i)=>({id:'t'+(i+1),name:x[0],subjects:x[1].split(',')})),
    groups:['1A','1B','2A','2B','3A','3B'],schedule:[],status:{},declined:{},makeup:[],
    users:[{id:'u0',name:'Dirección',user:'admin',pass:'admin',role:'admin'},{id:'u1',name:'Ana Ramírez',user:'ana',pass:'1234',role:'teacher',tid:'t1'}],
    sess:null,clock:{d:Math.min(Math.max(wd-1,0),4),p:2},me:'t1'};
  st.schedule=generate(st)||[];return st;
}
function loadState(){try{const r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch(e){}return null}
function save(){try{localStorage.setItem('planify.v1',JSON.stringify({school:S.school,logo:S.logo,subjects:S.subjects}))}catch(e){}}
let S=(function(){let l={};try{l=JSON.parse(localStorage.getItem('planify.v1'))||{}}catch(e){}const b=seedState();return{school:l.school||'',logo:l.logo||'',real:false,subjects:[],teachers:[],groups:[],schedule:[],status:{},declined:{},makeup:[],users:[],sess:null,prof:null,clock:b.clock,me:''}})();
let ui={tab:'me',kind:'g',sel:'',msg:null,confirm:null,off:false,reg:false};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tname=id=>(S.teachers.find(t=>t.id===id)||{name:'?'}).name;
const at=(g,d,p)=>S.schedule.find(e=>e.g===g&&e.d===d&&e.p===p);
const tat=(t,d,p)=>S.schedule.find(e=>e.t===t&&e.d===d&&e.p===p);
const stat=t=>S.status[S.clock.d+'|'+S.clock.p+'|'+t]||'ok';
const hoursOf=t=>S.schedule.filter(e=>e.t===t).length;
const U=()=>S.sess&&S.prof?{name:S.prof.name,role:S.prof.rol,tid:S.prof.rol==='admin'?null:S.prof.id}:null;
const isAdmin=()=>{const u=U();return !!u&&u.role==='admin'};
const meId=()=>{const u=U();return u&&u.tid?u.tid:(u&&u.role==='admin'?'':S.me)};
function groupState(g){const {d,p}=S.clock,e=at(g,d,p);if(S.gt[g]&&S.gt[g]!==turnoP(p))return{k:'off'};if(!e)return{k:'free'};const s=stat(e.t);return{k:s==='ok'?'ok':s,e}}
function offers(){
  const {d,p}=S.clock,out=[];
  for(const g of S.groups){
    if(['ok','off'].includes(groupState(g).k))continue;
    for(const t of S.teachers){
      if(tat(t.id,d,p)||stat(t.id)!=='ok'||!covers(t,p))continue;
      const fut=S.schedule.filter(e=>e.t===t.id&&e.g===g&&(e.d>d||(e.d===d&&e.p>p))).sort((a,b)=>a.d-b.d||a.p-b.p)[0];
      const key=d+'|'+p+'|'+g+'|'+t.id;
      if(fut&&!S.declined[key])out.push({g,t:t.id,e:fut,key});
    }
  }
  return out;
}
function acceptOffer(key){
  const o=offers().find(x=>x.key===key);if(!o)return;
  const {d,p}=S.clock,m=at(o.g,d,p),e=o.e,od=e.d,op=e.p;
  if(m){if(!tat(m.t,od,op)){m.d=od;m.p=op}else{S.schedule=S.schedule.filter(x=>x!==m);S.makeup.push({g:m.g,s:m.s,t:m.t})}}
  e.d=d;e.p=p;save();toast('Listo: adelantaste '+e.s+' con '+e.g+'. Esa hora queda libre en tu horario.');
}
function regen(){
  const r=generate(S);
  if(r){S.schedule=r;S.makeup=[];S.status={};S.declined={};const h=S.teachers.map(t=>hoursOf(t.id));
    ui.msg={ok:1,t:'Horario generado sin choques. Carga por maestro: de '+Math.min(...h)+' a '+Math.max(...h)+' horas a la semana.'+(S._w&&S._w.length?' ⚠ '+S._w.length+' asignación(es) superan el límite de horas de algún maestro; revisa Maestros → Horas.':'')}}
  else ui.msg={ok:0,t:'No se pudo repartir sin choques. Revisa que cada materia tenga al menos un maestro y que las horas no pasen de '+(DAYS.length*CFG.M.n)+' por grupo, y que el turno de cada grupo tenga horas en Jornada y receso.'};
  save();
}
const chip=(k,t)=>`<span class="chip ${k}">${esc(t)}</span>`;
const hourLabel=p=>`${p%PER+1}ª hora · ${TIMES[p]}`;
const logoImg=()=>S.logo?`<img src="${S.logo}" alt="Logo de ${esc(S.school)}">`:'';

function vTop(){
  const u=U();
  return `<div class="brand">${logoImg()}<div><b>Planify</b><br><span>${esc(S.school||'')}</span></div></div>
  <div class="row">${u?`<small>${esc(u.name)}</small><button class="btn small ghost" data-act="logout">Salir</button>`:''}</div>`;
}
function vLogin(){
  const m=ui.msg?`<div class="msg${ui.msg.ok?'':' bad'}">${esc(ui.msg.t)}</div>`:'';
  if(ui.reg)return `<div class="card hero login"><div class="logo">${logoImg()}<b>Crear cuenta</b><small>Escribe la clave de tu plantel. Dirección aprobará tu acceso.</small></div>${m}
    <div class="field"><label for="rc">Clave del plantel (CCT)</label><input type="text" id="rc" autocapitalize="characters"></div><div class="field"><label for="rn">Nombre y apellido</label><input type="text" id="rn"></div><div class="field"><label for="rt">Turno</label><select id="rt" class="f"><option>Matutino</option><option>Vespertino</option><option>Ambos</option></select></div>
    <div class="field"><label for="ru">Correo institucional</label><input type="text" id="ru" autocapitalize="none"></div>
    <div class="field"><label for="rp">Contraseña</label><input type="password" id="rp" autocomplete="new-password"></div>
    <small>Tus materias las eliges al entrar, en <b>Mi día → Mis materias</b>.</small>
    <button class="btn primary" data-act="reg">Enviar mi solicitud de acceso →</button><button class="btn ghost" data-act="toreg">Ya tengo cuenta, iniciar sesión</button></div>`;
  return `<div class="card hero login"><div class="logo">${logoImg()}<b>Planify</b><small>Bienvenido. Inicia sesión para consultar y gestionar los horarios</small></div>${m}
    <div class="field"><label for="lc">Clave del plantel (CCT)</label><input type="text" id="lc" autocapitalize="characters"></div><div class="field"><label for="lu">Correo</label><input type="text" id="lu" autocapitalize="none"></div>
    <div class="field"><label for="lp">Contraseña</label><input type="password" id="lp" autocomplete="current-password"></div>
    <button class="btn primary" data-act="login">Entrar a mi cuenta →</button><button class="btn" data-act="toreg">¿Eres nuevo? Solicita tu acceso</button><button class="btn ghost" data-act="forgot">¿Olvidaste tu contraseña? Te ayudamos</button>
    </div>`;
}
function vClock(){
  const {d,p}=S.clock,r=!!S.real;
  return `<div class="clock"><div class="clock-main"><button class="ic" data-act="prev" aria-label="Hora anterior"${r?' disabled':''}>‹</button>
    <div class="clock-now"><span class="mono">${DAYS[d]} ${TIMES[p]}</span><small>${p%PER+1}ª hora · ${turnoP(p)} · ${r?'hora real':'hora simulada'}</small></div>
    <button class="ic" data-act="next" aria-label="Hora siguiente"${r?' disabled':''}>›</button></div>
    <div class="sim"><label>Día <select id="day"${r?' disabled':''}>${DAYS_FULL.map((x,i)=>`<option value="${i}"${i===d?' selected':''}>${x}</option>`).join('')}</select></label>
    <button class="tg" data-act="real">${r?'Usar simulación':'Usar hora real'}</button></div>
    ${r&&ui.off?'<div class="off">Fuera de horario de clases. Se muestra la última hora.</div>':''}</div>`;
}
function vAlert(){
  const t=meId(),mine=offers().filter(o=>o.t===t);if(!mine.length)return '';
  const o=mine[0];
  return `<div class="card alert" role="alert"><div class="row"><h3>🔔 Alerta de cobertura${mine.length>1?' ('+mine.length+')':''}</h3>${chip('bad','Urgente')}</div>
    <div><b>${esc(o.g)} se quedó sin maestro ahora</b><br><small>¿Adelantar tu clase de ${esc(o.e.s)} (${DAYS[o.e.d]} ${TIMES[o.e.p]}) a esta hora? Tu hora original quedará libre.</small></div>
    <div class="row"><button class="btn primary" data-act="acc" data-key="${esc(o.key)}">Adelantar clase</button><button class="btn" data-act="dec" data-key="${esc(o.key)}">No puedo</button></div></div>`;
}
function vMe(){
  const {d,p}=S.clock,id=meId(),t=S.teachers.find(x=>x.id===id)||S.teachers[0]||{id:'',name:'—',subjects:[]};
  const e=tat(t.id,d,p),s=stat(t.id);
  const seg=items=>`<div class="seg">${items.map(([v,l,c])=>`<button class="btn${s===v?' on '+c:''}" data-act="set" data-v="${v}" data-t="${t.id}">${l}</button>`).join('')}</div>`;
  let now;
  if(e){
    const note=s==='ok'?'Confirmado. Se avisa a dirección que entras.':s==='meeting'?'Marcaste junta. Tu grupo queda sin maestro.':'Marcaste que no asistirás. Tu grupo queda sin maestro.';
    const near=offers().filter(o=>o.g===e.g).length;
    now=`<div class="card hero"><div class="row"><small class="mono">${hourLabel(p)}</small>${chip(s==='ok'?'ok':s==='meeting'?'warn':'bad',s==='ok'?'Entras':s==='meeting'?'En junta':'Ausente')}</div>
      <div><div class="big">${esc(e.g)} · ${esc(e.s)}</div><small>${note}${s!=='ok'?` Se avisó a ${near} maestro(s) en sala de maestros.`:''}</small></div>
      ${seg([['ok','Voy a entrar',''],['meeting','Tengo junta','warn'],['absent','No asistiré','bad']])}</div>`;
  }else{
    now=`<div class="card hero"><div class="row"><small class="mono">${hourLabel(p)}</small>${chip(s==='ok'?'info':'warn',s==='ok'?'Descanso':'No disponible')}</div>
      <div><div class="big">Hora libre · descanso</div><small>${s==='ok'?'Si algún grupo se queda sin maestro, te llegará una alerta para adelantar tu clase.':'No recibirás alertas de cobertura esta hora.'}</small></div>
      ${seg([['ok','Estoy disponible',''],['meeting','Tengo junta / ocupado','warn']])}</div>`;
  }
  let nx;
  if(!valid(p+1)||p+1>=P)nx='Fin de la jornada de hoy.';
  else{const x=tat(t.id,d,p+1);nx=`<b>${hourLabel(p+1)}</b> → ${x?`<b>${esc(x.g)}</b> · ${esc(x.s)}`:'<b>Hora libre</b> (descanso en sala de maestros)'}`;}
  const next=`<div class="card"><div class="row"><h3>Sigue</h3>${isRecAfter(p)?chip('warn','Receso '+RC(p)):''}</div><p>${nx}</p></div>`;
  const agenda=`<div class="card"><h3>Mi día · ${DAYS_FULL[d]}</h3><div class="list">${visFor(t).map(i=>[TIMES[i],i]).map(([tm,i])=>{
    const x=tat(t.id,d,i);
    return `<div class="li day-row${i===p?' now':''}"><span class="t mono">${tm}</span><div style="flex:1">${x?`<b>${esc(x.g)}</b> · ${esc(x.s)}`:'<span class="muted">Libre · descanso</span>'}</div>${i===p?chip('info','Ahora'):''}</div>`
      +(isRecAfter(i)?`<div class="li day-row rec"><span class="t mono">${RC(i).slice(0,5)}</span><div style="flex:1"><b>Receso</b> · ${RC(i)}</div>${chip('warn','Descanso')}</div>`:'');}).join('')}</div>
    <small>${hoursOf(t.id)} horas a la semana asignadas.</small></div>`;
  const pick=isAdmin()?`<div class="card"><div class="field"><label for="me">Ver como maestro / maestra</label><select id="me" class="f">${S.teachers.map(x=>`<option value="${x.id}"${x.id===t.id?' selected':''}>${esc(x.name)} · ${esc(x.subjects.join(', '))}</option>`).join('')}</select></div></div>`:'';
  return `<div class="hello"><h1>Buen día, ${esc(((U()||{}).name||'').split(' ')[0])}</h1><small>Este es tu panorama de hoy, ${DAYS_FULL[d]}.</small></div>`+emptyMe()+pick+now+next+agenda+misMat()+misPref()+misHoras()+mfaCard();
}
function vSchool(){
  const {d,p}=S.clock,rows=S.groups.map(g=>({g,st:groupState(g)})).filter(r=>r.st.k!=='off'),bad=rows.filter(r=>r.st.k!=='ok').length,free=S.teachers.filter(t=>!tat(t.id,d,p)&&covers(t,p));
  const line=r=>{const st=r.st,n=offers().filter(o=>o.g===r.g).length;
    if(st.k==='ok')return `<div class="li"><div><b>${esc(r.g)}</b> · ${esc(st.e.s)}<br><small>${esc(tname(st.e.t))}</small></div>${chip('ok','En clase')}</div>`;
    if(st.k==='free')return `<div class="li"><div><b>${esc(r.g)}</b> · sin clase asignada<br><small>${n} maestro(s) con aviso de cobertura</small></div>${chip('bad','Sin maestro')}</div>`;
    return `<div class="li"><div><b>${esc(r.g)}</b> · ${esc(st.e.s)}<br><small>${esc(tname(st.e.t))} ${st.k==='meeting'?'está en junta':'no asistirá'} · ${n} maestro(s) avisados</small></div>${chip('bad','Sin maestro')}</div>`};
  return `${pasos()}${emptyLive()}<div class="card"><div class="row"><div><h2>En vivo</h2><small>Grupos con o sin maestro en este momento.</small></div><small class="mono">${DAYS[d]} ${TIMES[p]}</small></div>
    <div class="row"><div><div class="big">${rows.length-bad} de ${rows.length}</div><small>grupos con maestro</small></div>${bad?chip('bad',bad+' sin cubrir'):chip('ok','Todo cubierto')}</div></div>
    <div class="card"><div class="list">${rows.map(line).join('')}</div></div>
    <div class="card"><h3>Sala de maestros (${free.length})</h3><div class="subs">${free.length?free.map(t=>`<span class="chip ${stat(t.id)==='ok'?'info':'warn'}">${esc(t.name)}${stat(t.id)==='ok'?'':' · junta'}</span>`).join(''):'<small>Nadie libre esta hora.</small>'}</div></div>
    ${S.makeup.length?`<div class="card"><h3>Clases por reponer</h3><div class="list">${S.makeup.map(m=>`<div class="li"><div><b>${esc(m.g)}</b> · ${esc(m.s)}<br><small>${esc(tname(m.t))}</small></div>${chip('warn','Pendiente')}</div>`).join('')}</div></div>`:''}`;
}
function vTable(){
  const kind=ui.kind,opts=kind==='g'?S.groups.map(g=>[g,'Grupo '+g]):S.teachers.map(t=>[t.id,t.name]);
  if(!opts.find(o=>o[0]===ui.sel))ui.sel=opts[0]?opts[0][0]:'';
  const cell=(d,p)=>{const e=kind==='g'?at(ui.sel,d,p):tat(ui.sel,d,p),now=S.clock.d===d&&S.clock.p===p;
    return `<td data-d="${d}" class="${now?'now':''}${isAdmin()&&kind==='g'?' ed':''}"${isAdmin()&&kind==='g'?` data-act="cell" data-d="${d}" data-p="${p}"`:''}>${e?`<b>${esc(e.s)}</b><span>${esc(kind==='g'?tname(e.t).split(' ').slice(-1)[0]:e.g)}</span>`:'<span>·</span>'}</td>`};
  return `${emptyTable()}<div class="card"><div><h2>Horarios</h2><small>${isAdmin()&&ui.kind==='g'?'Toca una celda para cambiarla o dejarla libre.':'Consulta el horario de un grupo o de un maestro.'}</small></div><div class="row">
    <div class="field" style="flex:1;min-width:130px"><label for="kind">Ver por</label><select id="kind" class="f"><option value="g"${kind==='g'?' selected':''}>Grupo</option><option value="t"${kind==='t'?' selected':''}>Maestro</option></select></div>
    <div class="field" style="flex:2;min-width:160px"><label for="sel">Elegir</label><select id="sel" class="f">${opts.map(o=>`<option value="${esc(o[0])}"${o[0]===ui.sel?' selected':''}>${esc(o[1])}</option>`).join('')}</select></div></div>
    <div class="dayseg">${DAYS.map((x,i)=>`<button class="btn${(ui.day!=null?ui.day:S.clock.d)===i?' on':''}" data-act="tday" data-v="${i}">${x}</button>`).join('')}</div><div class="scroll"><table class="dv${ui.day!=null?ui.day:S.clock.d}"><thead><tr><th>Hora</th>${DAYS.map((x,i)=>`<th data-d="${i}">${x}</th>`).join('')}</tr></thead><tbody>
    ${visTable().map(p=>[TIMES[p],p]).map(([tm,p])=>`<tr><th class="mono">${tm}</th>${DAYS.map((_,d)=>cell(d,p)).join('')}</tr>`+(isRecAfter(p)?`<tr><th class="mono">Receso</th><td colspan="5"><span>${RC(p)}</span></td></tr>`:'')).join('')}</tbody></table></div>
    <small>La celda resaltada es la hora actual. Un punto significa hora libre.</small>${ui.kind==='g'&&S.groups.length?`<div class="row"><button class="btn small" data-act="pdf1">Imprimir horario del salón (PDF)</button>${isAdmin()?`<button class="btn small" data-act="gedit" data-g="${esc(ui.sel)}">✏️ Materias y tutor del grupo</button><button class="btn small" data-act="pdfall">Imprimir horarios de todos los grupos</button>`:''}</div>`:''}</div>${cellEditor()}`;
}
function vSetup(){
  const hs=S.teachers.map(t=>hoursOf(t.id)),mx=Math.max(1,...hs);
  return `<div class="card"><h2>Generar horario</h2>
    ${ui.msg?`<div class="msg${ui.msg.ok?'':' bad'}">${esc(ui.msg.t)}</div>`:''}
    <button class="btn primary" data-act="gen">Generar horario equitativo →</button>
    <small>Reparte las horas de cada materia entre los maestros que la imparten, al de menor carga, sin que nadie esté en dos salones a la vez.</small></div>
  <!--@e--><div class="card"><h3>Escuela y logo</h3><div class="field"><label for="sn">Nombre que aparece arriba</label><input type="text" id="sn" value="${esc(S.school||'')}"></div>
    <div class="row">${logoImg()}<div class="field"><label for="logo">Insertar logo (imagen)</label><input type="file" id="logo" accept="image/*"></div>${S.logo?'<button class="btn small ghost" data-act="rmlogo">Quitar logo</button>':''}</div></div>
  <!--@e--><div class="card"><h3>Jornada y receso</h3><small>Cada escuela define sus horas. Ejemplo: entrada 07:00, 50 min por hora, 8 horas y receso de 30 min después de la 3ª hora. Pon 0 horas para apagar un turno.</small>
  ${['M','V'].map(sh=>{const c=CFG[sh],a=sh==='M'?0:PER;return `<div class="stack"><b>${sh==='M'?'Matutino':'Vespertino'}${c.n?` · ${TIMES[a]}–${ENDS[a+c.n-1]}${REC[sh]?' · receso '+REC[sh]:''}`:' · apagado'}</b>
  <div class="row"><label>Entrada <input type="text" id="hi-${sh}" value="${c.ini}" style="width:80px"></label><label>Min por hora <input type="number" id="hd-${sh}" value="${c.dur}" min="30" max="90"></label><label>Horas <input type="number" id="hn-${sh}" value="${c.n}" min="0" max="10"></label></div>
  <div class="row"><label>Receso después de la hora n.º <input type="number" id="hr-${sh}" value="${c.rec}" min="0" max="9"></label><label>Duración (min) <input type="number" id="hc-${sh}" value="${c.recDur}" min="0" max="60"></label></div></div>`}).join('')}
  <div class="field"><label for="hp">Periodo en el encabezado del PDF (opcional)</label><input type="text" id="hp" value="${esc(CFG.periodo||'')}" placeholder="Septiembre 2026 - Enero 2027"></div>
  <button class="btn primary" data-act="saveH">Guardar jornada y receso</button><small>Después de guardar, toca "Generar horario equitativo".</small></div>
  <!--@p-->${hoursEditor()}<!--@p-->${normasCard()}<!--@p--><div class="card"><h3>Maestros (${S.teachers.length}) · cuentas: ${S.users.length}</h3><div class="list">${S.teachers.map(t=>`
    <div class="li"><div style="flex:1"><b>${esc(t.name)}</b> <small>${esc(t.subjects.join(', '))}</small><br><small>${esc(nombLabel(t))}</small>${t.exs>t.exa?' '+chip('warn','Pide +'+t.exs+' h')+' <button class="btn small" data-act="hok" data-id="'+t.id+'" data-n="'+t.exs+'">Autorizar</button>':''}<div class="bar"><i style="width:${hoursOf(t.id)/mx*100}%"></i></div></div>
    <span class="mono">${hoursOf(t.id)}${capOf(t)?' / '+capOf(t):''} h</span><button class="btn small ghost" data-act="hedit" data-id="${t.id}">Horas</button><button class="btn small ghost${ui.confirm===t.id?' confirm':''}" data-act="delT" data-t="${t.id}" aria-label="Quitar a ${esc(t.name)}">${ui.confirm===t.id?'¿Seguro?':'Quitar'}</button></div>`).join('')}</div>
    <small>Cada maestro crea su propia cuenta desde la pantalla de inicio (sin límite de usuarios).</small></div>
  <!--@e-->${mfaCard()}<!--@e--><div class="card"><h3>Ciclo escolar</h3><div class="seg"><button class="btn${S.ciclo==='par'?'':' on'}" data-act="ciclo" data-v="impar">Agosto: semestres 1, 3, 5</button><button class="btn${S.ciclo==='par'?' on':''}" data-act="ciclo" data-v="par">Febrero: semestres 2, 4, 6</button></div></div>
  <!--@a--><div class="card"><h3>Asignaturas por semestre</h3><small>Escribe la asignatura y elige en qué semestre se imparte (ej. Inglés III en 3°). Los grupos de ese semestre la toman solos; después puedes quitar o agregar por grupo con ✏️.</small>
  ${[1,2,3,4,5,6].map(n=>{const L=S.catalog.filter(x=>x.sem===n);return L.length?`<div class="stack"><b>${n}° semestre</b><div class="list">${L.map(x=>`<div class="li"><div>${esc(x.n)} <small>${x.h} h</small></div><button class="btn small ghost" data-act="cdel" data-id="${x.id}">Quitar</button></div>`).join('')}</div></div>`:''}).join('')}
  <div class="row"><select id="cs2" class="f" style="width:90px">${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}°</option>`).join('')}</select><input type="text" id="cn" placeholder="Nombre de la asignatura" style="flex:1"><label>Horas por semana <input type="number" id="cx" value="3" min="1" max="10"></label><button class="btn" data-act="cadd">+ Agregar asignatura</button></div></div>
  <!--@a--><div class="card"><h3>Especialidades y submódulos</h3><small>Solo Dirección puede agregarlos o quitarlos.</small>
  ${S.specs.map(x=>`<div class="stack"><div class="row"><b>${esc(x.n)}</b><button class="btn small ghost" data-act="delE" data-id="${x.id}">Quitar</button></div><div class="list">${S.sm.filter(m=>m.spec===x.id).sort((a,b)=>a.sem-b.sem).map(m=>`<div class="li"><div>${m.sem}° · ${esc(m.n)} <small>${m.h} h</small></div><button class="btn small ghost" data-act="delM" data-id="${m.id}">Quitar</button></div>`).join('')}</div></div>`).join('')}
  <div class="row"><input type="text" id="en" placeholder="Nueva especialidad (ej. Programación)" style="flex:1"><button class="btn" data-act="addE">+ Crear especialidad</button></div>
  <div class="field"><label for="mn">Agregar submódulo a una especialidad</label><div class="row"><select id="me2" class="f" style="flex:1">${S.specs.map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join('')}</select><select id="ms" class="f" style="width:90px">${semOpts()}</select><input type="number" id="mh" value="4" min="1" max="10"></div><input type="text" id="mn" placeholder="Nombre del submódulo"><button class="btn" data-act="addM">+ Agregar submódulo</button></div></div>
  <!--@p--><div class="card"><h3>Administradores (${S.admins.length})</h3><small>Pueden cambiar todo en tu escuela. Para agregar otro, aprueba su solicitud como administrador.</small><div class="list">${S.admins.map(a=>`<div class="li"><div><b>${esc(a.name)}</b>${a.uid===S.sess?' '+chip('info','Tú'):''}</div>${a.uid===S.sess?'':`<button class="btn small ghost${ui.confirm===a.id?' confirm':''}" data-act="delT" data-t="${a.id}">${ui.confirm===a.id?'¿Seguro?':'Quitar'}</button>`}</div>`).join('')}</div></div>
  <!--@p--><div class="card"><h3>Solicitudes de acceso (${S.requests.length})</h3><small>Cuando alguien crea su cuenta con la clave de tu plantel, aparece aquí. Aprueba solo a personas que conozcas: revisa su nombre y su correo.</small>
  ${S.requests.length?`<div class="list">${S.requests.map(q=>`<div class="li" style="flex-wrap:wrap"><div><b>${esc(q.nombre)}</b><br><small>${esc(q.email)} · ${esc(q.turno)}</small></div><div class="row"><button class="btn small primary" data-act="apT" data-id="${q.id}" data-t="${esc(q.turno)}">✓ Aprobar como maestro</button><button class="btn small" data-act="apA" data-id="${q.id}" data-t="${esc(q.turno)}">Aprobar como administrador</button><button class="btn small ghost" data-act="rej" data-id="${q.id}">Rechazar</button></div></div>`).join('')}</div>`:'<small>No hay solicitudes pendientes.</small>'}</div>
  <!--@g-->${groupEditor()}<!--@g--><div class="card"><h3>Grupos (${S.groups.length})</h3><div class="subs">${S.groups.map(g=>`<span class="chip info">${esc(g)} · ${(S.gt[g]||'M')[0]} · ${S.gsem[g]||1}° ${esc(specName(S.gspec[g]))} <button class="btn small ghost" style="min-height:0;padding:0 4px;border:0" data-act="gedit" data-g="${esc(g)}" aria-label="Materias de ${esc(g)}">✏️</button><button class="btn small ghost${ui.confirm==='g:'+g?' confirm':''}" style="min-height:0;padding:0 4px;border:0" data-act="delG" data-g="${esc(g)}" aria-label="Quitar grupo ${esc(g)}">${ui.confirm==='g:'+g?'¿Seguro?':'×'}</button></span>`).join('')}</div>
    <div class="stack"><b>Nuevo grupo</b>
    <div class="field"><label for="ng">Nombre del grupo</label><input type="text" id="ng" placeholder="Ej. 3A"></div>
    <div class="row"><div class="field" style="flex:1"><label for="gt">Turno</label><select id="gt" class="f"><option>Matutino</option><option>Vespertino</option></select></div><div class="field" style="flex:1"><label for="gs">Semestre</label><select id="gs" class="f">${semOpts()}</select></div></div>
    <div class="field"><label for="gp">Especialidad</label><select id="gp" class="f"><option value="">Sin especialidad (tronco común)</option>${S.specs.map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join('')}</select></div>
    <div class="field"><label for="gtt">Tutor (opcional)</label><select id="gtt" class="f"><option value="">Sin tutor</option>${S.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><small>El tutor se elige una sola vez y se queda con el grupo hasta 6° semestre: su hora de Tutoría aparece en cada horario.</small></div>
    <button class="btn primary" data-act="addG">+ Crear este grupo</button></div>
    <div class="stack"><b>Cambio de ciclo escolar</b><small>Sube todos los grupos un semestre (los tutores se quedan con su grupo) y los de 6° se dan de baja. Se borran los horarios y las listas propias para volver a generarlos.</small>
    <button class="btn${ui.confirm==='adv'?' confirm':''}" data-act="advance">${ui.confirm==='adv'?'¿Seguro? Toca otra vez para confirmar':'Avanzar al siguiente ciclo'}</button></div></div>
  `;
}
const ICONS={me:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
 school:'<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
 table:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
 setup:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>'};
function render(){
  $('#top').innerHTML=vTop();
  const u=U();
  if(!u){$('#clock').innerHTML='';$('#alert').innerHTML='';$('#nav').innerHTML='';$('#nav').style.display='none';$('#main').innerHTML=vLogin();return}
  $('#nav').style.display='';
  const tabs=isAdmin()?[['school','En vivo'],['table','Horarios'],['setup','Configurar']]:[['me','Mi día'],['school','En vivo'],['table','Horarios']];
  if(!tabs.find(x=>x[0]===ui.tab))ui.tab=tabs[0][0];
  $('#clock').innerHTML=vClock();$('#alert').innerHTML=vAlert();
  $('#main').innerHTML={me:vMe,school:vSchool,table:vTable,setup:vSetup}[ui.tab]();
  const n=offers().filter(o=>o.t===meId()).length;
  $('#nav').style.gridTemplateColumns=`repeat(${tabs.length},1fr)`;
  $('#nav').innerHTML=tabs.map(([k,l])=>`<button class="${ui.tab===k?'on':''}" data-tab="${k}">${ICONS[k]}<span>${l}</span>${k==='me'&&n?`<i class="badge">${n}</i>`:''}${k==='setup'&&S.requests.length?`<i class="badge">${S.requests.length}</i>`:''}</button>`).join('');
  notifyNew();
}
let seen=new Set(),toastTimer;
function notifyNew(){
  const mine=offers().filter(o=>o.t===meId()),fresh=mine.filter(o=>!seen.has(o.key));seen=new Set(mine.map(o=>o.key));
  if(fresh.length){toast('🔔 '+fresh[0].g+' no tiene maestro. ¿Adelantar tu clase de '+fresh[0].e.s+'?');try{navigator.vibrate&&navigator.vibrate([150,80,150])}catch(e){}}
}
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4500)}
function realSlot(){
  const n=new Date(),wd=n.getDay()-1;if(wd<0||wd>4)return null;const m=n.getHours()*60+n.getMinutes();
  for(let p=0;p<P;p++){const [h,mi]=TIMES[p].split(':').map(Number),st=h*60+mi;if(m>=st&&m<st+(valid(p)?CFG[shiftOf(p)].dur:0))return{d:wd,p}}return null;
}
function tick(force){
  if(!S.real){ui.off=false;if(force){save();render()}return}
  const r=realSlot(),was=ui.off;ui.off=!r;const changed=r&&(r.d!==S.clock.d||r.p!==S.clock.p);if(changed)S.clock=r;
  if(changed||was!==ui.off||force){save();render()}
}
function step(dir){let {d,p}=S.clock;p+=dir;if(p>=P){p=0;d=(d+1)%5}if(p<0){p=P-1;d=(d+4)%5}S.clock={d,p}}
function boot(){
  document.addEventListener('click',ev=>{
    const tb=ev.target.closest('[data-tab]');if(tb){ui.tab=tb.dataset.tab;render();window.scrollTo(0,0);return}
    const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
    if(a!=='delT'&&a!=='delG')ui.confirm=null;
    if(a==='prev'){if(!S.real)step(-1)}else if(a==='next'){if(!S.real)step(1)}
    else if(a==='real'){S.real=!S.real;tick(true)}
    else if(a==='set')S.status[S.clock.d+'|'+S.clock.p+'|'+b.dataset.t]=b.dataset.v;
    else if(a==='acc')acceptOffer(b.dataset.key);
    else if(a==='dec')S.declined[b.dataset.key]=1;
    else if(a==='gen')regen();
    else if(a==='reset'){S=seedState(S.logo);ui.msg=null;ui.reg=false;seen=new Set()}
    else if(a==='logout'){S.sess=null;ui.msg=null;seen=new Set()}
    else if(a==='toreg'){ui.reg=!ui.reg;ui.msg=null}
    else if(a==='login'){const un=$('#lu').value.trim().toLowerCase(),pw=$('#lp').value,u=S.users.find(x=>x.user===un&&x.pass===pw);
      if(u){S.sess=u.id;ui.msg=null;ui.tab='me';seen=new Set()}else ui.msg={ok:0,t:'Usuario o contraseña incorrectos.'}}
    else if(a==='reg'){
      const name=$('#rn').value.trim(),un=$('#ru').value.trim().toLowerCase(),pw=$('#rp').value;
      const subs=[...document.querySelectorAll('.ns:checked')].map(x=>S.subjects[+x.value].n);
      if(!name||!un||!pw||!subs.length)ui.msg={ok:0,t:'Llena nombre, usuario y contraseña, y marca al menos una materia.'};
      else if(S.users.some(x=>x.user===un))ui.msg={ok:0,t:'Ese usuario ya existe. Elige otro.'};
      else{const tid='t'+Date.now(),uid='u'+Date.now();S.teachers.push({id:tid,name,subjects:subs});S.users.push({id:uid,name,user:un,pass:pw,role:'teacher',tid});regen();S.sess=uid;ui.reg=false;ui.tab='me';ui.msg=null;seen=new Set()}
    }
    else if(a==='rmlogo')S.logo='';
    else if(a==='delT'){if(ui.confirm!==b.dataset.t)ui.confirm=b.dataset.t;else{const id=b.dataset.t;ui.confirm=null;S.teachers=S.teachers.filter(t=>t.id!==id);S.users=S.users.filter(u=>u.tid!==id);if(S.me===id)S.me=S.teachers[0]?S.teachers[0].id:'';if(!U())S.sess=null;regen()}}
    else if(a==='delG'){const k='g:'+b.dataset.g;if(ui.confirm!==k)ui.confirm=k;else{ui.confirm=null;S.groups=S.groups.filter(g=>g!==b.dataset.g);regen()}}
    else if(a==='addG'){const v=$('#ng').value.trim().toUpperCase();if(v&&!S.groups.includes(v)){S.groups.push(v);regen()}}
    save();render();
  });
  document.addEventListener('change',ev=>{
    const t=ev.target;
    if(t.id==='day')S.clock.d=+t.value;
    else if(t.id==='me'){S.me=t.value;seen=new Set()}
    else if(t.id==='sn'){S.school=t.value.trim();if(S.prof&&S.prof.school_id)sb.from('schools').update({nombre:S.school}).eq('id',S.prof.school_id)}
    else if(t.id==='kind'){ui.kind=t.value;ui.sel=''}
    else if(t.id==='sel')ui.sel=t.value;
    else if(t.id==='logo'){const f=t.files[0];if(!f)return;const r=new FileReader();
      r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,240/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);S.logo=c.toDataURL('image/png');save();render();if(S.prof&&S.prof.school_id)sb.from('schools').update({logo:S.logo}).eq('id',S.prof.school_id)};im.src=r.result};r.readAsDataURL(f);return}
    else if(t.classList.contains('sh')){S.subjects[+t.dataset.i].h=Math.max(0,Math.min(10,+t.value||0));ui.msg=null}
    else return;
    save();render();
  });
  setInterval(tick,30000);tick();render();
}
const SB_URL='https://rscorenutlyzflzgsbhm.supabase.co',SB_KEY='sb_publishable_7Og4mvxWwdrNz3KujOa9cQ__Ws5gK9p';
const sb=supabase.createClient(SB_URL,SB_KEY);
S.gt={};S.gsem={};S.gspec={};S.gtutor={};S.catalog=[];S.gsub={};S.admins=[];S.specs=[];S.sm=[];S.ciclo='impar';S.allowed=[];S.requests=[];S.mfa=[];ui.form={};
const LOCK={n:0,u:0};
try{if(window.top!==window.self)window.top.location=window.self.location}catch(e){document.documentElement.innerHTML=''}
const AUTHF=['lc','lu','lp','rc','rn','rt','ru','rp','np'];
function fieldErrors(list){
  document.querySelectorAll('.ferr').forEach(e=>e.remove());
  document.querySelectorAll('[aria-invalid]').forEach(e=>{e.removeAttribute('aria-invalid');e.classList.remove('bad')});
  (list||[]).forEach(([id,msg],i)=>{const el=document.getElementById(id);if(!el)return;el.setAttribute('aria-invalid','true');el.classList.add('bad');el.insertAdjacentHTML('afterend',`<small class="ferr" role="alert">${esc(msg)}</small>`);if(i===0)el.focus()});
}
const _render=render;
render=function(){
  if(!U())AUTHF.forEach(id=>{const e=document.getElementById(id);if(e)ui.form[id]=e.value});
  _render();
  if(U())ui.form={};else AUTHF.forEach(id=>{const e=document.getElementById(id);if(e&&ui.form[id]!=null)e.value=ui.form[id]});
  const sr=document.getElementById('search');if(sr)sr.hidden=!U();
  if(ui.errs){fieldErrors(ui.errs);ui.errs=null}
};
function friendly(m){
  if(/Invalid login/i.test(m))return{f:'lp',t:'El correo o la contraseña no coinciden. Revisa mayúsculas y espacios, o toca "¿Olvidaste tu contraseña?".'};
  if(/not confirmed/i.test(m))return{f:'lu',t:'Aún no confirmas tu correo. Abre el mensaje que te enviamos y toca el enlace.'};
  if(/already registered/i.test(m))return{f:'ru',t:'Ese correo ya tiene una cuenta. Toca "Ya tengo cuenta" e inicia sesión.'};
  if(/rate limit|too many|seconds/i.test(m))return{f:'',t:'Se hicieron demasiados intentos. Espera unos minutos y vuelve a probar.'};
  if(/password/i.test(m))return{f:'rp',t:'Esa contraseña no es suficientemente segura. Usa 8 o más caracteres con letras y números.'};
  return{f:'',t:m};
}
function go(d){ui.tab=d.tab;if(d.sub)ui.sub=d.sub;ui.msg=null;render();window.scrollTo(0,0);setTimeout(()=>{const f=d.focus&&document.getElementById(d.focus);if(f)f.focus();const sc=d.scroll&&document.getElementById(d.scroll);if(sc)sc.scrollIntoView({behavior:'smooth'})},60)}
const card=(h,t,btn)=>`<div class="card"><h3>${h}</h3><small>${t}</small>${btn}</div>`;
function emptyLive(){if(S.groups.length)return '';return isAdmin()?card('Aún no hay grupos','Crea tu primer grupo para empezar a armar horarios.','<button class="btn primary" data-act="goto" data-tab="setup" data-sub="g" data-focus="ng">+ Crear mi primer grupo</button>'):card('Aún no hay horario','Dirección todavía no lo publica. Mientras tanto, elige las materias que impartes.','<button class="btn primary" data-act="goto" data-tab="me" data-scroll="mis-materias">Elegir mis materias</button>')}
function emptyTable(){if(S.schedule.length)return '';return isAdmin()?card('Todavía no hay horario generado','Cuando tengas grupos, asignaturas y maestros, genéralo con un clic.','<button class="btn primary" data-act="goto" data-tab="setup" data-sub="x">Ir a generar el horario →</button>'):card('Todavía no hay horario','Aparecerá aquí cuando Dirección lo genere.','')}
function emptyMe(){if(isAdmin()||S.schedule.some(e=>e.t===(S.prof&&S.prof.id)))return '';return card('Aún no tienes clases asignadas','Marca las materias que puedes impartir y Dirección las tomará en cuenta al generar el horario.','<button class="btn primary" data-act="goto" data-tab="me" data-scroll="mis-materias">Elegir mis materias →</button>')}
function MFAFORM(){return `<div class="card hero login"><div class="logo"><b>Verificación en dos pasos</b></div>${ui.msg?`<div class="msg${ui.msg.ok?'':' bad'}">${esc(ui.msg.t)}</div>`:''}<small>Abre tu app autenticadora y escribe el código de 6 dígitos de Planify.</small><div class="field"><label for="mfal">Código de 6 dígitos</label><input type="text" id="mfal" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><button class="btn primary" data-act="mfalogin">Verificar y entrar →</button><button class="btn ghost" data-act="logout">Cancelar</button></div>`}
function mfaCard(){
  if((S.mfa||[]).length)return `<div class="card" id="mfa-card"><h3>Verificación en dos pasos</h3><small>Activada. Al iniciar sesión te pediremos el código de tu app autenticadora.</small><button class="btn small ghost${ui.confirm==='mfaoff'?' confirm':''}" data-act="mfaoff">${ui.confirm==='mfaoff'?'¿Seguro? Toca otra vez para desactivar':'Desactivar'}</button></div>`;
  if(ui.enr)return `<div class="card" id="mfa-card"><h3>Activa la verificación en dos pasos</h3><small>1. Abre Google Authenticator, Microsoft Authenticator o similar. 2. Escanea este código. 3. Escribe el número de 6 dígitos que muestra.</small><div style="text-align:center"><img src="${ui.enr.qr}" alt="Código QR para tu app autenticadora" width="180" height="180"></div><small>¿No puedes escanear? Escribe esta clave: <b class="mono">${esc(ui.enr.secret)}</b></small><div class="field"><label for="mfac">Código de 6 dígitos</label><input type="text" id="mfac" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><button class="btn primary" data-act="mfaverify">Confirmar y activar</button></div>`;
  return `<div class="card" id="mfa-card"><h3>Verificación en dos pasos</h3><small>Protege tu cuenta con un código temporal de tu celular. Muy recomendado para Dirección.</small><button class="btn primary" data-act="mfaon">Activar ahora →</button></div>`;
}
const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function entries(){return (isAdmin()?[
 ['📅','Generar horario equitativo','generar horario reparto crear armar','setup','x'],
 ['🏫','Crear un grupo','grupo nuevo agregar salon crear','setup','g','ng'],
 ['👤','Elegir o cambiar el tutor de un grupo','tutor tutoria grupo cambiar','setup','g'],
 ['📚','Agregar asignaturas por semestre','asignatura materia semestre agregar','setup','a','cn'],
 ['🎓','Crear una especialidad o submódulo','especialidad submodulo modulo carrera','setup','a','en'],
 ['⏰','Cambiar hora de entrada, duración o receso','receso hora entrada jornada descanso duracion','setup','e','hi-M'],
 ['🖼️','Subir el logo de la escuela','logo imagen escuela nombre','setup','e'],
 ['🗓️','Avanzar al siguiente ciclo escolar','ciclo semestre avanzar siguiente agosto febrero','setup','g'],
 ['✅','Aprobar solicitudes de acceso','solicitud aprobar acceso maestros nuevos autorizar','setup','p'],
 ['🛡️','Agregar o quitar administradores','administrador admin quitar agregar','setup','p'],
 ['⏱️','Editar nombramiento y horas de un maestro','horas nombramiento 20 30 40 tiempo completo medio extra maestro','setup','p'],
 ['🖨️','Imprimir horarios en PDF','pdf imprimir horario salon descargar','table'],
 ['🔍','Ver el horario de un grupo o maestro','horario grupo maestro consultar ver','table'],
 ['🟢','Ver qué grupos tienen maestro ahora','ahora en vivo sin maestro cobertura','school'],
 ['🔒','Activar verificación en dos pasos','seguridad dos pasos 2fa contrasena autenticacion','setup','e','mfa-card']
 ]:[
 ['🏠','Ver mi día y qué sigue','mi dia siguiente clase hoy','me'],
 ['📚','Elegir las materias que imparto','materias elegir marcar impartir','me','','','mis-materias'],
 ['🎯','Elegir grupos que prefiero (opcional)','grupo preferido elegir','me','','','mis-grupos'],
 ['🧑‍🏫','Marcar que soy tutor de un grupo','tutor tutoria','me','','','mis-grupos'],
 ['🙋','Avisar que no asistiré o tengo junta','falta ausente junta asistire avisar','me'],
 ['⏱️','Pedir más horas de lo habitual (opcional)','horas extra mas solicitar nombramiento','me','','','mis-horas'],
 ['🗓️','Consultar el horario de un grupo','horario grupo consultar','table'],
 ['🟢','Ver quién está disponible ahora','disponible ahora en vivo sala maestros','school'],
 ['🔒','Seguridad de mi cuenta (dos pasos)','seguridad dos pasos 2fa','me','','','mfa-card']
 ]).concat([['🚪','Cerrar sesión','salir cerrar sesion','logout']])}
(function(){
  const box=document.getElementById('search');
  box.innerHTML='<div class="sbox"><span aria-hidden="true">🔎</span><input id="q" type="search" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="qres" aria-label="Buscar en Planify" placeholder="Buscar en Planify…"></div><div class="sres" id="qres" role="listbox" hidden></div>';
  const q=document.getElementById('q'),res=document.getElementById('qres');let list=[],idx=-1,ph=0;
  const show=()=>{
    const t=norm(q.value).split(/\s+/).filter(Boolean),all=entries();
    list=t.length?all.filter(e=>t.every(w=>norm(e[1]+' '+e[2]).includes(w))).slice(0,7):all.slice(0,6);idx=list.length?0:-1;
    res.innerHTML=(t.length?'':'<h4>Prueba buscar…</h4>')+(list.length?list.map((e,i)=>`<button role="option" data-i="${i}" class="${i===idx?'act':''}"><span aria-hidden="true">${e[0]}</span><span>${esc(e[1])}</span></button>`).join(''):`<small>No encontré “${esc(q.value)}”. Prueba con: horario, grupo, receso, maestros o PDF.</small>`);
    res.hidden=false;q.setAttribute('aria-expanded','true');
  };
  const hide=()=>{res.hidden=true;q.setAttribute('aria-expanded','false')};
  const pick=i=>{const e=list[i];if(!e)return;q.value='';hide();q.blur();
    if(e[3]==='logout'){const b=document.querySelector('[data-act="logout"]');if(b)b.click();return}
    go({tab:e[3],sub:e[4],focus:e[5],scroll:e[6]})};
  q.addEventListener('focus',show);q.addEventListener('input',show);q.addEventListener('blur',()=>setTimeout(hide,150));
  res.addEventListener('mousedown',ev=>{const b=ev.target.closest('button[data-i]');if(b){ev.preventDefault();pick(+b.dataset.i)}});
  q.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'){hide();q.blur()}
    else if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();if(!list.length)return;idx=(idx+(ev.key==='ArrowDown'?1:-1)+list.length)%list.length;[...res.querySelectorAll('button')].forEach((b,i)=>b.classList.toggle('act',i===idx))}
    else if(ev.key==='Enter'){ev.preventDefault();pick(Math.max(idx,0))}
  });
  document.addEventListener('keydown',ev=>{if(ev.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&!box.hidden){ev.preventDefault();q.focus()}});
  setInterval(()=>{if(document.activeElement!==q){const p=entries();q.placeholder='Prueba: '+p[ph++%Math.min(p.length,6)][1].toLowerCase()+'…'}},3500);
})();

function pasos(){
  if(!isAdmin())return '';
  const rq=S.requests.length?`<div class="card alert"><b>🔔 ${S.requests.length} solicitud(es) de acceso por aprobar</b><small>Configurar → 4 · Maestros</small></div>`:'';
  const st=[[S.hasHor,'Configura la jornada y el receso','Configurar → 1 · Escuela'],[S.catalog.length>0,'Agrega las asignaturas de cada semestre','Configurar → 2 · Asignaturas'],[S.groups.length>0,'Crea tus grupos','Configurar → 3 · Grupos'],[S.teachers.length>0||S.requests.length>0,'Pasa el enlace y la clave del plantel a tus maestros','Configurar → 4 · Maestros'],[S.teachers.length>0,'Aprueba sus solicitudes','Configurar → 4 · Maestros'],[S.schedule.length>0,'Genera el horario equitativo','Configurar → 5 · Generar']];
  if(st.every(x=>x[0]))return rq;
  return rq+`<div class="card hero"><h3>Primeros pasos</h3><div class="list">${st.map(x=>`<div class="li"><div>${x[0]?'✅':'⬜'} ${x[1]}${x[2]?` <small>· ${x[2]}</small>`:''}</div></div>`).join('')}</div></div>`;
}
function misPref(){
  const t=S.teachers.find(x=>x.id===(S.prof&&S.prof.id));if(isAdmin()||!t||!S.groups.length)return '';
  const mine=S.groups.find(g=>S.gtutor[g]===t.id)||'';
  return `<div class="card" id="mis-grupos"><h3>Mis grupos <small>(opcional)</small></h3><small>Si quieres dar clase a ciertos grupos, márcalos. Se toma en cuenta al generar el horario, pero no es obligatorio.</small>
  <div class="subs">${S.groups.map(g=>`<label><input type="checkbox" class="pg" value="${esc(g)}"${(t.prefs||[]).includes(g)?' checked':''}> ${esc(g)}</label>`).join('')}</div><button class="btn" data-act="savePg">Guardar mis grupos</button>
  <div class="field"><label for="tu">Soy tutor del grupo <small>(opcional)</small></label><select id="tu" class="f"><option value="">Ninguno</option>${S.groups.filter(g=>!S.gtutor[g]||S.gtutor[g]===t.id).map(g=>`<option${g===mine?' selected':''}>${esc(g)}</option>`).join('')}</select></div><button class="btn" data-act="saveTu">Guardar tutoría</button><small>La Tutoría de ese grupo siempre aparece con tu nombre en su horario.</small></div>`;
}
function groupEditor(){
  const g=ui.gedit;if(!g||!S.groups.includes(g))return '';
  const own=S.gsub[g]||[],L=own.length?own:baseFor(S,g),tut=S.gtutor[g];
  return `<div class="card hero"><div class="row"><h3>✏️ Materias y tutor de ${esc(g)}</h3><button class="btn small ghost" data-act="gclose">Cerrar</button></div>
  <small>${own.length?'Este grupo tiene su propia lista.':'Ahora usa la lista base de su semestre. Agrega una asignatura o toca "Personalizar" para editarla.'}</small>
  <div class="field"><label for="gtu">Tutor del grupo (opcional)</label><select id="gtu" class="f"><option value="">Sin tutor</option>${S.teachers.map(t=>`<option value="${t.id}"${tut===t.id?' selected':''}>${esc(t.name)}</option>`).join('')}</select><small>Con tutor, la hora de Tutoría (1 h) se agrega sola con su nombre.</small></div>
  <div class="list">${L.map(x=>`<div class="li"><div>${esc(x.n)} <small>${x.h} h</small></div>${x.id?`<button class="btn small ghost" data-act="gsdel" data-id="${x.id}">Quitar</button>`:''}</div>`).join('')}</div>
  ${own.length?'':'<button class="btn" data-act="gcust">Personalizar esta lista</button>'}
  <div class="row"><input type="text" id="gsn" placeholder="Nueva asignatura (ej. Inglés III)" style="flex:1"><input type="number" id="gsh" value="3" min="1" max="10"><button class="btn" data-act="gsadd">+ Agregar a este grupo</button></div>
  ${own.length?'<button class="btn small ghost" data-act="grst">Volver a la lista base</button>':''}</div>`;
}
async function ensureOwn(g){if((S.gsub[g]||[]).length)return;const rows=baseFor(S,g).map(x=>({school_id:S.prof.school_id,grupo:g,nombre:x.n,horas:x.h})).filter((r,i,a)=>a.findIndex(y=>y.nombre===r.nombre)===i);if(rows.length)await sb.from('group_subjects').insert(rows)}
function hoursEditor(){
  const t=S.teachers.find(x=>x.id===ui.hedit);if(!t)return '';
  return `<div class="card hero"><div class="row"><h3>Horas de ${esc(t.name)}</h3><button class="btn small ghost" data-act="hclose">Cerrar</button></div>
  <small>Fija el nombramiento y el máximo de horas. Planify no pasará de ese límite al generar el horario (suma las horas extra que autorices).</small>
  <div class="field"><label for="hn">Nombramiento</label><select id="hn" class="f"><option value="">Sin definir (sin límite)</option>${[['medio','Medio tiempo · 20 h'],['tres','Tres cuartos de tiempo · 30 h'],['tc','Tiempo completo · 40 h'],['asig','Por horas de asignatura']].map(([v,l])=>`<option value="${v}"${t.nomb===v?' selected':''}>${l}</option>`).join('')}</select></div>
  <div class="row"><div class="field" style="flex:1"><label for="hb">Horas semanales de nombramiento</label><input type="number" id="hb" min="1" max="60" value="${t.base||''}"></div><div class="field" style="flex:1"><label for="hm">Máximo frente a grupo (opcional)</label><input type="number" id="hm" min="1" max="60" value="${t.maxf||''}"></div></div>
  <div class="field"><label for="he">Horas extra autorizadas</label><input type="number" id="he" min="0" max="20" value="${t.exa||0}"><small>${t.exs?'El maestro solicitó +'+t.exs+' h.':'El maestro no ha solicitado horas extra.'}</small></div>
  <button class="btn primary" data-act="hsave">Guardar horas</button></div>`;
}
document.addEventListener('change',ev=>{if(ev.target.id==='hn'){const m={medio:20,tres:30,tc:40}[ev.target.value],hb=document.getElementById('hb');if(m&&hb)hb.value=m}});
function misHoras(){
  const t=S.teachers.find(x=>x.id===(S.prof&&S.prof.id));if(isAdmin()||!t)return '';
  const hh=hoursOf(t.id),cap=capOf(t);
  return `<div class="card" id="mis-horas"><h3>Mis horas</h3>
  <small>${esc(nombLabel(t))}${t.base?' · '+t.base+' h por semana':''}. Este horario te asigna <b>${hh}</b> h${cap?' de un máximo de <b>'+cap+'</b>':''}.</small>
  <div class="field"><label for="xh">¿Quieres más horas de lo habitual? <small>(opcional)</small></label><select id="xh" class="f">${[0,2,4,6,8,10].map(n=>`<option value="${n}"${(t.exs||0)===n?' selected':''}>${n?'+ '+n+' horas':'No, con mis horas habituales'}</option>`).join('')}</select></div>
  <button class="btn" data-act="askx">Enviar mi solicitud</button>
  <small>${t.exs?(t.exa>=t.exs?'Dirección ya autorizó +'+t.exa+' h.':'Solicitaste +'+t.exs+' h. Dirección decide según las necesidades del plantel y el presupuesto disponible.'):'Dirección decide si hay horas disponibles según las necesidades del plantel y el presupuesto.'}</small></div>`;
}
function normasCard(){return `<details class="card"><summary>Normas DGETI sobre horas del personal docente (consulta)</summary>
<small>Resumen informativo de las <i>Normas que regulan las condiciones específicas de trabajo del personal docente de la DGETI</i> (1984), solo en lo que se relaciona con horas. No es asesoría legal: confirma siempre el texto vigente con Recursos Humanos o tu representación sindical.</small>
<ul>
<li><b>Profesores de carrera</b> (art. 14): nombramientos de <b>20, 30 o 40 horas semana-mes</b>. Medio tiempo 20 h, tres cuartos de tiempo 30 h y tiempo completo 40 h.</li>
<li><b>Jornada</b> (art. 85): se fija de acuerdo con las necesidades del plantel.</li>
<li><b>Más horas</b> (art. 76 de las Normas y art. 69 del Reglamento de Promoción): el incremento de horas de carrera, de medio tiempo a tres cuartos o de tres cuartos a tiempo completo dentro de la misma categoría, se hace a juicio de la Dirección del plantel, con partida presupuestal y necesidad académica. Por eso en Planify el maestro <b>solicita</b> horas extra y Dirección las <b>autoriza</b>.</li>
<li><b>Límites de docencia frente a grupo:</b> en los textos consultados aparecen límites distintos según categoría y nivel (por ejemplo, para tiempo completo 30, 32 o 34 h; para medio tiempo 15, 16 o 18 h). Por eso Planify no impone un número: Dirección fija el <b>máximo frente a grupo</b> de cada maestro.</li>
<li><b>Horas de asignatura</b> (art. 86): revisa el texto oficial. En Planify captura sus horas semanales con el nombramiento "Por horas de asignatura".</li>
</ul>
<small>Fuentes: <a href="http://cbtis174.edu.mx/img/doc/Normas_que_Regulan_las_Condiciones_Especficas_del_Personal_Docente_de_la_DGETI.pdf" target="_blank" rel="noopener noreferrer">texto de las Normas (PDF)</a> · <a href="http://uemstis.sep.gob.mx/index.php/normateca/104-categoria-leyesreglamentos/148-recursos-humanos" target="_blank" rel="noopener noreferrer">Normateca de la UEMSTIS</a>.</small></details>`}
const shiftIdx=sh=>[...Array(PER).keys()].map(k=>(sh==='V'?PER:0)+k).filter(valid);
function visFor(t){const o=[];if(covers(t,0))o.push(...shiftIdx('M'));if(covers(t,PER))o.push(...shiftIdx('V'));return o}
function visTable(){if(ui.kind==='g')return shiftIdx(S.gt[ui.sel]==='Vespertino'?'V':'M');return visFor(S.teachers.find(x=>x.id===ui.sel)||{})}
step=function(dir){let {d,p}=S.clock;for(let i=0;i<P*2;i++){p+=dir;if(p>=P){p=0;d=(d+1)%5}if(p<0){p=P-1;d=(d+4)%5}if(valid(p))break}S.clock={d,p}};
const _vs=vSetup;
vSetup=function(){const html=_vs(),sub=ui.sub||'e',parts=html.split('<!--@'),head=parts.shift();
  const T=[['e','1 · Escuela','Nombre, logo, ciclo escolar y horas de entrada y receso.'],['a','2 · Asignaturas','Agrega las asignaturas de cada semestre y, si aplica, las especialidades con sus submódulos.'],['g','3 · Grupos','Crea los grupos, elige su tutor y ajusta sus asignaturas con ✏️.'],['p','4 · Maestros','Aprueba las solicitudes de tus maestros y revisa quién ya tiene acceso.'],['x','5 · Generar','Cuando todo esté listo, genera el horario equitativo.']];
  const cur=T.find(x=>x[0]===sub)||T[0];
  return `<div class="seg">${T.map(x=>`<button class="btn${sub===x[0]?' on':''}" data-act="sub" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><div class="card"><small>${cur[2]}</small></div>`+(sub==='x'?head:(ui.msg?`<div class="msg${ui.msg.ok?'':' bad'}">${esc(ui.msg.t)}</div>`:'')+parts.filter(x=>x[0]===sub).map(x=>x.slice(4)).join(''))};
function cellEditor(){
  const c=ui.cell;if(!c||!isAdmin()||ui.kind!=='g')return '';
  const g=ui.sel,e=at(g,c.d,c.p),subs=subsFor(S,g).map(x=>x.n),sub=ui.csel||(e&&e.s)||subs[0];
  const opts=S.teachers.filter(t=>covers(t,c.p)&&t.subjects.includes(sub));
  return `<div class="card hero"><h3>${esc(g)} · ${DAYS_FULL[c.d]} ${TIMES[c.p]}</h3><small>${e?'Ahora: '+esc(e.s)+' con '+esc(tname(e.t)):'Hora libre'}</small>
  <div class="field"><label for="cs">Materia o submódulo</label><select id="cs" class="f">${subs.map(n=>`<option${n===sub?' selected':''}>${esc(n)}</option>`).join('')}</select></div>
  <div class="field"><label for="ct">Maestro</label><select id="ct" class="f">${opts.length?opts.map(t=>`<option value="${t.id}"${e&&e.t===t.id?' selected':''}>${esc(t.name)}</option>`).join(''):'<option value="">Nadie imparte esta materia en este turno</option>'}</select></div>
  <div class="row"><button class="btn primary" data-act="saveC">Guardar cambio</button>${e?'<button class="btn" data-act="clrC">Dejar libre</button>':''}<button class="btn ghost" data-act="noC">Cerrar</button></div></div>`;
}
document.addEventListener('change',async ev=>{const t=ev.target;if(t.id==='cs'){ui.csel=t.value;render()}else if(t.id==='gtu'){await sb.from('groups').update({tutor_id:t.value||null}).eq('school_id',S.prof.school_id).eq('nombre',ui.gedit);await load()}});
function printSheets(list){
  const y=new Date().getFullYear(),per=(CFG.periodo||(S.ciclo==='par'?'Febrero '+y+' - Julio '+y:'Agosto '+y+' - Enero '+(y+1))).toUpperCase();
  const sem=['','PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO'];
  const pages=list.map(g=>{
    const sh=S.gt[g]==='Vespertino'?'V':'M',sub={},rows=[];
    S.schedule.filter(e=>e.g===g).forEach(e=>{const o=sub[e.s]||(sub[e.s]={h:0,t:new Set()});o.h++;o.t.add(tname(e.t))});
    const sum=Object.entries(sub).map(([n,o])=>[n,o.h,[...o.t].join(' / ')]);
    shiftIdx(sh).forEach(p=>{rows.push({p});if(isRecAfter(p))rows.push({rec:RC(p)})});
    const sc=r=>r?`<td class="a">${esc(r[0])}</td><td>${r[1]}</td><td class="a">${esc(r[2])}</td>`:'<td></td><td></td><td></td>';
    let body='';
    for(let i=0;i<Math.max(rows.length,sum.length);i++){
      const r=rows[i];
      if(!r)body+=`<tr><td></td><td></td><td></td><td></td><td></td><td></td>${sc(sum[i])}</tr>`;
      else if(r.rec)body+=`<tr><td class="h">${esc(r.rec).replace('–','<br>')}</td><td colspan="5" class="rc">R E C E S O</td>${sc(sum[i])}</tr>`;
      else body+=`<tr><td class="h">${TIMES[r.p]}<br>${ENDS[r.p]}</td>${DAYS.map((_,d)=>{const e=at(g,d,r.p);return `<td>${e?esc(e.s):''}</td>`}).join('')}${sc(sum[i])}</tr>`;
    }
    return `<section><div class="hd">${S.logo?`<img src="${S.logo}">`:''}<div><b>${esc(S.school)}</b><br>${esc(S.cct||'')}</div></div><h1>SEMESTRE ${esc(per)}</h1><h2>ESPECIALIDAD: ${esc(specName(S.gspec[g])||'Tronco común').toUpperCase()}</h2><p>SEMESTRE: <b>${sem[S.gsem[g]]||''}</b> &nbsp;&nbsp; GRUPO: <b>${esc(g)}</b> &nbsp;&nbsp; TURNO: <b>${sh==='V'?'VESPERTINO':'MATUTINO'}</b>${S.gtutor[g]?`<br>TUTOR(A): <b>${esc(tname(S.gtutor[g]))}</b>`:''}</p><table><tr><th>HORA</th>${DAYS_FULL.map(x=>`<th>${x.toUpperCase()}</th>`).join('')}<th>ASIGNATURA</th><th>HR</th><th>MAESTRO</th></tr>${body}</table><div class="sg"><div>Jefatura de Servicios Docentes</div><div>Subdirección Académica</div><div>Dirección del Plantel</div></div></section>`;
  }).join('');
  const w=window.open('','_blank');if(!w){toast('Permite las ventanas emergentes para generar el PDF.');return}
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Horarios ${esc(S.school)}</title><style>@page{size:letter;margin:12mm}body{font:11px Arial,sans-serif;margin:0}section{page-break-after:always;text-align:center}section:last-child{page-break-after:auto}.hd{display:flex;align-items:center;gap:10px;text-align:left}.hd img{height:50px}h1{font-size:15px;margin:8px 0 2px}h2{font-size:14px;margin:2px 0}table{width:100%;border-collapse:collapse;margin-top:8px}tr{height:34px}th,td{border:1px solid #000;padding:4px;font-size:9px}td.h{white-space:nowrap}td.rc{font-weight:700;letter-spacing:6px;font-size:12px}td.a{text-align:center}.sg{display:flex;justify-content:space-around;margin-top:60px}.sg div{border-top:1px solid #000;padding-top:4px;width:30%}</style>${pages}`);
  w.document.close();setTimeout(()=>w.print(),500);
}

const semOpts=()=>(S.ciclo==='par'?[2,4,6]:[1,3,5]).map(n=>`<option value="${n}">${n}°</option>`).join('');
const specName=id=>(S.specs.find(x=>x.id===id)||{n:''}).n;
const allNames=()=>[...S.subjects.map(x=>x.n),...S.catalog.map(x=>x.n),...S.sm.map(m=>m.n),...Object.values(S.gsub).flat().map(x=>x.n)].filter((v,i,a)=>v!=='Tutoría'&&a.indexOf(v)===i);
function misMat(){
  const t=S.teachers.find(x=>x.id===(S.prof&&S.prof.id));if(isAdmin()||!t)return '';
  const secs=[...[1,2,3,4,5,6].map(n=>[n+'° semestre',S.catalog.filter(x=>x.sem===n).map(x=>[x.n,x.n])]),...S.specs.map(sp=>['Especialidad: '+sp.n,S.sm.filter(m=>m.spec===sp.id).map(m=>[m.n,m.sem+'° · '+m.n])])];
  const known=new Set(secs.flatMap(x=>x[1].map(i=>i[0])));
  const otros=[...new Set(Object.values(S.gsub).flat().map(x=>x.n))].filter(n=>n!=='Tutoría'&&!known.has(n));
  if(otros.length)secs.push(['Otras',otros.map(n=>[n,n])]);
  const body=secs.filter(x=>x[1].length).map(x=>`<b>${esc(x[0])}</b><div class="subs">${x[1].map(([v,l])=>`<label><input type="checkbox" class="mm" value="${esc(v)}"${t.subjects.includes(v)?' checked':''}> ${esc(l)}</label>`).join('')}</div>`).join('');
  return `<div class="card" id="mis-materias"><h3>Mis materias</h3><small>Marca las asignaturas que puedes impartir. Dirección las usa al generar el horario.</small>${body||'<small>Dirección aún no ha agregado asignaturas.</small>'}<button class="btn" data-act="saveM">Guardar mis materias</button><small>Dirección debe volver a generar el horario para aplicar los cambios.</small></div>`;
}
const _vl=vLogin;
vLogin=function(){return ui.mfaLogin?MFAFORM():ui.rec?`<div class="card hero login"><div class="logo"><b>Nueva contraseña</b></div>${ui.msg?`<div class="msg${ui.msg.ok?'':' bad'}">${esc(ui.msg.t)}</div>`:''}<div class="field"><label for="np">Nueva contraseña (8 o más caracteres, con letras y números)</label><input type="password" id="np" autocomplete="new-password"></div><button class="btn primary" data-act="setpw">Guardar contraseña</button></div>`:_vl()};
async function load(){
  const adm=S.prof&&S.prof.rol==='admin';
  const [t,g,s,st,al,sp,sm,cat,gs]=await Promise.all([sb.from('teachers').select('*'),sb.from('groups').select('*'),sb.from('schedule').select('*'),sb.from('status').select('*'),adm?sb.from('access_requests').select('*').order('created_at'):null,sb.from('specialties').select('*'),sb.from('submodules').select('*'),sb.from('semester_subjects').select('*'),sb.from('group_subjects').select('*')]);
  S.teachers=(t.data||[]).filter(x=>x.rol!=='admin').map(x=>({id:x.id,name:x.nombre,subjects:x.materias||[],turno:x.turno,prefs:x.prefs||[],nomb:x.nombramiento,base:x.horas_base,maxf:x.max_frente,exs:x.extra_solicitadas||0,exa:x.extra_autorizadas||0}));
  S.users=S.teachers;S.admins=(t.data||[]).filter(x=>x.rol==='admin').map(x=>({id:x.id,name:x.nombre,uid:x.user_id}));S.gt={};S.gsem={};S.gspec={};S.gtutor={};(g.data||[]).forEach(x=>{S.gt[x.nombre]=x.turno;S.gsem[x.nombre]=x.semestre;S.gspec[x.nombre]=x.specialty_id;S.gtutor[x.nombre]=x.tutor_id});S.specs=(sp&&sp.data||[]).map(x=>({id:x.id,n:x.nombre}));S.sm=(sm&&sm.data||[]).map(x=>({id:x.id,spec:x.specialty_id,sem:x.semestre,n:x.nombre,h:x.horas}));S.catalog=(cat&&cat.data||[]).map(x=>({id:x.id,sem:x.semestre,n:x.nombre,h:x.horas}));S.gsub={};(gs&&gs.data||[]).forEach(x=>(S.gsub[x.grupo]=S.gsub[x.grupo]||[]).push({id:x.id,n:x.nombre,h:x.horas}));S.groups=Object.keys(S.gt).sort();S.requests=al&&al.data||[];S.allowed=[];
  S.schedule=(s.data||[]).map(x=>({id:x.id,g:x.grupo,s:x.materia,t:x.teacher_id,d:x.dia,p:x.hora}));
  S.status={};(st.data||[]).forEach(x=>S.status[x.dia+'|'+x.hora+'|'+x.teacher_id]=x.estado);
  if(!S.teachers.some(x=>x.id===S.me))S.me=S.teachers[0]?S.teachers[0].id:'';
  render();
}
let ch;
function subscribe(){
  if(ch)return;let tm;const f=()=>{clearTimeout(tm);tm=setTimeout(load,300)};
  ch=sb.channel('planify').on('postgres_changes',{event:'*',schema:'public',table:'status'},f).on('postgres_changes',{event:'*',schema:'public',table:'schedule'},f).subscribe();
}
const getP=async uid=>await sb.from('teachers').select('*').eq('user_id',uid).maybeSingle();
async function afterAuth(cct){if(ui.rec||location.hash.includes('type=recovery')){ui.rec=true;S.sess=null;render();return}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){S.sess=null;S.prof=null;render();return}
  const {data:aal}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aal&&aal.nextLevel==='aal2'&&aal.currentLevel!=='aal2'){const {data:fl}=await sb.auth.mfa.listFactors();const f=((fl&&fl.totp)||[])[0];if(f){ui.mfaLogin=f.id;S.sess=null;S.prof=null;render();return}}
  let {data:p,error:pe}=await getP(session.user.id);
  if(!p){
    let pend=null,pe2=null;try{pend=JSON.parse(localStorage.getItem('planify.pend'))}catch(e){}
    const um=session.user.user_metadata||{};if(!pend&&um.cct)pend={email:(session.user.email||'').toLowerCase(),cct:um.cct,name:um.nombre,turno:um.turno};
    if(pend&&pend.email===(session.user.email||'').toLowerCase()){
      const r=await sb.rpc('request_access',{p_cct:pend.cct,p_nombre:pend.name,p_turno:pend.turno});
      if(r.error||r.data!=='ok')pe2=r.error?r.error.message:r.data;else localStorage.removeItem('planify.pend');
    }
    const rq=await sb.from('access_requests').select('id').eq('user_id',session.user.id).maybeSingle();
    S.sess=null;S.prof=null;
    ui.msg=rq.data?{ok:1,t:'⏳ Tu solicitud ya está enviada. Falta que Dirección la apruebe; vuelve a intentar más tarde.'}:{ok:0,t:pe2||(pe&&pe.message)||'Esta cuenta no tiene acceso a ninguna escuela. Toca "Crear cuenta" para enviar tu solicitud.'};
    await sb.auth.signOut();render();return
  }
  const {data:sc}=await sb.from('schools').select('*').eq('id',p.school_id).maybeSingle();
  if(cct&&(!sc||sc.cct!==cct)){S.sess=null;S.prof=null;ui.errs=[['lc','Esta cuenta no pertenece a ese plantel. Revisa la clave (CCT).']];ui.msg={ok:0,t:'La clave del plantel (CCT) no corresponde a tu cuenta. Revisa el campo marcado; tus datos siguen ahí.'};await sb.auth.signOut();render();return}
  if(sc){S.school=sc.nombre;if(sc.logo)S.logo=sc.logo;S.ciclo=sc.ciclo||'impar';S.cct=sc.cct;S.hasHor=!!sc.horario;if(sc.horario){CFG.M={...CFG.M,...(sc.horario.M||{})};CFG.V={...CFG.V,...(sc.horario.V||{})};CFG.periodo=sc.horario.periodo||''}buildTimes()}
  S.sess=session.user.id;S.prof={id:p.id,name:p.nombre,rol:p.rol,school_id:p.school_id};if(p.rol!=='admin')S.me=p.id;
  try{const {data:fl}=await sb.auth.mfa.listFactors();S.mfa=((fl&&fl.totp)||[]).filter(f=>f.status==='verified')}catch(e){S.mfa=[]}
  ui.msg=null;ui.tab='me';seen=new Set();subscribe();await load();
}
const DBACTS=['login','reg','logout','set','acc','gen','delT','delG','addG','addA','delA','ciclo','addE','delE','addM','delM','saveM','forgot','setpw','sub','cell','noC','clrC','saveC','saveH','pdf1','pdfall','gedit','gclose','gcust','gsadd','gsdel','grst','cadd','cdel','savePg','saveTu','advance','newcode','apT','apA','rej','goto','mfaon','mfaverify','mfaoff','mfalogin','tday','hedit','hclose','hsave','hok','askx'];
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;if(!DBACTS.includes(a))return;
  ev.stopPropagation();if(a!=='delT'&&a!=='delG'&&a!=='advance')ui.confirm=null;
  try{
    if(a==='login'){
      const cct=$('#lc').value.trim().toUpperCase(),email=$('#lu').value.trim(),pw=$('#lp').value,errs=[];
      if(!cct)errs.push(['lc','Escribe la clave de tu plantel (CCT). Ejemplo: 28DCT0436Y']);
      if(!email)errs.push(['lu','Escribe tu correo.']);else if(!/^\S+@\S+\.\S+$/.test(email))errs.push(['lu','Revisa tu correo: debe tener la forma nombre@dominio.com']);
      if(!pw)errs.push(['lp','Escribe tu contraseña.']);
      if(errs.length){ui.errs=errs;ui.msg={ok:0,t:'Faltan datos para entrar. Revisa los campos marcados; lo que escribiste se conserva.'};render();return}
      if(Date.now()<LOCK.u){ui.msg={ok:0,t:'Demasiados intentos fallidos. Espera 1 minuto y vuelve a intentarlo.'};render();return}
      const {error}=await sb.auth.signInWithPassword({email,password:pw});
      if(error){if(++LOCK.n>=5){LOCK.u=Date.now()+60000;LOCK.n=0}const m=friendly(error.message);ui.errs=m.f?[[m.f,m.t]]:[];ui.msg={ok:0,t:m.f?'No se pudo entrar. Revisa el campo marcado; tus datos siguen ahí.':m.t};render()}
      else await afterAuth(cct);
    }else if(a==='reg'){
      const name=$('#rn').value.trim(),email=$('#ru').value.trim(),pw=$('#rp').value,cct=$('#rc').value.trim().toUpperCase(),turno=$('#rt').value,errs=[];
      if(!cct)errs.push(['rc','Escribe la clave de tu plantel (CCT). Pídela a Dirección si no la tienes.']);
      if(name.length<3)errs.push(['rn','Escribe tu nombre completo (nombre y apellido).']);
      if(!email)errs.push(['ru','Escribe tu correo institucional.']);else if(!/^\S+@\S+\.\S+$/.test(email))errs.push(['ru','Revisa tu correo: debe tener la forma nombre@dominio.com']);
      const miss=[];if(pw.length<8)miss.push('8 o más caracteres');if(!/[A-Za-z]/.test(pw))miss.push('al menos una letra');if(!/\d/.test(pw))miss.push('al menos un número');
      if(miss.length)errs.push(['rp','Tu contraseña necesita '+miss.join(', ')+'.']);
      if(!errs.length){const ex=await sb.rpc('school_exists',{p_cct:cct});if(!ex.data)errs.push(['rc','No encontramos esa clave de plantel. Revisa que esté bien escrita o pídela a Dirección.'])}
      if(errs.length){ui.errs=errs;ui.msg={ok:0,t:'Revisa los campos marcados en rojo. Lo que ya escribiste se conserva.'};render();return}
      const {data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname,data:{nombre:name,cct,turno}}});
      if(error){const m=friendly(error.message);ui.errs=m.f?[[m.f,m.t]]:[];ui.msg={ok:0,t:m.f?'Revisa el campo marcado en rojo.':m.t};render();return}
      localStorage.setItem('planify.pend',JSON.stringify({email:email.toLowerCase(),cct,name,turno}));
      ui.reg=false;ui.form={};
      if(data.session){
        const r=await sb.rpc('request_access',{p_cct:cct,p_nombre:name,p_turno:turno});
        await sb.auth.signOut();S.sess=null;S.prof=null;
        if(r.data==='ok'){localStorage.removeItem('planify.pend');ui.msg={ok:1,t:'Solicitud enviada. Cuando Dirección la apruebe, entra con tu correo y tu contraseña.'}}
        else ui.msg={ok:0,t:r.error?r.error.message:r.data};
      }else ui.msg={ok:1,t:'Cuenta creada. Confirma tu correo y luego inicia sesión para enviar tu solicitud.'};
      render();
    }else if(a==='logout'){ui.mfaLogin=null;await sb.auth.signOut();S.sess=null;S.prof=null;ui.msg=null;render()}
    else if(a==='set'){
      S.status[S.clock.d+'|'+S.clock.p+'|'+b.dataset.t]=b.dataset.v;render();
      await sb.from('status').upsert({teacher_id:b.dataset.t,dia:S.clock.d,hora:S.clock.p,estado:b.dataset.v});
    }else if(a==='acc'){
      const before=S.schedule.map(x=>({...x}));acceptOffer(b.dataset.key);
      const ups=S.schedule.filter(x=>{const o=before.find(y=>y.id===x.id);return o&&(o.d!==x.d||o.p!==x.p)});
      const gone=before.filter(o=>!S.schedule.some(x=>x.id===o.id));
      render();
      await Promise.all([...ups.map(x=>sb.from('schedule').update({dia:x.d,hora:x.p}).eq('id',x.id)),...gone.map(o=>sb.from('schedule').delete().eq('id',o.id))]);
      await load();
    }else if(a==='gen'){
      regen();
      const rows=S.schedule.map(x=>({grupo:x.g,materia:x.s,teacher_id:x.t,dia:x.d,hora:x.p,school_id:S.prof.school_id}));
      await sb.from('schedule').delete().not('id','is',null);
      if(rows.length){const r=await sb.from('schedule').insert(rows);if(r.error)ui.msg={ok:0,t:'Error al guardar: '+r.error.message}}
      await load();
    }else if(a==='delT'){
      const id=b.dataset.t;if(ui.confirm!==id){ui.confirm=id;render();return}
      ui.confirm=null;await sb.from('teachers').delete().eq('id',id);await load();
    }else if(a==='delG'){
      const g=b.dataset.g,k='g:'+g;if(ui.confirm!==k){ui.confirm=k;render();return}
      ui.confirm=null;await sb.from('schedule').delete().eq('grupo',g);await sb.from('group_subjects').delete().eq('grupo',g);await sb.from('groups').delete().eq('nombre',g);await load();
    }else if(a==='addG'){
      const v=$('#ng').value.trim().toUpperCase();
      if(!v){fieldErrors([['ng','Escribe el nombre del grupo, por ejemplo 3A.']]);return}
      if(S.groups.includes(v)){fieldErrors([['ng','Ya existe un grupo con ese nombre. Usa otro.']]);return}
      await sb.from('groups').insert({nombre:v,turno:$('#gt').value,semestre:+$('#gs').value,specialty_id:$('#gp').value||null,tutor_id:$('#gtt').value||null,school_id:S.prof.school_id});await load()
    }else if(a==='addA'){
      const e=$('#ae').value.trim().toLowerCase();if($('#ar').value==='admin'&&!confirm('Un administrador puede cambiar todo en tu escuela. ¿Seguro que quieres autorizarlo?'))return;
      if(e){const r=await sb.rpc('invite',{p_email:e,p_turno:$('#at').value,p_rol:$('#ar').value});if(r.error)toast(r.error.message);else ui.invite={e,c:r.data};await load()}
    }else if(a==='delA'){await sb.from('allowed_teachers').delete().eq('id',b.dataset.id);await load()
    }else if(a==='ciclo'){S.ciclo=b.dataset.v;await sb.from('schools').update({ciclo:S.ciclo}).eq('id',S.prof.school_id);render()
    }else if(a==='addE'){const v=$('#en').value.trim();if(!v){fieldErrors([['en','Escribe el nombre de la especialidad, por ejemplo Programación.']]);return}if(v){const r=await sb.from('specialties').insert({school_id:S.prof.school_id,nombre:v});if(r.error)ui.msg={ok:0,t:r.error.message};await load()}
    }else if(a==='delE'){await sb.from('specialties').delete().eq('id',b.dataset.id);await load()
    }else if(a==='delM'){await sb.from('submodules').delete().eq('id',b.dataset.id);await load()
    }else if(a==='addM'){const n=$('#mn').value.trim(),sp=$('#me2').value;if(!sp){toast('Primero crea una especialidad.');return}if(!n){fieldErrors([['mn','Escribe el nombre del submódulo.']]);return}if(n&&sp){await sb.from('submodules').insert({school_id:S.prof.school_id,specialty_id:sp,semestre:+$('#ms').value,nombre:n,horas:+$('#mh').value||4});await load()}
    }else if(a==='saveM'){const r=await sb.rpc('set_my_subjects',{p_materias:[...new Set([...document.querySelectorAll('.mm:checked')].map(x=>x.value))]});toast(r.error?r.error.message:'Materias guardadas.');await load()
    }else if(a==='forgot'){const em=$('#lu').value.trim();
      if(!em)ui.msg={ok:0,t:'Escribe tu correo en el campo de arriba y toca de nuevo "Olvidé mi contraseña".'};
      else{await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});ui.msg={ok:1,t:'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva.'}}
      render()
    }else if(a==='setpw'){const pw=$('#np').value;
      if(pw.length<8||!/[A-Za-z]/.test(pw)||!/\\d/.test(pw)){ui.errs=[['np','Mínimo 8 caracteres, con al menos una letra y un número.']];ui.msg={ok:0,t:'Revisa el campo marcado en rojo.'};render();return}
      const {error}=await sb.auth.updateUser({password:pw});
      if(error){ui.msg={ok:0,t:error.message};render();return}
      ui.rec=false;history.replaceState(null,'',location.pathname);await sb.auth.signOut();S.sess=null;S.prof=null;ui.msg={ok:1,t:'Contraseña actualizada. Inicia sesión.'};render()
    }else if(a==='sub'){ui.sub=b.dataset.v;ui.msg=null;render()
    }else if(a==='cell'){ui.cell={d:+b.dataset.d,p:+b.dataset.p};ui.csel=null;render()
    }else if(a==='noC'){ui.cell=null;render()
    }else if(a==='clrC'){const o=at(ui.sel,ui.cell.d,ui.cell.p);if(o)await sb.from('schedule').delete().eq('id',o.id);ui.cell=null;await load()
    }else if(a==='saveC'){
      const c=ui.cell,g=ui.sel,sub=$('#cs').value,tid=$('#ct').value;
      if(!tid){toast('No hay maestros disponibles para esa materia en ese turno.');return}
      const busy=tat(tid,c.d,c.p);
      if(busy&&busy.g!==g){toast(tname(tid)+' ya tiene clase con '+busy.g+' a esa hora.');return}
      const old=at(g,c.d,c.p);if(old)await sb.from('schedule').delete().eq('id',old.id);
      const r=await sb.from('schedule').insert({grupo:g,materia:sub,teacher_id:tid,dia:c.d,hora:c.p,school_id:S.prof.school_id});
      if(r.error)toast(r.error.message);ui.cell=null;await load()
    }else if(a==='saveH'){
      const nh={periodo:$('#hp').value.trim()};let bad=false;
      for(const sh of ['M','V']){const c={ini:$('#hi-'+sh).value.trim(),dur:+$('#hd-'+sh).value,n:+$('#hn-'+sh).value,rec:+$('#hr-'+sh).value,recDur:+$('#hc-'+sh).value};
        if(!/^\d{1,2}:\d{2}$/.test(c.ini)||!(c.dur>=30&&c.dur<=90)||!(c.n>=0&&c.n<=10)||!(c.rec>=0)||!(c.recDur>=0))bad=true;nh[sh]=c}
      if(bad){toast('Revisa los datos: entrada tipo 07:00, de 30 a 90 min por hora y máximo 10 horas.');return}
      CFG=nh;buildTimes();if(!valid(S.clock.p))step(1);
      const r=await sb.from('schools').update({horario:CFG}).eq('id',S.prof.school_id);
      toast(r.error?r.error.message:'Jornada guardada. Genera el horario de nuevo para aplicarla.');render()
    }else if(a==='pdf1'){printSheets([ui.sel])
    }else if(a==='pdfall'){printSheets(S.groups)
    }else if(a==='gedit'){ui.gedit=b.dataset.g;ui.tab='setup';ui.sub='g';render();window.scrollTo(0,0)
    }else if(a==='gclose'){ui.gedit=null;render()
    }else if(a==='gcust'){await ensureOwn(ui.gedit);await load()
    }else if(a==='gsadd'){const n=$('#gsn').value.trim(),h=+$('#gsh').value||3;
      if(!n){fieldErrors([['gsn','Escribe el nombre de la asignatura.']]);return}if(n){await ensureOwn(ui.gedit);const r=await sb.from('group_subjects').insert({school_id:S.prof.school_id,grupo:ui.gedit,nombre:n,horas:h});if(r.error)toast(r.error.code==='23505'?'Esa asignatura ya está en la lista.':r.error.message);await load()}
    }else if(a==='gsdel'){await sb.from('group_subjects').delete().eq('id',b.dataset.id);await load()
    }else if(a==='grst'){await sb.from('group_subjects').delete().eq('grupo',ui.gedit);await load()
    }else if(a==='cadd'){const n=$('#cn').value.trim();
      if(!n){fieldErrors([['cn','Escribe el nombre de la asignatura, por ejemplo Inglés III.']]);return}if(n){const r=await sb.from('semester_subjects').insert({school_id:S.prof.school_id,semestre:+$('#cs2').value,nombre:n,horas:+$('#cx').value||3});if(r.error)toast(r.error.message);await load()}
    }else if(a==='cdel'){await sb.from('semester_subjects').delete().eq('id',b.dataset.id);await load()
    }else if(a==='savePg'){const r=await sb.rpc('set_my_prefs',{p_prefs:[...document.querySelectorAll('.pg:checked')].map(x=>x.value)});toast(r.error?r.error.message:'Listo, tus grupos se tomarán en cuenta al generar el horario.');await load()
    }else if(a==='saveTu'){const r=await sb.rpc('set_my_tutor',{p_group:$('#tu').value||null});toast(r.error?r.error.message:'Tutoría guardada.');await load()
    }else if(a==='hedit'){ui.hedit=b.dataset.id;ui.tab='setup';ui.sub='p';render();window.scrollTo(0,0)
    }else if(a==='hclose'){ui.hedit=null;render()
    }else if(a==='hsave'){
      const base=+$('#hb').value||null,maxf=+$('#hm').value||null,ex=+$('#he').value||0,errs=[];
      if(base&&(base<1||base>60))errs.push(['hb','Escribe entre 1 y 60 horas.']);
      if(maxf&&(maxf<1||maxf>60))errs.push(['hm','Escribe entre 1 y 60 horas.']);
      if(base&&maxf&&maxf>base)errs.push(['hm','El máximo frente a grupo no puede ser mayor que las horas de nombramiento.']);
      if(ex<0||ex>20)errs.push(['he','Las horas extra van de 0 a 20.']);
      if(errs.length){fieldErrors(errs);return}
      const r=await sb.from('teachers').update({nombramiento:$('#hn').value||null,horas_base:base,max_frente:maxf,extra_autorizadas:ex}).eq('id',ui.hedit);
      toast(r.error?r.error.message:'Horas guardadas. Genera el horario de nuevo para aplicarlas.');if(!r.error)ui.hedit=null;await load()
    }else if(a==='hok'){const r=await sb.from('teachers').update({extra_autorizadas:+b.dataset.n}).eq('id',b.dataset.id);toast(r.error?r.error.message:'Horas extra autorizadas. Genera el horario de nuevo para aplicarlas.');await load()
    }else if(a==='askx'){const r=await sb.rpc('request_extra_hours',{p_n:+$('#xh').value||0});toast(r.error?r.error.message:'Solicitud enviada a Dirección.');await load()
    }else if(a==='tday'){ui.day=+b.dataset.v;render()
    }else if(a==='goto'){go(b.dataset)
    }else if(a==='mfaon'){
      const {data:fl}=await sb.auth.mfa.listFactors();for(const f of ((fl&&fl.all)||[]))if(f.status==='unverified')await sb.auth.mfa.unenroll({factorId:f.id});
      const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Planify '+Date.now()});
      if(error)toast(error.message);else ui.enr={id:data.id,qr:data.totp.qr_code,secret:data.totp.secret};render()
    }else if(a==='mfaverify'){
      const code=$('#mfac').value.trim();
      if(!/^\d{6}$/.test(code)){fieldErrors([['mfac','Escribe los 6 números que muestra tu app autenticadora.']]);return}
      const {error}=await sb.auth.mfa.challengeAndVerify({factorId:ui.enr.id,code});
      if(error){fieldErrors([['mfac','Ese código no es correcto o ya venció. Escribe el que aparece ahora en tu app.']]);return}
      ui.enr=null;const {data:fl}=await sb.auth.mfa.listFactors();S.mfa=((fl&&fl.totp)||[]).filter(f=>f.status==='verified');toast('Verificación en dos pasos activada.');render()
    }else if(a==='mfaoff'){
      if(ui.confirm!=='mfaoff'){ui.confirm='mfaoff';render();return}
      ui.confirm=null;const f=(S.mfa||[])[0];if(f){const {error}=await sb.auth.mfa.unenroll({factorId:f.id});if(error){toast(error.message);return}S.mfa=[]}toast('Verificación en dos pasos desactivada.');render()
    }else if(a==='mfalogin'){
      const code=$('#mfal').value.trim();
      if(!/^\d{6}$/.test(code)){ui.errs=[['mfal','Escribe los 6 números que muestra tu app autenticadora.']];render();return}
      const {error}=await sb.auth.mfa.challengeAndVerify({factorId:ui.mfaLogin,code});
      if(error){ui.errs=[['mfal','Código incorrecto o vencido. Escribe el que muestra tu app ahora.']];render();return}
      ui.mfaLogin=null;await afterAuth()
    }else if(a==='apT'||a==='apA'){
      const adm=a==='apA';if(adm&&!confirm('Un administrador puede cambiar todo en tu escuela. ¿Seguro?'))return;
      const r=await sb.rpc('approve_request',{p_id:b.dataset.id,p_rol:adm?'admin':'teacher',p_turno:b.dataset.t});
      toast(r.error?r.error.message:(r.data==='ok'?'Listo: ya tiene acceso.':r.data));await load()
    }else if(a==='rej'){await sb.from('access_requests').delete().eq('id',b.dataset.id);await load()
    }else if(a==='newcode'){const r=await sb.rpc('invite',{p_email:b.dataset.e,p_turno:b.dataset.t,p_rol:b.dataset.r});if(r.error)toast(r.error.message);else ui.invite={e:b.dataset.e,c:r.data};await load()
    }else if(a==='advance'){
      if(ui.confirm!=='adv'){ui.confirm='adv';render();return}
      ui.confirm=null;const sid=S.prof.school_id;
      for(const g of S.groups){const old=S.gsem[g]||1,ns=old+1;
        if(ns>6){await sb.from('schedule').delete().eq('grupo',g);await sb.from('group_subjects').delete().eq('grupo',g);await sb.from('groups').delete().eq('school_id',sid).eq('nombre',g)}
        else await sb.from('groups').update({semestre:ns,nombre:(/^\d/.test(g)&&+g[0]===old)?String(ns)+g.slice(1):g}).eq('school_id',sid).eq('nombre',g)}
      await sb.from('schedule').delete().eq('school_id',sid);await sb.from('group_subjects').delete().eq('school_id',sid);
      S.ciclo=S.ciclo==='par'?'impar':'par';await sb.from('schools').update({ciclo:S.ciclo}).eq('id',sid);
      toast('Ciclo avanzado. Agrega los grupos nuevos de 1.er semestre y genera el horario.');await load()}
  }catch(e){ui.msg={ok:0,t:'Error de conexión: '+e.message};render()}
},true);
let idle;const bump=()=>{clearTimeout(idle);idle=setTimeout(async()=>{if(S.sess){await sb.auth.signOut();S.sess=null;S.prof=null;ui.msg={ok:0,t:'Sesión cerrada por inactividad.'};render()}},15*60*1000)};
['click','keydown','touchstart'].forEach(e=>document.addEventListener(e,bump));bump();
sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){ui.rec=true;S.sess=null;render()}});
boot();
afterAuth();
