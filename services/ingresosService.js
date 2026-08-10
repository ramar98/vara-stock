const db = require("../config/db");

const obtenerIngresoPorId = async (id) => {
  const [ingresos] = await db.query(
    `
      SELECT
        i.id,
        i.proveedor_id,
        i.numero_comprobante,
        i.fecha,
        i.total,
        i.observaciones,
        i.usuario_id,
        i.created_at,

        p.nombre AS proveedor,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido

      FROM ingresos i

      INNER JOIN proveedores p
        ON p.id = i.proveedor_id

      LEFT JOIN usuarios u
        ON u.id = i.usuario_id

      WHERE i.id = ?

      LIMIT 1
    `,
    [id],
  );

  if (ingresos.length === 0) {
    return null;
  }

  const [detalles] = await db.query(
    `
      SELECT
        idet.id,
        idet.ingreso_id,
        idet.variante_id,
        idet.cantidad,
        idet.precio_costo,
        idet.subtotal,

        pv.codigo_barras,
        pv.producto_id,

        p.codigo AS producto_codigo,
        p.nombre AS producto_nombre,

        c.nombre AS color,
        t.nombre AS talle

      FROM ingresos_detalle idet

      INNER JOIN producto_variantes pv
        ON pv.id = idet.variante_id

      INNER JOIN productos p
        ON p.id = pv.producto_id

      LEFT JOIN colores c
        ON c.id = pv.color_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      WHERE idet.ingreso_id = ?

      ORDER BY
        p.nombre ASC,
        c.nombre ASC,
        t.nombre ASC
    `,
    [id],
  );

  const ingreso = ingresos[0];

  return {
    ...ingreso,

    total: Number(
      ingreso.total ?? 0,
    ),

    productos: detalles.map(
      (detalle) => ({
        ...detalle,

        cantidad: Number(
          detalle.cantidad ?? 0,
        ),

        precio_costo: Number(
          detalle.precio_costo ?? 0,
        ),

        subtotal: Number(
          detalle.subtotal ?? 0,
        ),
      }),
    ),
  };
};

const obtenerIngresos = async ({
  fechaDesde = null,
  fechaHasta = null,
  proveedorId = null,
} = {}) => {
  const condiciones = [];
  const parametros = [];

  if (fechaDesde) {
    condiciones.push(
      "i.fecha >= ?",
    );

    parametros.push(
      fechaDesde,
    );
  }

  if (fechaHasta) {
    condiciones.push(
      "i.fecha <= ?",
    );

    parametros.push(
      fechaHasta,
    );
  }

  if (proveedorId) {
    condiciones.push(
      "i.proveedor_id = ?",
    );

    parametros.push(
      proveedorId,
    );
  }

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const [rows] = await db.query(
    `
      SELECT
        i.id,
        i.proveedor_id,
        i.numero_comprobante,
        i.fecha,
        i.total,
        i.observaciones,
        i.usuario_id,
        i.created_at,

        p.nombre AS proveedor,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido,

        COUNT(idet.id) AS cantidad_items,

        COALESCE(
          SUM(idet.cantidad),
          0
        ) AS cantidad_unidades

      FROM ingresos i

      INNER JOIN proveedores p
        ON p.id = i.proveedor_id

      LEFT JOIN usuarios u
        ON u.id = i.usuario_id

      LEFT JOIN ingresos_detalle idet
        ON idet.ingreso_id = i.id

      ${where}

      GROUP BY
        i.id,
        i.proveedor_id,
        i.numero_comprobante,
        i.fecha,
        i.total,
        i.observaciones,
        i.usuario_id,
        i.created_at,
        p.nombre,
        u.nombre,
        u.apellido

      ORDER BY
        i.fecha DESC,
        i.id DESC
    `,
    parametros,
  );

  return rows.map((fila) => ({
    ...fila,

    total: Number(
      fila.total ?? 0,
    ),

    cantidad_items: Number(
      fila.cantidad_items ?? 0,
    ),

    cantidad_unidades: Number(
      fila.cantidad_unidades ?? 0,
    ),
  }));
};

const crearIngreso = async (data) => {
  const {
    proveedor_id,
    numero_comprobante = null,
    fecha,
    observaciones = null,
    usuario_id,
    productos,
  } = data;

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    if (!usuario_id) {
      const error = new Error(
        "No se pudo identificar al usuario de la sesión.",
      );

      error.code =
        "USUARIO_NO_ENCONTRADO";

      throw error;
    }

    const [usuarios] =
      await connection.query(
        `
          SELECT
            id

          FROM usuarios

          WHERE id = ?
            AND activo = TRUE

          LIMIT 1
        `,
        [usuario_id],
      );

    if (usuarios.length === 0) {
      const error = new Error(
        "El usuario de la sesión no existe o está inactivo.",
      );

      error.code =
        "USUARIO_NO_ENCONTRADO";

      throw error;
    }

    const [proveedores] =
      await connection.query(
        `
          SELECT
            id

          FROM proveedores

          WHERE id = ?

          LIMIT 1
        `,
        [proveedor_id],
      );

    if (proveedores.length === 0) {
      const error = new Error(
        "El proveedor seleccionado no existe.",
      );

      error.code =
        "PROVEEDOR_NO_ENCONTRADO";

      throw error;
    }

    let totalIngreso = 0;

    const productosProcesados =
      [];

    for (const item of productos) {
      const varianteId = Number(
        item.variante_id,
      );

      const cantidad = Number(
        item.cantidad,
      );

      const precioCosto = Number(
        item.precio_costo,
      );

      const [variantes] =
        await connection.query(
          `
            SELECT
              pv.id,
              pv.stock_actual,
              p.nombre AS producto_nombre

            FROM producto_variantes pv

            INNER JOIN productos p
              ON p.id = pv.producto_id

            WHERE pv.id = ?

            FOR UPDATE
          `,
          [varianteId],
        );

      if (variantes.length === 0) {
        const error = new Error(
          `La variante ${varianteId} no existe.`,
        );

        error.code =
          "VARIANTE_NO_ENCONTRADA";

        throw error;
      }

      const variante =
        variantes[0];

      const stockAnterior =
        Number(
          variante.stock_actual ??
            0,
        );

      const stockNuevo =
        stockAnterior + cantidad;

      const subtotal =
        cantidad * precioCosto;

      totalIngreso += subtotal;

      productosProcesados.push({
        varianteId,
        cantidad,
        precioCosto,
        subtotal,
        stockAnterior,
        stockNuevo,
        productoNombre:
          variante.producto_nombre,
      });
    }

    const [ingresoResult] =
      await connection.query(
        `
          INSERT INTO ingresos
          (
            proveedor_id,
            numero_comprobante,
            fecha,
            total,
            observaciones,
            usuario_id
          )

          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          proveedor_id,
          numero_comprobante,
          fecha,
          totalIngreso,
          observaciones,
          usuario_id,
        ],
      );

    const ingresoId =
      ingresoResult.insertId;

    for (
      const item of productosProcesados
    ) {
      await connection.query(
        `
          INSERT INTO ingresos_detalle
          (
            ingreso_id,
            variante_id,
            cantidad,
            precio_costo,
            subtotal
          )

          VALUES (?, ?, ?, ?, ?)
        `,
        [
          ingresoId,
          item.varianteId,
          item.cantidad,
          item.precioCosto,
          item.subtotal,
        ],
      );

      await connection.query(
        `
          UPDATE producto_variantes

          SET
            stock_actual = ?,
            precio_costo = ?

          WHERE id = ?
        `,
        [
          item.stockNuevo,
          item.precioCosto,
          item.varianteId,
        ],
      );

      const referencia =
        `Ingreso #${ingresoId}`;

      const observacionMovimiento =
        numero_comprobante
          ? `Comprobante: ${numero_comprobante}`
          : observaciones;

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
          item.varianteId,
          "INGRESO",
          item.cantidad,
          item.stockAnterior,
          item.stockNuevo,
          referencia,
          usuario_id,
          observacionMovimiento,
        ],
      );
    }

    await connection.commit();

    return await obtenerIngresoPorId(
      ingresoId,
    );
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerIngresos,
  obtenerIngresoPorId,
  crearIngreso,
};