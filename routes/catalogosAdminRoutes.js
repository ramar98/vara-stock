const express = require("express");

const router = express.Router();

const controller = require(
  "../controllers/catalogosAdminController",
);

const {
  verificarAutenticacion,
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * =====================================
 * AUTENTICACIÓN
 * =====================================
 */

router.use(
  verificarAutenticacion,
);

/*
 * =====================================
 * AUTORIZACIÓN
 * =====================================
 *
 * El mantenimiento de catálogos
 * es exclusivo del Administrador.
 */

router.use(
  autorizarRoles(
    "Administrador",
  ),
);

/*
 * =====================================
 * LISTAR ELEMENTOS
 * =====================================
 */

router.get(
  "/:tipo",
  controller.obtenerElementos,
);

/*
 * =====================================
 * OBTENER ELEMENTO
 * =====================================
 */

router.get(
  "/:tipo/:id",
  controller.obtenerElemento,
);

/*
 * =====================================
 * CREAR ELEMENTO
 * =====================================
 */

router.post(
  "/:tipo",
  controller.crearElemento,
);

/*
 * =====================================
 * ACTUALIZAR ELEMENTO
 * =====================================
 */

router.put(
  "/:tipo/:id",
  controller.actualizarElemento,
);

/*
 * =====================================
 * ELIMINAR ELEMENTO
 * =====================================
 */

router.delete(
  "/:tipo/:id",
  controller.eliminarElemento,
);

module.exports = router;