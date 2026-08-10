const express = require("express");

const router = express.Router();

const controller = require(
  "../controllers/catalogosAdminController",
);

router.get(
  "/:tipo",
  controller.obtenerElementos,
);

router.get(
  "/:tipo/:id",
  controller.obtenerElemento,
);

router.post(
  "/:tipo",
  controller.crearElemento,
);

router.put(
  "/:tipo/:id",
  controller.actualizarElemento,
);

router.delete(
  "/:tipo/:id",
  controller.eliminarElemento,
);

module.exports = router;