const dashboardService = require(
  "../services/dashboardService",
);

function responderError(
  res,
  error,
) {
  console.error(
    "Error procesando dashboard:",
    error,
  );

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error interno cargando el dashboard.",

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

/*
 * =====================================
 * RESUMEN DASHBOARD
 * =====================================
 */

exports.obtenerResumen =
  async (
    req,
    res,
  ) => {
    try {
      const usuarioId =
        req.usuario?.id ??
        null;

      const rol =
        String(
          req.usuario?.rol ??
            "",
        )
          .trim()
          .toUpperCase();

      const resumen =
        await dashboardService.obtenerResumen({
          usuarioId,
          rol,
        });

      return res
        .status(200)
        .json({
          success: true,
          data: resumen,
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
 * VENTAS POR DÍA
 * =====================================
 */

exports.obtenerVentasPorDia =
  async (
    req,
    res,
  ) => {
    const dias =
      Number(
        req.query.dias ??
          7,
      );

    if (
      !Number.isInteger(
        dias,
      ) ||
      dias < 1 ||
      dias > 90
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "La cantidad de días debe ser un número entero entre 1 y 90.",
        });
    }

    try {
      /*
       * Usuario autenticado.
       */
      const usuarioId =
        req.usuario?.id ??
        null;

      const rol =
        String(
          req.usuario?.rol ??
            "",
        )
          .trim()
          .toUpperCase();

      const ventas =
        await dashboardService.obtenerVentasPorDia(
          dias,
          {
            usuarioId,
            rol,
          },
        );

      return res
        .status(200)
        .json({
          success: true,
          data: ventas,
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
 * STOCK BAJO
 * =====================================
 */

exports.obtenerStockBajo =
  async (
    req,
    res,
  ) => {
    try {
      const productos =
        await dashboardService.obtenerProductosStockBajo();

      return res
        .status(200)
        .json({
          success: true,
          data: productos,
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };