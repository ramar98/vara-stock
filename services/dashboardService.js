const db = require(
  "../config/db",
);

/*
 * =====================================
 * RESUMEN DASHBOARD
 * =====================================
 */

const obtenerResumen =
  async ({
    empresaId,
    usuarioId = null,
    rol = "",
  } = {}) => {
    const rolNormalizado =
      String(rol)
        .trim()
        .toUpperCase();

    const esVendedor =
      rolNormalizado ===
      "VENDEDOR";

    /*
     * =================================
     * VENTAS DE HOY
     * =================================
     */

    const condicionesVentasHoy = [
      "v.empresa_id = ?",
      "DATE(v.fecha) = CURRENT_DATE",
    ];

    const parametrosVentasHoy = [
      empresaId,
    ];

    if (esVendedor) {
      condicionesVentasHoy.push(
        "v.usuario_id = ?",
      );

      parametrosVentasHoy.push(
        usuarioId,
      );
    }

    /*
     * =================================
     * VENTAS DEL MES
     * =================================
     */

    const condicionesVentasMes = [
      "v.empresa_id = ?",
      "YEAR(v.fecha) = YEAR(CURRENT_DATE)",
      "MONTH(v.fecha) = MONTH(CURRENT_DATE)",
    ];

    const parametrosVentasMes = [
      empresaId,
    ];

    if (esVendedor) {
      condicionesVentasMes.push(
        "v.usuario_id = ?",
      );

      parametrosVentasMes.push(
        usuarioId,
      );
    }

    /*
     * =================================
     * MOVIMIENTOS
     * =================================
     */

    const condicionesMovimientos = [
      "p.empresa_id = ?",
    ];

    const parametrosMovimientos = [
      empresaId,
    ];

    if (esVendedor) {
      condicionesMovimientos.push(
        "ms.usuario_id = ?",
      );

      parametrosMovimientos.push(
        usuarioId,
      );
    }

    /*
     * =================================
     * VENTAS RECIENTES
     * =================================
     */

    const condicionesVentasRecientes = [
      "v.empresa_id = ?",
    ];

    const parametrosVentasRecientes = [
      empresaId,
    ];

    if (esVendedor) {
      condicionesVentasRecientes.push(
        "v.usuario_id = ?",
      );

      parametrosVentasRecientes.push(
        usuarioId,
      );
    }

    const [
      productosResult,
      stockResult,
      ventasHoyResult,
      ventasMesResult,
      comprasMesResult,
      stockBajoResult,
      movimientosResult,
      ventasRecientesResult,
    ] =
      await Promise.all([
        /*
         * =============================
         * PRODUCTOS ACTIVOS
         * =============================
         */

        db.query(
          `
            SELECT
              COUNT(*) AS cantidad

            FROM productos p

            WHERE
              p.empresa_id = ?
              AND p.activo = TRUE
          `,
          [
            empresaId,
          ],
        ),

        /*
         * =============================
         * UNIDADES EN STOCK
         * =============================
         *
         * producto_variantes no tiene
         * empresa_id, por eso unimos con
         * productos.
         */

        db.query(
          `
            SELECT
              COALESCE(
                SUM(
                  pv.stock_actual
                ),
                0
              ) AS cantidad

            FROM producto_variantes pv

            INNER JOIN productos p
              ON p.id =
                pv.producto_id

            WHERE
              p.empresa_id = ?
              AND p.activo = TRUE
          `,
          [
            empresaId,
          ],
        ),

        /*
         * =============================
         * VENTAS DE HOY
         * =============================
         */

        db.query(
          `
            SELECT
              COALESCE(
                SUM(v.total),
                0
              ) AS total

            FROM ventas v

            WHERE
              ${condicionesVentasHoy.join(
                " AND ",
              )}
          `,
          parametrosVentasHoy,
        ),

        /*
         * =============================
         * VENTAS DEL MES
         * =============================
         */

        db.query(
          `
            SELECT
              COALESCE(
                SUM(v.total),
                0
              ) AS total

            FROM ventas v

            WHERE
              ${condicionesVentasMes.join(
                " AND ",
              )}
          `,
          parametrosVentasMes,
        ),

        /*
         * =============================
         * COMPRAS DEL MES
         * =============================
         *
         * Se muestran las compras de la
         * empresa completa.
         *
         * No filtramos por vendedor porque
         * conceptualmente son compras del
         * negocio, no ventas personales.
         */

        db.query(
          `
            SELECT
              COALESCE(
                SUM(i.total),
                0
              ) AS total

            FROM ingresos i

            WHERE
              i.empresa_id = ?

              AND YEAR(i.fecha) =
                  YEAR(CURRENT_DATE)

              AND MONTH(i.fecha) =
                  MONTH(CURRENT_DATE)
          `,
          [
            empresaId,
          ],
        ),

        /*
         * =============================
         * STOCK BAJO
         * =============================
         */

        db.query(
          `
            SELECT
              COUNT(*) AS cantidad

            FROM producto_variantes pv

            INNER JOIN productos p
              ON p.id =
                pv.producto_id

            WHERE
              p.empresa_id = ?
              AND p.activo = TRUE

              AND pv.stock_actual <=
                  pv.stock_minimo
          `,
          [
            empresaId,
          ],
        ),

        /*
         * =============================
         * ÚLTIMOS MOVIMIENTOS
         * =============================
         */

        db.query(
          `
            SELECT
              ms.id,
              ms.tipo,
              ms.cantidad,
              ms.stock_anterior,
              ms.stock_nuevo,
              ms.referencia,
              ms.observacion,
              ms.created_at,
              ms.usuario_id,

              pv.id AS variante_id,
              pv.codigo_barras,

              p.id AS producto_id,
              p.codigo AS producto_codigo,
              p.nombre AS producto_nombre,
              p.usa_variantes,

              c.nombre AS color,
              t.nombre AS talle,

              u.nombre AS usuario_nombre,
              u.apellido AS usuario_apellido

            FROM movimientos_stock ms

            INNER JOIN producto_variantes pv
              ON pv.id =
                ms.variante_id

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

            LEFT JOIN usuarios u
              ON u.id =
                ms.usuario_id
             AND u.empresa_id =
                p.empresa_id

            WHERE
              ${condicionesMovimientos.join(
                " AND ",
              )}

            ORDER BY
              ms.created_at DESC,
              ms.id DESC

            LIMIT 10
          `,
          parametrosMovimientos,
        ),

        /*
         * =============================
         * ÚLTIMAS VENTAS
         * =============================
         */

        db.query(
          `
            SELECT
              v.id,
              v.fecha,
              v.total,
              v.metodo_pago,
              v.usuario_id,

              COALESCE(
                c.nombre,
                'Consumidor final'
              ) AS cliente,

              u.nombre AS usuario_nombre,
              u.apellido AS usuario_apellido,

              COUNT(
                vd.id
              ) AS cantidad_items,

              COALESCE(
                SUM(
                  vd.cantidad
                ),
                0
              ) AS cantidad_unidades

            FROM ventas v

            LEFT JOIN clientes c
              ON c.id =
                v.cliente_id
             AND c.empresa_id =
                v.empresa_id

            LEFT JOIN usuarios u
              ON u.id =
                v.usuario_id
             AND u.empresa_id =
                v.empresa_id

            LEFT JOIN ventas_detalle vd
              ON vd.venta_id =
                v.id

            WHERE
              ${condicionesVentasRecientes.join(
                " AND ",
              )}

            GROUP BY
              v.id,
              v.fecha,
              v.total,
              v.metodo_pago,
              v.usuario_id,
              c.nombre,
              u.nombre,
              u.apellido

            ORDER BY
              v.fecha DESC,
              v.id DESC

            LIMIT 10
          `,
          parametrosVentasRecientes,
        ),
      ]);

    /*
     * =================================
     * NORMALIZAR RESULTADOS
     * =================================
     */

    const productos =
      Number(
        productosResult?.[0]?.[0]
          ?.cantidad ??
          0,
      );

    const unidadesStock =
      Number(
        stockResult?.[0]?.[0]
          ?.cantidad ??
          0,
      );

    const ventasHoy =
      Number(
        ventasHoyResult?.[0]?.[0]
          ?.total ??
          0,
      );

    const ventasMes =
      Number(
        ventasMesResult?.[0]?.[0]
          ?.total ??
          0,
      );

    const comprasMes =
      Number(
        comprasMesResult?.[0]?.[0]
          ?.total ??
          0,
      );

    const stockBajo =
      Number(
        stockBajoResult?.[0]?.[0]
          ?.cantidad ??
          0,
      );

    const gananciaBrutaEstimada =
      ventasMes -
      comprasMes;

    return {
      productos,

      unidades_stock:
        unidadesStock,

      ventas_hoy:
        ventasHoy,

      ventas_mes:
        ventasMes,

      compras_mes:
        comprasMes,

      ganancia_bruta_estimada:
        gananciaBrutaEstimada,

      stock_bajo:
        stockBajo,

      ultimos_movimientos:
        movimientosResult?.[0] ??
        [],

      ultimas_ventas:
        ventasRecientesResult?.[0] ??
        [],
    };
  };

