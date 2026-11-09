/* Panel de coordinación */
const GRS = c => c === 1 ? [1, 2, 3] : [4, 5, 6];
const AREAS = g => g <= 3 ? ['LE', 'MAT'] : ['LE', 'MAT', 'SOC', 'CN'];
const nInd = d => d.comps.reduce((n, c) => n + c.inds.length, 0);
const sests = (D, g, l) => [...D.est.values()].filter(e => e.g === g && (!l || e.l === l)).sort((a, b) => a.o - b.o);
const EV = (D, e, a) => D.ev.get(e.id + '|' + a);
const isDone = (D, e, a) => { const v = EV(D, e, a), d = D.defs[e.g + a]; return !!v && !!d && (v.aus || (Object.keys(v.res).length >= nInd(d) && (!d.lec || !!v.nivel))); };
function tally(D, g, a, l) {
  const es = sests(D, g, l), ev = es.map(e => EV(D, e, a)).filter(v => v && !v.aus), rated = ev.filter(v => Object.keys(v.res).length);
  return { l, m: es.length, n: rated.length, cnt: (c, k) => ev.filter(v => v.res[c] === k).length, lc: c => ev.filter(v => v.nivel === c).length };
}
async function loadD(c) {
  const [df, cs] = await Promise.all([api(`defs?periodo=${S.per}`), api(`consol?ciclo=${c}&periodo=${S.per}`)]);
  const D = { c, per: S.per, t: Date.now(), defs: {}, est: new Map(), ev: new Map() };
  df.defs.forEach(d => D.defs[d.grado + d.area] = d.def);
  cs.rows.forEach(r => {
    if (!D.est.has(r.est)) D.est.set(r.est, { id: r.est, mat: r.matricula, ap: r.apellidos, nom: r.nombres, g: r.grado, l: r.letra, sid: r.seccion_id, o: r.orden });
    if (r.area) D.ev.set(r.est + '|' + r.area, { res: r.resultados || {}, nivel: r.nivel, aus: r.ausente, act: r.actualizado });
  });
  return D;
}
async function coord(c, tab) {
  if (!isStaff(c)) { location.hash = '#/c/' + c; return; }
  await boot(c);
  if (!S.D || S.D.c !== c || S.D.per !== S.per || Date.now() - S.D.t > 60000) S.D = await loadD(c);
  const D = S.D, T = { sup: ['Supervisión', tabSup], ana: ['Análisis', tabAna], con: ['Consolidados', tabCon], rep: ['Reporte al distrito', tabRep], est: ['Estudiantes', tabEst] };
  if (!T[tab]) tab = 'sup';
  $('#app').innerHTML = `<div class="crumb"><a href="#/">Inicio</a> › <a href="#/c/${c}">${CY[c]}</a> › Coordinación</div>
  <div class="row"><h1>Coordinación · ${CY[c]}</h1><div class="sp"></div><button class="btn alt" onclick="S.D=null;route()">Actualizar datos</button></div>
  <div class="tabs">${Object.entries(T).map(([k, v]) => `<a class="tab ${k === tab ? 'on' : ''}" href="#/coord/${c}/${k}">${v[0]}</a>`).join('')}</div><div id="tb"></div>`;
  T[tab][1](c, D, $('#tb'));
}

/* ---------- Supervisión ---------- */
function tabSup(c, D, el) {
  const A = S.boot.asig, dn = id => S.boot.docs.find(x => x.id === id)?.nombre || '—';
  const R = A.map(a => { const es = sests(D, a.grado, a.letra), pend = es.filter(e => !isDone(D, e, a.area)), h = es.length - pend.length;
    const last = Math.max(0, ...es.map(e => { const v = EV(D, e, a.area); return v && v.act ? +new Date(v.act) : 0; }));
    return { a, t: es.length, h, pend, last, st: es.length && h >= es.length ? 'Completa' : h ? 'En proceso' : 'Sin iniciar' }; });
  const f = S.sf || '', V = R.filter(r => !f || r.st === f), T = R.reduce((s, r) => s + r.t, 0), H = R.reduce((s, r) => s + r.h, 0), n = k => R.filter(r => r.st === k).length;
  const fmt = ts => ts ? new Date(ts).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const byT = [...new Set(A.map(a => a.docente_id))].map(id => { const rr = R.filter(r => r.a.docente_id === id); return { id, n: rr.length, t: rr.reduce((s, r) => s + r.t, 0), h: rr.reduce((s, r) => s + r.h, 0) }; }).sort((x, y) => pct(x.h, x.t) - pct(y.h, y.t));
  const chip = s => `<span class="st ${s === 'Completa' ? 'ok' : s === 'En proceso' ? 'mid' : 'no'}">${s}</span>`;
  el.innerHTML = `<div class="kpis"><div class="card kpi"><b>${pct(H, T)}%</b><span>avance global</span><div class="bar" style="margin-top:8px"><i style="width:${pct(H, T)}%"></i></div></div><div class="card kpi"><b>${n('Completa')}</b><span>asignaciones completas</span></div><div class="card kpi"><b>${n('En proceso')}</b><span>en proceso</span></div><div class="card kpi"><b>${n('Sin iniciar')}</b><span>sin iniciar</span></div><div class="card kpi"><b>${T - H}</b><span>evaluaciones pendientes</span></div></div>
  <div class="card"><h3>Avance por docente</h3><div class="sc2"><table class="tb"><tr><th>Docente</th><th>Asignaciones</th><th>Avance</th><th></th></tr>${byT.map(x => `<tr><td>${esc(dn(x.id))}</td><td>${x.n}</td><td>${x.h}/${x.t}</td><td style="min-width:140px"><div class="bar ${x.h >= x.t ? 'ok' : ''}"><i style="width:${pct(x.h, x.t)}%"></i></div></td></tr>`).join('')}</table></div></div>
  <div class="card" style="margin-top:18px"><div class="row"><h3>Detalle por sección y asignatura</h3><div class="sp"></div><select onchange="S.sf=this.value;tabSup(${c},S.D,$('#tb'))"><option value="">Todos los estados</option>${['Sin iniciar', 'En proceso', 'Completa'].map(s => `<option ${f === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  <div class="sc2"><table class="tb"><tr><th>Sección</th><th>Asignatura</th><th>Docente</th><th>Evaluados</th><th>Estado</th><th>Última actividad</th><th>Pendientes</th><th></th></tr>
  ${V.map(r => `<tr><td>${GR[r.a.grado]} ${r.a.letra}</td><td>${AR[r.a.area]}</td><td>${esc(dn(r.a.docente_id))}</td><td>${r.h}/${r.t}</td><td>${chip(r.st)}</td><td>${fmt(r.last)}</td><td>${r.pend.length ? `<details><summary>${r.pend.length}</summary>${r.pend.map(e => esc(e.ap + ', ' + e.nom)).join('<br>')}</details>` : '—'}</td><td><a class="x" href="#/eval/${r.a.id}">Abrir</a></td></tr>`).join('')}</table></div></div>`;
}

/* ---------- Análisis estadístico ---------- */
const SEV1 = { F: 0, SF: 1, P: 2, S: 3, I: 4 }, SEV2 = { F: 0, NF: 1 };
function calcAna(D, o) {
  const R = { ar: {}, ga: {}, sa: [], ind: [], lec: {}, tot: { E: 0, A: 0, S: 0 }, aus: 0, pend: 0, sm: new Map() };
  const stud = e => { if (!R.sm.has(e.id)) R.sm.set(e.id, { e, t: 0, E: 0, pa: {}, lec: null }); return R.sm.get(e.id); };
  for (const g of GRS(D.c)) {
    const letras = [...new Set(sests(D, g).map(e => e.l))].sort();
    for (const a of AREAS(g)) {
      const d = D.defs[g + a]; if (!d) continue; const inds = d.comps.flatMap(c => c.inds), ga = R.ga[g + a] = { g, a, E: 0, A: 0, S: 0, n: 0 };
      const IR = inds.map(i => { const x = { g, a, c: i.c, t: i.t, E: 0, A: 0, S: 0 }; R.ind.push(x); return x; });
      for (const l of letras) {
        const sa = { g, l, a, E: 0, A: 0, S: 0, n: 0 };
        for (const e of sests(D, g, l)) {
          const v = EV(D, e, a); if (!isDone(D, e, a)) R.pend++; if (!v) continue; if (v.aus) { R.aus++; continue; }
          let any = false;
          inds.forEach((i, ix) => { const k = v.res[i.c]; if (!k) return; any = true; ga[k]++; sa[k]++; R.tot[k]++; (R.ar[a] = R.ar[a] || { E: 0, A: 0, S: 0 })[k]++; IR[ix][k]++;
            const s = stud(e); s.t++; if (k === 'E') s.E++; const p = s.pa[a] = s.pa[a] || { E: 0, t: 0 }; p.t++; if (k === 'E') p.E++; });
          if (any) { ga.n++; sa.n++; }
          if (a === 'LE' && v.nivel) { stud(e).lec = v.nivel; const L = R.lec[g] = R.lec[g] || {}; L[v.nivel] = (L[v.nivel] || 0) + 1; }
        }
        R.sa.push(sa);
      }
    }
  }
  const sev = D.c === 1 ? SEV1 : SEV2;
  R.st = [...R.sm.values()].map(s => {
    const p = s.t ? Math.round(100 * s.E / s.t) : 0, sv = s.lec ? sev[s.lec] ?? 0 : 0;
    const alto = p >= o.hi || (D.c === 1 && sv >= 3), medio = p >= o.mid || (D.c === 1 ? sv >= 2 : sv >= 1);
    s.p = p; s.sv = sv; s.r = alto ? 'Alto' : medio ? 'Medio' : 'Bajo';
    s.dif = Object.entries(s.pa).filter(([, x]) => x.t && x.E / x.t >= .5).map(([a]) => AR[a]);
    return s; }).sort((x, y) => y.p - x.p || y.sv - x.sv);
  return R;
}
const pcs = (x, t) => t ? Math.round(100 * x / t) : 0;
const sb = (E, A, S) => { const t = E + A + S; if (!t) return '<div class="sb"></div>'; const w = x => (100 * x / t).toFixed(1), l = x => x / t >= .1 ? Math.round(100 * x / t) + '%' : ''; return `<div class="sb" title="E ${E} · A ${A} · S ${S}"><i class="e" style="width:${w(E)}%">${l(E)}</i><i class="a" style="width:${w(A)}%">${l(A)}</i><i class="s" style="width:${w(S)}%">${l(S)}</i></div>`; };
const dn2 = (a) => S.boot.docs.find(x => x.id === a)?.nombre || '';
function anaHTML(D, o, pr) {
  const R = calcAna(D, o), T = R.tot.E + R.tot.A + R.tot.S, ga = Object.values(R.ga), hasD = T > 0;
  if (!hasD) return '<div class="warn">Aún no hay evaluaciones registradas en este período. El análisis aparecerá cuando los docentes comiencen a registrar resultados.</div>';
  const alto = R.st.filter(s => s.r === 'Alto'), medio = R.st.filter(s => s.r === 'Medio'), nE = R.sm.size, totEst = D.est.size;
  const areas = Object.keys(R.ar).sort((x, y) => pcs(R.ar[y].E, R.ar[y].E + R.ar[y].A + R.ar[y].S) - pcs(R.ar[x].E, R.ar[x].E + R.ar[x].A + R.ar[x].S));
  const ar = (x) => R.ar[x], pe = (x) => pcs(x.E, x.E + x.A + x.S);
  const heat = `<table class="tb heat"><tr><th></th>${['LE', 'MAT', 'SOC', 'CN'].filter(a => D.c === 2 || a.length < 4 && a !== 'SOC' && a !== 'CN').map(a => `<th>${AR[a]}</th>`).join('')}</tr>${GRS(D.c).map(g => `<tr><th>${GR[g]}</th>${['LE', 'MAT', 'SOC', 'CN'].filter(a => D.c === 2 || a === 'LE' || a === 'MAT').map(a => { const x = R.ga[g + a]; if (!x || !x.n) return '<td>—</td>'; const p = pe(x); return `<td style="background:rgba(212,32,44,${(p / 100 * .85).toFixed(2)});color:${p > 45 ? '#fff' : '#1c2740'}"><b>${p}%</b><small>Elemental</small></td>`; }).join('')}</tr>`).join('')}</table>`;
  const secs = R.sa.filter(s => s.n >= 3).sort((x, y) => pe(y) - pe(x));
  const inds = R.ind.filter(i => i.E + i.A + i.S >= 5).sort((x, y) => pe(y) - pe(x)).slice(0, 12);
  const sevN = D.c === 1 ? ['F', 'SF', 'P', 'S', 'I'] : ['F', 'NF'], LV = D.c === 1 ? { F: 'Con fluidez', SF: 'Sin fluidez', P: 'Palabras', S: 'Sílabas', I: 'Imágenes' } : { F: 'Fluido', NF: 'No fluido' }, COL = ['#1a9d6b', '#9bc53d', '#e6a100', '#e8742c', '#d4202c'];
  const lecRows = GRS(D.c).map(g => { const L = R.lec[g] || {}, t = sevN.reduce((s, k) => s + (L[k] || 0), 0); return t ? `<div class="lr"><b>${GR[g]}</b><div class="sb">${sevN.map((k, i) => (L[k] ? `<i style="width:${100 * L[k] / t}%;background:${COL[D.c === 1 ? i : i * 4]}">${L[k] / t >= .08 ? L[k] : ''}</i>` : '')).join('')}</div><small>${t} est.</small></div>` : ''; }).join('');
  const lecIni = (() => { let t = 0, ini = 0; GRS(D.c).forEach(g => sevN.forEach(k => { const v = (R.lec[g] || {})[k] || 0; t += v; if (D.c === 1 ? ['P', 'S', 'I'].includes(k) : k === 'NF') ini += v; })); return { t, ini }; })();
  const lis = R.st.filter(s => (!o.nv || s.r === o.nv) && (!o.g || s.e.g === o.g) && s.r !== 'Bajo'), shown = pr ? lis : lis.slice(0, 60);
  const porSec = {}; R.st.forEach(s => { const k = `${s.e.g}|${s.e.l}`; (porSec[k] = porSec[k] || { a: 0, m: 0 })[s.r === 'Alto' ? 'a' : s.r === 'Medio' ? 'm' : 'x'] = ((porSec[k][s.r === 'Alto' ? 'a' : s.r === 'Medio' ? 'm' : 'x']) || 0) + 1; });
  const F = [];
  const wa = areas[0]; F.push(['Alta', `La asignatura con mayor proporción de Elemental es ${AR[wa]} (${pe(ar(wa))}% de los indicadores evaluados).`, 'Revisar la planificación del área y programar sesiones de refuerzo focalizadas en los indicadores críticos.']);
  const wg = ga.filter(x => x.n >= 5).sort((x, y) => pe(y) - pe(x))[0]; if (wg) F.push(['Alta', `El caso más crítico es ${GR[wg.g]} grado en ${AR[wg.a]}: ${pe(wg)}% en Elemental.`, 'Reunión con el docente y la coordinación para analizar errores frecuentes y ajustar las estrategias de enseñanza.']);
  if (secs[0]) F.push(['Alta', `La sección con mayor concentración de Elemental es ${GR[secs[0].g]} ${secs[0].l} en ${AR[secs[0].a]} (${pe(secs[0])}%).`, 'Acompañamiento de aula y planificación conjunta; comparar prácticas con secciones de mejor resultado.']);
  inds.slice(0, 3).forEach(i => F.push(['Media', `Indicador crítico ${GR[i.g]} ${AR[i.a]} ${i.c}: ${pe(i)}% Elemental. «${i.t}»`, 'Diseñar actividades de refuerzo específicas y reevaluar este indicador en la próxima evaluación.']));
  F.push([alto.length ? 'Alta' : 'Media', `${alto.length} estudiantes en riesgo alto y ${medio.length} en riesgo medio (de ${nE} con resultados).`, 'Elaborar plan de apoyo individual (adecuación curricular), informar a las familias y dar seguimiento quincenal.']);
  if (lecIni.t) F.push(['Media', `${pcs(lecIni.ini, lecIni.t)}% de los estudiantes evaluados en lectura se ubica en niveles iniciales (${D.c === 1 ? 'palabras, sílabas o imágenes' : 'no fluido'}).`, 'Reforzar fluidez y decodificación con lectura guiada diaria y grupos de apoyo por nivel.']);
  if (R.pend) F.push(['Media', `Hay ${R.pend} evaluaciones pendientes o incompletas y ${R.aus} estudiantes ausentes registrados.`, 'Completar los registros y aplicar la evaluación a los estudiantes ausentes antes del cierre del período.']);
  const kp = (b, l, s) => `<div class="card kpi"><b>${b}</b><span>${l}</span>${s || ''}</div>`;
  return `<div class="kpis">${kp(pcs(R.tot.E, T) + '%', 'indicadores en Elemental')}${kp(pcs(R.tot.S, T) + '%', 'indicadores en Satisfactorio')}${kp(alto.length, 'estudiantes en riesgo alto')}${kp(medio.length, 'estudiantes en riesgo medio')}${kp(nE + '/' + totEst, 'estudiantes con resultados')}</div>
  <div class="leg"><i class="e"></i>Elemental <i class="a"></i>Aceptable <i class="s"></i>Satisfactorio</div>
  <div class="card ab"><h3>Rendimiento por asignatura</h3>${areas.map(a => `<div class="lr"><b>${AR[a]}</b>${sb(ar(a).E, ar(a).A, ar(a).S)}<small>${ar(a).E + ar(a).A + ar(a).S}</small></div>`).join('')}</div>
  <div class="grid two ab"><div class="card"><h3>Mapa de calor: % en Elemental por grado y asignatura</h3><div class="sc2">${heat}</div></div>
  <div class="card"><h3>Niveles de lectura por grado</h3>${lecRows || '<p class="muted">Sin niveles de lectura registrados.</p>'}<div class="leg">${sevN.map((k, i) => `<i style="background:${COL[D.c === 1 ? i : i * 4]}"></i>${LV[k]}`).join(' ')}</div></div></div>
  <div class="card ab" style="margin-top:18px"><h3>Secciones con mayor proporción de Elemental</h3>${secs.slice(0, 15).map(s => `<div class="lr"><b>${GR[s.g]} ${s.l} · ${AR[s.a]}</b>${sb(s.E, s.A, s.S)}<small>${esc(dn2(S.boot.asig.find(x => x.grado === s.g && x.letra === s.l && x.area === s.a)?.docente_id))}</small></div>`).join('')}</div>
  <div class="card ab" style="margin-top:18px"><h3>Indicadores críticos (mayor % en Elemental)</h3>${inds.map(i => `<div class="lr"><b>${GR[i.g]} · ${AR[i.a]} ${i.c}</b>${sb(i.E, i.A, i.S)}<small>${esc(i.t)}</small></div>`).join('')}</div>
  <div class="card" style="margin-top:18px"><div class="row"><h3>Estudiantes en riesgo</h3><div class="sp"></div>${pr ? '' : `<select onchange="S.ao.nv=this.value;anaRe()"><option value="">Alto y medio</option><option ${o.nv === 'Alto' ? 'selected' : ''}>Alto</option><option ${o.nv === 'Medio' ? 'selected' : ''}>Medio</option></select><select onchange="S.ao.g=+this.value;anaRe()"><option value="0">Todos los grados</option>${GRS(D.c).map(g => `<option value="${g}" ${o.g === g ? 'selected' : ''}>${GR[g]}</option>`).join('')}</select>`}</div>
  <p class="muted" style="font-size:12.5px">Riesgo alto: ≥ ${o.hi}% de sus indicadores en Elemental${D.c === 1 ? ' o lector de sílabas/imágenes' : ''}. Riesgo medio: ≥ ${o.mid}%${D.c === 1 ? ' o lector de palabras' : ' o lectura no fluida'}. Los umbrales se pueden ajustar arriba.</p>
  <div class="sc2"><table class="tb"><tr><th>Estudiante</th><th>Grado</th><th>% Elemental</th><th>Asignaturas en dificultad</th><th>Lectura</th><th>Riesgo</th></tr>${shown.map(s => `<tr><td>${esc(s.e.ap)}, ${esc(s.e.nom)}</td><td>${GR[s.e.g]} ${s.e.l}</td><td>${s.p}% <small class="muted">(${s.E}/${s.t})</small></td><td>${esc(s.dif.join(', ') || '—')}</td><td>${s.lec ? LV[s.lec] || s.lec : '—'}</td><td><span class="st ${s.r === 'Alto' ? 'no' : 'mid'}">${s.r}</span></td></tr>`).join('') || '<tr><td colspan="6">Sin estudiantes en este nivel.</td></tr>'}</table></div>${!pr && lis.length > 60 ? `<p class="muted">Mostrando 60 de ${lis.length}. Use «Exportar riesgo (CSV)» o «Imprimir / PDF» para la lista completa.</p>` : ''}
  <h4 style="margin:16px 0 6px">Concentración por sección</h4><div class="chips">${Object.entries(porSec).filter(([, v]) => v.a || v.m).sort((x, y) => (y[1].a || 0) - (x[1].a || 0) || (y[1].m || 0) - (x[1].m || 0)).map(([k, v]) => { const [g, l] = k.split('|'); return `<span class="pill">${GR[g]} ${l}: ${v.a || 0} alto · ${v.m || 0} medio</span>`; }).join('')}</div></div>
  <div class="card" style="margin-top:18px"><h3>Hallazgos y plan de acción</h3><div class="sc2"><table class="tb pa"><tr><th>Prioridad</th><th>Hallazgo</th><th>Acción sugerida</th><th>Responsable</th><th>Fecha</th></tr>${F.map(f => `<tr><td><span class="st ${f[0] === 'Alta' ? 'no' : 'mid'}">${f[0]}</span></td><td>${esc(f[1])}</td><td>${esc(f[2])}</td><td></td><td></td></tr>`).join('')}</table></div></div>`;
}
function tabAna(c, D, el) {
  const o = S.ao = S.ao || { hi: 50, mid: 30, nv: '', g: 0 };
  el.innerHTML = `<div class="row" style="margin-bottom:14px"><span class="muted">Umbral de riesgo (% de indicadores en Elemental): alto ≥</span><input type="number" id="ahi" value="${o.hi}" min="1" max="100" style="width:74px"><span class="muted">medio ≥</span><input type="number" id="amd" value="${o.mid}" min="1" max="100" style="width:74px"><button class="btn alt" onclick="anaApply()">Aplicar</button><div class="sp"></div><button class="btn alt" onclick="csvRiesgo()">Exportar riesgo (CSV)</button><button class="btn" onclick="printAna()">Imprimir / PDF</button></div><div id="ana">${anaHTML(D, o)}</div><div class="card" style="margin-top:18px"><h3>Comparación entre períodos</h3><div id="cmpb" class="muted">Cargando…</div></div>`;
  cmpLoad(c);
}
async function cmpLoad(c) {
  const el = $('#cmpb'); try {
    const r = await api(`comparar?ciclo=${c}`), ps = S.boot.periodos.filter(p => r.rows.some(x => x.periodo_id === p.id)), ag = {};
    r.rows.forEach(x => { const a = ag[x.area] = ag[x.area] || {}, b = a[x.periodo_id] = a[x.periodo_id] || { E: 0, A: 0, S: 0 }; b[x.k] += x.n; });
    if (ps.length < 2) { el.innerHTML = 'Se necesitan resultados en al menos dos períodos para comparar. Cuando existan, aquí verá la evolución por asignatura.'; return; }
    const cell = b => { if (!b) return '—'; const t = b.E + b.A + b.S; return `${pcs(b.E, t)}% E · ${pcs(b.S, t)}% S`; };
    el.innerHTML = `<div class="sc2"><table class="tb"><tr><th>Asignatura</th>${ps.map(p => `<th>${esc(p.nombre.replace(/Evaluación (de )?/, ''))}</th>`).join('')}<th>Cambio en Satisfactorio</th></tr>${Object.keys(ag).map(a => { const f = ag[a][ps[0].id], l = ag[a][ps[ps.length - 1].id], d = f && l ? pcs(l.S, l.E + l.A + l.S) - pcs(f.S, f.E + f.A + f.S) : null; return `<tr><td>${AR[a]}</td>${ps.map(p => `<td>${cell(ag[a][p.id])}</td>`).join('')}<td>${d === null ? '—' : `<span class="st ${d >= 0 ? 'ok' : 'no'}">${d > 0 ? '+' : ''}${d} pts</span>`}</td></tr>`; }).join('')}</table></div><p class="muted" style="font-size:12.5px">Compara el porcentaje de indicadores en Elemental (E) y Satisfactorio (S). Tenga presente que cada período puede usar instrumentos distintos.</p>`;
  } catch (e) { el.textContent = e.message; }
}
const anaRe = () => tabAna(S.D.c, S.D, $('#tb'));
function anaApply() { S.ao.hi = +$('#ahi').value || 50; S.ao.mid = Math.min(+$('#amd').value || 30, S.ao.hi); anaRe(); }
function printAna() { const D = S.D, o = { ...S.ao, nv: '', g: 0 }; doPrint(`<section class="of ana">${ofHead()}<div class="ot">ANÁLISIS DE RESULTADOS · ${esc(S.boot.periodos.find(p => p.id === S.per)?.nombre || '')} · ${CY[D.c].toUpperCase()}</div>${fld('Centro Educativo', S.boot.centro.nombre)}${fld('Fecha', hoy())}${anaHTML(D, o, true)}</section>`); }
function csvRiesgo() {
  const D = S.D, R = calcAna(D, S.ao), LVn = D.c === 1 ? { F: 'Con fluidez', SF: 'Sin fluidez', P: 'Palabras', S: 'Sílabas', I: 'Imágenes' } : { F: 'Fluido', NF: 'No fluido' };
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`, rows = [['Matrícula', 'Apellidos', 'Nombres', 'Grado', 'Sección', 'Indicadores evaluados', '% Elemental', 'Asignaturas en dificultad', 'Nivel de lectura', 'Riesgo']];
  R.st.filter(s => s.r !== 'Bajo').forEach(s => rows.push([s.e.mat, s.e.ap, s.e.nom, GR[s.e.g], s.e.l, s.t, s.p + '%', s.dif.join('; '), LVn[s.lec] || '', s.r]));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' })); a.download = `estudiantes_en_riesgo_${S.per}.csv`; a.click();
}

/* ---------- Consolidados oficiales ---------- */
function conHTML(D, g, a) {
  const def = D.defs[g + a]; if (!def) return '<div class="warn">Instrumento no disponible.</div>';
  const letras = [...new Set(sests(D, g).map(e => e.l))].sort(), secs = letras.map(l => tally(D, g, a, l));
  const o = { def, g, cen: S.boot.centro, tp: tipo(), anio: anio(), secs, coord: S.user?.r === 'coord' ? S.user.nombre : '' };
  return ofCoord(o) + (def.lec && g <= 3 ? ofLecCons(o) : '');
}
function tabCon(c, D, el) {
  const gs = GRS(c), g = gs.includes(+sessionStorage.cg) ? +sessionStorage.cg : gs[0], as = AREAS(g), a = as.includes(sessionStorage.ca) ? sessionStorage.ca : 'LE';
  el.innerHTML = `<div class="row" style="margin-bottom:14px"><select onchange="sessionStorage.cg=this.value;tabCon(${c},S.D,$('#tb'))">${gs.map(x => `<option value="${x}" ${x === g ? 'selected' : ''}>${GR[x]} grado</option>`).join('')}</select><select onchange="sessionStorage.ca=this.value;tabCon(${c},S.D,$('#tb'))">${as.map(x => `<option value="${x}" ${x === a ? 'selected' : ''}>${AR[x]}</option>`).join('')}</select><div class="sp"></div><button class="btn alt" onclick="printCon(${c},0)">Imprimir este consolidado</button><button class="btn" onclick="printCon(${c},1)">Imprimir todos los del ciclo</button></div>${conHTML(D, g, a)}`;
}
function printCon(c, all) {
  const D = S.D; if (!all) { const g = +sessionStorage.cg || GRS(c)[0], a = sessionStorage.ca || 'LE'; return doPrint(conHTML(D, g, a)); }
  doPrint(GRS(c).map(g => AREAS(g).map(a => conHTML(D, g, a)).join('')).join(''));
}

/* ---------- Reporte al distrito ---------- */
function repChecks(D) {
  const out = [];
  GRS(D.c).forEach(g => { const m = sests(D, g).length; AREAS(g).forEach(a => { const d = D.defs[g + a]; if (!d) return; const t = tally(D, g, a), f = Math.max(...d.comps.flatMap(k => k.inds).map(i => m - (t.cnt(i.c, 'E') + t.cnt(i.c, 'A') + t.cnt(i.c, 'S')))); if (f > 0) out.push(`${GR[g]} · ${AR[a]}: faltan ${f} de ${m} estudiantes (sin evaluar o ausentes).`); }); });
  return out;
}
function tabRep(c, D, el) {
  const chk = repChecks(D), o = { c, cen: S.boot.centro, D, limite: S.per === '2026-11' ? 'El registro estará disponible hasta el 20 de noviembre de 2026 a las 4:00 p. m.' : '' };
  const miss = ['correo', 'codigo', 'regional', 'distrito', 'sector', 'tipo'].filter(k => !o.cen[k]);
  el.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="muted" style="margin:0;flex:1">Réplica del formulario oficial «Sistematización Evaluación de Seguimiento ${c === 1 ? 'Primer' : 'Segundo'} Ciclo» con las cantidades calculadas. Use estas cifras para registrar el formulario del distrito o guarde el PDF.</p><button class="btn" onclick="doPrint(ofReporte({c:${c},cen:S.boot.centro,D:S.D,limite:'${o.limite}'}))">Imprimir / guardar PDF</button></div>
  ${miss.length ? `<div class="warn">Faltan datos del centro para el formulario: <b>${miss.join(', ')}</b>. El administrador puede completarlos en «Datos del centro».</div>` : ''}
  ${chk.length ? `<div class="warn"><b>Verifique antes de enviar</b> (la suma de cada indicador debe igualar la matrícula del grado):<br>${chk.map(esc).join('<br>')}</div>` : '<div class="okb">Todas las sumas coinciden con la matrícula del grado.</div>'}${ofReporte(o)}`;
}

/* ---------- Estudiantes ---------- */
function tabEst(c, D, el) {
  const gs = GRS(c), g = gs.includes(+sessionStorage.eg) ? +sessionStorage.eg : gs[0], ls = [...new Set(S.boot.asig.filter(a => a.grado === g).map(a => a.letra))].sort(), l = ls.includes(sessionStorage.el) ? sessionStorage.el : ls[0];
  const es = sests(D, g, l), sid = S.boot.asig.find(a => a.grado === g && a.letra === l)?.seccion_id;
  el.innerHTML = `<div class="row" style="margin-bottom:14px"><select onchange="sessionStorage.eg=this.value;tabEst(${c},S.D,$('#tb'))">${gs.map(x => `<option value="${x}" ${x === g ? 'selected' : ''}>${GR[x]} grado</option>`).join('')}</select><select onchange="sessionStorage.el=this.value;tabEst(${c},S.D,$('#tb'))">${ls.map(x => `<option ${x === l ? 'selected' : ''}>${x}</option>`).join('')}</select><span class="muted">${es.length} estudiantes</span><div class="sp"></div><button class="btn" onclick="estForm(${sid})">+ Inscribir estudiante</button></div>
  <div class="card"><div class="sc2"><table class="tb"><tr><th>No.</th><th>Matrícula</th><th>Apellidos</th><th>Nombres</th><th></th></tr>${es.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.mat || '')}</td><td>${esc(e.ap)}</td><td>${esc(e.nom)}</td><td><button class="x" onclick="estForm(${sid},${e.id})">Editar / retirar</button></td></tr>`).join('')}</table></div></div>`;
}
async function estForm(sid, id) {
  const e = id ? S.D.est.get(id) : null, ap = prompt('Apellidos', e?.ap || ''); if (!ap) return; const no = prompt('Nombres', e?.nom || ''); if (!no) return; const ma = prompt('Matrícula (opcional)', e?.mat || '') || '';
  const act = e ? !confirm('¿Retirar a este estudiante de la sección? (Aceptar = retirar, Cancelar = mantener)') : true;
  try { await api('estudiante', { m: 'POST', b: { id, seccion_id: sid, apellidos: ap, nombres: no, matricula: ma, activo: act } }); toast('Guardado'); S.D = null; route(); } catch (x) { toast(x.message, 1); }
}
