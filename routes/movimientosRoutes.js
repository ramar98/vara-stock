const express = require("express");

const router = express.Router();

const movimientosController = require(
  "../controllers/movimientosController",
);

router.get(
  "/producto/:producto_id",
  movimientosController.obtenerMovimientosPorProducto,
);

router.get(
  "/variante/:variante_id",
  movimientosController.obtenerMovimientosPorVariante,
);

router.get(
  "/:id",
  movimientosController.obtenerMovimiento,
);

module.exports = router;