const configuracionService = require(
  "../services/configuracionService",
);

const MONEDAS_PERMITIDAS = [
  "ARS",
  "USD",
  "EUR",
];

function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return "";
  }

  return valor.trim();
}

function normalizarTextoOpcional(valor) {
  const texto =
    normalizarTexto(valor);

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

function validarConfiguracion(
  body = {},
) {
  const errores = [];

  const nombreNegocio =
    normalizarTexto(
      body.nombre_negocio,
    );

  const eslogan =
    normalizarTextoOpcional(
      body.eslogan,
    );

  const telefono =
    normalizarTextoOpcional(
      body.telefono,
    );

  const email =
    normalizarTextoOpcional(
      body.email,
    );

  const direccion =
    normalizarTextoOpcional(
      body.direccion,
    );

  const moneda = String(
    body.moneda ?? "",
  )
    .trim()
    .toUpperCase();

  const porcentajeIva = Number(
    body.porcentaje_iva,
  );

  const stockMinimoPredeterminado =
    Number(
      body.stock_minimo_predeterminado,
    );

  const encabezadoComprobante =
    normalizarTextoOpcional(
      body.encabezado_comprobante,
    );

  const pieComprobante =
    normalizarTextoOpcional(
      body.pie_comprobante,
    );

  if (!nombreNegocio) {
    errores.push(
      "El nombre del negocio es obligatorio.",
    );
  } else if (
    nombreNegocio.length > 150
  ) {
    errores.push(
      "El nombre del negocio no puede superar los 150 caracteres.",
    );
  }

  if (
    eslogan &&
    eslogan.length > 250
  ) {
    errores.push(
      "El eslogan no puede superar los 250 caracteres.",
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

  if (
    !MONEDAS_PERMITIDAS.includes(
      moneda,
    )
  ) {
    errores.push(
      "La moneda seleccionada no es válida.",
    );
  }

  if (
    Number.isNaN(
      porcentajeIva,
    ) ||
    porcentajeIva < 0 ||
    porcentajeIva > 100
  ) {
    errores.push(
      "El porcentaje de IVA debe estar entre 0 y 100.",
    );
  }

  if (
    !Number.isInteger(
      stockMinimoPredeterminado,
    ) ||
    stockMinimoPredeterminado < 0
  ) {
    errores.push(
      "El stock mínimo predeterminado debe ser un número entero mayor o igual a cero.",
    );
  }

  if (
    encabezadoComprobante &&
    encabezadoComprobante.length >
    250
  ) {
    errores.push(
      "El encabezado del comprobante no puede superar los 250 caracteres.",
    );
  }

  if (
    pieComprobante &&
    pieComprobante.length > 500
  ) {
    errores.push(
      "El pie del comprobante no puede superar los 500 caracteres.",
    );
  }

  return {
    valido:
      errores.length === 0,

    errores,

    datos: {
      nombre_negocio:
        nombreNegocio,

      eslogan,
      telefono,
      email,
      direccion,
      moneda,

      porcentaje_iva:
        porcentajeIva,

      stock_minimo_predeterminado:
        stockMinimoPredeterminado,

      encabezado_comprobante:
        encabezadoComprobante,

      pie_comprobante:
        pieComprobante,
    },
  };
}

function responderEmpresaNoValida(
  res,
) {
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
    "Error procesando configuración:",
    error,
  );

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error interno procesando la configuración.",

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
 * VALIDAR LOGO
 * =====================================
 */

function validarLogo(
  logoData,
) {
  if (
    typeof logoData !==
    "string"
  ) {
    return {
      valido: false,

      message:
        "El logo no es válido.",
    };
  }

  const logo =
    logoData.trim();

  const formatoValido =
    /^data:image\/(png|jpeg|webp);base64,/i.test(
      logo,
    );

  if (!formatoValido) {
    return {
      valido: false,

      message:
        "El logo debe ser una imagen PNG, JPG o WEBP.",
    };
  }

  /*
   * Data URL incluye aproximadamente
   * 33% de sobrecarga respecto al archivo.
   *
   * Limitamos a ~700 KB de texto para
   * mantener logos pequeños.
   */

  if (
    logo.length > 700000
  ) {
    return {
      valido: false,

      message:
        "El logo no puede superar los 500 KB.",
    };
  }

  return {
    valido: true,

    logo,
  };
}


/*
 * =====================================
 * OBTENER CONFIGURACIÓN
 * =====================================
 */

exports.obtenerConfiguracion =
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
      const configuracion =
        await configuracionService.obtenerConfiguracion(
          empresaId,
        );

      return res
        .status(200)
        .json({
          success: true,

          data:
            configuracion,
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
 * ACTUALIZAR CONFIGURACIÓN
 * =====================================
 */

exports.actualizarConfiguracion =
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

    const validacion =
      validarConfiguracion(
        req.body,
      );

    if (
      !validacion.valido
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Los datos de configuración no son válidos.",

          errors:
            validacion.errores,
        });
    }

    try {
      const configuracion =
        await configuracionService.actualizarConfiguracion(
          empresaId,
          validacion.datos,
        );

      if (!configuracion) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "No se encontró la configuración del negocio.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Configuración actualizada correctamente.",

          data:
            configuracion,
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
* ACTUALIZAR LOGO
* =====================================
*/

exports.actualizarLogo =
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

    const validacion =
      validarLogo(
        req.body?.logo_data,
      );

    if (!validacion.valido) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            validacion.message,
        });
    }

    try {
      const configuracion =
        await configuracionService
          .actualizarLogo(
            empresaId,
            validacion.logo,
          );

      if (!configuracion) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "No se encontró la configuración del negocio.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Logo actualizado correctamente.",

          data:
            configuracion,
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
 * ELIMINAR LOGO
 * =====================================
 */

exports.eliminarLogo =
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
      const configuracion =
        await configuracionService
          .eliminarLogo(
            empresaId,
          );

      if (!configuracion) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "No se encontró la configuración del negocio.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Logo eliminado correctamente.",

          data:
            configuracion,
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };