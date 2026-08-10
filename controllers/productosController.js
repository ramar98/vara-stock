const productosService = require(
  "../services/productosService",
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

function normalizarTexto(valor) {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor.trim();
}

function normalizarIdOpcional(
  valor,
) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  const id = Number(valor);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function normalizarRol(rol) {
  return String(
    rol ?? "",
  )
    .trim()
    .toUpperCase();
}

function esAdministrador(req) {
  return (
    normalizarRol(
      req.usuario?.rol,
    ) === "ADMINISTRADOR"
  );
}

/*
 * Elimina datos sensibles para
 * usuarios que no sean Administrador.
 */
function filtrarProductoPorRol(
  producto,
  administrador,
) {
  if (!producto) {
    return producto;
  }

  if (administrador) {
    return producto;
  }

  const productoSeguro = {
    ...producto,
  };

  delete productoSeguro.precio_costo;
  delete productoSeguro.margen;

  /*
   * Si el detalle trae variantes
   * embebidas, también limpiamos
   * el costo de cada variante.
   */
  if (
    Array.isArray(
      productoSeguro.variantes,
    )
  ) {
    productoSeguro.variantes =
      productoSeguro.variantes.map(
        (variante) => {
          const varianteSegura = {
            ...variante,
          };

          delete varianteSegura.precio_costo;
          delete varianteSegura.margen;

          return varianteSegura;
        },
      );
  }

  return productoSeguro;
}

function filtrarProductosPorRol(
  productos,
  administrador,
) {
  if (
    !Array.isArray(productos)
  ) {
    return [];
  }

  return productos.map(
    (producto) =>
      filtrarProductoPorRol(
        producto,
        administrador,
      ),
  );
}

function validarProducto(
  body = {},
) {
  const errores = [];

  const codigo =
    normalizarTexto(
      body.codigo,
    );

  const nombre =
    normalizarTexto(
      body.nombre,
    );

  if (!codigo) {
    errores.push(
      "El código es obligatorio.",
    );
  }

  if (
    codigo.length > 50
  ) {
    errores.push(
      "El código no puede superar los 50 caracteres.",
    );
  }

  if (!nombre) {
    errores.push(
      "El nombre es obligatorio.",
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
    body.descripcion !==
      undefined &&
    body.descripcion !==
      null &&
    typeof body.descripcion !==
      "string"
  ) {
    errores.push(
      "La descripción debe ser un texto.",
    );
  }

  const camposRelacionados = [
    [
      "categoria_id",
      "La categoría",
    ],
    [
      "marca_id",
      "La marca",
    ],
    [
      "proveedor_id",
      "El proveedor",
    ],
  ];

  for (
    const [
      campo,
      etiqueta,
    ] of camposRelacionados
  ) {
    const valor =
      body[campo];

    if (
      valor !== undefined &&
      valor !== null &&
      valor !== ""
    ) {
      const id =
        Number(valor);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        errores.push(
          `${etiqueta} seleccionada no es válida.`,
        );
      }
    }
  }

  return {
    valido:
      errores.length === 0,

    errores,

    datos: {
      codigo,
      nombre,

      descripcion:
        normalizarTexto(
          body.descripcion,
        ) || null,

      categoria_id:
        normalizarIdOpcional(
          body.categoria_id,
        ),

      marca_id:
        normalizarIdOpcional(
          body.marca_id,
        ),

      proveedor_id:
        normalizarIdOpcional(
          body.proveedor_id,
        ),
    },
  };
}

function responderErrorBaseDatos(
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
          "Ya existe un producto con ese código.",

        error: {
          code:
            error.code,
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
          "La categoría, marca o proveedor seleccionado no existe.",

        error: {
          code:
            error.code,
        },
      });
  }

  console.error(
    "Error de productos:",
    error,
  );

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error interno procesando el producto.",

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

exports.obtenerProductos =
  async (req, res) => {
    try {
      const productos =
        await productosService.obtenerProductos();

      const administrador =
        esAdministrador(req);

      const productosFiltrados =
        filtrarProductosPorRol(
          productos,
          administrador,
        );

      return res
        .status(200)
        .json({
          success: true,

          data:
            productosFiltrados,
        });
    } catch (error) {
      return responderErrorBaseDatos(
        res,
        error,
      );
    }
  };

exports.obtenerProducto =
  async (req, res) => {
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
            "El ID del producto no es válido.",
        });
    }

    try {
      const producto =
        await productosService.obtenerProductoPorId(
          id,
        );

      if (!producto) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Producto no encontrado.",
          });
      }

      const administrador =
        esAdministrador(req);

      const productoFiltrado =
        filtrarProductoPorRol(
          producto,
          administrador,
        );

      return res
        .status(200)
        .json({
          success: true,

          data:
            productoFiltrado,
        });
    } catch (error) {
      return responderErrorBaseDatos(
        res,
        error,
      );
    }
  };

exports.crearProducto =
  async (req, res) => {
    const validacion =
      validarProducto(
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
            "Los datos del producto no son válidos.",

          errors:
            validacion.errores,
        });
    }

    try {
      const producto =
        await productosService.crearProducto(
          validacion.datos,
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Producto creado correctamente.",

          data:
            producto,
        });
    } catch (error) {
      return responderErrorBaseDatos(
        res,
        error,
      );
    }
  };

exports.actualizarProducto =
  async (req, res) => {
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
            "El ID del producto no es válido.",
        });
    }

    const validacion =
      validarProducto(
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
            "Los datos del producto no son válidos.",

          errors:
            validacion.errores,
        });
    }

    try {
      const producto =
        await productosService.actualizarProducto(
          id,
          validacion.datos,
        );

      if (!producto) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Producto no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Producto actualizado correctamente.",

          data:
            producto,
        });
    } catch (error) {
      return responderErrorBaseDatos(
        res,
        error,
      );
    }
  };

exports.eliminarProducto =
  async (req, res) => {
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
            "El ID del producto no es válido.",
        });
    }

    try {
      const eliminado =
        await productosService.eliminarProducto(
          id,
        );

      if (!eliminado) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Producto no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Producto eliminado correctamente.",
        });
    } catch (error) {
      return responderErrorBaseDatos(
        res,
        error,
      );
    }
  };