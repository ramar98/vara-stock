const usuariosService = require(
  "../services/usuariosService",
);

function convertirId(valor) {
  const id = Number(valor);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function normalizarTexto(valor) {
  if (
    typeof valor !==
    "string"
  ) {
    return "";
  }

  return valor.trim();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function validarUsuario(
  body = {},
  {
    passwordObligatoria =
      false,
  } = {},
) {
  const errores = [];

  const nombre =
    normalizarTexto(
      body.nombre,
    );

  const apellido =
    normalizarTexto(
      body.apellido,
    );

  const usuario =
    normalizarTexto(
      body.usuario,
    );

  const email =
    normalizarTexto(
      body.email,
    ).toLowerCase();

  const rolId =
    convertirId(
      body.rol_id,
    );

  const password =
    typeof body.password ===
    "string"
      ? body.password
      : "";

  const activo =
    body.activo ===
    undefined
      ? true
      : Boolean(
          body.activo,
        );

  if (!nombre) {
    errores.push(
      "El nombre es obligatorio.",
    );
  } else if (
    nombre.length > 100
  ) {
    errores.push(
      "El nombre no puede superar los 100 caracteres.",
    );
  }

  if (!apellido) {
    errores.push(
      "El apellido es obligatorio.",
    );
  } else if (
    apellido.length > 100
  ) {
    errores.push(
      "El apellido no puede superar los 100 caracteres.",
    );
  }

  if (!usuario) {
    errores.push(
      "El nombre de usuario es obligatorio.",
    );
  } else if (
    usuario.length > 50
  ) {
    errores.push(
      "El nombre de usuario no puede superar los 50 caracteres.",
    );
  }

  if (!email) {
    errores.push(
      "El correo electrónico es obligatorio.",
    );
  } else if (
    !validarEmail(email)
  ) {
    errores.push(
      "El correo electrónico no es válido.",
    );
  } else if (
    email.length > 150
  ) {
    errores.push(
      "El correo electrónico no puede superar los 150 caracteres.",
    );
  }

  if (!rolId) {
    errores.push(
      "El rol seleccionado no es válido.",
    );
  }

  if (
    passwordObligatoria &&
    !password
  ) {
    errores.push(
      "La contraseña es obligatoria.",
    );
  }

  if (
    password &&
    password.length < 8
  ) {
    errores.push(
      "La contraseña debe tener al menos 8 caracteres.",
    );
  }

  if (
    password &&
    password.length > 72
  ) {
    errores.push(
      "La contraseña no puede superar los 72 caracteres.",
    );
  }

  return {
    valido:
      errores.length === 0,

    errores,

    datos: {
      nombre,
      apellido,
      usuario,
      email,
      rol_id:
        rolId,
      password,
      activo,
    },
  };
}

function responderError(
  res,
  error,
) {
  const errores = {
    USUARIO_DUPLICADO: {
      status: 409,
      message:
        error.message,
    },

    ROL_NO_ENCONTRADO: {
      status: 400,
      message:
        "El rol seleccionado no existe.",
    },

    ER_DUP_ENTRY: {
      status: 409,
      message:
        "Ya existe un usuario con esos datos.",
    },
  };

  const controlado =
    errores[
      error.code
    ];

  if (controlado) {
    return res
      .status(
        controlado.status,
      )
      .json({
        success: false,

        message:
          controlado.message,

        error: {
          code:
            error.code,
        },
      });
  }

  console.error(
    "Error procesando usuario:",
    error,
  );

  return res.status(500).json({
    success: false,

    message:
      "Ocurrió un error interno procesando el usuario.",

    error:
      process.env.NODE_ENV ===
      "development"
        ? {
            code:
              error.code,

            detail:
              error.message,
          }
        : undefined,
  });
}

exports.obtenerUsuarios =
  async (
    req,
    res,
  ) => {
    try {
      const usuarios =
        await usuariosService.obtenerUsuarios(
          {
            busqueda:
              req.query.busqueda ||
              "",
          },
        );

      return res.status(200).json({
        success: true,
        data: usuarios,
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

exports.obtenerUsuario =
  async (
    req,
    res,
  ) => {
    const id =
      convertirId(
        req.params.id,
      );

    if (!id) {
      return res.status(400).json({
        success: false,

        message:
          "El ID del usuario no es válido.",
      });
    }

    try {
      const usuario =
        await usuariosService.obtenerUsuarioPorId(
          id,
        );

      if (!usuario) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Usuario no encontrado.",
          });
      }

      return res.status(200).json({
        success: true,
        data: usuario,
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

exports.obtenerRoles =
  async (
    req,
    res,
  ) => {
    try {
      const roles =
        await usuariosService.obtenerRoles();

      return res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

exports.crearUsuario =
  async (
    req,
    res,
  ) => {
    const validacion =
      validarUsuario(
        req.body,
        {
          passwordObligatoria:
            true,
        },
      );

    if (!validacion.valido) {
      return res.status(400).json({
        success: false,

        message:
          "Los datos del usuario no son válidos.",

        errors:
          validacion.errores,
      });
    }

    try {
      const usuario =
        await usuariosService.crearUsuario(
          validacion.datos,
        );

      return res.status(201).json({
        success: true,

        message:
          "Usuario creado correctamente.",

        data: usuario,
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

exports.actualizarUsuario =
  async (
    req,
    res,
  ) => {
    const id =
      convertirId(
        req.params.id,
      );

    if (!id) {
      return res.status(400).json({
        success: false,

        message:
          "El ID del usuario no es válido.",
      });
    }

    const validacion =
      validarUsuario(
        req.body,
      );

    if (!validacion.valido) {
      return res.status(400).json({
        success: false,

        message:
          "Los datos del usuario no son válidos.",

        errors:
          validacion.errores,
      });
    }

    try {
      const usuario =
        await usuariosService.actualizarUsuario(
          id,
          validacion.datos,
        );

      if (!usuario) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Usuario no encontrado.",
          });
      }

      return res.status(200).json({
        success: true,

        message:
          "Usuario actualizado correctamente.",

        data: usuario,
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

exports.cambiarEstado =
  async (
    req,
    res,
  ) => {
    const id =
      convertirId(
        req.params.id,
      );

    if (!id) {
      return res.status(400).json({
        success: false,

        message:
          "El ID del usuario no es válido.",
      });
    }

    if (
      typeof req.body.activo !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "El estado del usuario no es válido.",
      });
    }

    /*
     * Evitamos que el administrador
     * desactive su propia cuenta.
     */
    if (
      id ===
        Number(
          req.usuarioId,
        ) &&
      req.body.activo ===
        false
    ) {
      return res.status(409).json({
        success: false,

        message:
          "No podés desactivar tu propia cuenta.",
      });
    }

    try {
      const usuario =
        await usuariosService.cambiarEstadoUsuario(
          id,
          req.body.activo,
        );

      if (!usuario) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Usuario no encontrado.",
          });
      }

      return res.status(200).json({
        success: true,

        message:
          req.body.activo
            ? "Usuario activado correctamente."
            : "Usuario desactivado correctamente.",

        data: usuario,
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

exports.cambiarPassword =
  async (
    req,
    res,
  ) => {
    const id =
      convertirId(
        req.params.id,
      );

    if (!id) {
      return res.status(400).json({
        success: false,

        message:
          "El ID del usuario no es válido.",
      });
    }

    const password =
      typeof req.body.password ===
      "string"
        ? req.body.password
        : "";

    if (
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,

        message:
          "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    if (
      password.length > 72
    ) {
      return res.status(400).json({
        success: false,

        message:
          "La contraseña no puede superar los 72 caracteres.",
      });
    }

    try {
      const resultado =
        await usuariosService.cambiarPassword(
          id,
          password,
        );

      if (!resultado) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Usuario no encontrado.",
          });
      }

      return res.status(200).json({
        success: true,

        message:
          "Contraseña actualizada correctamente.",
      });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };