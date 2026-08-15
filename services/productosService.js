const db = require(
  "../config/db",
);

/*
 * =====================================
 * VALIDAR RELACIONES DE LA EMPRESA
 * =====================================
 */

async function validarRelacionesProducto(
  empresaId,
  {
    categoria_id,
    marca_id,
    proveedor_id,
  },
) {
  /*
   * CATEGORÍA
   */

  if (categoria_id) {
    const [rows] =
      await db.query(
        `
          SELECT id
          FROM categorias
          WHERE id = ?
            AND empresa_id = ?
          LIMIT 1
        `,
        [
          categoria_id,
          empresaId,
        ],
      );

    if (
      rows.length === 0
    ) {
      const error =
        new Error(
          "La categoría no pertenece a la empresa.",
        );

      error.code =
        "CATEGORIA_NO_VALIDA";

      throw error;
    }
  }

  /*
   * MARCA
   */

  if (marca_id) {
    const [rows] =
      await db.query(
        `
          SELECT id
          FROM marcas
          WHERE id = ?
            AND empresa_id = ?
          LIMIT 1
        `,
        [
          marca_id,
          empresaId,
        ],
      );

    if (
      rows.length === 0
    ) {
      const error =
        new Error(
          "La marca no pertenece a la empresa.",
        );

      error.code =
        "MARCA_NO_VALIDA";

      throw error;
    }
  }

  /*
   * PROVEEDOR
   */

  if (proveedor_id) {
    const [rows] =
      await db.query(
        `
          SELECT id
          FROM proveedores
          WHERE id = ?
            AND empresa_id = ?
            AND activo = TRUE
          LIMIT 1
        `,
        [
          proveedor_id,
          empresaId,
        ],
      );

    if (
      rows.length === 0
    ) {
      const error =
        new Error(
          "El proveedor no pertenece a la empresa.",
        );

      error.code =
        "PROVEEDOR_NO_VALIDO";

      throw error;
    }
  }
}

/*
 * =====================================
 * OBTENER PRODUCTOS
 * =====================================
 */

