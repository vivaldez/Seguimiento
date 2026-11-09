/* Administración: docentes, asignaciones, PIN, períodos y datos del centro */
async function adminView(tab) {
  if (S.user?.r !== 'admin') { location.hash = '#/'; return; }
  if (!S.boot) await boot(1);
  const d = await api('adm/datos'), T = { doc: 'Docentes', asi: 'Asignaciones', per: 'Períodos' };
  tab = T[tab] ? tab : 'doc';
  const dos = d.docs.filter(x => x.rol === 'docente'), nm = id => d.docs.find(x => x.id === id)?.nombre || '';
  let h = '';
  if (tab === 'doc') h = `<div class="row" style="margin-bottom:12px"><p class="muted" style="margin:0;flex:1">El docente crea su PIN en el primer ingreso. «Restablecer PIN» lo borra para que cree uno nuevo.</p><button class="btn" onclick="admDoc()">+ Agregar docente</button></div>
    <div class="card"><div class="sc2"><table class="tb"><tr><th>Nombre</th><th>Rol</th><th>Asignaciones</th><th>PIN</th><th></th></tr>${d.docs.map(x => `<tr><td>${esc(x.nombre)}</td><td>${x.rol === 'coord' ? `Coordinación ${x.ciclo}.º ciclo` : 'Docente'}</td><td>${x.n}</td><td><span class="st ${x.tiene_pin ? 'ok' : 'mid'}">${x.tiene_pin ? 'Creado' : 'Sin crear'}</span></td><td><button class="x" onclick="admDoc(${x.id},'${esc(x.nombre).replace(/'/g, '')}')">Renombrar</button> <button class="x" onclick="admPin(${x.id})">Restablecer PIN</button></td></tr>`).join('')}</table></div></div>`;
  if (tab === 'asi') h = `<p class="muted">Cambie el docente responsable de una asignatura en una sección. Las evaluaciones ya registradas se conservan.</p><div class="card"><div class="sc2"><table class="tb"><tr><th>Sección</th><th>Asignatura</th><th>Docente</th></tr>${d.asig.map(a => `<tr><td>${GR[a.grado]} ${a.letra}</td><td>${AR[a.area]}</td><td><select onchange="admAsig(${a.id},this.value)">${dos.map(x => `<option value="${x.id}" ${x.id === a.docente_id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></td></tr>`).join('')}</table></div></div>`;
  if (tab === 'per') h = `<div class="card"><div class="sc2"><table class="tb"><tr><th>Período</th><th>Activo</th><th>Instrumentos</th><th>Evaluaciones</th></tr>${d.per.map(p => `<tr><td>${esc(p.nombre)}</td><td><input type="radio" name="pa" ${p.abierto ? 'checked' : ''} onchange="admPer('${p.id}')"></td><td>${p.instr}</td><td>${p.evals}</td></tr>`).join('')}</table></div></div>
    <div class="card" style="margin-top:18px"><h3>Copiar instrumentos entre períodos</h3><p class="muted">Útil cuando un período nuevo usa los mismos instrumentos que otro. Solo agrega los que faltan; no sobrescribe.</p><div class="row"><span>Copiar de</span><select id="cd">${d.per.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select><span>a</span><select id="ch">${d.per.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select><button class="btn" onclick="admCopy()">Copiar</button></div></div>`;
  $('#app').innerHTML = `<div class="crumb"><a href="#/">Inicio</a> › Administración</div><div class="row"><h1>Administración</h1><div class="sp"></div><button class="btn alt" onclick="centro()">Datos del centro</button></div>
  <div class="tabs">${Object.entries(T).map(([k, v]) => `<a class="tab ${k === tab ? 'on' : ''}" href="#/admin/${k}">${v}</a>`).join('')}</div>${h}`;
}
const admDo = async (p, m, b, msg) => { try { await api(p, { m, b }); toast(msg || 'Guardado'); S.boot = null; route(); } catch (e) { toast(e.message, 1); } };
function admDoc(id, n) { const v = prompt(id ? 'Nuevo nombre' : 'Nombre completo del docente', n || ''); if (v) admDo('adm/docente', 'POST', { id, nombre: v }); }
function admPin(id) { if (confirm('¿Restablecer el PIN de esta persona? Deberá crear uno nuevo en su próximo ingreso.')) admDo('adm/pin', 'POST', { id }, 'PIN restablecido'); }
const admAsig = (id, doc) => admDo('adm/asignacion', 'PUT', { id, docente_id: +doc });
const admPer = (id) => admDo('adm/periodo', 'POST', { id }, 'Período activo actualizado');
const admCopy = () => admDo('adm/copiar', 'POST', { desde: $('#cd').value, hacia: $('#ch').value }, 'Instrumentos copiados');
