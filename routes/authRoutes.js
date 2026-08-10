const express = require("express");

const authController = require(
  "../controllers/authController",
);

const {
  verificarAutenticacion,
  autorizarRoles,
} = require(
  "../middlewares/authMiddleware",
);

const router = express.Router();

router.post(
  "/login",
  authController.iniciarSesion,
);

router.get(
  "/me",
  verificarAutenticacion,
  authController.obtenerSesionActual,
);

/*
 * Lo mantenemos temporalmente por compatibilidad.
 * La creación normal de usuarios se hará
 * mediante /api/usuarios.
 */
router.post(
  "/register",
  verificarAutenticacion,
  autorizarRoles(
    "Administrador",
  ),
  authController.registrarUsuario,
);

module.exports = router;