const catalogosService = require(
  "../services/catalogosService",
);

const TIPOS_PERMITIDOS = [
  "categorias",
  "marcas",
  "colores",
  "talles",
];

function validarTipo(tipo) {
  return TIPOS_PERMITIDOS.includes(tipo);
}

function convertirId(valor) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function normalizarNombre(valor) {
  if (typeof valor !== "string") {
    return "";
  }

  return valor.trim();
}

function validarElemento(body = {}) {
  const errores = [];

  const nombre = normalizarNombre(
    body.nombre,
  );

  if (!nombre) {
    errores.push(
      "El nombre es obligatorio.",
    );
  }

  if (nombre.length > 100) {
    errores.push(
      "El nombre no puede superar los 100 caracteres.",
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    datos: {
      nombre,
    },
  };
}

function responderTipoInvalido(res) {
  return res.status(400).json({
    success: false,
    message:
      "El tipo de catálogo no es válido.",
    tipos_permitidos:
      TIPOS_PERMITIDOS,
  });
}

function responderError(res, error) {
  if (
    error.code ===
    "CATALOGO_NO_VALIDO"
  ) {
    return responderTipoInvalido(res);
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message:
        "Ya existe un elemento con ese nombre en el catálogo.",
      error: {
        code: error.code,
      },
    });
  }

  if (
    error.code ===
    "ER_ROW_IS_REFERENCED_2"
  ) {
    return res.status(409).json({
      success: false,
      message:
        "No se puede eliminar el elemento porque está siendo utilizado.",
      error: {
        code: error.code,
      },
    });
  }

  if (
    error.code === "ELEMENTO_DUPLICADO"
  ) {
    return res.status(409).json({
      success: false,
      message: error.message,
      error: {
        code: error.code,
      },
    });
  }

  console.error(
    "Error procesando catálogo:",
    error,
  );

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error interno procesando el catálogo.",
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

exports.obtenerElementos = async (
  req,
  res,
) => {
  const { tipo } = req.params;

  if (!validarTipo(tipo)) {
    return responderTipoInvalido(res);
  }

  try {
    const elementos =
      await catalogosService.obtenerElementos(
        tipo,
        {
          busqueda:
            req.query.busqueda || "",
        },
      );

    return res.status(200).json({
      success: true,
      data: elementos,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.obtenerElemento = async (
  req,
  res,
) => {
  const { tipo } = req.params;
  const id = convertirId(req.params.id);

  if (!validarTipo(tipo)) {
    return responderTipoInvalido(res);
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del elemento no es válido.",
    });
  }

  try {
    const elemento =
      await catalogosService.obtenerElementoPorId(
        tipo,
        id,
      );

    if (!elemento) {
      return res.status(404).json({
        success: false,
        message:
          "Elemento no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: elemento,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.crearElemento = async (
  req,
  res,
) => {
  const { tipo } = req.params;

  if (!validarTipo(tipo)) {
    return responderTipoInvalido(res);
  }

  const validacion = validarElemento(
    req.body,
  );

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos del elemento no son válidos.",
      errors: validacion.errores,
    });
  }

  try {
    const elemento =
      await catalogosService.crearElemento(
        tipo,
        validacion.datos,
      );

    return res.status(201).json({
      success: true,
      message:
        "Elemento creado correctamente.",
      data: elemento,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.actualizarElemento = async (
  req,
  res,
) => {
  const { tipo } = req.params;
  const id = convertirId(req.params.id);

  if (!validarTipo(tipo)) {
    return responderTipoInvalido(res);
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del elemento no es válido.",
    });
  }

  const validacion = validarElemento(
    req.body,
  );

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos del elemento no son válidos.",
      errors: validacion.errores,
    });
  }

  try {
    const elemento =
      await catalogosService.actualizarElemento(
        tipo,
        id,
        validacion.datos,
      );

    if (!elemento) {
      return res.status(404).json({
        success: false,
        message:
          "Elemento no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Elemento actualizado correctamente.",
      data: elemento,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.eliminarElemento = async (
  req,
  res,
) => {
  const { tipo } = req.params;
  const id = convertirId(req.params.id);

  if (!validarTipo(tipo)) {
    return responderTipoInvalido(res);
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del elemento no es válido.",
    });
  }

  try {
    const resultado =
      await catalogosService.eliminarElemento(
        tipo,
        id,
      );

    if (
      resultado.motivo ===
      "NO_ENCONTRADO"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Elemento no encontrado.",
      });
    }

    if (
      resultado.motivo ===
      "TIENE_RELACIONES"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "No se puede eliminar el elemento porque está asociado a productos o variantes.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Elemento eliminado correctamente.",
    });
  } catch (error) {
    return responderError(res, error);
  }
};