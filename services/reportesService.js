const db = require("../config/db");

function construirFiltrosFechas({
  fechaDesde,
  fechaHasta,
  campoFecha,
}) {
  const condiciones = [];
  const parametros = [];

  if (fechaDesde) {
    condiciones.push(
      `DATE(${campoFecha}) >= ?`,
    );

    parametros.push(fechaDesde);
  }

  if (fechaHasta) {
    condiciones.push(
      `DATE(${campoFecha}) <= ?`,
    );

    parametros.push(fechaHasta);
  }

  return {
    condiciones,
    parametros,
  };
}

const obtenerResumenVentas = async ({
  fechaDesde = null,
  fechaHasta = null,
} = {}) => {
  const {
    condiciones,
    parametros,
  } = construirFiltrosFechas({
    fechaDesde,
    fechaHasta,
    campoFecha: "v.fecha",
  });

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const [rows] = await db.query(
    `
      SELECT
        COUNT(DISTINCT v.id) AS cantidad_ventas,

        COALESCE(
          SUM(v.subtotal),
          0
        ) AS subtotal_ventas,

        COALESCE(
          SUM(v.descuento),
          0
        ) AS descuentos,

        COALESCE(
          SUM(v.total),
          0
        ) AS total_ventas,

        COALESCE(
          SUM(vd.cantidad),
          0
        ) AS unidades_vendidas,

        COALESCE(
          SUM(
            vd.cantidad *
            pv.precio_costo
          ),
          0
        ) AS costo_estimado,

        COALESCE(
          SUM(vd.subtotal) -
          SUM(
            vd.cantidad *
            pv.precio_costo
          ),
          0
        ) AS ganancia_estimada

      FROM ventas v

      LEFT JOIN ventas_detalle vd
        ON vd.venta_id = v.id

      LEFT JOIN producto_variantes pv
        ON pv.id = vd.variante_id

      ${where}
    `,
    parametros,
  );

  const resultado = rows[0] ?? {};

  return {
    cantidad_ventas: Number(
      resultado.cantidad_ventas ?? 0,
    ),

    subtotal_ventas: Number(
      resultado.subtotal_ventas ?? 0,
    ),

    descuentos: Number(
      resultado.descuentos ?? 0,
    ),

    total_ventas: Number(
      resultado.total_ventas ?? 0,
    ),

    unidades_vendidas: Number(
      resultado.unidades_vendidas ?? 0,
    ),

    costo_estimado: Number(
      resultado.costo_estimado ?? 0,
    ),

    ganancia_estimada: Number(
      resultado.ganancia_estimada ?? 0,
    ),
  };
};

const obtenerVentasPorDia = async ({
  fechaDesde = null,
  fechaHasta = null,
} = {}) => {
  const {
    condiciones,
    parametros,
  } = construirFiltrosFechas({
    fechaDesde,
    fechaHasta,
    campoFecha: "v.fecha",
  });

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const [rows] = await db.query(
    `
      SELECT
        DATE(v.fecha) AS fecha,

        COUNT(DISTINCT v.id) AS cantidad_ventas,

        COALESCE(
          SUM(vd.cantidad),
          0
        ) AS unidades_vendidas,

        COALESCE(
          SUM(v.total),
          0
        ) AS total

      FROM ventas v

      LEFT JOIN ventas_detalle vd
        ON vd.venta_id = v.id

      ${where}

      GROUP BY DATE(v.fecha)

      ORDER BY DATE(v.fecha) ASC
    `,
    parametros,
  );

  return rows.map((fila) => ({
    fecha: fila.fecha,

    cantidad_ventas: Number(
      fila.cantidad_ventas ?? 0,
    ),

    unidades_vendidas: Number(
      fila.unidades_vendidas ?? 0,
    ),

    total: Number(
      fila.total ?? 0,
    ),
  }));
};

