const db = require("../config/db");

/*
 * =====================================
 * OBTENER AJUSTE POR ID
 * =====================================
 */

const obtenerAjustePorId = async (
  id,
  empresaId,
) => {
  const [rows] = await db.query(
    `
      SELECT
        ms.id,
        ms.variante_id,
        ms.tipo,
        ms.cantidad,
        ms.stock_anterior,
        ms.stock_nuevo,
        ms.referencia,
        ms.observacion,
        ms.usuario_id,
        ms.created_at,

        pv.producto_id,
        pv.codigo_barras,

        p.codigo AS producto_codigo,
        p.nombre AS producto_nombre,

        c.nombre AS color,
        t.nombre AS talle,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido

      FROM movimientos_stock ms

      INNER JOIN producto_variantes pv
        ON pv.id = ms.variante_id

      INNER JOIN productos p
        ON p.id = pv.producto_id

      LEFT JOIN colores c
        ON c.id = pv.color_id
       AND c.empresa_id = p.empresa_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id
       AND t.empresa_id = p.empresa_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id
       AND u.empresa_id = p.empresa_id

      WHERE
        ms.id = ?
        AND ms.tipo = 'AJUSTE'
        AND p.empresa_id = ?

      LIMIT 1
    `,
    [
      id,
      empresaId,
    ],
  );

  return rows[0] ?? null;
};

/*
 * =====================================
 * LISTADO DE AJUSTES
 * =====================================
 */

const obtenerAjustes = async ({
  empresaId,
  fechaDesde = null,
  fechaHasta = null,
  productoId = null,
} = {}) => {
  const condiciones = [
    "ms.tipo = 'AJUSTE'",
    "p.empresa_id = ?",
  ];

  const parametros = [
    empresaId,
  ];

  if (fechaDesde) {
    condiciones.push(
      "DATE(ms.created_at) >= ?",
    );

    parametros.push(fechaDesde);
  }

  if (fechaHasta) {
    condiciones.push(
      "DATE(ms.created_at) <= ?",
    );

    parametros.push(fechaHasta);
  }

  if (productoId) {
    condiciones.push(
      "pv.producto_id = ?",
    );

    parametros.push(productoId);
  }

  const [rows] = await db.query(
    `
      SELECT
        ms.id,
        ms.variante_id,
        ms.tipo,
        ms.cantidad,
        ms.stock_anterior,
        ms.stock_nuevo,
        ms.referencia,
        ms.observacion,
        ms.usuario_id,
        ms.created_at,

        pv.producto_id,
        pv.codigo_barras,

        p.codigo AS producto_codigo,
        p.nombre AS producto_nombre,

        c.nombre AS color,
        t.nombre AS talle,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido

      FROM movimientos_stock ms

      INNER JOIN producto_variantes pv
        ON pv.id = ms.variante_id

      INNER JOIN productos p
        ON p.id = pv.producto_id

      LEFT JOIN colores c
        ON c.id = pv.color_id
       AND c.empresa_id = p.empresa_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id
       AND t.empresa_id = p.empresa_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id
       AND u.empresa_id = p.empresa_id

      WHERE
        ${condiciones.join(" AND ")}

      ORDER BY
        ms.created_at DESC,
        ms.id DESC
    `,
    parametros,
  );

  return rows;
};

/*
 * =====================================
 * CREAR AJUSTE
 * =====================================
 */

const crearAjuste = async ({
  empresa_id,
  variante_id,
  nuevo_stock,
  motivo,
  observacion = null,
  usuario_id = null,
}) => {
  const empresaId = Number(
    empresa_id,
  );

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * =================================
     * VALIDAR EMPRESA
     * =================================
     */

    if (
      !Number.isInteger(empresaId) ||
      empresaId <= 0
    ) {
      const error = new Error(
        "No se pudo identificar la empresa.",
      );

      error.code =
        "EMPRESA_NO_ASIGNADA";

      throw error;
    }

    /*
     * =================================
     * VALIDAR VARIANTE + EMPRESA
     * =================================
     */

    const [variantes] =
      await connection.query(
        `
          SELECT
            pv.id,
            pv.stock_actual,
            pv.producto_id,

            p.nombre AS producto_nombre

          FROM producto_variantes pv

          INNER JOIN productos p
            ON p.id =
              pv.producto_id

          WHERE
            pv.id = ?
            AND p.empresa_id = ?
            AND p.activo = TRUE

          FOR UPDATE
        `,
        [
          variante_id,
          empresaId,
        ],
      );

    if (
      variantes.length === 0
    ) {
      const error = new Error(
        "La variante seleccionada no existe o no pertenece a la empresa.",
      );

      error.code =
        "VARIANTE_NO_ENCONTRADA";

      throw error;
    }

    /*
     * =================================
     * VALIDAR USUARIO
     * =================================
     */

    if (usuario_id) {
      const [usuarios] =
        await connection.query(
          `
            SELECT
              id

            FROM usuarios

            WHERE
              id = ?
              AND empresa_id = ?
              AND activo = TRUE

            LIMIT 1
          `,
          [
            usuario_id,
            empresaId,
          ],
        );

      if (
        usuarios.length === 0
      ) {
        const error = new Error(
          "El usuario de la sesión no existe, está inactivo o no pertenece a la empresa.",
        );

        error.code =
          "USUARIO_NO_ENCONTRADO";

        throw error;
      }
    }

    const variante =
      variantes[0];

    const stockAnterior =
      Number(
        variante.stock_actual ??
          0,
      );

    const stockNuevo =
      Number(
        nuevo_stock,
      );

    const diferencia =
      stockNuevo -
      stockAnterior;

    if (
      diferencia === 0
    ) {
      const error = new Error(
        "El nuevo stock debe ser diferente al stock actual.",
      );

      error.code =
        "STOCK_SIN_CAMBIOS";

      throw error;
    }

    /*
     * =================================
     * ACTUALIZAR STOCK
     * =================================
     *
     * Protegemos el UPDATE mediante
     * JOIN con productos.
     */

    const [resultadoStock] =
      await connection.query(
        `
          UPDATE producto_variantes pv

          INNER JOIN productos p
            ON p.id =
              pv.producto_id

          SET
            pv.stock_actual = ?

          WHERE
            pv.id = ?
            AND p.empresa_id = ?
            AND p.activo = TRUE
        `,
        [
          stockNuevo,
          variante_id,
          empresaId,
        ],
      );

    if (
      resultadoStock.affectedRows ===
      0
    ) {
      const error = new Error(
        "La variante seleccionada no existe o no pertenece a la empresa.",
      );

      error.code =
        "VARIANTE_NO_ENCONTRADA";

      throw error;
    }

    /*
     * =================================
     * REGISTRAR MOVIMIENTO
     * =================================
     */

    const referencia =
      `Ajuste de stock: ${motivo}`;

    const [movimientoResult] =
      await connection.query(
        `
          INSERT INTO movimientos_stock
          (
            variante_id,
            tipo,
            cantidad,
            stock_anterior,
            stock_nuevo,
            referencia,
            usuario_id,
            observacion
          )

          VALUES (
            ?,
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
          variante_id,
          "AJUSTE",
          diferencia,
          stockAnterior,
          stockNuevo,
          referencia,
          usuario_id,
          observacion,
        ],
      );

    await connection.commit();

    return obtenerAjustePorId(
      movimientoResult.insertId,
      empresaId,
    );
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerAjustes,
  obtenerAjustePorId,
  crearAjuste,
};