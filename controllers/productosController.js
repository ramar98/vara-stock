const productosService =
  require(
    "../services/productosService",
  );

/*
 * =====================================
 * CONVERTIR ID
 * =====================================
 */

function convertirId(valor) {
  const id =
    Number(valor);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

/*
 * =====================================
 * EMPRESA
 * =====================================
 */

function obtenerEmpresaId(req) {
  const empresaId =
    Number(
      req.empresaId ??
        req.usuario?.empresa_id,
    );

  if (
    !Number.isInteger(
      empresaId,
    ) ||
    empresaId <= 0
  ) {
    return null;
  }

  return empresaId;
}

/*
 * =====================================
 * TEXTO
 * =====================================
 */

function normalizarTexto(valor) {
  if (
    typeof valor !==
    "string"
  ) {
    return "";
  }

  return valor.trim();
}

/*
 * =====================================
 * ID OPCIONAL
 * =====================================
 */

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

  const id =
    Number(valor);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

/*
 * =====================================
 * ROL
 * =====================================
 */

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
    ) ===
    "ADMINISTRADOR"
  );
}

/*
 * =====================================
 * FILTRAR DATOS SEGÚN ROL
 * =====================================
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

  /*
   * Costo calculado / agregado
   * en consultas existentes.
   */

  delete productoSeguro
    .precio_costo;

  /*
   * Nuevo precio base de costo.
   *
   * Un vendedor no debería
   * poder verlo.
   */

  delete productoSeguro
    .precio_costo_default;

  delete productoSeguro
    .margen;

  /*
   * También ocultamos el costo
   * de cada variante.
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

          delete varianteSegura
            .precio_costo;

          delete varianteSegura
            .margen;

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

/*
 * =====================================
 * VALIDAR PRODUCTO
 * =====================================
 */

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

  /*
   * =====================================
   * DATOS GENERALES
   * =====================================
   */

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

  /*
   * =====================================
   * RELACIONES
   * =====================================
   */

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
        !Number.isInteger(
          id,
        ) ||
        id <= 0
      ) {
        errores.push(
          `${etiqueta} seleccionada no es válida.`,
        );
      }
    }
  }

  /*
   * =====================================
   * PRECIO DE COSTO PREDETERMINADO
   * =====================================
   */

  const precioCostoDefault =
    Number(
      body.precio_costo_default,
    );

  if (
    body.precio_costo_default ===
      undefined ||
    body.precio_costo_default ===
      null ||
    body.precio_costo_default ===
      "" ||
    Number.isNaN(
      precioCostoDefault,
    ) ||
    precioCostoDefault < 0
  ) {
    errores.push(
      "El precio de costo debe ser un número mayor o igual a cero.",
    );
  }

  /*
   * =====================================
   * PRECIO DE VENTA PREDETERMINADO
   * =====================================
   */

  const precioVentaDefault =
    Number(
      body.precio_venta_default,
    );

  if (
    body.precio_venta_default ===
      undefined ||
    body.precio_venta_default ===
      null ||
    body.precio_venta_default ===
      "" ||
    Number.isNaN(
      precioVentaDefault,
    ) ||
    precioVentaDefault < 0
  ) {
    errores.push(
      "El precio de venta debe ser un número mayor o igual a cero.",
    );
  }

  /*
   * =====================================
   * VENTA MENOR AL COSTO
   * =====================================
   */

  if (
    body.precio_costo_default !==
      undefined &&
    body.precio_costo_default !==
      null &&
    body.precio_costo_default !==
      "" &&
    body.precio_venta_default !==
      undefined &&
    body.precio_venta_default !==
      null &&
    body.precio_venta_default !==
      "" &&
    !Number.isNaN(
      precioCostoDefault,
    ) &&
    !Number.isNaN(
      precioVentaDefault,
    ) &&
    precioVentaDefault <
      precioCostoDefault
  ) {
    errores.push(
      "El precio de venta no puede ser menor al precio de costo.",
    );
  }

  /*
   * =====================================
   * RESULTADO
   * =====================================
   */

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

      precio_costo_default:
        precioCostoDefault,

      precio_venta_default:
        precioVentaDefault,
    },
  };
}

/*
 * =====================================
 * ERROR EMPRESA
 * =====================================
 */

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

/*
 * =====================================
 * ERRORES BASE DE DATOS
 * =====================================
 */

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
        success:
          false,

        message:
          "Ya existe un producto con ese código dentro de la empresa.",

        error: {
          code:
            error.code,
        },
      });
  }

  /*
   * Relaciones pertenecientes
   * a otra empresa o inexistentes.
   */

  const erroresRelacion = {
    CATEGORIA_NO_VALIDA:
      "La categoría seleccionada no pertenece a la empresa.",

    MARCA_NO_VALIDA:
      "La marca seleccionada no pertenece a la empresa.",

    PROVEEDOR_NO_VALIDO:
      "El proveedor seleccionado no pertenece a la empresa.",
  };

  if (
    erroresRelacion[
      error.code
    ]
  ) {
    return res
      .status(400)
      .json({
        success:
          false,

        message:
          erroresRelacion[
            error.code
          ],

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
        success:
          false,

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

/*
 * =====================================
 * OBTENER PRODUCTOS
 * =====================================
 */

exports.obtenerProductos =
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
        await productosService.obtenerProductos(
          empresaId,
        );

      const administrador =
        esAdministrador(
          req,
        );

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

/*
 * =====================================
 * OBTENER PRODUCTO
 * =====================================
 */

exports.obtenerProducto =
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
          success:
            false,

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
      const producto =
        await productosService.obtenerProductoPorId(
          id,
          empresaId,
        );

      /*
       * Si el ID existe pero pertenece
       * a otra empresa también devolvemos
       * 404.
       *
       * No revelamos su existencia.
       */

      if (!producto) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Producto no encontrado.",
          });
      }

      const administrador =
        esAdministrador(
          req,
        );

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

/*
 * =====================================
 * CREAR PRODUCTO
 * =====================================
 */

exports.crearProducto =
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
      validarProducto(
        req.body,
      );

    if (
      !validacion.valido
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Los datos del producto no son válidos.",

          errors:
            validacion.errores,
        });
    }

    try {
      /*
       * empresa_id NO viene del body.
       */

      const producto =
        await productosService.crearProducto(
          empresaId,
          validacion.datos,
        );

      return res
        .status(201)
        .json({
          success:
            true,

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

/*
 * =====================================
 * ACTUALIZAR PRODUCTO
 * =====================================
 */

exports.actualizarProducto =
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
          success:
            false,

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
          success:
            false,

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
          empresaId,
          validacion.datos,
        );

      if (!producto) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Producto no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,

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

/*
 * =====================================
 * ELIMINAR PRODUCTO
 * =====================================
 */

exports.eliminarProducto =
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
          success:
            false,

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
      const eliminado =
        await productosService.eliminarProducto(
          id,
          empresaId,
        );

      if (!eliminado) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Producto no encontrado.",
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,

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