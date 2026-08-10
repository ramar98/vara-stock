const ingresosService = require(
  "../services/ingresosService",
);

function convertirId(valor) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
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

function validarFecha(valor) {
  if (typeof valor !== "string") {
    return false;
  }

  const formatoValido =
    /^\d{4}-\d{2}-\d{2}$/.test(valor);

  if (!formatoValido) {
    return false;
  }

  const fecha = new Date(
    `${valor}T00:00:00`,
  );

  return !Number.isNaN(
    fecha.getTime(),
  );
}

function validarProductos(productos) {
  const errores = [];

  if (
    !Array.isArray(productos) ||
    productos.length === 0
  ) {
    errores.push(
      "El ingreso debe contener al menos un producto.",
    );

    return {
      valido: false,
      errores,
      productos: [],
    };
  }

  const variantesUsadas =
    new Set();

  const productosNormalizados =
    [];

  productos.forEach(
    (item, indice) => {
      const numeroItem =
        indice + 1;

      const varianteId =
        convertirId(
          item?.variante_id,
        );

      const cantidad = Number(
        item?.cantidad,
      );

      const precioCosto = Number(
        item?.precio_costo,
      );

      if (!varianteId) {
        errores.push(
          `El producto ${numeroItem} tiene una variante inválida.`,
        );
      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        errores.push(
          `La cantidad del producto ${numeroItem} debe ser un número entero mayor que cero.`,
        );
      }

      if (
        item?.precio_costo ===
          undefined ||
        item?.precio_costo === "" ||
        Number.isNaN(
          precioCosto,
        ) ||
        precioCosto < 0
      ) {
        errores.push(
          `El precio de costo del producto ${numeroItem} no es válido.`,
        );
      }

      if (
        varianteId &&
        variantesUsadas.has(
          varianteId,
        )
      ) {
        errores.push(
          `La variante ${varianteId} está repetida en el ingreso.`,
        );
      }

      if (varianteId) {
        variantesUsadas.add(
          varianteId,
        );
      }

      productosNormalizados.push({
        variante_id: varianteId,
        cantidad,
        precio_costo: precioCosto,
      });
    },
  );

  return {
    valido:
      errores.length === 0,
    errores,
    productos:
      productosNormalizados,
  };
}

function validarIngreso(body = {}) {
  const errores = [];

  const proveedorId =
    convertirId(
      body.proveedor_id,
    );

  if (!proveedorId) {
    errores.push(
      "El proveedor seleccionado no es válido.",
    );
  }

  if (!validarFecha(body.fecha)) {
    errores.push(
      "La fecha del ingreso no es válida.",
    );
  }

  const validacionProductos =
    validarProductos(
      body.productos,
    );

  errores.push(
    ...validacionProductos.errores,
  );

  const numeroComprobante =
    normalizarTextoOpcional(
      body.numero_comprobante,
    );

  const observaciones =
    normalizarTextoOpcional(
      body.observaciones,
    );

  if (
    numeroComprobante &&
    numeroComprobante.length > 50
  ) {
    errores.push(
      "El número de comprobante no puede superar los 50 caracteres.",
    );
  }

  if (
    observaciones &&
    observaciones.length > 1000
  ) {
    errores.push(
      "Las observaciones no pueden superar los 1000 caracteres.",
    );
  }

  return {
    valido:
      errores.length === 0,

    errores,

    datos: {
      proveedor_id:
        proveedorId,

      numero_comprobante:
        numeroComprobante,

      fecha:
        body.fecha,

      observaciones,

      productos:
        validacionProductos.productos,
    },
  };
}

function responderError(
  res,
  error,
) {
  const erroresControlados = {
    PROVEEDOR_NO_ENCONTRADO: {
      status: 404,
      message:
        "El proveedor seleccionado no existe.",
    },

    USUARIO_NO_ENCONTRADO: {
      status: 404,
      message:
        "El usuario de la sesión no existe o está inactivo.",
    },

    VARIANTE_NO_ENCONTRADA: {
      status: 404,
      message: error.message,
    },
  };

  const errorControlado =
    erroresControlados[
      error.code
    ];

  if (errorControlado) {
    return res
      .status(
        errorControlado.status,
      )
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
    "Error procesando ingreso:",
    error,
  );

  return res.status(500).json({
    success: false,

    message:
      "Ocurrió un error interno procesando el ingreso.",

    error:
      process.env.NODE_ENV ===
      "development"
        ? {
            code: error.code,
            detail:
              error.message,
          }
        : undefined,
  });
}

exports.obtenerIngresos = async (
  req,
  res,
) => {
  const {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    proveedor_id:
      proveedorIdParametro,
  } = req.query;

  const proveedorId =
    proveedorIdParametro
      ? convertirId(
          proveedorIdParametro,
        )
      : null;

  if (
    proveedorIdParametro &&
    !proveedorId
  ) {
    return res.status(400).json({
      success: false,

      message:
        "El proveedor utilizado como filtro no es válido.",
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
    fechaDesde >
      fechaHasta
  ) {
    return res.status(400).json({
      success: false,

      message:
        "La fecha inicial no puede ser posterior a la fecha final.",
    });
  }

  try {
    const ingresos =
      await ingresosService.obtenerIngresos(
        {
          fechaDesde:
            fechaDesde || null,

          fechaHasta:
            fechaHasta || null,

          proveedorId,
        },
      );

    return res.status(200).json({
      success: true,
      data: ingresos,
    });
  } catch (error) {
    return responderError(
      res,
      error,
    );
  }
};

exports.obtenerIngreso = async (
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
        "El ID del ingreso no es válido.",
    });
  }

  try {
    const ingreso =
      await ingresosService.obtenerIngresoPorId(
        id,
      );

    if (!ingreso) {
      return res.status(404).json({
        success: false,
        message:
          "Ingreso no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: ingreso,
    });
  } catch (error) {
    return responderError(
      res,
      error,
    );
  }
};

exports.crearIngreso = async (
  req,
  res,
) => {
  const validacion =
    validarIngreso(req.body);

  if (!validacion.valido) {
    return res.status(400).json({
      success: false,

      message:
        "Los datos del ingreso no son válidos.",

      errors:
        validacion.errores,
    });
  }

  if (!req.usuarioId) {
    return res.status(401).json({
      success: false,

      message:
        "No se pudo identificar al usuario de la sesión.",

      error: {
        code:
          "USUARIO_NO_AUTENTICADO",
      },
    });
  }

  try {
    const ingreso =
      await ingresosService.crearIngreso(
        {
          ...validacion.datos,

          usuario_id:
            req.usuarioId,
        },
      );

    return res.status(201).json({
      success: true,

      message:
        "Ingreso registrado correctamente.",

      data: ingreso,
    });
  } catch (error) {
    return responderError(
      res,
      error,
    );
  }
};