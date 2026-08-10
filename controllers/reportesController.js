const reportesService = require(
  "../services/reportesService",
);

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

function obtenerPeriodo(query = {}) {
  const fechaDesde =
    query.fecha_desde || null;

  const fechaHasta =
    query.fecha_hasta || null;

  const errores = [];

  if (
    fechaDesde &&
    !validarFecha(fechaDesde)
  ) {
    errores.push(
      "La fecha inicial no es válida.",
    );
  }

  if (
    fechaHasta &&
    !validarFecha(fechaHasta)
  ) {
    errores.push(
      "La fecha final no es válida.",
    );
  }

  if (
    fechaDesde &&
    fechaHasta &&
    fechaDesde > fechaHasta
  ) {
    errores.push(
      "La fecha inicial no puede ser posterior a la fecha final.",
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    fechaDesde,
    fechaHasta,
  };
}

function responderError(res, error) {
  console.error(
    "Error generando reporte:",
    error,
  );

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error interno generando el reporte.",

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

function responderPeriodoInvalido(
  res,
  validacion,
) {
  return res.status(400).json({
    success: false,
    message:
      "El período seleccionado no es válido.",
    errors: validacion.errores,
  });
}

exports.obtenerReporteGeneral = async (
  req,
  res,
) => {
  const validacion = obtenerPeriodo(
    req.query,
  );

  if (!validacion.valido) {
    return responderPeriodoInvalido(
      res,
      validacion,
    );
  }

  try {
    const reporte =
      await reportesService.obtenerReporteGeneral({
        fechaDesde:
          validacion.fechaDesde,
        fechaHasta:
          validacion.fechaHasta,
      });

    return res.status(200).json({
      success: true,
      data: reporte,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.obtenerResumenVentas = async (
  req,
  res,
) => {
  const validacion = obtenerPeriodo(
    req.query,
  );

  if (!validacion.valido) {
    return responderPeriodoInvalido(
      res,
      validacion,
    );
  }

  try {
    const resumen =
      await reportesService.obtenerResumenVentas({
        fechaDesde:
          validacion.fechaDesde,
        fechaHasta:
          validacion.fechaHasta,
      });

    return res.status(200).json({
      success: true,
      data: resumen,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.obtenerVentasPorDia = async (
  req,
  res,
) => {
  const validacion = obtenerPeriodo(
    req.query,
  );

  if (!validacion.valido) {
    return responderPeriodoInvalido(
      res,
      validacion,
    );
  }

  try {
    const ventas =
      await reportesService.obtenerVentasPorDia({
        fechaDesde:
          validacion.fechaDesde,
        fechaHasta:
          validacion.fechaHasta,
      });

    return res.status(200).json({
      success: true,
      data: ventas,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.obtenerProductosMasVendidos =
  async (req, res) => {
    const validacion = obtenerPeriodo(
      req.query,
    );

    if (!validacion.valido) {
      return responderPeriodoInvalido(
        res,
        validacion,
      );
    }

    const limite = Number(
      req.query.limite ?? 10,
    );

    if (
      !Number.isInteger(limite) ||
      limite < 1 ||
      limite > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El límite debe ser un número entero entre 1 y 100.",
      });
    }

    try {
      const productos =
        await reportesService.obtenerProductosMasVendidos(
          {
            fechaDesde:
              validacion.fechaDesde,
            fechaHasta:
              validacion.fechaHasta,
            limite,
          },
        );

      return res.status(200).json({
        success: true,
        data: productos,
      });
    } catch (error) {
      return responderError(res, error);
    }
  };

exports.obtenerVentasPorMetodoPago =
  async (req, res) => {
    const validacion = obtenerPeriodo(
      req.query,
    );

    if (!validacion.valido) {
      return responderPeriodoInvalido(
        res,
        validacion,
      );
    }

    try {
      const ventas =
        await reportesService.obtenerVentasPorMetodoPago(
          {
            fechaDesde:
              validacion.fechaDesde,
            fechaHasta:
              validacion.fechaHasta,
          },
        );

      return res.status(200).json({
        success: true,
        data: ventas,
      });
    } catch (error) {
      return responderError(res, error);
    }
  };

exports.obtenerStockActual = async (
  req,
  res,
) => {
  try {
    const stock =
      await reportesService.obtenerStockActual();

    const resumen = stock.reduce(
      (acumulado, item) => {
        acumulado.variantes += 1;

        acumulado.unidades += Number(
          item.stock_actual ?? 0,
        );

        acumulado.valor_costo += Number(
          item.valor_costo ?? 0,
        );

        acumulado.valor_venta += Number(
          item.valor_venta ?? 0,
        );

        if (
          Number(item.stock_actual) <=
          Number(item.stock_minimo)
        ) {
          acumulado.stock_bajo += 1;
        }

        return acumulado;
      },
      {
        variantes: 0,
        unidades: 0,
        stock_bajo: 0,
        valor_costo: 0,
        valor_venta: 0,
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        resumen,
        productos: stock,
      },
    });
  } catch (error) {
    return responderError(res, error);
  }
};