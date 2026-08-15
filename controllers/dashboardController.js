const dashboardService = require(
  "../services/dashboardService",
);

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
        code:
          "EMPRESA_NO_ASIGNADA",
      },
    });
}

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
    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

    try {
      const usuarioId =
        req.usuario?.id ??
        req.usuarioId ??
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
          empresaId,
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
    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

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
      const usuarioId =
        req.usuario?.id ??
        req.usuarioId ??
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
            empresaId,
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
    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

    try {
      const productos =
        await dashboardService.obtenerProductosStockBajo(
          empresaId,
        );

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