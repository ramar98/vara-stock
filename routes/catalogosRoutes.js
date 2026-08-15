const express = require("express");

const router = express.Router();

const catalogosController = require(
  "../controllers/catalogosController",
);

const proveedoresController = require(
  "../controllers/proveedoresController",
);

const {
  verificarAutenticacion,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * =====================================
 * AUTENTICACIÓN
 * =====================================
 *
 * Aunque server.js ya protege /api,
 * mantenemos esta protección también
 * a nivel del router.
 */

router.use(
  verificarAutenticacion,
);

/*
 * =====================================
 * HELPER CATÁLOGOS
 * =====================================
 *
 * El controller actual trabaja con:
 *
 * req.params.tipo
 *
 * Como eliminamos la ruta dinámica
 * /:tipo, asignamos el tipo nosotros
 * de forma explícita.
 */

function obtenerCatalogo(tipo) {
  return (
    req,
    res,
  ) => {
    req.params.tipo =
      tipo;

    return catalogosController.obtenerElementos(
      req,
      res,
    );
  };
}

/*
 * =====================================
 * CATEGORÍAS
 * =====================================
 */

router.get(
  "/categorias",
  obtenerCatalogo(
    "categorias",
  ),
);

/*
 * =====================================
 * MARCAS
 * =====================================
 */

router.get(
  "/marcas",
  obtenerCatalogo(
    "marcas",
  ),
);

/*
 * =====================================
 * COLORES
 * =====================================
 */

router.get(
  "/colores",
  obtenerCatalogo(
    "colores",
  ),
);

/*
 * =====================================
 * TALLES
 * =====================================
 */

router.get(
  "/talles",
  obtenerCatalogo(
    "talles",
  ),
);

/*
 * =====================================
 * PROVEEDORES
 * =====================================
 *
 * Proveedores tiene su propio
 * controller/service.
 */

router.get(
  "/proveedores",
  proveedoresController.obtenerProveedores,
);

module.exports = router;