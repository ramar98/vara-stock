const db = require("../config/db");

const obtenerVariantes = async (productoId) => {
  const [rows] = await db.query(
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
        v.created_at,

        c.nombre AS color,
        t.nombre AS talle

      FROM producto_variantes v

      LEFT JOIN colores c
        ON c.id = v.color_id

      LEFT JOIN talles t
        ON t.id = v.talle_id

      WHERE v.producto_id = ?

      ORDER BY
        c.nombre ASC,
        t.nombre ASC
    `,
    [productoId],
  );

  return rows;
};

const obtenerVariantePorId = async (id) => {
  const [rows] = await db.query(
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
        v.created_at,

        c.nombre AS color,
        t.nombre AS talle

      FROM producto_variantes v

      LEFT JOIN colores c
        ON c.id = v.color_id

      LEFT JOIN talles t
        ON t.id = v.talle_id

      WHERE v.id = ?

      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

const existeCombinacion = async ({
  productoId,
  colorId,
  talleId,
  excluirVarianteId = null,
}) => {
  const parametros = [
    productoId,
    colorId,
    talleId,
  ];

  let condicionExcluir = "";

  if (excluirVarianteId) {
    condicionExcluir = "AND id <> ?";
    parametros.push(excluirVarianteId);
  }

  const [rows] = await db.query(
    `
      SELECT id

      FROM producto_variantes

      WHERE producto_id = ?
        AND color_id = ?
        AND talle_id = ?
        ${condicionExcluir}

      LIMIT 1
    `,
    parametros,
  );

  return rows.length > 0;
};

const crearVariante = async (data) => {
  const {
    producto_id,
    color_id,
    talle_id,
    codigo_barras = null,
    precio_costo,
    precio_venta,
    stock_actual = 0,
    stock_minimo = 1,
  } = data;

  const combinacionExiste =
    await existeCombinacion({
      productoId: producto_id,
      colorId: color_id,
      talleId: talle_id,
    });

  if (combinacionExiste) {
    const error = new Error(
      "Ya existe una variante con ese color y talle.",
    );

    error.code = "VARIANTE_DUPLICADA";

    throw error;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
        INSERT INTO producto_variantes
        (
          producto_id,
          color_id,
          talle_id,
          codigo_barras,
          precio_costo,
          precio_venta,
          stock_actual,
          stock_minimo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        producto_id,
        color_id,
        talle_id,
        codigo_barras,
        precio_costo,
        precio_venta,
        stock_actual,
        stock_minimo,
      ],
    );

    const varianteId = result.insertId;

    if (Number(stock_actual) > 0) {
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
            observacion
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          varianteId,
          "AJUSTE",
          Number(stock_actual),
          0,
          Number(stock_actual),
          `Stock inicial variante #${varianteId}`,
          "Stock inicial registrado al crear la variante.",
        ],
      );
    }

    await connection.commit();

    return obtenerVariantePorId(varianteId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const actualizarVariante = async (
  id,
  data,
) => {
  const {
    color_id,
    talle_id,
    codigo_barras = null,
    precio_costo,
    precio_venta,
    stock_minimo = 1,
  } = data;

  const varianteActual =
    await obtenerVariantePorId(id);

  if (!varianteActual) {
    return null;
  }

  const combinacionExiste =
    await existeCombinacion({
      productoId:
        varianteActual.producto_id,
      colorId: color_id,
      talleId: talle_id,
      excluirVarianteId: id,
    });

  if (combinacionExiste) {
    const error = new Error(
      "Ya existe otra variante con ese color y talle.",
    );

    error.code = "VARIANTE_DUPLICADA";

    throw error;
  }

  const [result] = await db.query(
    `
      UPDATE producto_variantes

      SET
        color_id = ?,
        talle_id = ?,
        codigo_barras = ?,
        precio_costo = ?,
        precio_venta = ?,
        stock_minimo = ?

      WHERE id = ?
    `,
    [
      color_id,
      talle_id,
      codigo_barras,
      precio_costo,
      precio_venta,
      stock_minimo,
      id,
    ],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return obtenerVariantePorId(id);
};

const tieneMovimientosRelacionados = async (
  varianteId,
) => {
  const [rows] = await db.query(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM movimientos_stock
          WHERE variante_id = ?
        ) AS movimientos,

        (
          SELECT COUNT(*)
          FROM ingresos_detalle
          WHERE variante_id = ?
        ) AS ingresos,

        (
          SELECT COUNT(*)
          FROM ventas_detalle
          WHERE variante_id = ?
        ) AS ventas
    `,
    [
      varianteId,
      varianteId,
      varianteId,
    ],
  );

  const resultado = rows[0];

  return (
    Number(resultado.movimientos) > 0 ||
    Number(resultado.ingresos) > 0 ||
    Number(resultado.ventas) > 0
  );
};

const eliminarVariante = async (id) => {
  const variante =
    await obtenerVariantePorId(id);

  if (!variante) {
    return {
      eliminada: false,
      motivo: "NO_ENCONTRADA",
    };
  }

  const tieneRelaciones =
    await tieneMovimientosRelacionados(id);

  if (tieneRelaciones) {
    return {
      eliminada: false,
      motivo: "TIENE_MOVIMIENTOS",
    };
  }

  const [result] = await db.query(
    `
      DELETE FROM producto_variantes
      WHERE id = ?
    `,
    [id],
  );

  return {
    eliminada: result.affectedRows > 0,
    motivo:
      result.affectedRows > 0
        ? null
        : "NO_ENCONTRADA",
  };
};

module.exports = {
  obtenerVariantes,
  obtenerVariantePorId,
  crearVariante,
  actualizarVariante,
  eliminarVariante,
};