const crypto = require('crypto');
const { getDb, nextId } = require('../data/store');
const AppError = require('../utils/AppError');
const chance = require('./chanceService');
const baloto = require('./balotoService');
const sorteos = require('./sorteoService');
const { valorBaloto, minutosAnulacion, diasCaducidadPremio } = require('../config');
const { minutosEntre, diasEntre } = require('../utils/fechas');

function generarCodigo(tipo) {
  const prefijo = tipo === 'CHANCE' ? 'CH' : 'BL';
  return `${prefijo}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function guardar(ticket) {
  getDb().tickets.push(ticket);
  return ticket;
}

/**
 * Vende un tiquete de chance: valida que el sorteo destino exista, esté ABIERTO y con
 * ventas vigentes, normaliza entre 1 y 5 apuestas, genera el código único del tiquete y
 * lo guarda en la base de datos en memoria.
 *
 * Reglas de negocio que el código por sí solo no aclara:
 * - El límite de 1 a 5 apuestas por tiquete es una decisión del puesto de juego
 *   (ventanilla), no una restricción técnica.
 * - Cada apuesta pasa por `chanceService.validarApuesta`: número de 1 a 4 dígitos como
 *   cadena, valor entero entre `APUESTA_MIN_CHANCE` y `APUESTA_MAX_CHANCE`
 *   (500-50 000 por defecto, configurables por variables de entorno) y múltiplo de 100.
 * - La modalidad por omisión es DIRECTO; COMBINADO solo admite 3 o 4 cifras y rechaza
 *   números con todas las cifras iguales, porque no tienen permutaciones que combinar.
 * - `total` es la suma de los valores validados; el premio queda en `null` hasta que el
 *   sorteo se juegue y `registrarResultado` liquide el tiquete.
 * - El código se compone como `CH-` + 8 caracteres hexadecimales aleatorios
 *   (`crypto.randomBytes(4)`): es operativo para una ventanilla, pero la colisión no se
 *   comprueba; se asume improbable (1 entre ~4300 millones por sorteo).
 *
 * @function venderChance
 * @param {{id: number, usuario: string, nombre: string, rol: string}} vendedor - Usuario
 *   autenticado que realiza la venta (se pasa `req.usuario` desde el controlador); su
 *   `id` queda registrado como `vendedorId` del tiquete y habilita la anulación posterior.
 * @param {{sorteoId: number|string, apuestas: Array<{numero: string,
 *   modalidad?: ('DIRECTO'|'COMBINADO'), valor: number}>, cliente?: string}} datos -
 *   Cuerpo de la venta: `sorteoId` del sorteo CHANCE, de 1 a 5 apuestas y un
 *   identificador de cliente opcional (se guarda tal cual, sin validación de formato).
 * @returns {{id: number, codigo: string, tipo: 'CHANCE', sorteoId: number,
 *   vendedorId: number, cliente: string|null, apuestas: Array<{numero: string,
 *   cifras: number, modalidad: string, valor: number}>, total: number, estado: 'ACTIVO',
 *   premio: null, creadoEn: string}}
 *   El tiquete guardado, con `codigo` con prefijo `CH-`, apuestas normalizadas
 *   (`cifras` derivada del número), `total` en pesos y `estado` inicial `ACTIVO`.
 * @throws {AppError} Con status 404 si el sorteo no existe (`'Sorteo no encontrado'`).
 * @throws {AppError} Con status 409 si el sorteo no es de tipo CHANCE, no está ABIERTO o
 *   faltan menos de `MINUTOS_CIERRE_VENTAS` minutos (15 por defecto) para su fecha
 *   (propagado por `sorteoService.verificarVentaPermitida`).
 * @throws {AppError} Con status 400 si `apuestas` no es un arreglo de 1 a 5 elementos
 *   (`'Un tiquete de chance debe tener entre 1 y 5 apuestas'`) o si alguna apuesta no
 *   cumple las reglas de `chanceService.validarApuesta` (número, modalidad o valor).
 * @example
 * // Venta desde el controlador (rol VENDEDOR); los errores los atrapa manejarErrores:
 * res.status(201).json(ticketService.venderChance(req.usuario, req.body));
 */
function venderChance(vendedor, { sorteoId, apuestas, cliente }) {
  const sorteo = sorteos.obtener(sorteoId);
  sorteos.verificarVentaPermitida(sorteo, 'CHANCE');

  if (!Array.isArray(apuestas) || apuestas.length === 0 || apuestas.length > 5) {
    throw new AppError('Un tiquete de chance debe tener entre 1 y 5 apuestas');
  }
  const validas = apuestas.map(chance.validarApuesta);

  return guardar({
    id: nextId('tickets'),
    codigo: generarCodigo('CHANCE'),
    tipo: 'CHANCE',
    sorteoId: sorteo.id,
    vendedorId: vendedor.id,
    cliente: cliente || null,
    apuestas: validas,
    total: validas.reduce((s, a) => s + a.valor, 0),
    estado: 'ACTIVO',
    premio: null,
    creadoEn: new Date().toISOString(),
  });
}

function venderBaloto(vendedor, { sorteoId, jugadas, cliente }) {
  const sorteo = sorteos.obtener(sorteoId);
  sorteos.verificarVentaPermitida(sorteo, 'BALOTO');

  if (!Array.isArray(jugadas) || jugadas.length === 0 || jugadas.length > 10) {
    throw new AppError('Un tiquete de Baloto debe tener entre 1 y 10 jugadas');
  }
  const validas = jugadas.map(baloto.validarJugada);

  return guardar({
    id: nextId('tickets'),
    codigo: generarCodigo('BALOTO'),
    tipo: 'BALOTO',
    sorteoId: sorteo.id,
    vendedorId: vendedor.id,
    cliente: cliente || null,
    jugadas: validas,
    total: validas.length * valorBaloto,
    estado: 'ACTIVO',
    premio: null,
    creadoEn: new Date().toISOString(),
  });
}

function buscar(codigo) {
  const ticket = getDb().tickets.find((t) => t.codigo === codigo);
  if (!ticket) throw new AppError('Tiquete no encontrado', 404);
  return ticket;
}

function listar(usuario, { fecha, estado } = {}) {
  return getDb().tickets.filter((t) =>
    (usuario.rol === 'ADMIN' || t.vendedorId === usuario.id) &&
    (!estado || t.estado === estado) &&
    (!fecha || t.creadoEn.startsWith(fecha)));
}

function consultar(codigo) {
  const ticket = buscar(codigo);
  const sorteo = sorteos.obtener(ticket.sorteoId);
  return {
    ...ticket,
    sorteo: { id: sorteo.id, nombre: sorteo.nombre, fecha: sorteo.fecha, estado: sorteo.estado, resultado: sorteo.resultado },
    ganador: sorteo.estado === 'JUGADO' ? ticket.premio > 0 : null,
  };
}

/**
 * Anula un tiquete ACTIVO y deja registrada la trazabilidad de la anulación.
 *
 * El orden de las verificaciones es intencional (no es casual) y define qué error ve
 * primero el cliente:
 * 1. **Existencia** (404) - busca el tiquete por código.
 * 2. **Propiedad** (403) - solo el vendedor que lo emitió o un ADMIN pueden anularlo;
 *    un vendedor ajeno recibe `'No puede anular tiquetes de otro vendedor'`.
 * 3. **Estado** (409) - solo se anulan tiquetes ACTIVOS; ANULADO/PAGADO/CADUCADO se
 *    rechazan con el estado interpelado en el mensaje.
 * 4. **Sorteo jugado** (409) - si el sorteo asociado ya es JUGADO no se anula, porque el
 *    tiquete ya participó en la liquidación de premios.
 * 5. **Ventana de tiempo** (409) - solo aplica a vendedores: `MINUTOS_ANULACION` minutos
 *    (10 por defecto) desde `creadoEn`. El ADMIN no tiene límite de tiempo, decisión que
 *    da al administrador capacidad de corrección sobre ventas antiguas.
 * 6. **Motivo** (400) - el motivo es obligatorio y se persiste con el usuario y la fecha.
 *
 * @function anular
 * @param {string} codigo - Código del tiquete impreso en el ticket (p. ej. `"CH-A1B2C3D4"`).
 * @param {{id: number, rol: ('ADMIN'|'VENDEDOR')}} usuario - Usuario autenticado que
 *   solicita la anulación (se pasa `req.usuario` desde el controlador).
 * @param {string=} motivo - Justificación de la anulación; obligatorio en la práctica
 *   (si llega vacío la anulación se rechaza) y se guarda junto con usuario y fecha.
 * @returns {{id: number, codigo: string, tipo: string, sorteoId: number, vendedorId: number,
 *   cliente: string|null, apuestas?: Array, jugadas?: Array, total: number,
 *   estado: 'ANULADO', premio: null, creadoEn: string, anulacion: {usuarioId: number,
 *   motivo: string, fecha: string}}}
 *   El mismo objeto del tiquete (referencia en memoria) mutado a `estado: 'ANULADO'` y
 *   con el bloque `anulacion` de trazabilidad.
 * @throws {AppError} Con status 404 si no existe un tiquete con ese código
 *   (`'Tiquete no encontrado'`, reenviado por `buscar`).
 * @throws {AppError} Con status 403 si el tiquete fue vendido por otro vendedor y el
 *   usuario no es ADMIN.
 * @throws {AppError} Con status 409 si el tiquete no está ACTIVO, si su sorteo ya está
 *   JUGADO, o si el vendedor intenta anular fuera de la ventana de
 *   `MINUTOS_ANULACION` minutos.
 * @throws {AppError} Con status 400 si no se envía `motivo`
 *   (`'Debe indicar el motivo de anulación'`).
 * @example
 * // Anulación desde el controlador:
 * res.json(ticketService.anular(req.params.codigo, req.usuario, req.body.motivo));
 */
function anular(codigo, usuario, motivo) {
  const ticket = buscar(codigo);

  if (usuario.rol !== 'ADMIN' && ticket.vendedorId !== usuario.id) {
    throw new AppError('No puede anular tiquetes de otro vendedor', 403);
  }
  if (ticket.estado !== 'ACTIVO') throw new AppError(`El tiquete está ${ticket.estado}`, 409);
  if (sorteos.obtener(ticket.sorteoId).estado === 'JUGADO') {
    throw new AppError('No se puede anular un tiquete de un sorteo jugado', 409);
  }
  if (usuario.rol !== 'ADMIN' && minutosEntre(ticket.creadoEn) > minutosAnulacion) {
    throw new AppError(`Solo se puede anular dentro de los ${minutosAnulacion} minutos siguientes a la venta`, 409);
  }
  if (!motivo) throw new AppError('Debe indicar el motivo de anulación');

  ticket.estado = 'ANULADO';
  ticket.anulacion = { usuarioId: usuario.id, motivo, fecha: new Date().toISOString() };
  return ticket;
}

/**
 * Paga el premio de un tiquete ganador y registra el movimiento del dinero.
 *
 * Condiciones acumulativas que deben cumplirse todas a la vez:
 * - El sorteo asociado ya se jugó (estado JUGADO); no hay pagos "adelantados" (409).
 * - El tiquete sigue ACTIVO: un tiquete ANULADO no paga aunque el sorteo se haya jugado,
 *   y un PAGADO no se paga dos veces (ambos casos devuelven 409 con mensajes distintos).
 * - El tiquete tiene premio mayor a 0 tras la liquidación (409 si no ganó nada).
 * - El premio no está caducado: si pasaron más de `DIAS_CADUCIDAD_PREMIO` días
 *   (365 por defecto) desde `sorteo.jugadoEn`, se devuelve 410.
 *
 * Efecto secundario importante que conviene conocer: cuando el premio está caducado,
 * esta función **muta el estado del tiquete a CADUCADO antes de lanzar el error**, de
 * modo que el caducamiento queda persistido en la base en memoria aunque el cliente
 * reciba un 410. El pago registrado (`db.pagos`) lleva el id del usuario que paga, no el
 * del vendedor que vendió: cualquier VENDEDOR de la ventanilla puede pagar el premio.
 *
 * @function pagarPremio
 * @param {string} codigo - Código del tiquete impreso en el ticket (p. ej. `"CH-A1B2C3D4"`).
 * @param {{id: number, rol: ('ADMIN'|'VENDEDOR')}} usuario - Usuario autenticado que
 *   efectúa el pago (se pasa `req.usuario` desde el controlador).
 * @returns {{id: number, ticketId: number, codigo: string, usuarioId: number,
 *   valor: number, fecha: string}}
 *   El pago registrado: `valor` igual al premio liquidado del tiquete y `fecha` en
 *   ISO 8601 UTC. El tiquete queda con `estado: 'PAGADO'` en la base en memoria.
 * @throws {AppError} Con status 404 si no existe un tiquete con ese código o si el
 *   sorteo asociado no existe.
 * @throws {AppError} Con status 409 si el sorteo aún no se ha jugado
 *   (`'El sorteo aún no se ha jugado'`), si el premio ya fue pagado
 *   (`'El premio ya fue pagado'`), si el tiquete no está ACTIVO
 *   (`'El tiquete está ANULADO'`, por ejemplo) o si el tiquete no ganó premio
 *   (`'El tiquete no tiene premio'`).
 * @throws {AppError} Con status 410 si el premio caducó por `DIAS_CADUCIDAD_PREMIO`
 *   días; el tiquete queda con `estado: 'CADUCADO'` como efecto secundario.
 * @example
 * // Pago de premio desde el controlador (rol VENDEDOR):
 * res.json(ticketService.pagarPremio(req.params.codigo, req.usuario));
 */
function pagarPremio(codigo, usuario) {
  const ticket = buscar(codigo);
  const sorteo = sorteos.obtener(ticket.sorteoId);

  if (sorteo.estado !== 'JUGADO') throw new AppError('El sorteo aún no se ha jugado', 409);
  if (ticket.estado === 'PAGADO') throw new AppError('El premio ya fue pagado', 409);
  if (ticket.estado !== 'ACTIVO') throw new AppError(`El tiquete está ${ticket.estado}`, 409);
  if (!ticket.premio) throw new AppError('El tiquete no tiene premio', 409);
  if (diasEntre(sorteo.jugadoEn) > diasCaducidadPremio) {
    ticket.estado = 'CADUCADO';
    throw new AppError('El premio está caducado', 410);
  }

  const pago = {
    id: nextId('pagos'),
    ticketId: ticket.id,
    codigo: ticket.codigo,
    usuarioId: usuario.id,
    valor: ticket.premio,
    fecha: new Date().toISOString(),
  };
  getDb().pagos.push(pago);
  ticket.estado = 'PAGADO';
  return pago;
}

module.exports = { venderChance, venderBaloto, consultar, listar, anular, pagarPremio };
