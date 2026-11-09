/* Formatos oficiales (vista previa en pantalla e impresión / PDF) */
const KS = ['E', 'A', 'S'];
const ofHead = () => `<div class="ofi"><small>GOBIERNO DE LA REPÚBLICA DOMINICANA</small><b>EDUCACIÓN</b><div>Dirección de Educación Primaria</div></div>`;
const fld = (l, v) => `<div class="fl"><b>${l}:</b><span>${esc(v ?? '')}</span></div>`;
const hoy = () => new Date().toLocaleDateString('es-DO');
const vh = (t) => `<th class="v"><span>${esc(t)}</span></th>`;
const heads = (def, N, lec, first) => {
  const inds = def.comps.flatMap(c => c.inds);
  return { inds, r2: def.comps.map(c => `<th colspan="${c.inds.length * 3}" class="cp">${esc(c.t)}</th>`).join(''),
    r3: inds.map(i => `<th colspan="3" class="ip">${i.c} ${esc(i.t)}</th>`).join(''),
    r4: inds.map(() => KS.map(k => `<th class="k">${k}</th>`).join('')).join('') + (lec ? lec.map(l => vh(l.n)).join('') : '') };
};

/* Instrumento para el docente consolidar resultados */
function ofDocente(o) {
  const { def, est, A, cen } = o, lec = def.lec && A.grado >= 4 ? def.lec : null;
  const { inds, r2, r3, r4 } = heads(def, 0, lec), N = inds.length * 3;
  const act = est.filter(e => !e.ausente && (Object.keys(e.res).length || e.nivel)).length;
  const hd = `<tr><th rowspan="4" class="nmh">Nombres de estudiantes<br>(correctos)</th><th colspan="${N}" class="ar">${esc(def.titulo)}</th>${lec ? `<th colspan="${lec.length}" rowspan="3" class="ar">Niveles de lectura</th>` : ''}</tr><tr>${r2}</tr><tr>${r3}</tr><tr>${r4}</tr>`;
  const body = est.map((e, n) => `<tr><td class="nmc">${n + 1}. ${esc(e.apellidos)}, ${esc(e.nombres)}${e.ausente ? ' <i>(ausente)</i>' : ''}</td>${inds.map(i => KS.map(k => `<td>${!e.ausente && e.res[i.c] === k ? '✓' : ''}</td>`).join('')).join('')}${lec ? lec.map(l => `<td>${!e.ausente && e.nivel === l.c ? '✓' : ''}</td>`).join('') : ''}</tr>`).join('');
  const ft = `<tr class="tt"><td>Total</td>${inds.map(i => KS.map(k => `<td>${est.filter(e => !e.ausente && e.res[i.c] === k).length}</td>`).join('')).join('')}${lec ? lec.map(l => `<td>${est.filter(e => !e.ausente && e.nivel === l.c).length}</td>`).join('') : ''}</tr>`;
  return `<section class="of">${ofHead()}<div class="ot">Instrumento para el docente consolidar resultados de ${o.tp}, Año Escolar ${esc(o.anio)}<br>${GR[A.grado].toUpperCase()} GRADO</div>
  ${fld('Centro Educativo', cen.nombre)}${fld('Sección', A.letra)}${fld('Cantidad de estudiantes matriculados', est.length)}${fld('Cantidad de estudiantes evaluados', act)}
  <div class="ofw"><table class="ot2"><thead>${hd}</thead><tbody>${body}</tbody><tfoot>${ft}</tfoot></table></div><div class="lg">E: Elemental &nbsp;&nbsp;&nbsp; A: Aceptable &nbsp;&nbsp;&nbsp; S: Satisfactorio</div></section>`;
}

/* Tabla para registrar niveles de lectura (1.er ciclo) */
function ofLectura(o) {
  const { est, A, cen, def } = o, L = def.lec, n = Math.max(20, est.length);
  const rows = Array.from({ length: n }, (_, i) => { const e = est[i]; return `<tr><td>${i + 1}</td><td class="nmc">${e ? `${esc(e.apellidos)}, ${esc(e.nombres)}` : ''}</td>${L.map(l => `<td>${e && !e.ausente && e.nivel === l.c ? '✓' : ''}</td>`).join('')}<td></td></tr>`; }).join('');
  return `<section class="of pt">${ofHead()}<div class="ot2t">TABLA PARA REGISTRAR NIVELES DE LECTURA<br>${GR[A.grado].toUpperCase()} GRADO</div>
  ${fld('Centro Educativo', cen.nombre)}${fld('Sección', A.letra)}${fld('Fecha', hoy())}${fld('Docente', o.doc)}<p class="it"><b>Esta tabla evalúa el ítem uno (1).</b></p>
  <div class="ofw"><table class="ot2 lt"><colgroup><col style="width:6%"><col style="width:30%">${L.map(() => '<col>').join('')}<col style="width:20%"></colgroup><thead><tr><th colspan="${L.length + 3}" class="ar">Coloca un cotejo (✔) en el nivel de lectura de cada estudiante</th></tr><tr><th class="w2">No.</th><th class="nmh">Nombre(s) y apellido(s)</th>${L.map(l => vh(l.n)).join('')}<th class="obs">Observaciones</th></tr></thead>
  <tbody>${rows}</tbody><tfoot><tr class="tt"><td colspan="2">Total</td>${L.map(l => `<td>${est.filter(e => !e.ausente && e.nivel === l.c).length}</td>`).join('')}<td></td></tr></tfoot></table></div></section>`;
}

/* Instrumento para el coordinador/director (consolidado por sección) */
function ofCoord(o) {
  const { def, g, cen } = o, lec = def.lec && g >= 4 ? def.lec : null, { inds, r2, r3, r4 } = heads(def, 0, lec), N = inds.length * 3;
  const L = 'ABCDEFGH'.split(''), sec = (l) => o.secs.find(s => s.l === l), sum = f => o.secs.reduce((a, s) => a + f(s), 0);
  const hd = `<tr><th rowspan="4" class="v w2"><span>Secciones</span></th><th colspan="${N}" class="ar">${esc(def.titulo)}</th>${lec ? `<th colspan="${lec.length}" rowspan="3" class="ar">Niveles de lectura</th>` : ''}<th rowspan="4" class="v w2"><span>Matrícula</span></th><th rowspan="4" class="v w2"><span>Total de estudiantes evaluados</span></th></tr><tr>${r2}</tr><tr>${r3}</tr><tr>${r4}</tr>`;
  const body = L.map(l => { const s = sec(l); return `<tr class="tall"><td class="b">${l}</td>${inds.map(i => KS.map(k => `<td>${s ? s.cnt(i.c, k) : ''}</td>`).join('')).join('')}${lec ? lec.map(x => `<td>${s ? s.lc(x.c) : ''}</td>`).join('') : ''}<td>${s ? s.m : ''}</td><td>${s ? s.n : ''}</td></tr>`; }).join('');
  const ft = `<tr class="tt"><td>Total</td>${inds.map(i => KS.map(k => `<td>${sum(s => s.cnt(i.c, k))}</td>`).join('')).join('')}${lec ? lec.map(x => `<td>${sum(s => s.lc(x.c))}</td>`).join('') : ''}<td>${sum(s => s.m)}</td><td>${sum(s => s.n)}</td></tr>`;
  return `<section class="of">${ofHead()}<div class="ot">Instrumento para el coordinador pedagógico/director consolidar resultados de la ${o.tp}, Año Escolar ${esc(o.anio)}<br>${GR[g].toUpperCase()} GRADO</div>
  ${fld('Centro Educativo', cen.nombre)}${fld('Cantidad de estudiantes matriculados', sum(s => s.m))}${fld('Cantidad de estudiantes evaluados', sum(s => s.n))}
  <div class="ofw"><table class="ot2"><thead>${hd}</thead><tbody>${body}</tbody><tfoot>${ft}</tfoot></table></div><div class="lg">E: Elemental &nbsp;&nbsp;&nbsp; A: Aceptable &nbsp;&nbsp;&nbsp; S: Satisfactorio</div></section>`;
}

