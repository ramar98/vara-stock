const express = require("express");

const router = express.Router();

const usuariosController = require(
  "../controllers/usuariosController",
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
 *
 * Primero verificamos el JWT.
 *
 * Esto genera:
 *
 * req.usuario
 * req.usuarioId
 * req.empresaId
 * req.rol
 * req.rolId
 */

router.use(
  verificarAutenticacion,
);

/*
 * =====================================
 * AUTORIZACIÓN
 * =====================================
 *
 * Todo el módulo Usuarios
 * es exclusivo del Administrador.
 */

router.use(
  autorizarRoles(
    "Administrador",
  ),
);

/*
 * =====================================
 * ROLES
 * =====================================
 *
 * IMPORTANTE:
 * Las rutas fijas deben estar antes
 * de /:id
 */

router.get(
  "/roles",
  usuariosController.obtenerRoles,
);

/*
 * =====================================
 * LISTAR USUARIOS
 * =====================================
 */

router.get(
  "/",
  usuariosController.obtenerUsuarios,
);

/*
 * =====================================
 * OBTENER USUARIO
 * =====================================
 */

router.get(
  "/:id",
  usuariosController.obtenerUsuario,
);

/*
 * =====================================
 * CREAR USUARIO
 * =====================================
 */

router.post(
  "/",
  usuariosController.crearUsuario,
);

/*
 * =====================================
 * ACTUALIZAR USUARIO
 * =====================================
 */

router.put(
  "/:id",
  usuariosController.actualizarUsuario,
);

/*
 * =====================================
 * CAMBIAR ESTADO
 * =====================================
 */

router.patch(
  "/:id/estado",
  usuariosController.cambiarEstado,
);

/*
 * =====================================
 * CAMBIAR PASSWORD
 * =====================================
 */

router.patch(
  "/:id/password",
  usuariosController.cambiarPassword,
);

module.exports = router;