const obtenerProductosMasVendidos = async ({
  fechaDesde = null,
  fechaHasta = null,
  limite = 10,
} = {}) => {
  const {
    condiciones,
    parametros,
  } = construirFiltrosFechas({
    fechaDesde,
    fechaHasta,
    campoFecha: "v.fecha",
  });

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const limiteNormalizado = Math.min(
    Math.max(Number(limite) || 10, 1),
    100,
  );

  const [rows] = await db.query(
    `
      SELECT
        p.id AS producto_id,
        p.codigo AS producto_codigo,
        p.nombre AS producto_nombre,

        COALESCE(
          SUM(vd.cantidad),
          0
        ) AS unidades_vendidas,

        COALESCE(
          SUM(vd.subtotal),
          0
        ) AS total_vendido,

        COUNT(
          DISTINCT v.id
        ) AS cantidad_ventas

      FROM ventas_detalle vd

      INNER JOIN ventas v
        ON v.id = vd.venta_id

      INNER JOIN producto_variantes pv
        ON pv.id = vd.variante_id

      INNER JOIN productos p
        ON p.id = pv.producto_id

      ${where}

      GROUP BY
        p.id,
        p.codigo,
        p.nombre

      ORDER BY
        unidades_vendidas DESC,
        total_vendido DESC

      LIMIT ?
    `,
    [
      ...parametros,
      limiteNormalizado,
    ],
  );

  return rows.map((fila) => ({
    producto_id: fila.producto_id,
    producto_codigo:
      fila.producto_codigo,
    producto_nombre:
      fila.producto_nombre,

    unidades_vendidas: Number(
      fila.unidades_vendidas ?? 0,
    ),

    total_vendido: Number(
      fila.total_vendido ?? 0,
    ),

    cantidad_ventas: Number(
      fila.cantidad_ventas ?? 0,
    ),
  }));
};

const obtenerVentasPorMetodoPago = async ({
  fechaDesde = null,
  fechaHasta = null,
} = {}) => {
  const {
    condiciones,
    parametros,
  } = construirFiltrosFechas({
    fechaDesde,
    fechaHasta,
    campoFecha: "v.fecha",
  });

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const [rows] = await db.query(
    `
      SELECT
        v.metodo_pago,

        COUNT(*) AS cantidad_ventas,

        COALESCE(
          SUM(v.total),
          0
        ) AS total

      FROM ventas v

      ${where}

      GROUP BY v.metodo_pago

      ORDER BY total DESC
    `,
    parametros,
  );

  return rows.map((fila) => ({
    metodo_pago: fila.metodo_pago,

    cantidad_ventas: Number(
      fila.cantidad_ventas ?? 0,
    ),

    total: Number(
      fila.total ?? 0,
    ),
  }));
};

const obtenerStockActual = async () => {
  const [rows] = await db.query(
    `
      SELECT
        p.id AS producto_id,
        p.codigo AS producto_codigo,
        p.nombre AS producto_nombre,

        pv.id AS variante_id,
        pv.codigo_barras,
        pv.precio_costo,
        pv.precio_venta,
        pv.stock_actual,
        pv.stock_minimo,

        c.nombre AS color,
        t.nombre AS talle,

        (
          pv.stock_actual *
          pv.precio_costo
        ) AS valor_costo,

        (
          pv.stock_actual *
          pv.precio_venta
        ) AS valor_venta

      FROM producto_variantes pv

      INNER JOIN productos p
        ON p.id = pv.producto_id

      LEFT JOIN colores c
        ON c.id = pv.color_id

      LEFT JOIN talles t
        ON t.id = pv.talle_id

      WHERE p.activo = TRUE

      ORDER BY
        p.nombre ASC,
        c.nombre ASC,
        t.nombre ASC
    `,
  );

  return rows.map((fila) => ({
    ...fila,

    precio_costo: Number(
      fila.precio_costo ?? 0,
    ),

    precio_venta: Number(
      fila.precio_venta ?? 0,
    ),

    stock_actual: Number(
      fila.stock_actual ?? 0,
    ),

    stock_minimo: Number(
      fila.stock_minimo ?? 0,
    ),

    valor_costo: Number(
      fila.valor_costo ?? 0,
    ),

    valor_venta: Number(
      fila.valor_venta ?? 0,
    ),
  }));
};

const obtenerReporteGeneral = async ({
  fechaDesde = null,
  fechaHasta = null,
} = {}) => {
  const [
    resumen,
    ventasPorDia,
    productosMasVendidos,
    ventasPorMetodoPago,
  ] = await Promise.all([
    obtenerResumenVentas({
      fechaDesde,
      fechaHasta,
    }),

    obtenerVentasPorDia({
      fechaDesde,
      fechaHasta,
    }),

    obtenerProductosMasVendidos({
      fechaDesde,
      fechaHasta,
      limite: 10,
    }),

    obtenerVentasPorMetodoPago({
      fechaDesde,
      fechaHasta,
    }),
  ]);

  return {
    periodo: {
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    },

    resumen,
    ventas_por_dia: ventasPorDia,

    productos_mas_vendidos:
      productosMasVendidos,

    ventas_por_metodo_pago:
      ventasPorMetodoPago,
  };
};

module.exports = {
  obtenerResumenVentas,
  obtenerVentasPorDia,
  obtenerProductosMasVendidos,
  obtenerVentasPorMetodoPago,
  obtenerStockActual,
  obtenerReporteGeneral,
};