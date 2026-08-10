const db = require("../config/db");

const obtenerMovimientosPorProducto = async (
  productoId,
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

        pv.codigo_barras,
        pv.producto_id,

        c.nombre AS color,
        t.nombre AS talle,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido

      FROM movimientos_stock ms

      INNER JOIN producto_variantes pv
        ON pv.id = ms.variante_id

      LEFT JOIN colores c
        ON c.id = pv.color_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id

      WHERE pv.producto_id = ?

      ORDER BY
        ms.created_at DESC,
        ms.id DESC
    `,
    [productoId],
  );

  return rows;
};

const obtenerMovimientosPorVariante = async (
  varianteId,
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

        pv.codigo_barras,
        pv.producto_id,

        c.nombre AS color,
        t.nombre AS talle,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido

      FROM movimientos_stock ms

      INNER JOIN producto_variantes pv
        ON pv.id = ms.variante_id

      LEFT JOIN colores c
        ON c.id = pv.color_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id

      WHERE ms.variante_id = ?

      ORDER BY
        ms.created_at DESC,
        ms.id DESC
    `,
    [varianteId],
  );

  return rows;
};

const obtenerMovimientoPorId = async (id) => {
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

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id

      WHERE ms.id = ?

      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

module.exports = {
  obtenerMovimientosPorProducto,
  obtenerMovimientosPorVariante,
  obtenerMovimientoPorId,
};