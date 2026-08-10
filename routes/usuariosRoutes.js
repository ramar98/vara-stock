const express = require("express");

const router = express.Router();

const usuariosController = require(
  "../controllers/usuariosController",
);

const {
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

/*
 * Todo el módulo Usuarios
 * es exclusivo del Administrador.
 */

router.use(
  autorizarRoles(
    "Administrador",
  ),
);

router.get(
  "/roles",
  usuariosController.obtenerRoles,
);

router.get(
  "/",
  usuariosController.obtenerUsuarios,
);

router.get(
  "/:id",
  usuariosController.obtenerUsuario,
);

router.post(
  "/",
  usuariosController.crearUsuario,
);

router.put(
  "/:id",
  usuariosController.actualizarUsuario,
);

router.patch(
  "/:id/estado",
  usuariosController.cambiarEstado,
);

router.patch(
  "/:id/password",
  usuariosController.cambiarPassword,
);

module.exports = router;