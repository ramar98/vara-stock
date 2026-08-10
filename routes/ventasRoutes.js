const express = require(
  "express",
);

const router =
  express.Router();

const ventasController =
  require(
    "../controllers/ventasController",
  );

const {
  verificarAutenticacion,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * Todas las rutas de ventas
 * requieren usuario autenticado.
 */
router.use(
  verificarAutenticacion,
);

router.get(
  "/",
  ventasController.obtenerVentas,
);

router.get(
  "/:id",
  ventasController.obtenerVenta,
);

router.post(
  "/",
  ventasController.crearVenta,
);

module.exports =
  router;