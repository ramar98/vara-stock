const authService = require(
  "../services/authService",
);

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
    req.headers["x-access-token"];

  if (tokenAlternativo) {
    return String(
      tokenAlternativo,
    ).trim();
  }

  return null;
}

async function verificarAutenticacion(
  req,
  res,
  next,
) {
  const token =
    obtenerToken(req);

  if (!token) {
    return res.status(401).json({
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
     * Dejamos disponible la información
     * del usuario autenticado para los
     * controllers y middlewares siguientes.
     */
    req.usuario = usuario;

    req.usuarioId =
      usuario.id;

    req.rol =
      usuario.rol || null;

    req.rolId =
      usuario.rol_id || null;

    return next();
  } catch (error) {
    const mensajes = {
      TOKEN_INVALIDO:
        "La sesión no es válida o ha vencido.",

      USUARIO_NO_ENCONTRADO:
        "El usuario de la sesión no existe.",

      USUARIO_INACTIVO:
        "El usuario se encuentra inactivo.",
    };

    return res.status(401).json({
      success: false,

      message:
        mensajes[error.code] ||
        "No se pudo validar la sesión.",

      error: {
        code:
          error.code ||
          "ERROR_AUTENTICACION",
      },
    });
  }
}

function autorizarRoles(
  ...rolesPermitidos
) {
  return (
    req,
    res,
    next,
  ) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,

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
          req.usuario.rol ||
          "",
      )
        .trim()
        .toUpperCase();

    if (!rolUsuario) {
      return res.status(403).json({
        success: false,

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
      return res.status(403).json({
        success: false,

        message:
          "No tenés permisos para realizar esta operación.",

        error: {
          code:
            "PERMISO_DENEGADO",

          rol:
            req.usuario.rol,
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