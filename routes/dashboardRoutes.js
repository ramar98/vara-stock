const express = require(
  "express",
);

const dashboardController =
  require(
    "../controllers/dashboardController",
  );

const {
  verificarAutenticacion,
} = require(
  "../middlewares/authMiddleware",
);

const router =
  express.Router();

/*
 * =====================================
 * TODAS LAS RUTAS DEL DASHBOARD
 * REQUIEREN LOGIN
 * =====================================
 */

router.use(
  verificarAutenticacion,
);

/*
 * =====================================
 * RESUMEN
 * =====================================
 */

router.get(
  "/resumen",
  dashboardController.obtenerResumen,
);

/*
 * =====================================
 * VENTAS POR DÍA
 * =====================================
 */

router.get(
  "/ventas-por-dia",
  dashboardController.obtenerVentasPorDia,
);

/*
 * =====================================
 * STOCK BAJO
 * =====================================
 */

router.get(
  "/stock-bajo",
  dashboardController.obtenerStockBajo,
);

module.exports =
  router;