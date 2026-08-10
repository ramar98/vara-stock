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
     * FILTROS POR USUARIO
     * =================================
     */

    const condicionMovimientos =
      esVendedor
        ? "WHERE ms.usuario_id = ?"
        : "";

    const parametrosMovimientos =
      esVendedor
        ? [usuarioId]
        : [];

    const condicionVentas =
      esVendedor
        ? "WHERE v.usuario_id = ?"
        : "";

    const parametrosVentas =
      esVendedor
        ? [usuarioId]
        : [];

    /*
     * Para ventas con condiciones
     * adicionales de fecha usamos AND.
     */

    const condicionVentasHoy =
      esVendedor
        ? `
            WHERE
              DATE(v.fecha) = CURRENT_DATE
              AND v.usuario_id = ?
          `
        : `
            WHERE
              DATE(v.fecha) = CURRENT_DATE
          `;

    const parametrosVentasHoy =
      esVendedor
        ? [usuarioId]
        : [];

    const condicionVentasMes =
      esVendedor
        ? `
            WHERE
              YEAR(v.fecha) =
                YEAR(CURRENT_DATE)

              AND MONTH(v.fecha) =
                MONTH(CURRENT_DATE)

              AND v.usuario_id = ?
          `
        : `
            WHERE
              YEAR(v.fecha) =
                YEAR(CURRENT_DATE)

              AND MONTH(v.fecha) =
                MONTH(CURRENT_DATE)
          `;

    const parametrosVentasMes =
      esVendedor
        ? [usuarioId]
        : [];

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

            FROM productos

            WHERE activo = TRUE
          `,
        ),

        /*
         * =============================
         * UNIDADES EN STOCK
         * =============================
         */

        db.query(
          `
            SELECT
              COALESCE(
                SUM(stock_actual),
                0
              ) AS cantidad

            FROM producto_variantes
          `,
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

            ${condicionVentasHoy}
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

            ${condicionVentasMes}
          `,
          parametrosVentasMes,
        ),

        /*
         * =============================
         * COMPRAS DEL MES
         * =============================
         *
         * Esto sigue siendo global.
         */

        db.query(
          `
            SELECT
              COALESCE(
                SUM(total),
                0
              ) AS total

            FROM ingresos

            WHERE
              YEAR(fecha) =
                YEAR(CURRENT_DATE)

              AND MONTH(fecha) =
                MONTH(CURRENT_DATE)
          `,
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
              p.activo = TRUE

              AND pv.stock_actual <=
                pv.stock_minimo
          `,
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

            LEFT JOIN talles t
              ON t.id =
                pv.talle_id

            LEFT JOIN usuarios u
              ON u.id =
                ms.usuario_id

            ${condicionMovimientos}

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

            LEFT JOIN usuarios u
              ON u.id =
                v.usuario_id

            LEFT JOIN ventas_detalle vd
              ON vd.venta_id =
                v.id

            ${condicionVentas}

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
          parametrosVentas,
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

    /*
     * Admin:
     *
     * WHERE fecha >= ...
     *
     * Vendedor:
     *
     * WHERE fecha >= ...
     * AND usuario_id = ?
     */

    const filtroUsuario =
      esVendedor
        ? "AND usuario_id = ?"
        : "";

    const parametros =
      esVendedor
        ? [
            cantidadDias - 1,
            usuarioId,
          ]
        : [
            cantidadDias - 1,
          ];

    const [rows] =
      await db.query(
        `
          SELECT
            DATE(fecha) AS fecha,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
              SUM(total),
              0
            ) AS total

          FROM ventas

          WHERE fecha >=
            DATE_SUB(
              CURRENT_DATE,
              INTERVAL ? DAY
            )

          ${filtroUsuario}

          GROUP BY
            DATE(fecha)

          ORDER BY
            DATE(fecha) ASC
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
  async () => {
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

            c.nombre AS color,
            t.nombre AS talle

          FROM producto_variantes pv

          INNER JOIN productos p
            ON p.id =
              pv.producto_id

          LEFT JOIN colores c
            ON c.id =
              pv.color_id

          LEFT JOIN talles t
            ON t.id =
              pv.talle_id

          WHERE
            p.activo = TRUE

            AND pv.stock_actual <=
              pv.stock_minimo

          ORDER BY
            pv.stock_actual ASC,
            p.nombre ASC,
            c.nombre ASC,
            t.nombre ASC
        `,
      );

    return rows;
  };

module.exports = {
  obtenerResumen,
  obtenerVentasPorDia,
  obtenerProductosStockBajo,
};