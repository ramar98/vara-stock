const express = require("express");

const router = express.Router();

const reportesController = require(
  "../controllers/reportesController",
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
 * Todo el módulo Reportes
 * es exclusivo del Administrador.
 */

router.use(
  autorizarRoles(
    "Administrador",
  ),
);

/*
 * =====================================
 * REPORTE GENERAL
 * =====================================
 */

router.get(
  "/general",
  reportesController.obtenerReporteGeneral,
);

/*
 * =====================================
 * RESUMEN DE VENTAS
 * =====================================
 */

router.get(
  "/resumen-ventas",
  reportesController.obtenerResumenVentas,
);

/*
 * =====================================
 * VENTAS POR DÍA
 * =====================================
 */

router.get(
  "/ventas-por-dia",
  reportesController.obtenerVentasPorDia,
);

/*
 * =====================================
 * PRODUCTOS MÁS VENDIDOS
 * =====================================
 */

router.get(
  "/productos-mas-vendidos",
  reportesController.obtenerProductosMasVendidos,
);

/*
 * =====================================
 * VENTAS POR MÉTODO DE PAGO
 * =====================================
 */

router.get(
  "/ventas-por-metodo-pago",
  reportesController.obtenerVentasPorMetodoPago,
);

/*
 * =====================================
 * STOCK ACTUAL
 * =====================================
 */

router.get(
  "/stock",
  reportesController.obtenerStockActual,
);

module.exports = router;