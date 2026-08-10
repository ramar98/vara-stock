const clientesService = require(
  "../services/clientesService",
);

function convertirId(valor) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return "";
  }

  return valor.trim();
}

function normalizarTextoOpcional(valor) {
  const texto = normalizarTexto(valor);

  return texto || null;
}

function validarEmail(email) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function validarCliente(body = {}) {
  const errores = [];

  const nombre = normalizarTexto(
    body.nombre,
  );

  const telefono =
    normalizarTextoOpcional(
      body.telefono,
    );

  const email = normalizarTextoOpcional(
    body.email,
  );

  const direccion =
    normalizarTextoOpcional(
      body.direccion,
    );

  if (!nombre) {
    errores.push(
      "El nombre del cliente es obligatorio.",
    );
  }

  if (nombre.length > 150) {
    errores.push(
      "El nombre no puede superar los 150 caracteres.",
    );
  }

  if (
    telefono &&
    telefono.length > 50
  ) {
    errores.push(
      "El teléfono no puede superar los 50 caracteres.",
    );
  }

  if (!validarEmail(email)) {
    errores.push(
      "El correo electrónico no es válido.",
    );
  }

  if (
    email &&
    email.length > 150
  ) {
    errores.push(
      "El correo electrónico no puede superar los 150 caracteres.",
    );
  }

  if (
    direccion &&
    direccion.length > 250
  ) {
    errores.push(
      "La dirección no puede superar los 250 caracteres.",
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    datos: {
      nombre,
      telefono,
      email,
      direccion,
    },
  };
}

function responderError(res, error) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message:
        "Ya existe un cliente con esos datos.",
      error: {
        code: error.code,
      },
    });
  }

  console.error(
    "Error procesando cliente:",
    error,
  );

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error interno procesando el cliente.",
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

exports.obtenerClientes = async (
  req,
  res,
) => {
  try {
    const clientes =
      await clientesService.obtenerClientes({
        busqueda:
          req.query.busqueda || "",
      });

    return res.status(200).json({
      success: true,
      data: clientes,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.obtenerCliente = async (
  req,
  res,
) => {
  const id = convertirId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del cliente no es válido.",
    });
  }

  try {
    const cliente =
      await clientesService.obtenerClientePorId(
        id,
      );

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: cliente,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.crearCliente = async (
  req,
  res,
) => {
  const validacion = validarCliente(
    req.body,
  );

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos del cliente no son válidos.",
      errors: validacion.errores,
    });
  }

  try {
    const cliente =
      await clientesService.crearCliente(
        validacion.datos,
      );

    return res.status(201).json({
      success: true,
      message:
        "Cliente creado correctamente.",
      data: cliente,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.actualizarCliente = async (
  req,
  res,
) => {
  const id = convertirId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del cliente no es válido.",
    });
  }

  const validacion = validarCliente(
    req.body,
  );

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos del cliente no son válidos.",
      errors: validacion.errores,
    });
  }

  try {
    const cliente =
      await clientesService.actualizarCliente(
        id,
        validacion.datos,
      );

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Cliente actualizado correctamente.",
      data: cliente,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.eliminarCliente = async (
  req,
  res,
) => {
  const id = convertirId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del cliente no es válido.",
    });
  }

  try {
    const resultado =
      await clientesService.eliminarCliente(
        id,
      );

    if (
      resultado.motivo ===
      "NO_ENCONTRADO"
    ) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado.",
      });
    }

    if (
      resultado.motivo ===
      "TIENE_VENTAS"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "No se puede eliminar el cliente porque tiene ventas asociadas.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Cliente eliminado correctamente.",
    });
  } catch (error) {
    return responderError(res, error);
  }
};