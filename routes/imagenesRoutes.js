const express = require("express");

const router = express.Router();

const upload = require(
  "../middlewares/upload",
);

const controller = require(
  "../controllers/imagenesController",
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
 * LISTAR IMÁGENES
 * =====================================
 *
 * Administrador y Vendedor necesitan
 * ver las imágenes de los productos.
 */

router.get(
  "/producto/:producto_id",
  autorizarRoles(
    "Administrador",
    "Vendedor",
  ),
  controller.obtenerImagenes,
);

/*
 * =====================================
 * SUBIR IMAGEN
 * =====================================
 *
 * Sólo Administrador.
 */

router.post(
  "/",
  autorizarRoles(
    "Administrador",
  ),
  upload.single(
    "imagen",
  ),
  controller.subirImagen,
);

/*
 * =====================================
 * MARCAR COMO PRINCIPAL
 * =====================================
 *
 * Sólo Administrador.
 */

router.put(
  "/:id/principal",
  autorizarRoles(
    "Administrador",
  ),
  controller.marcarComoPrincipal,
);

/*
 * =====================================
 * ELIMINAR IMAGEN
 * =====================================
 *
 * Sólo Administrador.
 */

router.delete(
  "/:id",
  autorizarRoles(
    "Administrador",
  ),
  controller.eliminarImagen,
);

module.exports = router;