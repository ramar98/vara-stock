const express = require("express");

const router = express.Router();

const configuracionController =
  require(
    "../controllers/configuracionController",
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
 * OBTENER CONFIGURACIÓN
 * =====================================
 *
 * Administrador y Vendedor pueden
 * consultar los datos del negocio.
 */

router.get(
  "/",
  autorizarRoles(
    "Administrador",
    "Vendedor",
  ),
  configuracionController.obtenerConfiguracion,
);

/*
 * =====================================
 * ACTUALIZAR CONFIGURACIÓN
 * =====================================
 *
 * Sólo Administrador.
 */

router.put(
  "/",
  autorizarRoles(
    "Administrador",
  ),
  configuracionController.actualizarConfiguracion,
);

module.exports = router;