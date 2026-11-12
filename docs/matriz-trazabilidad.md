# Matriz de trazabilidad de requisitos — Puesto de Chance API

Taller de Documentación Técnica y Trazabilidad de Requisitos (ADSO, SENA — clase 9).
Repositorio: `https://github.com/crgonzalez3212/documentacionApi` (rama `main`).

> **Nota previa sobre el origen de los requisitos.** El repositorio **no contiene historias
> de usuario formales ni criterios de aceptación** (no hay carpetas `docs/`, archivos
> `.md` de producto, ni issues catalogados; el único commit es `Add files via upload`).
> Los requisitos de esta matriz se **inferieron del comportamiento observable del código**
> (`src/routes/`, `src/services/` y `tests/`). Por ello, **todos los identificadores de la
> columna "ID HU" son provisionales** y deben renombrarse si el equipo formaliza
> historias de usuario. La descripción redactada reproduce la regla de negocio tal como
> está implementada y probada.

| ID HU | Descripción del requisito | Módulo o controlador | Caso de prueba | Estado QA |
|---|---|---|---|---|
| HU-01 (provisional) | Como usuario del puesto, autentico con usuario y contraseña y recibo un token JWT con mi perfil (sin hash de contraseña). | [`login`](../src/services/authService.js) vía [`authController.login`](../src/controllers/authController.js) — ruta `POST /api/v1/auth/login` | [`test_login_exitoso`](../tests/auth.test.js) | **Aprobado** |
| HU-02 (provisional) | Como sistema, rechazo credenciales inválidas con 401 sin revelar si el usuario existe. | [`login`](../src/services/authService.js) | [`test_login_credenciales_invalidas`](../tests/auth.test.js) | **Aprobado** |
| HU-03 (provisional) | Como sistema, exijo token Bearer JWT válido y usuario activo en todas las rutas protegidas. | [`autenticar`](../src/middlewares/auth.js) | [`test_ruta_protegida_sin_token`](../tests/auth.test.js) | **Aprobado** |
| HU-04 (provisional) | Como vendedor, el tiquete de chance de 4 cifras en DIRECTO paga 4500 veces el valor apostado cuando acierta el número ganador completo. | [`calcularPremio`](../src/services/chanceService.js) | [`test_premio_directo_4_cifras`](../tests/chance.test.js) | **Aprobado** |
| HU-05 (provisional) | Como vendedor, una apuesta DIRECTO de 3 o 2 cifras gana comparando contra las últimas cifras del número ganador (factor 400 y 50). | [`calcularPremio`](../src/services/chanceService.js) | [`test_premio_directo_ultimas_cifras`](../tests/chance.test.js) | **Aprobado** |
| HU-06 (provisional) | Como vendedor, una apuesta COMBINADO de 3 cifras paga el premio dividido entre las permutaciones del número. | [`calcularPremio`](../src/services/chanceService.js) / [`permutaciones`](../src/services/chanceService.js) | [`test_premio_combinado_divide_por_permutaciones`](../tests/chance.test.js) | **Aprobado** |
| HU-07 (provisional) | Como sistema, rechazo apuestas con números no numéricos, valores fuera del rango 500-50 000, no múltiplos de 100 o COMBINADO con menos de 3 cifras. | [`validarApuesta`](../src/services/chanceService.js) | [`test_validacion_apuesta_invalida`](../tests/chance.test.js) | **Aprobado** |
| HU-08 (provisional) | Como cliente, puedo pedir una jugada de Baloto aleatoria: 5 números distintos (1-43) y superbalota (1-16). | [`validarJugada`](../src/services/balotoService.js) / [`generarAleatoria`](../src/services/balotoService.js) | [`test_jugada_aleatoria_valida`](../tests/baloto.test.js) | **Aprobado** |
| HU-09 (provisional) | Como sistema, rechazo jugadas de Baloto con números repetidos o fuera del rango 1-43. | [`validarJugada`](../src/services/balotoService.js) | [`test_jugada_numeros_repetidos`](../tests/baloto.test.js) | **Aprobado** |
| HU-10 (provisional) | Como cliente, mi jugada de Baloto gana según la tabla de premios por aciertos (5+1 → acumulado; 4+1 → 2 000 000; sin aciertos → 0). | [`calcularPremio`](../src/services/balotoService.js) | [`test_premio_por_aciertos`](../tests/baloto.test.js) | **Aprobado** |
| HU-11 (provisional) | Como vendedor, vendo un tiquete de chance con 1 a 5 apuestas sobre un sorteo CHANCE y recibo código `CH-…` con el total a cobrar. | [`venderChance`](../src/services/ticketService.js) vía [`ticketController.venderChance`](../src/controllers/ticketController.js) — ruta `POST /api/v1/tickets/chance` | [`test_venta_chance`](../tests/tickets.test.js) | **Aprobado** |
| HU-12 (provisional) | Como vendedor, vendo un tiquete de Baloto con 1 a 10 jugadas (manuales o aleatorias) y el total es `jugadas × 5700`. | [`venderBaloto`](../src/services/ticketService.js) vía [`ticketController.venderBaloto`](../src/controllers/ticketController.js) — ruta `POST /api/v1/tickets/baloto` | [`test_venta_baloto`](../tests/tickets.test.js) | **Aprobado** |
| HU-13 (provisional) | Como sistema, cierro las ventas de un sorteo 15 minutos antes de su fecha (409). | [`verificarVentaPermitida`](../src/services/sorteoService.js) | [`test_venta_sorteo_cerrado`](../tests/tickets.test.js) | **Aprobado** |
| HU-14 (provisional) | Como sistema, solo el rol VENDEDOR puede vender tiquetes; un ADMIN recibe 403. | [`permitir('VENDEDOR')`](../src/middlewares/auth.js) | [`test_admin_no_vende`](../tests/tickets.test.js) | **Aprobado** |
| HU-15 (provisional) | Como vendedor, anulo mi propio tiquete ACTIVO indicando el motivo; otro vendedor recibe 403. | [`anular`](../src/services/ticketService.js) vía [`ticketController.anular`](../src/controllers/ticketController.js) — ruta `POST /api/v1/tickets/:codigo/anular` | [`test_anulacion_ticket`](../tests/tickets.test.js) | **Aprobado** |
| HU-16 (provisional) | Como sistema, la anulación solo es válida dentro de los 10 minutos siguientes a la venta (409 después). | [`anular`](../src/services/ticketService.js) | [`test_anulacion_fuera_de_tiempo`](../tests/tickets.test.js) | **Aprobado** |
| HU-17 (provisional) | Como ADMIN, registro el resultado de un sorteo; los tiquetes ACTIVOS se liquidan, la consulta del tiquete marca `ganador` y el premio se paga una sola vez (segundo pago → 409). | [`registrarResultado`](../src/services/sorteoService.js) / [`pagarPremio`](../src/services/ticketService.js) — rutas `POST /api/v1/sorteos/:id/resultado` y `POST /api/v1/tickets/:codigo/pagar` | [`test_resultado_y_pago_premio`](../tests/tickets.test.js) | **Aprobado** |
| HU-18 (provisional) | Como vendedor, consulto el resumen de mi caja del día con ventas por tipo, premios pagados y saldo esperado. | [`resumen`](../src/services/cajaService.js) vía [`cajaController.resumen`](../src/controllers/cajaController.js) — ruta `GET /api/v1/caja/resumen` | [`test_resumen_caja_diario`](../tests/caja.test.js) | **Aprobado** |
| HU-19 (provisional) | Como vendedor, cierro la caja reportando el efectivo; el sistema calcula la diferencia, marca FALTANTE/SOBRANTE/CUADRADA y no permite un segundo cierre (409). | [`cerrar`](../src/services/cajaService.js) vía [`cajaController.cerrar`](../src/controllers/cajaController.js) — ruta `POST /api/v1/caja/cierre` | [`test_cierre_caja_con_faltante`](../tests/caja.test.js) | **Aprobado** |
| HU-20 (provisional) | Como ADMIN, creo sorteos futuros de tipo CHANCE o BALOTO que quedan en estado ABIERTO. | [`crear`](../src/services/sorteoService.js) vía [`sorteoController.crear`](../src/controllers/sorteoController.js) — ruta `POST /api/v1/sorteos` | [`test_admin_crea_sorteo`](../tests/caja.test.js) | **Aprobado** |

