const express = require("express");

const router = express.Router();

const reportesController = require(
  "../controllers/reportesController",
);

router.get(
  "/general",
  reportesController.obtenerReporteGeneral,
);

router.get(
  "/resumen-ventas",
  reportesController.obtenerResumenVentas,
);

router.get(
  "/ventas-por-dia",
  reportesController.obtenerVentasPorDia,
);

router.get(
  "/productos-mas-vendidos",
  reportesController.obtenerProductosMasVendidos,
);

router.get(
  "/ventas-por-metodo-pago",
  reportesController.obtenerVentasPorMetodoPago,
);

router.get(
  "/stock",
  reportesController.obtenerStockActual,
);

module.exports = router;