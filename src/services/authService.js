const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../data/store');
const { jwtSecret, jwtExpiresIn } = require('../config');
const AppError = require('../utils/AppError');

/**
 * Autentica a un usuario contra la lista de usuarios en memoria y devuelve un token JWT
 * firmado junto con su perfil público (sin el hash de la contraseña).
 *
 * Flujo de decisiones que el código por sí solo no aclara:
 * 1. La validación temprana (400) ocurre antes de tocar la base de datos para no gastar
 *    una comparación bcrypt en una petición malformada.
 * 2. El caso "usuario no existe" y el caso "contraseña incorrecta" devuelven el mismo
 *    error 401 `Credenciales inválidas` de forma intencional: así la API no revela qué
 *    usuarios están registrados (evita enumeración de usuarios).
 * 3. Un usuario con credenciales correctas pero con `activo: false` se rechaza con 403
 *    (y no con 401) para distinguir "cuenta deshabilitada" de "credenciales malas".
 * 4. El payload del token solo incluye `id` y `rol`; el resto del perfil se resuelve
 *    contra el semillero de datos en cada petición (ver `autenticar`), de modo que
 *    desactivar un usuario invalida de inmediato sus tokens aunque no hayan expirado.
 *
 * @function login
 * @param {string} usuario - Nombre de usuario enviado en el cuerpo del login
 *   (p. ej. `"vendedor1"`).
 * @param {string} password - Contraseña en texto plano; se compara con
 *   `bcrypt.compareSync` contra el hash almacenado. No se guarda ni se registra.
 * @returns {{token: string, usuario: {id: number, usuario: string, nombre: string, rol: string}}}
 *   El token JWT firmado con `jwtSecret` (vence en `jwtExpiresIn`, 8 h por defecto)
 *   y el perfil público del usuario (`perfil`), que omite el campo `password`.
 * @throws {AppError} Con status 400 si `usuario` o `password` son vacíos o no enviados
 *   (`'Usuario y contraseña son obligatorios'`).
 * @throws {AppError} Con status 401 si el usuario no existe o la contraseña no coincide
 *   (`'Credenciales inválidas'`).
 * @throws {AppError} Con status 403 si el usuario existe pero está desactivado
 *   (`'Usuario inactivo'`).
 * @example
 * // Uso desde el controlador; los errores los atrapa manejarErrores:
 * res.json(authService.login(req.body.usuario, req.body.password));
 */
function login(usuario, password) {
  if (!usuario || !password) throw new AppError('Usuario y contraseña son obligatorios');

  const encontrado = getDb().usuarios.find((u) => u.usuario === usuario);
  if (!encontrado || !bcrypt.compareSync(password, encontrado.password)) {
    throw new AppError('Credenciales inválidas', 401);
  }
  if (!encontrado.activo) throw new AppError('Usuario inactivo', 403);

  const token = jwt.sign({ id: encontrado.id, rol: encontrado.rol }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, usuario: perfil(encontrado) };
}

function perfil(u) {
  return { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol };
}

function buscarPorId(id) {
  return getDb().usuarios.find((u) => u.id === id);
}

module.exports = { login, perfil, buscarPorId };
