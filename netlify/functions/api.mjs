import { neon } from '@neondatabase/serverless';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import people from '../../seed/personas.json';
import insts from '../../seed/instrumentos.json';

export const config = { path: '/api/*' };
const sql = neon(process.env.DATABASE_URL);
const q = (t, p = []) => sql.query(t, p);
const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PIN || 'cambiar';
const BASE = '2026-11';
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const err = (m, s = 400) => J({ error: m }, s);
const hash = (p) => createHash('sha256').update('sg:' + SECRET + p).digest('hex');
const sign = (o) => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + createHmac('sha256', SECRET).update(b).digest('base64url'); };
const verify = (t) => { try { const [b, s] = (t || '').split('.'); const e = createHmac('sha256', SECRET).update(b).digest('base64url');
  if (s.length !== e.length || !timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  const o = JSON.parse(Buffer.from(b, 'base64url')); return o.exp > Date.now() ? o : null; } catch { return null; } };

const SCHEMA = [
`create table if not exists ajustes(clave text primary key, valor jsonb not null)`,
`create table if not exists secciones(id serial primary key, grado int not null, letra text not null, tanda text default 'M', unique(grado,letra))`,
`create table if not exists estudiantes(id serial primary key, matricula text unique, apellidos text not null, nombres text not null, seccion_id int references secciones(id), orden int, activo boolean default true)`,
`create table if not exists docentes(id serial primary key, nombre text unique not null, rol text default 'docente', ciclo int, pin_hash text)`,
`create table if not exists asignaciones(id serial primary key, docente_id int references docentes(id), seccion_id int references secciones(id), area text not null, unique(seccion_id,area))`,
`create table if not exists periodos(id text primary key, nombre text not null, tipo text not null, orden int, abierto boolean default false)`,
`create table if not exists instrumentos(periodo_id text references periodos(id), grado int, area text, def jsonb not null, n_ind int not null, lec boolean default false, primary key(periodo_id,grado,area))`,
`create table if not exists evaluaciones(periodo_id text references periodos(id), estudiante_id int references estudiantes(id), area text, resultados jsonb not null default '{}', nivel text, ausente boolean default false, por text, actualizado timestamptz default now(), primary key(periodo_id,estudiante_id,area))`];

async function init() {
  for (const s of SCHEMA) await q(s);
  await q(`insert into ajustes values('centro',$1) on conflict do nothing`, [JSON.stringify({ nombre: 'SANTO DOMINGO', codigo: '', regional: '', distrito: '', sector: '', tipo: '', tanda: 'Matutina', director: '', anio: '2026-2027' })]);
  for (const [i, p] of [['2026-09', 'Evaluación Diagnóstica · Septiembre', 'diagnostica'], ['2026-11', 'Evaluación de Seguimiento · Noviembre', 'seguimiento'], ['2027-03', 'Evaluación de Seguimiento · Marzo', 'seguimiento'], ['2027-05', 'Evaluación de Seguimiento · Mayo', 'seguimiento']].entries())
    await q(`insert into periodos values($1,$2,$3,$4,$5) on conflict do nothing`, [p[0], p[1], p[2], i, p[0] === BASE]);
  for (const s of people.secciones) await q(`insert into secciones(grado,letra,tanda) values($1,$2,$3) on conflict do nothing`, [s.grado, s.sec, s.tanda]);
  const sec = Object.fromEntries((await q('select id,grado,letra from secciones')).map(r => [r.grado + r.letra, r.id]));
  for (const e of people.estudiantes) await q(`insert into estudiantes(matricula,apellidos,nombres,seccion_id,orden) values($1,$2,$3,$4,$5) on conflict do nothing`, [e.mat, e.ap, e.nom, sec[e.grado + e.sec], e.orden]);
  for (const n of people.docentes) await q(`insert into docentes(nombre) values($1) on conflict do nothing`, [n]);
  for (const c of [1, 2]) await q(`insert into docentes(nombre,rol,ciclo) values($1,'coord',$2) on conflict do nothing`, [`Coordinación ${c === 1 ? 'Primer' : 'Segundo'} Ciclo`, c]);
  const doc = Object.fromEntries((await q('select id,nombre from docentes')).map(r => [r.nombre, r.id]));
  for (const a of people.asignaciones) await q(`insert into asignaciones(docente_id,seccion_id,area) values($1,$2,$3) on conflict do nothing`, [doc[a.doc], sec[a.grado + a.sec], a.area]);
  for (const i of insts) await q(`insert into instrumentos values($1,$2,$3,$4,$5,$6) on conflict do nothing`, [BASE, i.grado, i.area, JSON.stringify(i.def_), i.def_.comps.reduce((n, c) => n + c.inds.length, 0), !!i.def_.lec]);
  return { ok: true, estudiantes: people.estudiantes.length, asignaciones: people.asignaciones.length };
}

const can = (u, a) => u.r === 'admin' || (u.r === 'coord' && u.c === (a.grado <= 3 ? 1 : 2)) || (u.r === 'docente' && u.id === a.docente_id);
const NI = `(select distinct on (grado,area) grado,area,n_ind,lec from instrumentos order by grado,area,(periodo_id=$1) desc,periodo_id)`;

export default async (req) => {
  const url = new URL(req.url), route = url.pathname.replace(/^\/api\//, ''), m = req.method, P = url.searchParams;
  const body = ['POST', 'PUT'].includes(m) ? await req.json().catch(() => ({})) : {};
  const u = verify((req.headers.get('authorization') || '').replace('Bearer ', ''));
  try {
    if (route === 'init' && m === 'POST') return body.pin && body.pin === process.env.ADMIN_PIN ? J(await init()) : err('PIN de administración incorrecto', 403);

    if (route === 'login' && m === 'POST') {
      if (body.admin) return body.pin && body.pin === process.env.ADMIN_PIN ? J({ token: sign({ r: 'admin', exp: Date.now() + 12 * 36e5 }), user: { r: 'admin', nombre: 'Administración' } }) : err('PIN incorrecto', 403);
      const [d] = await q('select * from docentes where id=$1', [body.id]);
      if (!d) return err('Usuario no encontrado', 404);
      if (!d.pin_hash) {
        if (!/^\d{4,8}$/.test(body.pin || '')) return err('Cree un PIN de 4 a 8 dígitos');
        if (d.rol === 'coord' && body.admin_pin !== process.env.ADMIN_PIN) return err('Primer acceso de coordinación: requiere el PIN de administración', 403);
        await q('update docentes set pin_hash=$1 where id=$2', [hash(body.pin), d.id]);
      } else if (d.pin_hash !== hash(body.pin || '')) return err('PIN incorrecto', 403);
      return J({ token: sign({ r: d.rol, id: d.id, c: d.ciclo, exp: Date.now() + 12 * 36e5 }), user: { r: d.rol, id: d.id, nombre: d.nombre, ciclo: d.ciclo } });
    }

    if (route === 'boot') {
      const ciclo = +P.get('ciclo') || 1, per = await q('select * from periodos order by orden'), pid = P.get('periodo') || per.find(p => p.abierto)?.id || BASE;
      const g = ciclo === 1 ? '<=3' : '>=4';
      const asig = await q(`with ni as ${NI}
        select a.id, a.docente_id, a.area, s.id seccion_id, s.grado, s.letra,
          (select count(*)::int from estudiantes e where e.seccion_id=s.id and e.activo) total,
          (select max(v.actualizado) from evaluaciones v join estudiantes e on e.id=v.estudiante_id where e.seccion_id=s.id and v.periodo_id=$1 and v.area=a.area) ult,
          (select count(*)::int from evaluaciones v join estudiantes e on e.id=v.estudiante_id where e.seccion_id=s.id and e.activo and v.periodo_id=$1 and v.area=a.area
             and (v.ausente or ((select count(*) from jsonb_object_keys(v.resultados))>=coalesce(ni.n_ind,0) and (not coalesce(ni.lec,false) or v.nivel is not null)))) hechos
        from asignaciones a join secciones s on s.id=a.seccion_id left join ni on ni.grado=s.grado and ni.area=a.area
        where s.grado ${g} order by s.grado, s.letra, a.area`, [pid]);
      const ids = [...new Set(asig.map(a => a.docente_id))];
      const docs = await q(`select id,nombre,rol,ciclo,(pin_hash is not null) tiene_pin from docentes where id=any($1) or (rol='coord' and ciclo=$2) order by nombre`, [ids, ciclo]);
      const [c] = await q(`select valor from ajustes where clave='centro'`);
      return J({ periodos: per, periodo: pid, asig, docs, centro: c?.valor || {} });
    }
    if (!u) return err('Sesión requerida', 401);

    if (route === 'defs') return J({ defs: await q(`select distinct on (grado,area) grado, area, def from instrumentos order by grado, area, (periodo_id=$1) desc, periodo_id`, [P.get('periodo')]) });

    if (route === 'comparar') {
      if (u.r === 'docente') return err('Solo coordinación', 403);
      const ciclo = +P.get('ciclo') || 1; if (u.r === 'coord' && u.c !== ciclo) return err('Sin acceso', 403);
      return J({ rows: await q(`select v.periodo_id, s.grado, v.area, j.value k, count(*)::int n from evaluaciones v join estudiantes e on e.id=v.estudiante_id join secciones s on s.id=e.seccion_id, jsonb_each_text(v.resultados) j where not v.ausente and e.activo and s.grado ${ciclo === 1 ? '<=3' : '>=4'} group by 1,2,3,4`) });
    }

    if (route.startsWith('adm/')) {
      if (u.r !== 'admin') return err('Solo administración', 403);
      const r = route.slice(4);
      if (r === 'datos') return J({
        docs: await q(`select d.id, d.nombre, d.rol, d.ciclo, (d.pin_hash is not null) tiene_pin, (select count(*)::int from asignaciones a where a.docente_id=d.id) n from docentes d order by d.rol desc, d.nombre`),
        asig: await q(`select a.id, a.docente_id, a.area, s.grado, s.letra from asignaciones a join secciones s on s.id=a.seccion_id order by s.grado, s.letra, a.area`),
        per: await q(`select p.*, (select count(*)::int from instrumentos i where i.periodo_id=p.id) instr, (select count(*)::int from evaluaciones v where v.periodo_id=p.id) evals from periodos p order by orden`) });
      if (r === 'docente' && m === 'POST') {
        const n = (body.nombre || '').trim(); if (!n) return err('Escriba el nombre');
        if (body.id) await q('update docentes set nombre=$1 where id=$2', [n, body.id]); else await q('insert into docentes(nombre) values($1)', [n]);
        return J({ ok: true });
      }
      if (r === 'pin' && m === 'POST') { await q('update docentes set pin_hash=null where id=$1', [body.id]); return J({ ok: true }); }
      if (r === 'asignacion' && m === 'PUT') { await q('update asignaciones set docente_id=$1 where id=$2', [body.docente_id, body.id]); return J({ ok: true }); }
      if (r === 'periodo' && m === 'POST') { await q('update periodos set abierto=(id=$1)', [body.id]); return J({ ok: true }); }
      if (r === 'copiar' && m === 'POST') {
        if (!body.desde || !body.hacia || body.desde === body.hacia) return err('Elija períodos distintos');
        await q('insert into instrumentos(periodo_id,grado,area,def,n_ind,lec) select $1,grado,area,def,n_ind,lec from instrumentos where periodo_id=$2 on conflict do nothing', [body.hacia, body.desde]); return J({ ok: true });
      }
      return err('Ruta no encontrada', 404);
    }

    if (route === 'seccion') {
      const [a] = await q(`select a.*, s.grado, s.letra from asignaciones a join secciones s on s.id=a.seccion_id where a.id=$1`, [P.get('asig')]);
      if (!a || !can(u, a)) return err('Sin acceso', 403);
      const pid = P.get('periodo');
      const [i] = await q(`select def, periodo_id from instrumentos where grado=$1 and area=$2 order by (periodo_id=$3) desc limit 1`, [a.grado, a.area, pid]);
      const est = await q(`select e.id,e.matricula,e.apellidos,e.nombres,e.activo,v.resultados,v.nivel,v.ausente from estudiantes e left join evaluaciones v on v.estudiante_id=e.id and v.periodo_id=$1 and v.area=$2 where e.seccion_id=$3 order by e.orden, e.apellidos`, [pid, a.area, a.seccion_id]);
      return J({ asig: a, def: i?.def, heredado: i && i.periodo_id !== pid ? i.periodo_id : null, est });
    }

    if (route === 'eval' && m === 'PUT') {
      const [a] = await q(`select a.*, s.grado from asignaciones a join estudiantes e on e.seccion_id=a.seccion_id join secciones s on s.id=a.seccion_id where e.id=$1 and a.area=$2`, [body.est, body.area]);
      if (!a || !can(u, a)) return err('Sin acceso', 403);
      await q(`insert into evaluaciones(periodo_id,estudiante_id,area,resultados,nivel,ausente,por,actualizado) values($1,$2,$3,$4,$5,$6,$7,now())
        on conflict(periodo_id,estudiante_id,area) do update set resultados=$4, nivel=$5, ausente=$6, por=$7, actualizado=now()`,
        [body.periodo, body.est, body.area, JSON.stringify(body.res || {}), body.nivel || null, !!body.ausente, u.r + ':' + (u.id || 'admin')]);
      return J({ ok: true });
    }

    if (route === 'consol') {
      if (u.r === 'docente') return err('Solo coordinación', 403);
      const ciclo = +P.get('ciclo') || 1; if (u.r === 'coord' && u.c !== ciclo) return err('Sin acceso', 403);
      const rows = await q(`select s.id seccion_id, s.grado, s.letra, e.id est, e.matricula, e.apellidos, e.nombres, e.orden, v.area, v.resultados, v.nivel, v.ausente, v.actualizado from estudiantes e join secciones s on s.id=e.seccion_id left join evaluaciones v on v.estudiante_id=e.id and v.periodo_id=$1 where e.activo and s.grado ${ciclo === 1 ? '<=3' : '>=4'} order by s.grado, s.letra, e.orden`, [P.get('periodo')]);
      return J({ rows });
    }

    if (route === 'estudiante' && m === 'POST') {
      const sid = body.seccion_id;
      if (u.r === 'docente' && !(await q('select 1 from asignaciones where docente_id=$1 and seccion_id=$2', [u.id, sid])).length) return err('Sin acceso', 403);
      if (!body.apellidos || !body.nombres) return err('Apellidos y nombres son obligatorios');
      if (body.id) await q('update estudiantes set matricula=$1, apellidos=$2, nombres=$3, activo=$4 where id=$5 and seccion_id=$6', [body.matricula || null, body.apellidos.toUpperCase(), body.nombres.toUpperCase(), body.activo !== false, body.id, sid]);
      else await q(`insert into estudiantes(matricula,apellidos,nombres,seccion_id,orden) values($1,$2,$3,$4,(select coalesce(max(orden),0)+1 from estudiantes where seccion_id=$4))`, [body.matricula || null, body.apellidos.toUpperCase(), body.nombres.toUpperCase(), sid]);
      return J({ ok: true });
    }

    if (route === 'ajustes' && m === 'PUT') {
      if (u.r !== 'admin') return err('Solo administración', 403);
      await q(`insert into ajustes values('centro',$1) on conflict(clave) do update set valor=$1`, [JSON.stringify(body)]); return J({ ok: true });
    }
    return err('Ruta no encontrada', 404);
  } catch (e) { return err('Error de servidor: ' + e.message, 500); }
};
