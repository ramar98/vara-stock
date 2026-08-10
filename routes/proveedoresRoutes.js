const express = require("express");

const router = express.Router();

const proveedoresController = require(
  "../controllers/proveedoresController",
);

const {
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * Listar proveedores
 * Solo Administrador
 */
router.get(
  "/",
  autorizarRoles(
    "Administrador",
  ),
  proveedoresController.obtenerProveedores,
);

/*
 * Ver detalle de proveedor
 * Solo Administrador
 */
router.get(
  "/:id",
  autorizarRoles(
    "Administrador",
  ),
  proveedoresController.obtenerProveedor,
);

/*
 * Crear proveedor
 * Solo Administrador
 */
router.post(
  "/",
  autorizarRoles(
    "Administrador",
  ),
  proveedoresController.crearProveedor,
);

/*
 * Editar proveedor
 * Solo Administrador
 */
router.put(
  "/:id",
  autorizarRoles(
    "Administrador",
  ),
  proveedoresController.actualizarProveedor,
);

/*
 * Eliminar proveedor
 * Solo Administrador
 */
router.delete(
  "/:id",
  autorizarRoles(
    "Administrador",
  ),
  proveedoresController.eliminarProveedor,
);

module.exports = router;