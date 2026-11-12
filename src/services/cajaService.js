const { getDb, nextId } = require('../data/store');
const AppError = require('../utils/AppError');
const { fechaLocal } = require('../utils/fechas');

function resumen(vendedorId, fecha = fechaLocal()) {
  const db = getDb();
  const delDia = (iso) => fechaLocal(iso) === fecha;

  const tickets = db.tickets.filter((t) => t.vendedorId === vendedorId && delDia(t.creadoEn));
  const validos = tickets.filter((t) => t.estado !== 'ANULADO');
  const pagos = db.pagos.filter((p) => p.usuarioId === vendedorId && delDia(p.fecha));

  const totalVendido = validos.reduce((s, t) => s + t.total, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.valor, 0);

  return {
    vendedorId,
    fecha,
    tiquetesVendidos: validos.length,
    tiquetesAnulados: tickets.length - validos.length,
    ventasChance: validos.filter((t) => t.tipo === 'CHANCE').reduce((s, t) => s + t.total, 0),
    ventasBaloto: validos.filter((t) => t.tipo === 'BALOTO').reduce((s, t) => s + t.total, 0),
    totalVendido,
    premiosPagados: pagos.length,
    totalPagado,
    saldoEsperado: totalVendido - totalPagado,
    cerrada: db.cierres.some((c) => c.vendedorId === vendedorId && c.fecha === fecha),
  };
}

/**
 * Cierra la caja de un vendedor para una fecha: compara el efectivo reportado con el
 * saldo esperado del día y deja registrado el cierre con su estado y diferencia.
 *
 * Decisiones y efectos que el código por sí solo no aclara:
 * - `efectivoReportado` debe ser un **entero** positivo (no se aceptan centavos), en
 *   línea con el resto de valores monetarios de la API, que trabajan en pesos enteros.
 * - El cierre usa el `resumen` de la misma fecha, por lo que el `saldoEsperado`
 *   (= `totalVendido - totalPagado`) refleja exactamente lo calculado en pantalla al
 *   momento de cerrar; los movimientos posteriores no reabren el día.
 * - El estado se deduce del signo de la diferencia: `CUADRADA` si es 0, `SOBRANTE` si el
 *   vendedor reporta más efectivo del esperado y `FALTANTE` si reporta menos.
 * - Efecto secundario: el cierre se agrega a `db.cierres` y como ese día queda
 *   `cerrada: true`, cualquier intento posterior de cierre para el mismo vendedor y
 *   fecha responde 409 (un cierre no se reabre ni se corrige).
 * - El resumen embebido en el cierre es una **copia instantánea**: si más tarde se
 *   registra una anulación, el cierre histórico conserva los totales originales.
 *
 * @function cerrar
 * @param {number} vendedorId - Identificador del vendedor cuya caja se cierra; en la
 *   ruta `POST /api/v1/caja/cierre` siempre es el id del usuario autenticado
 *   (se pasa `req.usuario.id` desde el controlador).
 * @param {{efectivoReportado: number, fecha?: string}} datos - Cuerpo del cierre: el
 *   dinero contado en caja y, opcionalmente, la fecha a cerrar en formato `YYYY-MM-DD`
 *   (por omisión, hoy en la zona `ZONA_HORARIA`).
 * @returns {{id: number, vendedorId: number, fecha: string, tiquetesVendidos: number,
 *   tiquetesAnulados: number, ventasChance: number, ventasBaloto: number,
 *   totalVendido: number, premiosPagados: number, totalPagado: number,
 *   saldoEsperado: number, cerrada: true, efectivoReportado: number, diferencia: number,
 *   estado: ('CUADRADA'|'SOBRANTE'|'FALTANTE'), creadoEn: string}}
 *   El cierre registrado, con el resumen embebido del día, `diferencia`
 *   (`efectivoReportado - saldoEsperado`) y el estado deducido del signo.
 * @throws {AppError} Con status 400 si `efectivoReportado` no es un entero no negativo
 *   (`'El efectivo reportado debe ser un entero positivo'`).
 * @throws {AppError} Con status 409 si la caja de ese vendedor y fecha ya fue cerrada
 *   (`'La caja de ese día ya fue cerrada'`).
 * @example
 * // Cierre de caja desde el controlador (rol VENDEDOR):
 * res.status(201).json(cajaService.cerrar(req.usuario.id, req.body));
 */
function cerrar(vendedorId, { efectivoReportado, fecha = fechaLocal() }) {
  if (!Number.isInteger(efectivoReportado) || efectivoReportado < 0) {
    throw new AppError('El efectivo reportado debe ser un entero positivo');
  }
  const r = resumen(vendedorId, fecha);
  if (r.cerrada) throw new AppError('La caja de ese día ya fue cerrada', 409);

  const diferencia = efectivoReportado - r.saldoEsperado;
  const cierre = {
    id: nextId('cierres'),
    ...r,
    cerrada: true,
    efectivoReportado,
    diferencia,
    estado: diferencia === 0 ? 'CUADRADA' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE',
    creadoEn: new Date().toISOString(),
  };
  getDb().cierres.push(cierre);
  return cierre;
}

module.exports = { resumen, cerrar };
