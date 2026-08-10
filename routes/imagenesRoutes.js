const express = require("express");

const router = express.Router();

const upload = require(
  "../middlewares/upload",
);

const controller = require(
  "../controllers/imagenesController",
);

router.get(
  "/producto/:producto_id",
  controller.obtenerImagenes,
);

router.post(
  "/",
  upload.single("imagen"),
  controller.subirImagen,
);

router.put(
  "/:id/principal",
  controller.marcarComoPrincipal,
);

router.delete(
  "/:id",
  controller.eliminarImagen,
);

module.exports = router;