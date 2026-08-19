const db = require(
  "../config/db",
);

/*
 * =====================================
 * FILTROS DE FECHA
 * =====================================
 */

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

    parametros.push(
      fechaDesde,
    );
  }

  if (fechaHasta) {
    condiciones.push(
      `DATE(${campoFecha}) <= ?`,
    );

    parametros.push(
      fechaHasta,
    );
  }

  return {
    condiciones,
    parametros,
  };
}

/*
 * =====================================
 * RESUMEN DE VENTAS
 * =====================================
 */

const obtenerResumenVentas =
  async ({
    empresaId,
    fechaDesde = null,
    fechaHasta = null,
  } = {}) => {
    const {
      condiciones,
      parametros,
    } =
      construirFiltrosFechas({
        fechaDesde,
        fechaHasta,
        campoFecha:
          "v.fecha",
      });

    /*
     * Empresa obligatoria.
     */

    condiciones.unshift(
      "v.empresa_id = ?",
    );

    parametros.unshift(
      empresaId,
    );

    const where = `
      WHERE ${condiciones.join(
        " AND ",
      )}
    `;

    const [rows] =
      await db.query(
        `
          SELECT
            COUNT(
              DISTINCT v.id
            ) AS cantidad_ventas,

            COALESCE(
              SUM(
                DISTINCT
                CASE
                  WHEN vd.id IS NOT NULL
                  THEN 0
                  ELSE 0
                END
              ),
              0
            ) AS dummy,

            COALESCE(
              (
                SELECT
                  SUM(v2.subtotal)

                FROM ventas v2

                WHERE
                  v2.empresa_id = ?

                  ${
                    fechaDesde
                      ? "AND DATE(v2.fecha) >= ?"
                      : ""
                  }

                  ${
                    fechaHasta
                      ? "AND DATE(v2.fecha) <= ?"
                      : ""
                  }
              ),
              0
            ) AS subtotal_ventas,

            COALESCE(
              (
                SELECT
                  SUM(v3.descuento)

                FROM ventas v3

                WHERE
                  v3.empresa_id = ?

                  ${
                    fechaDesde
                      ? "AND DATE(v3.fecha) >= ?"
                      : ""
                  }

                  ${
                    fechaHasta
                      ? "AND DATE(v3.fecha) <= ?"
                      : ""
                  }
              ),
              0
            ) AS descuentos,

            COALESCE(
              (
                SELECT
                  SUM(v4.total)

                FROM ventas v4

                WHERE
                  v4.empresa_id = ?

                  ${
                    fechaDesde
                      ? "AND DATE(v4.fecha) >= ?"
                      : ""
                  }

                  ${
                    fechaHasta
                      ? "AND DATE(v4.fecha) <= ?"
                      : ""
                  }
              ),
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
              SUM(
                vd.subtotal -
                (
                  vd.cantidad *
                  pv.precio_costo
                )
              ),
              0
            ) AS ganancia_estimada

          FROM ventas v

          LEFT JOIN ventas_detalle vd
            ON vd.venta_id =
              v.id

          LEFT JOIN producto_variantes pv
            ON pv.id =
              vd.variante_id

          ${where}
        `,
        [
          empresaId,
          ...(fechaDesde
            ? [fechaDesde]
            : []),
          ...(fechaHasta
            ? [fechaHasta]
            : []),

          empresaId,
          ...(fechaDesde
            ? [fechaDesde]
            : []),
          ...(fechaHasta
            ? [fechaHasta]
            : []),

          empresaId,
          ...(fechaDesde
            ? [fechaDesde]
            : []),
          ...(fechaHasta
            ? [fechaHasta]
            : []),

          ...parametros,
        ],
      );

    const resultado =
      rows[0] ?? {};

    return {
      cantidad_ventas:
        Number(
          resultado.cantidad_ventas ??
            0,
        ),

      subtotal_ventas:
        Number(
          resultado.subtotal_ventas ??
            0,
        ),

      descuentos:
        Number(
          resultado.descuentos ??
            0,
        ),

      total_ventas:
        Number(
          resultado.total_ventas ??
            0,
        ),

      unidades_vendidas:
        Number(
          resultado.unidades_vendidas ??
            0,
        ),

      costo_estimado:
        Number(
          resultado.costo_estimado ??
            0,
        ),

      ganancia_estimada:
        Number(
          resultado.ganancia_estimada ??
            0,
        ),
    };
  };

/*
 * =====================================
 * VENTAS POR DÍA
 * =====================================
 */

const obtenerVentasPorDia =
  async ({
    empresaId,
    fechaDesde = null,
    fechaHasta = null,
  } = {}) => {
    const {
      condiciones,
      parametros,
    } =
      construirFiltrosFechas({
        fechaDesde,
        fechaHasta,
        campoFecha:
          "v.fecha",
      });

    condiciones.unshift(
      "v.empresa_id = ?",
    );

    parametros.unshift(
      empresaId,
    );

    const where = `
      WHERE ${condiciones.join(
        " AND ",
      )}
    `;

    /*
     * Primero agregamos por venta para
     * no multiplicar v.total por la
     * cantidad de líneas de detalle.
     */

    const [rows] =
      await db.query(
        `
          SELECT
            DATE(x.fecha) AS fecha,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
              SUM(
                x.unidades
              ),
              0
            ) AS unidades_vendidas,

            COALESCE(
              SUM(
                x.total
              ),
              0
            ) AS total

          FROM (
            SELECT
              v.id,
              v.fecha,
              v.total,

              COALESCE(
                SUM(
                  vd.cantidad
                ),
                0
              ) AS unidades

            FROM ventas v

            LEFT JOIN ventas_detalle vd
              ON vd.venta_id =
                v.id

            ${where}

            GROUP BY
              v.id,
              v.fecha,
              v.total
          ) x

          GROUP BY
            DATE(x.fecha)

          ORDER BY
            DATE(x.fecha) ASC
        `,
        parametros,
      );

    return rows.map(
      (fila) => ({
        fecha:
          fila.fecha,

        cantidad_ventas:
          Number(
            fila.cantidad_ventas ??
              0,
          ),

        unidades_vendidas:
          Number(
            fila.unidades_vendidas ??
              0,
          ),

        total:
          Number(
            fila.total ??
              0,
          ),
      }),
    );
  };

/*
 * =====================================
 * PRODUCTOS MÁS VENDIDOS
 * =====================================
 */

const obtenerProductosMasVendidos =
  async ({
    empresaId,
    fechaDesde = null,
    fechaHasta = null,
    limite = 10,
  } = {}) => {
    const {
      condiciones,
      parametros,
    } =
      construirFiltrosFechas({
        fechaDesde,
        fechaHasta,
        campoFecha:
          "v.fecha",
      });

    condiciones.unshift(
      "v.empresa_id = ?",
    );

    condiciones.push(
      "p.empresa_id = ?",
    );

    parametros.unshift(
      empresaId,
    );

    parametros.push(
      empresaId,
    );

    const where = `
      WHERE ${condiciones.join(
        " AND ",
      )}
    `;

    const limiteNormalizado =
      Math.min(
        Math.max(
          Number(limite) ||
            10,
          1,
        ),
        100,
      );

    const [rows] =
      await db.query(
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
            ON v.id =
              vd.venta_id

          INNER JOIN producto_variantes pv
            ON pv.id =
              vd.variante_id

          INNER JOIN productos p
            ON p.id =
              pv.producto_id

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

    return rows.map(
      (fila) => ({
        producto_id:
          Number(
            fila.producto_id,
          ),

        producto_codigo:
          fila.producto_codigo,

        producto_nombre:
          fila.producto_nombre,

        unidades_vendidas:
          Number(
            fila.unidades_vendidas ??
              0,
          ),

        total_vendido:
          Number(
            fila.total_vendido ??
              0,
          ),

        cantidad_ventas:
          Number(
            fila.cantidad_ventas ??
              0,
          ),
      }),
    );
  };

/*
 * =====================================
 * VENTAS POR MÉTODO DE PAGO
 * =====================================
 */

const obtenerVentasPorMetodoPago =
  async ({
    empresaId,
    fechaDesde = null,
    fechaHasta = null,
  } = {}) => {
    const {
      condiciones,
      parametros,
    } =
      construirFiltrosFechas({
        fechaDesde,
        fechaHasta,
        campoFecha:
          "v.fecha",
      });

    condiciones.unshift(
      "v.empresa_id = ?",
    );

    parametros.unshift(
      empresaId,
    );

    const where = `
      WHERE ${condiciones.join(
        " AND ",
      )}
    `;

    const [rows] =
      await db.query(
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

          GROUP BY
            v.metodo_pago

          ORDER BY
            total DESC
        `,
        parametros,
      );

    return rows.map(
      (fila) => ({
        metodo_pago:
          fila.metodo_pago,

        cantidad_ventas:
          Number(
            fila.cantidad_ventas ??
              0,
          ),

        total:
          Number(
            fila.total ??
              0,
          ),
      }),
    );
  };

/*
 * =====================================
 * STOCK ACTUAL
 * =====================================
 */

const obtenerStockActual =
  async (
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            p.id AS producto_id,
            p.codigo AS producto_codigo,
            p.nombre AS producto_nombre,
            p.usa_variantes,

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
            ON p.id =
              pv.producto_id

          LEFT JOIN colores c
            ON c.id =
              pv.color_id
           AND c.empresa_id =
              p.empresa_id

          LEFT JOIN talles t
            ON t.id =
              pv.talle_id
           AND t.empresa_id =
              p.empresa_id

          WHERE
            p.empresa_id = ?
            AND p.activo = TRUE

          ORDER BY
            p.nombre ASC,
            c.nombre ASC,
            t.nombre ASC
        `,
        [
          empresaId,
        ],
      );

    return rows.map(
      (fila) => ({
        ...fila,

        producto_id:
          Number(
            fila.producto_id,
          ),

        usa_variantes:
          Number(
            fila.usa_variantes ??
              1,
          ),

        variante_id:
          Number(
            fila.variante_id,
          ),

        precio_costo:
          Number(
            fila.precio_costo ??
              0,
          ),

        precio_venta:
          Number(
            fila.precio_venta ??
              0,
          ),

        stock_actual:
          Number(
            fila.stock_actual ??
              0,
          ),

        stock_minimo:
          Number(
            fila.stock_minimo ??
              0,
          ),

        valor_costo:
          Number(
            fila.valor_costo ??
              0,
          ),

        valor_venta:
          Number(
            fila.valor_venta ??
              0,
          ),
      }),
    );
  };

/*
 * =====================================
 * REPORTE GENERAL
 * =====================================
 */

const obtenerReporteGeneral =
  async ({
    empresaId,
    fechaDesde = null,
    fechaHasta = null,
  } = {}) => {
    const [
      resumen,
      ventasPorDia,
      productosMasVendidos,
      ventasPorMetodoPago,
    ] =
      await Promise.all([
        obtenerResumenVentas({
          empresaId,
          fechaDesde,
          fechaHasta,
        }),

        obtenerVentasPorDia({
          empresaId,
          fechaDesde,
          fechaHasta,
        }),

        obtenerProductosMasVendidos({
          empresaId,
          fechaDesde,
          fechaHasta,
          limite: 10,
        }),

        obtenerVentasPorMetodoPago({
          empresaId,
          fechaDesde,
          fechaHasta,
        }),
      ]);

    return {
      periodo: {
        fecha_desde:
          fechaDesde,

        fecha_hasta:
          fechaHasta,
      },

      resumen,

      ventas_por_dia:
        ventasPorDia,

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