const express = require("express");

const router = express.Router();

const ajustesStockController = require(
  "../controllers/ajustesStockController",
);

const {
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * Listar ajustes de stock
 * Solo Administrador
 */
router.get(
  "/",
  autorizarRoles(
    "Administrador",
  ),
  ajustesStockController.obtenerAjustes,
);

/*
 * Ver un ajuste
 * Solo Administrador
 */
router.get(
  "/:id",
  autorizarRoles(
    "Administrador",
  ),
  ajustesStockController.obtenerAjuste,
);

/*
 * Crear un ajuste de stock
 * Solo Administrador
 */
router.post(
  "/",
  autorizarRoles(
    "Administrador",
  ),
  ajustesStockController.crearAjuste,
);

module.exports = router;