const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Carga la especificación OpenAPI 3.0.3 de la API desde `openapi.yaml`.
 *
 * Se lee con `js-yaml` en el arranque de la aplicación y el objeto resultante se pasa
 * a `swagger-ui-express` para renderizar Swagger UI en `/api-docs`. Se carga como YAML
 * (formato recomendado por la especificación, que acepta JSON o YAML) para que la
 * documentación sea legible directamente en el repositorio.
 *
 * @function cargarEspecificacion
 * @returns {object} Objeto con el documento OpenAPI completo (paths, componentes y
 *   esquemas) listo para consumirse con Swagger UI o para servirse como JSON crudo.
 * @throws {Error} Si el archivo `openapi.yaml` no existe o contiene YAML mal formado;
 *   el fallo ocurre al iniciar el servidor, lo que impide arrancar con documentación
 *   rota en lugar de servir una página en blanco.
 * @example
 * // En src/app.js:
 * const especificacion = require('./docs');
 * app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacion));
 */
function cargarEspecificacion() {
  const ruta = path.join(__dirname, 'openapi.yaml');
  return yaml.load(fs.readFileSync(ruta, 'utf8'));
}

module.exports = cargarEspecificacion();
