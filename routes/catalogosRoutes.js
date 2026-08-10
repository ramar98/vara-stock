const express = require("express");

const router = express.Router();

const catalogosController = require(
  "../controllers/catalogosController",
);

router.get(
  "/categorias",
  catalogosController.obtenerCategorias,
);

router.get(
  "/marcas",
  catalogosController.obtenerMarcas,
);

router.get(
  "/proveedores",
  catalogosController.obtenerProveedores,
);

router.get(
  "/colores",
  catalogosController.obtenerColores,
);

router.get(
  "/talles",
  catalogosController.obtenerTalles,
);

module.exports = router;