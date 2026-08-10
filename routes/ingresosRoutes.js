const express = require("express");

const router = express.Router();

const ingresosController = require(
  "../controllers/ingresosController",
);

const {
  verificarAutenticacion,
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * Ver listado de ingresos
 * Solo Administrador
 */
router.get(
  "/",
  verificarAutenticacion,
  autorizarRoles(
    "Administrador",
  ),
  ingresosController.obtenerIngresos,
);

/*
 * Ver detalle de un ingreso
 * Solo Administrador
 */
router.get(
  "/:id",
  verificarAutenticacion,
  autorizarRoles(
    "Administrador",
  ),
  ingresosController.obtenerIngreso,
);

/*
 * Registrar un nuevo ingreso
 * Solo Administrador
 */
router.post(
  "/",
  verificarAutenticacion,
  autorizarRoles(
    "Administrador",
  ),
  ingresosController.crearIngreso,
);

module.exports = router;