# Evaluaciones de Seguimiento · Nivel Primario (Netlify + Neon)

## Despliegue
1. Cree un proyecto en **Neon** y copie la cadena de conexión (`postgresql://...`).
2. Suba esta carpeta a un repositorio (GitHub) y conéctelo a **Netlify** (publica `public/`, funciones en `netlify/functions`).
3. En Netlify → *Site settings → Environment variables* agregue:
   - `DATABASE_URL` = cadena de conexión de Neon
   - `ADMIN_PIN` = PIN de administración (solo la dirección lo conoce)
   - `SESSION_SECRET` = texto largo aleatorio (no lo cambie después: invalida los PIN)
4. Abra el sitio. La primera vez aparece **Configuración inicial**: escriba el `ADMIN_PIN` y pulse *Inicializar base de datos*. Se crean las tablas y se cargan los datos oficiales (sin datos de prueba).

## Datos cargados desde sus documentos
- 443 estudiantes en 18 secciones (1.º–6.º, A–C), tomados de `Listados_primaria.pdf`. El único estudiante listado bajo "4P Sección b" se incorporó a 4.º B (continuación de la numeración).
- 17 docentes y 54 asignaciones (solo las áreas evaluadas: Lengua y Matemática en 1.º–3.º; más Sociales y Naturales en 4.º–6.º), tomados de `Cumplimiento_P1`.
- 18 instrumentos (incluida Matemática 4.º–6.º) con competencias, indicadores, ítems y rúbricas Elemental/Aceptable/Satisfactorio (extraídos de sus PDF), y los textos de indicadores del formulario del distrito.
- Períodos: Diagnóstica Sep-2026, Seguimiento Nov-2026 (activo), Mar-2027 y May-2027. Los períodos sin instrumento propio heredan el de noviembre y lo indican en pantalla.

## Accesos
- **Docente**: toca su tarjeta → primer acceso crea su PIN (4–8 dígitos).
- **Coordinación** (una cuenta por ciclo): botón *Acceso coordinación*; el primer acceso exige además el `ADMIN_PIN`. Solo ve su ciclo.
- **Administración**: enlace al pie de la portada (PIN = `ADMIN_PIN`); edita *Datos del centro*.

## Novedades de esta versión
- **Sesión persistente (12 h):** el docente ingresa una vez y cambia de asignatura/sección con las pestañas sobre la matriz, sin volver a entrar.
- **Panel de coordinación** (`Acceso coordinación` → *Panel de coordinación*): Supervisión (avance por docente y por sección/asignatura, pendientes, última actividad), Análisis estadístico, Consolidados oficiales, Reporte al distrito y gestión de Estudiantes. Cada coordinación ve solo su ciclo.
- **Formatos oficiales para imprimir:** desde la matriz, *Imprimir formato oficial* genera el instrumento del docente (con el texto completo de competencias e indicadores) y, en 1.º–3.º, la *Tabla para registrar niveles de lectura*. Elija «Guardar como PDF» en el diálogo de impresión.
- **Reporte al distrito:** réplica del formulario «Sistematización Evaluación de Seguimiento» de cada ciclo, con cantidades por indicador y la verificación «suma registrada = matrícula».
- **Análisis:** rendimiento por asignatura, mapa de calor grado×asignatura, secciones e indicadores críticos, niveles de lectura, estudiantes en riesgo (umbrales ajustables, exportable a CSV) y matriz de plan de acción.
- Para que el reporte salga completo, el administrador debe llenar *Datos del centro* (correo, SIGERD, regional, distrito, sector, tipo).

- **Administración** (enlace al pie de la portada, PIN de administración): agregar/renombrar docentes, restablecer PIN, cambiar el docente de una asignatura, elegir el período activo y copiar instrumentos entre períodos; incluye *Datos del centro*.
- **Comparación entre períodos** en la pestaña Análisis (cambio en % Satisfactorio por asignatura).

## Pendiente de cargar
- Instrumentos propios de la Diagnóstica de septiembre, marzo y mayo (hoy heredan los de noviembre y la pantalla lo indica).
