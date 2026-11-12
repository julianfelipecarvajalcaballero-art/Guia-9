const { getDb, nextId } = require('../data/store');
const AppError = require('../utils/AppError');
const chance = require('./chanceService');
const baloto = require('./balotoService');
const { minutosCierreVentas } = require('../config');
const { minutosEntre } = require('../utils/fechas');

const TIPOS = ['CHANCE', 'BALOTO'];

function listar({ tipo, estado } = {}) {
  return getDb().sorteos.filter((s) => (!tipo || s.tipo === tipo) && (!estado || s.estado === estado));
}

function obtener(id) {
  const sorteo = getDb().sorteos.find((s) => s.id === Number(id));
  if (!sorteo) throw new AppError('Sorteo no encontrado', 404);
  return sorteo;
}

function crear({ tipo, nombre, fecha, acumulado = 0 }) {
  if (!TIPOS.includes(tipo)) throw new AppError('Tipo de sorteo inválido');
  if (!nombre) throw new AppError('El nombre es obligatorio');
  if (!fecha || Number.isNaN(Date.parse(fecha))) throw new AppError('Fecha inválida');
  if (new Date(fecha) <= new Date()) throw new AppError('La fecha del sorteo debe ser futura');

  const sorteo = {
    id: nextId('sorteos'),
    tipo,
    nombre,
    fecha: new Date(fecha).toISOString(),
    estado: 'ABIERTO',
    resultado: null,
    acumulado: tipo === 'BALOTO' ? acumulado : 0,
  };
  getDb().sorteos.push(sorteo);
  return sorteo;
}

function verificarVentaPermitida(sorteo, tipoEsperado) {
  if (sorteo.tipo !== tipoEsperado) throw new AppError(`El sorteo no es de tipo ${tipoEsperado}`);
  if (sorteo.estado !== 'ABIERTO') throw new AppError('El sorteo no está abierto para ventas', 409);
  if (minutosEntre(new Date(), sorteo.fecha) < minutosCierreVentas) {
    throw new AppError('Las ventas para este sorteo ya cerraron', 409);
  }
}

/**
 * Registra el resultado oficial de un sorteo, lo valida según su tipo, marca el sorteo
 * como JUGADO y liquida en memoria todos los tiquetes ACTIVOS de ese sorteo.
 *
 * Comportamiento y efectos que el código por sí solo no aclara:
 * - Es destructiva y no repetible: si el sorteo ya está JUGADO responde 409, de modo que
 *   el resultado oficial no puede sobrescribirse ni re-liquidar premios.
 * - La liquidación es un efecto secundario inmediato (no hay tarea en segundo plano):
 *   al terminar esta función cada tiquete ACTIVO del sorteo ya tiene su campo `premio`
 *   calculado con `chanceService.calcularPremio` o `balotoService.calcularPremio`,
 *   según el tipo del sorteo.
 * - Los tiquetes ANULADOS y PAGADOS no se re-liquidan; conservan el estado que ya tenían.
 * - El formato del `resultado` depende del tipo: para CHANCE debe ser una cadena de 4
 *   dígitos (ver `chanceService.validarResultado`) y para BALOTO un objeto con 5 números
 *   (1-43, sin repetir) y superbalota (1-16) (ver `balotoService.validarJugada`). El
 *   resultado se almacena normalizado (jugada ordenada de menor a mayor).
 * - Además del `resultado`, el sorteo recibe la marca de tiempo `jugadoEn`, que luego
 *   gobierna la caducidad del premio en `ticketService.pagarPremio`.
 *
 * @function registrarResultado
 * @param {number|string} id - Identificador del sorteo; se compara como número
 *   (`Number(id)`) porque así llega desde la ruta `POST /api/v1/sorteos/:id/resultado`.
 * @param {string|{numeros: number[], superbalota: number}} resultado - Resultado oficial:
 *   cadena de 4 dígitos para CHANCE (p. ej. `"1234"`) u objeto jugada para BALOTO
 *   (p. ej. `{numeros: [3, 10, 21, 30, 43], superbalota: 7}`).
 * @returns {{id: number, tipo: 'CHANCE'|'BALOTO', nombre: string, fecha: string,
 *   estado: 'JUGADO', resultado: (string|{numeros: number[], superbalota: number}),
 *   acumulado: number, jugadoEn: string}}
 *   El sorteo actualizado, con `estado: 'JUGADO'`, el resultado validado/normalizado y
 *   `jugadoEn` en ISO 8601 UTC. Es la misma referencia del objeto en memoria, por lo que
 *   las liquidaciones ya son visibles para consultas posteriores.
 * @throws {AppError} Con status 404 si no existe un sorteo con ese id
 *   (`'Sorteo no encontrado'`, reenviado por `obtener`).
 * @throws {AppError} Con status 409 si el sorteo ya tiene resultado
 *   (`'El sorteo ya tiene resultado'`).
 * @throws {AppError} Con status 400 si `resultado` no cumple el formato exigido por el
 *   tipo del sorteo (propagado por `validarResultado` o `validarJugada`).
 * @example
 * // Resultado de chance desde el controlador (rol ADMIN):
 * res.json(sorteoService.registrarResultado(req.params.id, req.body.resultado));
 */
function registrarResultado(id, resultado) {
  const sorteo = obtener(id);
  if (sorteo.estado === 'JUGADO') throw new AppError('El sorteo ya tiene resultado', 409);

  sorteo.resultado = sorteo.tipo === 'CHANCE'
    ? chance.validarResultado(resultado)
    : baloto.validarJugada(resultado);
  sorteo.estado = 'JUGADO';
  sorteo.jugadoEn = new Date().toISOString();

  getDb().tickets
    .filter((t) => t.sorteoId === sorteo.id && t.estado === 'ACTIVO')
    .forEach((t) => liquidarTicket(t, sorteo));

  return sorteo;
}

function liquidarTicket(ticket, sorteo) {
  if (sorteo.tipo === 'CHANCE') {
    ticket.apuestas.forEach((a) => { a.premio = chance.calcularPremio(a, sorteo.resultado); });
    ticket.premio = ticket.apuestas.reduce((s, a) => s + a.premio, 0);
  } else {
    ticket.jugadas.forEach((j) => { j.premio = baloto.calcularPremio(j, sorteo.resultado, sorteo.acumulado); });
    ticket.premio = ticket.jugadas.reduce((s, j) => s + j.premio, 0);
  }
}

module.exports = { listar, obtener, crear, registrarResultado, verificarVentaPermitida };
