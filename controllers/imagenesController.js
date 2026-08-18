const imagenesService = require(
  "../services/imagenesService",
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

function convertirBooleano(valor) {
  return (
    valor === true ||
    valor === "true" ||
    valor === "1" ||
    valor === 1
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

function responderEmpresaNoValida(res) {
  return res.status(403).json({
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
  if (
    error.code ===
    "PRODUCTO_NO_ENCONTRADO"
  ) {
    return res
      .status(404)
      .json({
        success: false,
        message: error.message,

        error: {
          code: error.code,
        },
      });
  }

  if (
    error.code ===
    "IMAGEN_NO_ENCONTRADA"
  ) {
    return res
      .status(404)
      .json({
        success: false,
        message: error.message,

        error: {
          code: error.code,
        },
      });
  }

  if (
    error.code ===
    "ER_NO_REFERENCED_ROW_2"
  ) {
    return res
      .status(400)
      .json({
        success: false,

        message:
          "El producto seleccionado no existe.",

        error: {
          code: error.code,
        },
      });
  }

  console.error(
    "Error procesando imagen:",
    error,
  );

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error interno procesando la imagen.",

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
 * LISTAR IMÁGENES
 * =====================================
 */

exports.obtenerImagenes =
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
      const imagenes =
        await imagenesService.obtenerImagenes(
          productoId,
          empresaId,
        );

      return res
        .status(200)
        .json({
          success: true,
          data: imagenes,
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
 * SUBIR IMAGEN
 * =====================================
 */

exports.subirImagen =
  async (
    req,
    res,
  ) => {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "No se envió ninguna imagen.",
        });
    }

    const productoId =
      convertirId(
        req.body.producto_id,
      );

    if (!productoId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El producto seleccionado no es válido.",
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
      /*
       * IMPORTANTE:
       *
       * Guardamos en BD una ruta RELATIVA:
       *
       * uploads/productos/archivo.jpg
       *
       * y no:
       *
       * /app/uploads/productos/archivo.jpg
       *
       * El archivo físico sí queda dentro de:
       *
       * /app/uploads/productos
       *
       * que está respaldado por el Volume
       * de Railway.
       */

      const rutaRelativa =
        `uploads/productos/${req.file.filename}`;

      const imagen =
        await imagenesService.guardarImagen(
          {
            producto_id:
              productoId,

            ruta:
              rutaRelativa,

            principal:
              convertirBooleano(
                req.body.principal,
              ),
          },
          empresaId,
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Imagen subida correctamente.",

          data: imagen,
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
 * MARCAR COMO PRINCIPAL
 * =====================================
 */

exports.marcarComoPrincipal =
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
            "El ID de la imagen no es válido.",
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
      const imagen =
        await imagenesService.marcarComoPrincipal(
          id,
          empresaId,
        );

      if (!imagen) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Imagen no encontrada.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Imagen principal actualizada correctamente.",

          data: imagen,
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
 * ELIMINAR IMAGEN
 * =====================================
 */

exports.eliminarImagen =
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
            "El ID de la imagen no es válido.",
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
        await imagenesService.eliminarImagen(
          id,
          empresaId,
        );

      if (
        resultado.motivo ===
        "NO_ENCONTRADA"
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Imagen no encontrada.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Imagen eliminada correctamente.",

          data: {
            producto_id:
              resultado.producto_id,
          },
        });
    } catch (error) {
      return responderError(
        res,
        error,
      );
    }
  };