const obtenerProductos =
  async (
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            p.id,
            p.empresa_id,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.categoria_id,
            p.marca_id,
            p.proveedor_id,

            c.nombre AS categoria,
            m.nombre AS marca,
            pr.nombre AS proveedor,

            COUNT(
              DISTINCT v.id
            ) AS variantes,

            COALESCE(
              SUM(
                v.stock_actual
              ),
              0
            ) AS stock,

            COALESCE(
              MIN(
                v.precio_costo
              ),
              0
            ) AS precio_costo,

            COALESCE(
              MAX(
                v.precio_venta
              ),
              0
            ) AS precio_venta,

            (
              SELECT
                pi.ruta

              FROM producto_imagenes pi

              WHERE
                pi.producto_id =
                p.id

              ORDER BY
                pi.principal DESC,
                pi.id ASC

              LIMIT 1
            ) AS imagen

          FROM productos p

          LEFT JOIN categorias c
            ON c.id =
              p.categoria_id
           AND c.empresa_id =
              p.empresa_id

          LEFT JOIN marcas m
            ON m.id =
              p.marca_id
           AND m.empresa_id =
              p.empresa_id

          LEFT JOIN proveedores pr
            ON pr.id =
              p.proveedor_id
           AND pr.empresa_id =
              p.empresa_id

          LEFT JOIN producto_variantes v
            ON v.producto_id =
              p.id

          WHERE
            p.empresa_id = ?
            AND p.activo = TRUE

          GROUP BY
            p.id,
            p.empresa_id,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.categoria_id,
            p.marca_id,
            p.proveedor_id,
            c.nombre,
            m.nombre,
            pr.nombre

          ORDER BY
            p.nombre ASC
        `,
        [
          empresaId,
        ],
      );

    return rows;
  };

/*
 * =====================================
 * OBTENER PRODUCTO POR ID
 * =====================================
 */

const obtenerProductoPorId =
  async (
    id,
    empresaId,
  ) => {
    const [productos] =
      await db.query(
        `
          SELECT
            p.id,
            p.empresa_id,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.categoria_id,
            p.marca_id,
            p.proveedor_id,
            p.activo,
            p.created_at,
            p.updated_at,

            c.nombre AS categoria,
            m.nombre AS marca,
            pr.nombre AS proveedor

          FROM productos p

          LEFT JOIN categorias c
            ON c.id =
              p.categoria_id
           AND c.empresa_id =
              p.empresa_id

          LEFT JOIN marcas m
            ON m.id =
              p.marca_id
           AND m.empresa_id =
              p.empresa_id

          LEFT JOIN proveedores pr
            ON pr.id =
              p.proveedor_id
           AND pr.empresa_id =
              p.empresa_id

          WHERE
            p.id = ?
            AND p.empresa_id = ?
            AND p.activo = TRUE

          LIMIT 1
        `,
        [
          id,
          empresaId,
        ],
      );

    if (
      productos.length ===
      0
    ) {
      return null;
    }

    const producto =
      productos[0];

    /*
     * =================================
     * VARIANTES
     * =================================
     */

    const [variantes] =
      await db.query(
        `
          SELECT
            v.id,
            v.producto_id,
            v.color_id,
            v.talle_id,
            v.codigo_barras,
            v.precio_costo,
            v.precio_venta,
            v.stock_actual,
            v.stock_minimo,

            c.nombre AS color,
            t.nombre AS talle

          FROM producto_variantes v

          INNER JOIN productos p
            ON p.id =
              v.producto_id

          LEFT JOIN colores c
            ON c.id =
              v.color_id
           AND c.empresa_id =
              p.empresa_id

          LEFT JOIN talles t
            ON t.id =
              v.talle_id
           AND t.empresa_id =
              p.empresa_id

          WHERE
            v.producto_id = ?
            AND p.empresa_id = ?
            AND p.activo = TRUE

          ORDER BY
            c.nombre,
            t.nombre
        `,
        [
          id,
          empresaId,
        ],
      );

    /*
     * =================================
     * IMÁGENES
     * =================================
     */

    const [imagenes] =
      await db.query(
        `
          SELECT
            pi.id,
            pi.producto_id,
            pi.ruta,
            pi.principal,
            pi.created_at

          FROM producto_imagenes pi

          INNER JOIN productos p
            ON p.id =
              pi.producto_id

          WHERE
            pi.producto_id = ?
            AND p.empresa_id = ?
            AND p.activo = TRUE

          ORDER BY
            pi.principal DESC,
            pi.id ASC
        `,
        [
          id,
          empresaId,
        ],
      );

    return {
      ...producto,

      variantes,

      imagenes,
    };
  };

/*
 * =====================================
 * CREAR PRODUCTO
 * =====================================
 */

const crearProducto =
  async (
    empresaId,
    data,
  ) => {
    const {
      codigo,
      nombre,
      descripcion = null,
      categoria_id = null,
      marca_id = null,
      proveedor_id = null,
    } = data;

    /*
     * Evita relaciones con registros
     * pertenecientes a otra empresa.
     */

    await validarRelacionesProducto(
      empresaId,
      {
        categoria_id,
        marca_id,
        proveedor_id,
      },
    );

    const [result] =
      await db.query(
        `
          INSERT INTO productos
          (
            empresa_id,
            codigo,
            nombre,
            descripcion,
            categoria_id,
            marca_id,
            proveedor_id
          )

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          empresaId,
          codigo,
          nombre,
          descripcion,
          categoria_id,
          marca_id,
          proveedor_id,
        ],
      );

    return obtenerProductoPorId(
      result.insertId,
      empresaId,
    );
  };

/*
 * =====================================
 * ACTUALIZAR PRODUCTO
 * =====================================
 */

const actualizarProducto =
  async (
    id,
    empresaId,
    data,
  ) => {
    const {
      codigo,
      nombre,
      descripcion = null,
      categoria_id = null,
      marca_id = null,
      proveedor_id = null,
    } = data;

    await validarRelacionesProducto(
      empresaId,
      {
        categoria_id,
        marca_id,
        proveedor_id,
      },
    );

    const [result] =
      await db.query(
        `
          UPDATE productos

          SET
            codigo = ?,
            nombre = ?,
            descripcion = ?,
            categoria_id = ?,
            marca_id = ?,
            proveedor_id = ?

          WHERE
            id = ?
            AND empresa_id = ?
            AND activo = TRUE
        `,
        [
          codigo,
          nombre,
          descripcion,
          categoria_id,
          marca_id,
          proveedor_id,
          id,
          empresaId,
        ],
      );

    if (
      result.affectedRows ===
      0
    ) {
      return null;
    }

    return obtenerProductoPorId(
      id,
      empresaId,
    );
  };

/*
 * =====================================
 * ELIMINAR PRODUCTO
 * =====================================
 */

const eliminarProducto =
  async (
    id,
    empresaId,
  ) => {
    const [result] =
      await db.query(
        `
          UPDATE productos

          SET
            activo = FALSE

          WHERE
            id = ?
            AND empresa_id = ?
            AND activo = TRUE
        `,
        [
          id,
          empresaId,
        ],
      );

    return (
      result.affectedRows >
      0
    );
  };

module.exports = {
  obtenerProductos,

  obtenerProductoPorId,

  crearProducto,

  actualizarProducto,

  eliminarProducto,
};