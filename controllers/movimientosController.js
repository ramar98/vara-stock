const movimientosService = require(
  "../services/movimientosService",
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

function obtenerEmpresaId(req) {
  const empresaId = Number(
    req.empresaId ??
      req.usuario?.empresa_id,
  );

  if (
    !Number.isInteger(empresaId) ||
    empresaId <= 0
  ) {
    return null;
  }

  return empresaId;
}

function responderEmpresaNoValida(res) {
  return res
    .status(403)
    .json({
      success: false,

      message:
        "No se pudo determinar la empresa del usuario autenticado.",

      error: {
        code: "EMPRESA_NO_ASIGNADA",
      },
    });
}

function responderError(
  res,
  error,
) {
  console.error(
    "Error procesando movimientos:",
    error,
  );

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error interno consultando los movimientos de stock.",

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

/*
 * =====================================
 * MOVIMIENTOS POR PRODUCTO
 * =====================================
 */

exports.obtenerMovimientosPorProducto =
  async (
    req,
    res,
  ) => {
    const productoId =
      convertirId(
        req.params.producto_id,
      );

    if (!productoId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El ID del producto no es válido.",
        });
    }

    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

    try {
      const movimientos =
        await movimientosService.obtenerMovimientosPorProducto(
          productoId,
          empresaId,
        );

      return res
        .status(200)
        .json({
          success: true,
          data: movimientos,
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

/*
 * =====================================
 * MOVIMIENTOS POR VARIANTE
 * =====================================
 */

exports.obtenerMovimientosPorVariante =
  async (
    req,
    res,
  ) => {
    const varianteId =
      convertirId(
        req.params.variante_id,
      );

    if (!varianteId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El ID de la variante no es válido.",
        });
    }

    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

    try {
      const movimientos =
        await movimientosService.obtenerMovimientosPorVariante(
          varianteId,
          empresaId,
        );

      return res
        .status(200)
        .json({
          success: true,
          data: movimientos,
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };

/*
 * =====================================
 * MOVIMIENTO POR ID
 * =====================================
 */

exports.obtenerMovimiento =
  async (
    req,
    res,
  ) => {
    const id =
      convertirId(
        req.params.id,
      );

    if (!id) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El ID del movimiento no es válido.",
        });
    }

    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

    try {
      const movimiento =
        await movimientosService.obtenerMovimientoPorId(
          id,
          empresaId,
        );

      if (!movimiento) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Movimiento de stock no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          data: movimiento,
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };