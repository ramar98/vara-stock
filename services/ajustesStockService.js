const db = require("../config/db");

const obtenerAjustePorId = async (id) => {
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

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id

      WHERE ms.id = ?
        AND ms.tipo = 'AJUSTE'

      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

const obtenerAjustes = async ({
  fechaDesde = null,
  fechaHasta = null,
  productoId = null,
} = {}) => {
  const condiciones = [
    "ms.tipo = 'AJUSTE'",
  ];

  const parametros = [];

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

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      LEFT JOIN usuarios u
        ON u.id = ms.usuario_id

      WHERE ${condiciones.join(" AND ")}

      ORDER BY
        ms.created_at DESC,
        ms.id DESC
    `,
    parametros,
  );

  return rows;
};

const crearAjuste = async ({
  variante_id,
  nuevo_stock,
  motivo,
  observacion = null,
  usuario_id = null,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [variantes] = await connection.query(
      `
        SELECT
          pv.id,
          pv.stock_actual,
          pv.producto_id,
          p.nombre AS producto_nombre

        FROM producto_variantes pv

        INNER JOIN productos p
          ON p.id = pv.producto_id

        WHERE pv.id = ?

        FOR UPDATE
      `,
      [variante_id],
    );

    if (variantes.length === 0) {
      const error = new Error(
        "La variante seleccionada no existe.",
      );

      error.code =
        "VARIANTE_NO_ENCONTRADA";

      throw error;
    }

    if (usuario_id) {
      const [usuarios] =
        await connection.query(
          `
            SELECT id

            FROM usuarios

            WHERE id = ?
              AND activo = TRUE

            LIMIT 1
          `,
          [usuario_id],
        );

      if (usuarios.length === 0) {
        const error = new Error(
          "El usuario seleccionado no existe o está inactivo.",
        );

        error.code =
          "USUARIO_NO_ENCONTRADO";

        throw error;
      }
    }

    const variante = variantes[0];

    const stockAnterior = Number(
      variante.stock_actual ?? 0,
    );

    const stockNuevo = Number(
      nuevo_stock,
    );

    const diferencia =
      stockNuevo - stockAnterior;

    if (diferencia === 0) {
      const error = new Error(
        "El nuevo stock debe ser diferente al stock actual.",
      );

      error.code =
        "STOCK_SIN_CAMBIOS";

      throw error;
    }

    await connection.query(
      `
        UPDATE producto_variantes

        SET stock_actual = ?

        WHERE id = ?
      `,
      [
        stockNuevo,
        variante_id,
      ],
    );

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

          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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