/* Consolidado del centro de los niveles de lectura (1.er ciclo) */
function ofLecCons(o) {
  const { def, g, cen } = o, L = def.lec, ls = 'ABCDEFGH'.split(''), sec = l => o.secs.find(s => s.l === l), sum = f => o.secs.reduce((a, s) => a + f(s), 0);
  return `<section class="of pt">${ofHead()}<div class="ot2t">CONSOLIDADO DEL CENTRO EDUCATIVO DE LOS NIVELES DE LECTURA<br>${GR[g].toUpperCase()} GRADO</div>
  ${fld('Centro Educativo', cen.nombre)}${fld('Tanda', cen.tanda)}${fld('Fecha', hoy())}${fld('Director/a', cen.director)}${fld('Coordinador/a', o.coord)}
  <div class="ofw"><table class="ot2 lt"><thead><tr><th class="w2">Secciones</th>${L.map(l => vh(l.n)).join('')}<th class="obs">Observaciones</th></tr></thead>
  <tbody>${ls.map(l => { const s = sec(l); return `<tr class="tall"><td class="b">${l}</td>${L.map(x => `<td>${s ? s.lc(x.c) : ''}</td>`).join('')}<td></td></tr>`; }).join('')}</tbody>
  <tfoot><tr class="tt"><td>Total</td>${L.map(x => `<td>${sum(s => s.lc(x.c))}</td>`).join('')}<td></td></tr></tfoot></table></div></section>`;
}

/* Sistematización para el distrito: réplica del formulario oficial con las cantidades ya calculadas */
function ofReporte(o) {
  const { c, cen, D } = o, gr = GRS(c), ar = AREAS;
  const box = (l, v) => `<div class="rf"><label>${l}</label><div>${esc(v ?? '') || '&nbsp;'}</div></div>`;
  const sm = (a, m) => `<div class="rs ${a === m ? 'ok' : 'bad'}"><b>Suma registrada: ${a}</b><b>Matrícula del grado: ${m}</b></div>`;
  const mat = g => sests(D, g).length, LV = { F: 'Fluido', SF: 'No fluido', P: 'Palabras', S: 'Sílabas', I: 'Imágenes' };
  let h = `<section class="of rp"><h1>Sistematización Evaluación de Seguimiento ${c === 1 ? 'Primer' : 'Segundo'} Ciclo, Nivel Primario</h1>
  <p class="c">Instrumento para registrar las cantidades generales por grado, área evaluada, nivel de lectura e indicadores de desempeño.</p><hr>
  ${o.limite ? `<div class="rn"><b>${esc(o.limite)}</b></div>` : ''}
  <div class="rc"><h2>Datos generales del centro educativo</h2>${box('Correo *', cen.correo)}${box('Código SIGERD del centro educativo *', cen.codigo)}${box('Nombre completo del centro educativo *', cen.nombre)}${box('Regional *', cen.regional)}${box('Distrito Educativo *', cen.distrito)}${box('Sector *', cen.sector)}${box('Tipo *', cen.tipo)}${box('Tanda del centro *', cen.tanda)}</div>
  <div class="rc"><h2>Matrícula por grado</h2>${gr.map(g => box(`Cantidad de niños inscritos en ${GR[g].toLowerCase()} grado *`, mat(g))).join('')}</div>`;
  if (c === 1) gr.forEach(g => {
    const L = Object.keys(LV), v = L.map(k => sests(D, g).filter(e => { const x = EV(D, e, 'LE'); return x && !x.aus && x.nivel === k; }).length), t = v.reduce((a, b) => a + b, 0);
    h += `<div class="rc"><h2>${GR[g]} Grado Niveles de Lectura</h2><div class="rnote">Escriba la cantidad de estudiantes según el nivel de lectura alcanzado.</div><div class="rsub"><b>Niveles de lectura</b>${L.map((k, i) => box(LV[k] + ' *', v[i])).join('')}${sm(t, mat(g))}</div></div>`;
  });
  gr.forEach(g => ar(g).forEach(a => {
    const d = D.defs[g + a]; if (!d) return;
    h += `<div class="rc"><h2>${GR[g]} Grado ${d.titulo}</h2><div class="rnote">Escriba la cantidad de estudiantes del centro educativo según el nivel alcanzado en cada indicador evaluado.</div>` +
      d.comps.flatMap(k => k.inds).map(i => { const t = tally(D, g, a), v = KS.map(k => t.cnt(i.c, k)); return `<div class="rsub"><b>Indicador ${i.c}. ${esc(i.t)}</b>${box('Elemental *', v[0])}${box('Aceptable *', v[1])}${box('Satisfactorio *', v[2])}${sm(v[0] + v[1] + v[2], mat(g))}</div>`; }).join('') + `</div>`;
  }));
  return h + `<p class="c" style="margin-top:18px">© ${new Date().getFullYear()} Ministerio de Educación</p></section>`;
}
