const proveedoresService = require(
  "../services/proveedoresService",
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

function normalizarTexto(valor) {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor.trim();
}

function normalizarTextoOpcional(
  valor,
) {
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

function validarProveedor(
  body = {},
) {
  const errores = [];

  const nombre =
    normalizarTexto(
      body.nombre,
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

  const observaciones =
    normalizarTextoOpcional(
      body.observaciones,
    );

  if (!nombre) {
    errores.push(
      "El nombre del proveedor es obligatorio.",
    );
  }

  if (
    nombre.length > 150
  ) {
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

  if (
    !validarEmail(email)
  ) {
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
      nombre,
      telefono,
      email,
      direccion,
      observaciones,
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
  if (
    error.code ===
    "ER_DUP_ENTRY"
  ) {
    return res
      .status(409)
      .json({
        success: false,

        message:
          "Ya existe un proveedor con esos datos dentro de la empresa.",

        error: {
          code:
            error.code,
        },
      });
  }

  console.error(
    "Error procesando proveedor:",
    error,
  );

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error interno procesando el proveedor.",

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
 * OBTENER PROVEEDORES
 * =====================================
 */

exports.obtenerProveedores =
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
      const proveedores =
        await proveedoresService.obtenerProveedores({
          empresaId,

          busqueda:
            req.query.busqueda ||
            "",
        });

      return res
        .status(200)
        .json({
          success: true,

          data:
            proveedores,
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
 * OBTENER PROVEEDOR
 * =====================================
 */

exports.obtenerProveedor =
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
            "El ID del proveedor no es válido.",
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
      const proveedor =
        await proveedoresService.obtenerProveedorPorId(
          id,
          empresaId,
        );

      if (!proveedor) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Proveedor no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          data:
            proveedor,
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
 * CREAR PROVEEDOR
 * =====================================
 */

exports.crearProveedor =
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
      validarProveedor(
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
            "Los datos del proveedor no son válidos.",

          errors:
            validacion.errores,
        });
    }

    try {
      const proveedor =
        await proveedoresService.crearProveedor(
          empresaId,
          validacion.datos,
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Proveedor creado correctamente.",

          data:
            proveedor,
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
 * ACTUALIZAR PROVEEDOR
 * =====================================
 */

exports.actualizarProveedor =
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
            "El ID del proveedor no es válido.",
        });
    }

    const empresaId =
      obtenerEmpresaId(req);

    if (!empresaId) {
      return responderEmpresaNoValida(
        res,
      );
    }

    const validacion =
      validarProveedor(
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
            "Los datos del proveedor no son válidos.",

          errors:
            validacion.errores,
        });
    }

    try {
      const proveedor =
        await proveedoresService.actualizarProveedor(
          id,
          empresaId,
          validacion.datos,
        );

      if (!proveedor) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Proveedor no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Proveedor actualizado correctamente.",

          data:
            proveedor,
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
 * ELIMINAR PROVEEDOR
 * =====================================
 */

exports.eliminarProveedor =
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
            "El ID del proveedor no es válido.",
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
      const resultado =
        await proveedoresService.eliminarProveedor(
          id,
          empresaId,
        );

      if (
        resultado.motivo ===
        "NO_ENCONTRADO"
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Proveedor no encontrado.",
          });
      }

      if (
        resultado.motivo ===
        "TIENE_RELACIONES"
      ) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "No se puede eliminar el proveedor porque tiene productos o ingresos asociados.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Proveedor eliminado correctamente.",
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };