const ajustesStockService = require(
  "../services/ajustesStockService",
);

const MOTIVOS_PERMITIDOS = [
  "CONTEO_FISICO",
  "ROTURA",
  "PERDIDA",
  "ERROR_CARGA",
  "DEVOLUCION",
  "OTRO",
];

function convertirId(valor) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function validarFecha(valor) {
  if (!valor) {
    return true;
  }

  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const [anio, mes, dia] = valor
    .split("-")
    .map(Number);

  const fecha = new Date(
    anio,
    mes - 1,
    dia,
  );

  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

function normalizarTextoOpcional(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  return String(valor).trim() || null;
}

function validarAjuste(body = {}) {
  const errores = [];

  const varianteId = convertirId(
    body.variante_id,
  );

  const nuevoStock = Number(
    body.nuevo_stock,
  );

  const motivo = String(
    body.motivo ?? "",
  )
    .trim()
    .toUpperCase();

  const observacion =
    normalizarTextoOpcional(
      body.observacion,
    );

  if (!varianteId) {
    errores.push(
      "La variante seleccionada no es válida.",
    );
  }

  if (
    body.nuevo_stock === undefined ||
    body.nuevo_stock === "" ||
    !Number.isInteger(nuevoStock) ||
    nuevoStock < 0
  ) {
    errores.push(
      "El nuevo stock debe ser un número entero mayor o igual a cero.",
    );
  }

  if (
    !MOTIVOS_PERMITIDOS.includes(
      motivo,
    )
  ) {
    errores.push(
      "El motivo del ajuste no es válido.",
    );
  }

  if (
    observacion &&
    observacion.length > 1000
  ) {
    errores.push(
      "La observación no puede superar los 1000 caracteres.",
    );
  }

  return {
    valido: errores.length === 0,
    errores,

    datos: {
      variante_id: varianteId,
      nuevo_stock: nuevoStock,
      motivo,
      observacion,
    },
  };
}

function responderError(res, error) {
  const erroresControlados = {
    VARIANTE_NO_ENCONTRADA: {
      status: 404,
      message:
        "La variante seleccionada no existe.",
    },

    USUARIO_NO_ENCONTRADO: {
      status: 404,
      message:
        "El usuario de la sesión no existe o está inactivo.",
    },

    STOCK_SIN_CAMBIOS: {
      status: 409,
      message:
        "El nuevo stock debe ser diferente al stock actual.",
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

  if (
    error.code ===
    "ER_NO_REFERENCED_ROW_2"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Alguno de los datos relacionados no existe.",

      error: {
        code: error.code,
      },
    });
  }

  console.error(
    "Error procesando ajuste de stock:",
    error,
  );

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error interno procesando el ajuste de stock.",

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

exports.obtenerAjustes = async (
  req,
  res,
) => {
  const {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    producto_id: productoIdParametro,
  } = req.query;

  const productoId =
    productoIdParametro
      ? convertirId(
          productoIdParametro,
        )
      : null;

  if (
    productoIdParametro &&
    !productoId
  ) {
    return res.status(400).json({
      success: false,
      message:
        "El producto utilizado como filtro no es válido.",
    });
  }

  if (
    fechaDesde &&
    !validarFecha(fechaDesde)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "La fecha inicial no es válida.",
    });
  }

  if (
    fechaHasta &&
    !validarFecha(fechaHasta)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "La fecha final no es válida.",
    });
  }

  if (
    fechaDesde &&
    fechaHasta &&
    fechaDesde > fechaHasta
  ) {
    return res.status(400).json({
      success: false,
      message:
        "La fecha inicial no puede ser posterior a la fecha final.",
    });
  }

  try {
    const ajustes =
      await ajustesStockService.obtenerAjustes({
        fechaDesde:
          fechaDesde || null,

        fechaHasta:
          fechaHasta || null,

        productoId,
      });

    return res.status(200).json({
      success: true,
      data: ajustes,
    });
  } catch (error) {
    return responderError(
      res,
      error,
    );
  }
};

exports.obtenerAjuste = async (
  req,
  res,
) => {
  const id = convertirId(
    req.params.id,
  );

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del ajuste no es válido.",
    });
  }

  try {
    const ajuste =
      await ajustesStockService.obtenerAjustePorId(
        id,
      );

    if (!ajuste) {
      return res.status(404).json({
        success: false,
        message:
          "Ajuste de stock no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: ajuste,
    });
  } catch (error) {
    return responderError(
      res,
      error,
    );
  }
};

exports.crearAjuste = async (
  req,
  res,
) => {
  const validacion = validarAjuste(
    req.body,
  );

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,
      message:
        "Los datos del ajuste no son válidos.",
      errors: validacion.errores,
    });
  }

  if (!req.usuarioId) {
    return res.status(401).json({
      success: false,
      message:
        "No se pudo identificar al usuario de la sesión.",
      error: {
        code: "USUARIO_NO_AUTENTICADO",
      },
    });
  }

  try {
    const ajuste =
      await ajustesStockService.crearAjuste({
        ...validacion.datos,
        usuario_id: req.usuarioId,
      });

    return res.status(201).json({
      success: true,
      message:
        "Ajuste de stock registrado correctamente.",
      data: ajuste,
    });
  } catch (error) {
    return responderError(
      res,
      error,
    );
  }
};