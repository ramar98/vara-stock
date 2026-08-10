const imagenesService = require(
  "../services/imagenesService",
);

function convertirId(valor) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
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

function responderError(res, error) {
  if (error.code === "PRODUCTO_NO_ENCONTRADO") {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
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

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error interno procesando la imagen.",
    error:
      process.env.NODE_ENV === "development"
        ? {
            code: error.code,
            detail: error.message,
          }
        : undefined,
  });
}

exports.obtenerImagenes = async (req, res) => {
  const productoId = convertirId(
    req.params.producto_id,
  );

  if (!productoId) {
    return res.status(400).json({
      success: false,
      message:
        "El ID del producto no es válido.",
    });
  }

  try {
    const imagenes =
      await imagenesService.obtenerImagenes(
        productoId,
      );

    return res.status(200).json({
      success: true,
      data: imagenes,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.subirImagen = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No se envió ninguna imagen.",
    });
  }

  const productoId = convertirId(
    req.body.producto_id,
  );

  if (!productoId) {
    return res.status(400).json({
      success: false,
      message:
        "El producto seleccionado no es válido.",
    });
  }

  try {
    const imagen =
      await imagenesService.guardarImagen({
        producto_id: productoId,
        ruta: req.file.path,
        principal: convertirBooleano(
          req.body.principal,
        ),
      });

    return res.status(201).json({
      success: true,
      message:
        "Imagen subida correctamente.",
      data: imagen,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.marcarComoPrincipal = async (
  req,
  res,
) => {
  const id = convertirId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID de la imagen no es válido.",
    });
  }

  try {
    const imagen =
      await imagenesService.marcarComoPrincipal(
        id,
      );

    if (!imagen) {
      return res.status(404).json({
        success: false,
        message: "Imagen no encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Imagen principal actualizada correctamente.",
      data: imagen,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

exports.eliminarImagen = async (req, res) => {
  const id = convertirId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message:
        "El ID de la imagen no es válido.",
    });
  }

  try {
    const resultado =
      await imagenesService.eliminarImagen(id);

    if (
      resultado.motivo === "NO_ENCONTRADA"
    ) {
      return res.status(404).json({
        success: false,
        message: "Imagen no encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Imagen eliminada correctamente.",
      data: {
        producto_id: resultado.producto_id,
      },
    });
  } catch (error) {
    return responderError(res, error);
  }
};