## Evidencia de ejecución

- Comando: `npm test` (`jest --runInBand`).
- Ejecución previa a los cambios del taller (línea base en esta clonación): **20 pruebas
  pasadas, 0 fallidas** (5 suites).
- Ejecución posterior a los cambios del taller: **20 pruebas pasadas, 0 fallidas** (5 suites).
- Fecha de la última ejecución registrada: 2026-11-12.

## Criterios de calificación aplicados

- **Aprobado**: la prueba correspondiente se ejecutó con éxito y cubre el criterio
  documentado en la descripción del requisito.
- **Fallido**: la prueba se ejecutó y no pasó (no aplica en esta matriz en la fecha
  registrada).
- **Pendiente**: falta evidencia de ejecución suficiente o la prueba no existe.

## Pendientes explícitos

1. **Historias de usuario formales**: no existen en el repositorio. Los ID `HU-xx` son
   provisionales y se marcan como tales en cada fila; el equipo debe validarlos con el
   instructor antes de tratarlos como identificadores definitivos.
2. **Requisito de documentación interactiva (Swagger UI en `/api-docs`)**: cubierto por
   verificación **manual** (carga de la especificación y contraste con las rutas de
   `src/routes/index.js`), no existe prueba automatizada para la propia documentación.
   Evidencia registrada en el resumen de entrega del taller.
3. **Requisito de `/health` y `GET /api-docs.json`**: no tienen pruebas automatizadas
   dedicadas; `/health` se verifica manualmente al arrancar el servidor. Queda como
   pendiente **Pendiente** si el equipo decide exigir pruebas para esos endpoints.
4. **Requisitos sin prueba directa** (cubiertos por combinación de pruebas o revisión de
   código): rechazo de usuarios inactivos en login (403), listado filtrado de tiquetes
   (`GET /api/v1/tickets`) y resumen de caja del ADMIN con `vendedorId`. La
   implementación existe en [`authService`](../src/services/authService.js),
   [`listar`](../src/services/ticketService.js) y [`resumen`](../src/services/cajaService.js),
   pero no hay caso de prueba dedicado; se sugieren como mejoras futuras.
