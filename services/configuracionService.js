const db = require(
  "../config/db",
);

const CONFIGURACION_PREDETERMINADA = {
  nombre_negocio:
    "Mi negocio",

  eslogan:
    null,

  telefono:
    null,

  email:
    null,

  direccion:
    null,

  moneda:
    "ARS",

  porcentaje_iva:
    21,

  stock_minimo_predeterminado:
    1,

  encabezado_comprobante:
    "Mi negocio",

  pie_comprobante:
    "Gracias por tu compra",
};

function normalizarConfiguracion(
  fila,
) {
  if (!fila) {
    return null;
  }

  return {
    ...fila,

    id:
      Number(
        fila.id,
      ),

    empresa_id:
      Number(
        fila.empresa_id,
      ),

    porcentaje_iva:
      Number(
        fila.porcentaje_iva ??
          0,
      ),

    stock_minimo_predeterminado:
      Number(
        fila.stock_minimo_predeterminado ??
          0,
      ),
  };
}

/*
 * =====================================
 * CONFIGURACIÓN POR EMPRESA
 * =====================================
 */

const obtenerConfiguracionPorEmpresa =
  async (
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            id,
            empresa_id,
            nombre_negocio,
            eslogan,
            telefono,
            email,
            direccion,
            moneda,
            porcentaje_iva,
            stock_minimo_predeterminado,
            encabezado_comprobante,
            pie_comprobante,
            created_at,
            updated_at

          FROM configuracion_negocio

          WHERE
            empresa_id = ?

          LIMIT 1
        `,
        [
          empresaId,
        ],
      );

    return normalizarConfiguracion(
      rows[0] ??
      null,
    );
  };

/*
 * =====================================
 * CREAR CONFIGURACIÓN AUTOMÁTICA
 * =====================================
 */

const crearConfiguracionPredeterminada =
  async (
    empresaId,
  ) => {
    /*
     * Intentamos usar el nombre real
     * de la empresa como nombre inicial.
     */

    const [empresas] =
      await db.query(
        `
          SELECT
            id,
            nombre

          FROM empresas

          WHERE
            id = ?
            AND activo = TRUE

          LIMIT 1
        `,
        [
          empresaId,
        ],
      );

    if (
      empresas.length === 0
    ) {
      const error =
        new Error(
          "La empresa no existe o está inactiva.",
        );

      error.code =
        "EMPRESA_NO_ENCONTRADA";

      throw error;
    }

    const nombreEmpresa =
      String(
        empresas[0].nombre ??
          "",
      ).trim() ||
      CONFIGURACION_PREDETERMINADA.nombre_negocio;

    const [resultado] =
      await db.query(
        `
          INSERT INTO configuracion_negocio
          (
            empresa_id,
            nombre_negocio,
            eslogan,
            telefono,
            email,
            direccion,
            moneda,
            porcentaje_iva,
            stock_minimo_predeterminado,
            encabezado_comprobante,
            pie_comprobante
          )

          VALUES (
            ?,
            ?,
            ?,
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
          empresaId,

          nombreEmpresa,

          CONFIGURACION_PREDETERMINADA.eslogan,

          CONFIGURACION_PREDETERMINADA.telefono,

          CONFIGURACION_PREDETERMINADA.email,

          CONFIGURACION_PREDETERMINADA.direccion,

          CONFIGURACION_PREDETERMINADA.moneda,

          CONFIGURACION_PREDETERMINADA.porcentaje_iva,

          CONFIGURACION_PREDETERMINADA.stock_minimo_predeterminado,

          nombreEmpresa,

          CONFIGURACION_PREDETERMINADA.pie_comprobante,
        ],
      );

    return obtenerConfiguracionPorId(
      resultado.insertId,
      empresaId,
    );
  };

/*
 * =====================================
 * OBTENER CONFIGURACIÓN
 * =====================================
 */

const obtenerConfiguracion =
  async (
    empresaId,
  ) => {
    const empresaIdNormalizado =
      Number(
        empresaId,
      );

    if (
      !Number.isInteger(
        empresaIdNormalizado,
      ) ||
      empresaIdNormalizado <= 0
    ) {
      const error =
        new Error(
          "No se pudo determinar la empresa.",
        );

      error.code =
        "EMPRESA_NO_ASIGNADA";

      throw error;
    }

    const configuracion =
      await obtenerConfiguracionPorEmpresa(
        empresaIdNormalizado,
      );

    if (configuracion) {
      return configuracion;
    }

    /*
     * Si la empresa todavía no tiene
     * configuración, la creamos.
     */

    return crearConfiguracionPredeterminada(
      empresaIdNormalizado,
    );
  };

/*
 * =====================================
 * CONFIGURACIÓN POR ID + EMPRESA
 * =====================================
 */

const obtenerConfiguracionPorId =
  async (
    id,
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            id,
            empresa_id,
            nombre_negocio,
            eslogan,
            telefono,
            email,
            direccion,
            moneda,
            porcentaje_iva,
            stock_minimo_predeterminado,
            encabezado_comprobante,
            pie_comprobante,
            created_at,
            updated_at

          FROM configuracion_negocio

          WHERE
            id = ?
            AND empresa_id = ?

          LIMIT 1
        `,
        [
          id,
          empresaId,
        ],
      );

    return normalizarConfiguracion(
      rows[0] ??
      null,
    );
  };

/*
 * =====================================
 * ACTUALIZAR CONFIGURACIÓN
 * =====================================
 */

const actualizarConfiguracion =
  async (
    empresaId,
    datos,
  ) => {
    /*
     * Si todavía no existe una fila
     * para la empresa, obtenerConfiguracion
     * la crea automáticamente.
     */

    const configuracionActual =
      await obtenerConfiguracion(
        empresaId,
      );

    if (!configuracionActual) {
      return null;
    }

    const [resultado] =
      await db.query(
        `
          UPDATE configuracion_negocio

          SET
            nombre_negocio = ?,
            eslogan = ?,
            telefono = ?,
            email = ?,
            direccion = ?,
            moneda = ?,
            porcentaje_iva = ?,
            stock_minimo_predeterminado = ?,
            encabezado_comprobante = ?,
            pie_comprobante = ?

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          datos.nombre_negocio,
          datos.eslogan,
          datos.telefono,
          datos.email,
          datos.direccion,
          datos.moneda,
          datos.porcentaje_iva,
          datos.stock_minimo_predeterminado,
          datos.encabezado_comprobante,
          datos.pie_comprobante,

          configuracionActual.id,
          empresaId,
        ],
      );

    if (
      resultado.affectedRows === 0
    ) {
      return null;
    }

    return obtenerConfiguracionPorId(
      configuracionActual.id,
      empresaId,
    );
  };

module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
};