const db = require("../config/db");

const obtenerVentaPorId = async (id) => {
  const [ventas] = await db.query(
    `
      SELECT
        v.id,
        v.cliente_id,
        v.fecha,
        v.subtotal,
        v.descuento,
        v.total,
        v.metodo_pago,
        v.usuario_id,

        c.nombre AS cliente,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido

      FROM ventas v

      LEFT JOIN clientes c
        ON c.id = v.cliente_id

      LEFT JOIN usuarios u
        ON u.id = v.usuario_id

      WHERE v.id = ?

      LIMIT 1
    `,
    [id],
  );

  if (ventas.length === 0) {
    return null;
  }

  const [detalles] = await db.query(
    `
      SELECT
        vd.id,
        vd.venta_id,
        vd.variante_id,
        vd.cantidad,
        vd.precio_unitario,
        vd.subtotal,

        pv.producto_id,
        pv.codigo_barras,

        p.codigo AS producto_codigo,
        p.nombre AS producto_nombre,

        c.nombre AS color,
        t.nombre AS talle

      FROM ventas_detalle vd

      INNER JOIN producto_variantes pv
        ON pv.id = vd.variante_id

      INNER JOIN productos p
        ON p.id = pv.producto_id

      LEFT JOIN colores c
        ON c.id = pv.color_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      WHERE vd.venta_id = ?

      ORDER BY
        p.nombre ASC,
        c.nombre ASC,
        t.nombre ASC
    `,
    [id],
  );

  return {
    ...ventas[0],
    productos: detalles,
  };
};

const obtenerVentas = async ({
  fechaDesde = null,
  fechaHasta = null,
  clienteId = null,
  metodoPago = null,
} = {}) => {
  const condiciones = [];
  const parametros = [];

  if (fechaDesde) {
    condiciones.push("DATE(v.fecha) >= ?");
    parametros.push(fechaDesde);
  }

  if (fechaHasta) {
    condiciones.push("DATE(v.fecha) <= ?");
    parametros.push(fechaHasta);
  }

  if (clienteId) {
    condiciones.push("v.cliente_id = ?");
    parametros.push(clienteId);
  }

  if (metodoPago) {
    condiciones.push("v.metodo_pago = ?");
    parametros.push(metodoPago);
  }

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const [rows] = await db.query(
    `
      SELECT
        v.id,
        v.cliente_id,
        v.fecha,
        v.subtotal,
        v.descuento,
        v.total,
        v.metodo_pago,
        v.usuario_id,

        c.nombre AS cliente,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido,

        COUNT(vd.id) AS cantidad_items,

        COALESCE(
          SUM(vd.cantidad),
          0
        ) AS cantidad_unidades

      FROM ventas v

      LEFT JOIN clientes c
        ON c.id = v.cliente_id

      LEFT JOIN usuarios u
        ON u.id = v.usuario_id

      LEFT JOIN ventas_detalle vd
        ON vd.venta_id = v.id

      ${where}

      GROUP BY
        v.id,
        v.cliente_id,
        v.fecha,
        v.subtotal,
        v.descuento,
        v.total,
        v.metodo_pago,
        v.usuario_id,
        c.nombre,
        u.nombre,
        u.apellido

      ORDER BY
        v.fecha DESC,
        v.id DESC
    `,
    parametros,
  );

  return rows;
};

const crearVenta = async (data) => {
  const {
    cliente_id = null,
    descuento = 0,
    metodo_pago,
    usuario_id = null,
    productos,
  } = data;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    if (cliente_id) {
      const [clientes] = await connection.query(
        `
          SELECT id
          FROM clientes
          WHERE id = ?
          LIMIT 1
        `,
        [cliente_id],
      );

      if (clientes.length === 0) {
        const error = new Error(
          "El cliente seleccionado no existe.",
        );

        error.code = "CLIENTE_NO_ENCONTRADO";
        throw error;
      }
    }

    if (usuario_id) {
      const [usuarios] = await connection.query(
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

        error.code = "USUARIO_NO_ENCONTRADO";
        throw error;
      }
    }

    let subtotalVenta = 0;

    const productosProcesados = [];

    for (const item of productos) {
      const varianteId = Number(
        item.variante_id,
      );

      const cantidad = Number(
        item.cantidad,
      );

      const precioUnitario = Number(
        item.precio_unitario,
      );

      const [variantes] =
        await connection.query(
          `
            SELECT
              id,
              stock_actual,
              precio_venta

            FROM producto_variantes

            WHERE id = ?

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

      const variante = variantes[0];

      const stockAnterior = Number(
        variante.stock_actual ?? 0,
      );

      if (stockAnterior < cantidad) {
        const error = new Error(
          `Stock insuficiente para la variante ${varianteId}. Disponible: ${stockAnterior}.`,
        );

        error.code = "STOCK_INSUFICIENTE";
        error.varianteId = varianteId;
        error.stockDisponible = stockAnterior;

        throw error;
      }

      const precioFinal =
        Number.isFinite(precioUnitario) &&
        precioUnitario >= 0
          ? precioUnitario
          : Number(
              variante.precio_venta ?? 0,
            );

      const subtotal =
        cantidad * precioFinal;

      const stockNuevo =
        stockAnterior - cantidad;

      subtotalVenta += subtotal;

      productosProcesados.push({
        varianteId,
        cantidad,
        precioUnitario: precioFinal,
        subtotal,
        stockAnterior,
        stockNuevo,
      });
    }

    const descuentoNormalizado =
      Number(descuento ?? 0);

    const totalVenta = Math.max(
      subtotalVenta - descuentoNormalizado,
      0,
    );

    const [ventaResult] =
      await connection.query(
        `
          INSERT INTO ventas
          (
            cliente_id,
            fecha,
            subtotal,
            descuento,
            total,
            metodo_pago,
            usuario_id
          )

          VALUES (
            ?,
            CURRENT_TIMESTAMP,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          cliente_id,
          subtotalVenta,
          descuentoNormalizado,
          totalVenta,
          metodo_pago,
          usuario_id,
        ],
      );

    const ventaId =
      ventaResult.insertId;

    for (const item of productosProcesados) {
      await connection.query(
        `
          INSERT INTO ventas_detalle
          (
            venta_id,
            variante_id,
            cantidad,
            precio_unitario,
            subtotal
          )

          VALUES (?, ?, ?, ?, ?)
        `,
        [
          ventaId,
          item.varianteId,
          item.cantidad,
          item.precioUnitario,
          item.subtotal,
        ],
      );

      await connection.query(
        `
          UPDATE producto_variantes

          SET stock_actual = ?

          WHERE id = ?
        `,
        [
          item.stockNuevo,
          item.varianteId,
        ],
      );

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
          "VENTA",
          item.cantidad,
          item.stockAnterior,
          item.stockNuevo,
          `Venta #${ventaId}`,
          usuario_id,
          `Método de pago: ${metodo_pago}`,
        ],
      );
    }

    await connection.commit();

    return await obtenerVentaPorId(
      ventaId,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerVentas,
  obtenerVentaPorId,
  crearVenta,
};