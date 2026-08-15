const db = require("../config/db");

/*
 * =====================================
 * MOVIMIENTOS POR PRODUCTO
 * =====================================
 */

const obtenerMovimientosPorProducto = async (
  productoId,
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
        ms.created_at,
        ms.usuario_id,

        pv.codigo_barras,
        pv.producto_id,

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
        pv.producto_id = ?
        AND p.empresa_id = ?

      ORDER BY
        ms.created_at DESC,
        ms.id DESC
    `,
    [
      productoId,
      empresaId,
    ],
  );

  return rows;
};

/*
 * =====================================
 * MOVIMIENTOS POR VARIANTE
 * =====================================
 */

const obtenerMovimientosPorVariante = async (
  varianteId,
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
        ms.created_at,
        ms.usuario_id,

        pv.codigo_barras,
        pv.producto_id,

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
        ms.variante_id = ?
        AND p.empresa_id = ?

      ORDER BY
        ms.created_at DESC,
        ms.id DESC
    `,
    [
      varianteId,
      empresaId,
    ],
  );

  return rows;
};

/*
 * =====================================
 * MOVIMIENTO POR ID
 * =====================================
 */

const obtenerMovimientoPorId = async (
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
        ms.created_at,
        ms.usuario_id,

        pv.codigo_barras,
        pv.producto_id,

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

module.exports = {
  obtenerMovimientosPorProducto,
  obtenerMovimientosPorVariante,
  obtenerMovimientoPorId,
};