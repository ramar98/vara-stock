const authService = require(
  "../services/authService",
);

/*
 * =====================================
 * OBTENER TOKEN
 * =====================================
 */

function obtenerToken(req) {
  const authorization =
    req.headers.authorization;

  if (
    authorization &&
    authorization.startsWith(
      "Bearer ",
    )
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  const tokenAlternativo =
    req.headers[
      "x-access-token"
    ];

  if (
    tokenAlternativo
  ) {
    return String(
      tokenAlternativo,
    ).trim();
  }

  return null;
}

/*
 * =====================================
 * VERIFICAR AUTENTICACIÓN
 * =====================================
 */

async function verificarAutenticacion(
  req,
  res,
  next,
) {
  const token =
    obtenerToken(req);

  if (!token) {
    return res
      .status(401)
      .json({
        success: false,

        message:
          "Debés iniciar sesión para acceder a este recurso.",

        error: {
          code:
            "TOKEN_NO_ENVIADO",
        },
      });
  }

  try {
    const usuario =
      await authService.verificarToken(
        token,
      );

    /*
     * =================================
     * USUARIO AUTENTICADO
     * =================================
     */

    req.usuario =
      usuario;

    /*
     * Compatibilidad con código
     * que ya tenemos.
     */

    req.usuarioId =
      usuario.id;

    req.rol =
      usuario.rol ||
      null;

    req.rolId =
      usuario.rol_id ||
      null;

    /*
     * =================================
     * MULTIEMPRESA
     * =================================
     *
     * Este será el valor que usarán
     * todos los controllers/services.
     */

    req.empresaId =
      usuario.empresa_id;

    return next();
  } catch (error) {
    const mensajes = {
      TOKEN_INVALIDO:
        "La sesión no es válida o ha vencido.",

      USUARIO_NO_ENCONTRADO:
        "El usuario de la sesión no existe.",

      USUARIO_INACTIVO:
        "El usuario se encuentra inactivo.",

      EMPRESA_INACTIVA:
        "La empresa se encuentra inactiva.",

      EMPRESA_NO_ASIGNADA:
        "El usuario no tiene una empresa asignada.",
    };

    /*
     * Empresa inactiva es una
     * sesión válida pero sin acceso.
     */

    const status =
      error.code ===
        "EMPRESA_INACTIVA"
        ? 403
        : 401;

    return res
      .status(status)
      .json({
        success: false,

        message:
          mensajes[
            error.code
          ] ||
          "No se pudo validar la sesión.",

        error: {
          code:
            error.code ||
            "ERROR_AUTENTICACION",
        },
      });
  }
}

/*
 * =====================================
 * AUTORIZACIÓN POR ROL
 * =====================================
 */

function autorizarRoles(
  ...rolesPermitidos
) {
  return (
    req,
    res,
    next,
  ) => {
    if (!req.usuario) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            "Debés iniciar sesión.",

          error: {
            code:
              "USUARIO_NO_AUTENTICADO",
          },
        });
    }

    const rolesNormalizados =
      rolesPermitidos.map(
        (rol) =>
          String(rol)
            .trim()
            .toUpperCase(),
      );

    const rolUsuario =
      String(
        req.rol ||
          req.usuario
            .rol ||
          "",
      )
        .trim()
        .toUpperCase();

    if (!rolUsuario) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            "El usuario no tiene un rol asignado.",

          error: {
            code:
              "ROL_NO_ASIGNADO",
          },
        });
    }

    if (
      !rolesNormalizados.includes(
        rolUsuario,
      )
    ) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            "No tenés permisos para realizar esta operación.",

          error: {
            code:
              "PERMISO_DENEGADO",

            rol:
              req.usuario
                .rol,
          },
        });
    }

    return next();
  };
}

module.exports = {
  verificarAutenticacion,
  autorizarRoles,
};