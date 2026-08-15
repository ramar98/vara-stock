const db = require("../config/db");

const obtenerVentaPorId = async (
  id,
  empresaId,
) => {
  const [ventas] = await db.query(
    `
      SELECT
        v.id,
        v.empresa_id,
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
       AND c.empresa_id = v.empresa_id

      LEFT JOIN usuarios u
        ON u.id = v.usuario_id
       AND u.empresa_id = v.empresa_id

      WHERE
        v.id = ?
        AND v.empresa_id = ?

      LIMIT 1
    `,
    [
      id,
      empresaId,
    ],
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

      INNER JOIN ventas v
        ON v.id = vd.venta_id

      INNER JOIN producto_variantes pv
        ON pv.id = vd.variante_id

      INNER JOIN productos p
        ON p.id = pv.producto_id

      LEFT JOIN colores c
        ON c.id = pv.color_id
       AND c.empresa_id = p.empresa_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id
       AND t.empresa_id = p.empresa_id

      WHERE
        vd.venta_id = ?
        AND v.empresa_id = ?
        AND p.empresa_id = ?

      ORDER BY
        p.nombre ASC,
        c.nombre ASC,
        t.nombre ASC
    `,
    [
      id,
      empresaId,
      empresaId,
    ],
  );

  return {
    ...ventas[0],
    productos: detalles,
  };
};

const obtenerVentas = async ({
  empresaId,
  fechaDesde = null,
  fechaHasta = null,
  clienteId = null,
  metodoPago = null,
} = {}) => {
  const condiciones = [
    "v.empresa_id = ?",
  ];

  const parametros = [
    empresaId,
  ];

  if (fechaDesde) {
    condiciones.push(
      "DATE(v.fecha) >= ?",
    );

    parametros.push(
      fechaDesde,
    );
  }

  if (fechaHasta) {
    condiciones.push(
      "DATE(v.fecha) <= ?",
    );

    parametros.push(
      fechaHasta,
    );
  }

  if (clienteId) {
    condiciones.push(
      "v.cliente_id = ?",
    );

    parametros.push(
      clienteId,
    );
  }

  if (metodoPago) {
    condiciones.push(
      "v.metodo_pago = ?",
    );

    parametros.push(
      metodoPago,
    );
  }

  const where = `
    WHERE ${condiciones.join(" AND ")}
  `;

  const [rows] = await db.query(
    `
      SELECT
        v.id,
        v.empresa_id,
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
       AND c.empresa_id = v.empresa_id

      LEFT JOIN usuarios u
        ON u.id = v.usuario_id
       AND u.empresa_id = v.empresa_id

      LEFT JOIN ventas_detalle vd
        ON vd.venta_id = v.id

      ${where}

      GROUP BY
        v.id,
        v.empresa_id,
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
    empresa_id,
    cliente_id = null,
    descuento = 0,
    metodo_pago,
    usuario_id = null,
    productos,
  } = data;

  const empresaId = Number(
    empresa_id,
  );

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

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
     * CLIENTE
     */

    if (cliente_id) {
      const [clientes] =
        await connection.query(
          `
            SELECT
              id

            FROM clientes

            WHERE
              id = ?
              AND empresa_id = ?

            LIMIT 1
          `,
          [
            cliente_id,
            empresaId,
          ],
        );

      if (
        clientes.length === 0
      ) {
        const error = new Error(
          "El cliente seleccionado no existe o no pertenece a la empresa.",
        );

        error.code =
          "CLIENTE_NO_ENCONTRADO";

        throw error;
      }
    }

    /*
     * USUARIO
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
          "El usuario seleccionado no existe, está inactivo o no pertenece a la empresa.",
        );

        error.code =
          "USUARIO_NO_ENCONTRADO";

        throw error;
      }
    }

    let subtotalVenta = 0;

    const productosProcesados =
      [];

    /*
     * VARIANTES
     */

    for (
      const item of productos
    ) {
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
              pv.id,
              pv.producto_id,
              pv.stock_actual,
              pv.precio_venta,

              p.nombre AS producto_nombre

            FROM producto_variantes pv

            INNER JOIN productos p
              ON p.id = pv.producto_id

            WHERE
              pv.id = ?
              AND p.empresa_id = ?
              AND p.activo = TRUE

            FOR UPDATE
          `,
          [
            varianteId,
            empresaId,
          ],
        );

      if (
        variantes.length === 0
      ) {
        const error = new Error(
          `La variante ${varianteId} no existe o no pertenece a la empresa.`,
        );

        error.code =
          "VARIANTE_NO_ENCONTRADA";

        throw error;
      }

      const variante =
        variantes[0];

      const stockAnterior = Number(
        variante.stock_actual ?? 0,
      );

      if (
        stockAnterior < cantidad
      ) {
        const error = new Error(
          `Stock insuficiente para la variante ${varianteId}. Disponible: ${stockAnterior}.`,
        );

        error.code =
          "STOCK_INSUFICIENTE";

        error.varianteId =
          varianteId;

        error.stockDisponible =
          stockAnterior;

        throw error;
      }

      const precioFinal =
        Number.isFinite(
          precioUnitario,
        ) &&
        precioUnitario >= 0
          ? precioUnitario
          : Number(
              variante.precio_venta ??
                0,
            );

      const subtotal =
        cantidad *
        precioFinal;

      const stockNuevo =
        stockAnterior -
        cantidad;

      subtotalVenta +=
        subtotal;

      productosProcesados.push({
        varianteId,
        productoId:
          variante.producto_id,
        cantidad,
        precioUnitario:
          precioFinal,
        subtotal,
        stockAnterior,
        stockNuevo,
      });
    }

    const descuentoNormalizado =
      Number(
        descuento ?? 0,
      );

    const totalVenta = Math.max(
      subtotalVenta -
        descuentoNormalizado,
      0,
    );

    /*
     * INSERT VENTA
     */

    const [ventaResult] =
      await connection.query(
        `
          INSERT INTO ventas
          (
            empresa_id,
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
          empresaId,
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

    /*
     * DETALLE + STOCK
     */

    for (
      const item
      of productosProcesados
    ) {
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

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          ventaId,
          item.varianteId,
          item.cantidad,
          item.precioUnitario,
          item.subtotal,
        ],
      );

      /*
       * producto_variantes no tiene
       * empresa_id.
       *
       * Por eso protegemos el UPDATE
       * mediante EXISTS contra productos.
       */

      const [stockResult] =
        await connection.query(
          `
            UPDATE producto_variantes pv

            SET
              pv.stock_actual = ?

            WHERE
              pv.id = ?

              AND EXISTS (
                SELECT 1

                FROM productos p

                WHERE
                  p.id = pv.producto_id
                  AND p.empresa_id = ?
                  AND p.activo = TRUE
              )
          `,
          [
            item.stockNuevo,
            item.varianteId,
            empresaId,
          ],
        );

      if (
        stockResult.affectedRows ===
        0
      ) {
        const error = new Error(
          `No se pudo actualizar la variante ${item.varianteId}.`,
        );

        error.code =
          "VARIANTE_NO_ENCONTRADA";

        throw error;
      }

      /*
       * MOVIMIENTO DE STOCK
       */

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
  obtenerVentas,
  obtenerVentaPorId,
  crearVenta,
};