/*
 * =====================================
 * VENTAS POR DÍA
 * =====================================
 */

const obtenerVentasPorDia =
  async (
    dias = 7,
    {
      empresaId,
      usuarioId = null,
      rol = "",
    } = {},
  ) => {
    const cantidadDias =
      Math.min(
        Math.max(
          Number(dias) ||
            7,
          1,
        ),
        90,
      );

    const rolNormalizado =
      String(rol)
        .trim()
        .toUpperCase();

    const esVendedor =
      rolNormalizado ===
      "VENDEDOR";

    const condiciones = [
      `
        v.empresa_id = ?
      `,
      `
        v.fecha >=
        DATE_SUB(
          CURRENT_DATE,
          INTERVAL ? DAY
        )
      `,
    ];

    const parametros = [
      empresaId,
      cantidadDias - 1,
    ];

    if (esVendedor) {
      condiciones.push(
        "v.usuario_id = ?",
      );

      parametros.push(
        usuarioId,
      );
    }

    const [rows] =
      await db.query(
        `
          SELECT
            DATE(
              v.fecha
            ) AS fecha,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
              SUM(v.total),
              0
            ) AS total

          FROM ventas v

          WHERE
            ${condiciones.join(
              " AND ",
            )}

          GROUP BY
            DATE(v.fecha)

          ORDER BY
            DATE(v.fecha) ASC
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
 * PRODUCTOS CON STOCK BAJO
 * =====================================
 */

const obtenerProductosStockBajo =
  async (
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            pv.id AS variante_id,
            pv.producto_id,
            pv.codigo_barras,
            pv.stock_actual,
            pv.stock_minimo,

            p.codigo AS producto_codigo,
            p.nombre AS producto_nombre,
            p.usa_variantes,

            c.nombre AS color,
            t.nombre AS talle

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

            AND pv.stock_actual <=
                pv.stock_minimo

          ORDER BY
            pv.stock_actual ASC,
            p.nombre ASC,
            c.nombre ASC,
            t.nombre ASC
        `,
        [
          empresaId,
        ],
      );

    return rows;
  };

module.exports = {
  obtenerResumen,
  obtenerVentasPorDia,
  obtenerProductosStockBajo,
};