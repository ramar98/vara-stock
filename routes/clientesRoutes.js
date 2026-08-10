const express = require("express");

const router = express.Router();

const clientesController = require(
  "../controllers/clientesController",
);

const {
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * Listar clientes
 * Administrador y Vendedor
 */
router.get(
  "/",
  autorizarRoles(
    "Administrador",
    "Vendedor",
  ),
  clientesController.obtenerClientes,
);

/*
 * Ver detalle de cliente
 * Administrador y Vendedor
 */
router.get(
  "/:id",
  autorizarRoles(
    "Administrador",
    "Vendedor",
  ),
  clientesController.obtenerCliente,
);

/*
 * Crear cliente
 * Administrador y Vendedor
 */
router.post(
  "/",
  autorizarRoles(
    "Administrador",
    "Vendedor",
  ),
  clientesController.crearCliente,
);

/*
 * Editar cliente
 * Administrador y Vendedor
 */
router.put(
  "/:id",
  autorizarRoles(
    "Administrador",
    "Vendedor",
  ),
  clientesController.actualizarCliente,
);

/*
 * Eliminar cliente
 * Solo Administrador
 */
router.delete(
  "/:id",
  autorizarRoles(
    "Administrador",
  ),
  clientesController.eliminarCliente,
);

module.exports = router;