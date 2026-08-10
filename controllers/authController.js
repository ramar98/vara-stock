const authService = require(
  "../services/authService",
);

function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return "";
  }

  return valor.trim();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function validarLogin(body = {}) {
  const errores = [];

  const identificador =
    normalizarTexto(
      body.identificador,
    );

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (!identificador) {
    errores.push(
      "Ingresá tu usuario o correo electrónico.",
    );
  }

  if (!password) {
    errores.push(
      "Ingresá tu contraseña.",
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    datos: {
      identificador,
      password,
    },
  };
}

function validarRegistro(body = {}) {
  const errores = [];

  const nombre =
    normalizarTexto(body.nombre);

  const apellido =
    normalizarTexto(body.apellido);

  const usuario =
    normalizarTexto(body.usuario);

  const email =
    normalizarTexto(body.email)
      .toLowerCase();

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  const rolId = Number(
    body.rol_id ?? 2,
  );

  if (!nombre) {
    errores.push(
      "El nombre es obligatorio.",
    );
  } else if (nombre.length > 100) {
    errores.push(
      "El nombre no puede superar los 100 caracteres.",
    );
  }

  if (!apellido) {
    errores.push(
      "El apellido es obligatorio.",
    );
  } else if (apellido.length > 100) {
    errores.push(
      "El apellido no puede superar los 100 caracteres.",
    );
  }

  if (!usuario) {
    errores.push(
      "El nombre de usuario es obligatorio.",
    );
  } else if (usuario.length > 50) {
    errores.push(
      "El nombre de usuario no puede superar los 50 caracteres.",
    );
  }

  if (!email) {
    errores.push(
      "El correo electrónico es obligatorio.",
    );
  } else if (!validarEmail(email)) {
    errores.push(
      "El correo electrónico no es válido.",
    );
  } else if (email.length > 150) {
    errores.push(
      "El correo electrónico no puede superar los 150 caracteres.",
    );
  }

  if (!password) {
    errores.push(
      "La contraseña es obligatoria.",
    );
  } else if (password.length < 8) {
    errores.push(
      "La contraseña debe tener al menos 8 caracteres.",
    );
  } else if (password.length > 72) {
    errores.push(
      "La contraseña no puede superar los 72 caracteres.",
    );
  }

  if (
    !Number.isInteger(rolId) ||
    rolId <= 0
  ) {
    errores.push(
      "El rol seleccionado no es válido.",
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    datos: {
      nombre,
      apellido,
      usuario,
      email,
      password,
      rol_id: rolId,
    },
  };
}

function responderError(res, error) {
  const erroresControlados = {
    CREDENCIALES_INVALIDAS: {
      status: 401,
      message:
        "El usuario, correo o contraseña son incorrectos.",
    },

    USUARIO_INACTIVO: {
      status: 403,
      message:
        "El usuario se encuentra inactivo.",
    },

    USUARIO_DUPLICADO: {
      status: 409,
      message: error.message,
    },

    ROL_NO_ENCONTRADO: {
      status: 400,
      message:
        "El rol seleccionado no existe.",
    },

    TOKEN_INVALIDO: {
      status: 401,
      message:
        "La sesión no es válida o ha vencido.",
    },

    USUARIO_NO_ENCONTRADO: {
      status: 404,
      message:
        "El usuario no existe.",
    },

    JWT_SECRET_NO_CONFIGURADO: {
      status: 500,
      message:
        "La autenticación no está configurada correctamente.",
    },
  };

  const errorControlado =
    erroresControlados[error.code];

  if (errorControlado) {
    return res
      .status(errorControlado.status)
      .json({
        success: false,
        message:
          errorControlado.message,
        error: {
          code: error.code,
        },
      });
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message:
        "Ya existe un usuario con esos datos.",
      error: {
        code: error.code,
      },
    });
  }

  console.error(
    "Error procesando autenticación:",
    error,
  );

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error interno procesando la autenticación.",

    error:
      process.env.NODE_ENV ===
        "development"
        ? {
          code: error.code,
          detail: error.message,
        }
        : undefined,
  });
}

exports.iniciarSesion = async (
  req,
  res,
) => {
  const validacion = validarLogin(
    req.body,
  );

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos de inicio de sesión no son válidos.",
      errors: validacion.errores,
    });
  }

  try {
    const resultado =
      await authService.iniciarSesion(
        validacion.datos,
      );

    return res.status(200).json({
      success: true,
      message:
        "Sesión iniciada correctamente.",
      data: resultado,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.registrarUsuario = async (
  req,
  res,
) => {
  const validacion =
    validarRegistro(req.body);

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos del usuario no son válidos.",
      errors: validacion.errores,
    });
  }

  try {
    const resultado =
      await authService.registrarUsuario(
        validacion.datos,
      );

    return res.status(201).json({
      success: true,
      message:
        "Usuario registrado correctamente.",
      data: resultado,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.obtenerSesionActual = async (
  req,
  res,
) => {
  return res.status(200).json({
    success: true,
    data: {
      usuario: req.usuario,
    },
  });
};