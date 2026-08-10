const db = require("../config/db");

const CONFIGURACION_PREDETERMINADA = {
  nombre_negocio: "Vara Modas",
  eslogan: "Moda que te acompaña",
  telefono: null,
  email: null,
  direccion: null,
  moneda: "ARS",
  porcentaje_iva: 21,
  stock_minimo_predeterminado: 1,
  encabezado_comprobante: "Vara Modas",
  pie_comprobante: "Gracias por tu compra",
};

const obtenerConfiguracion = async () => {
  const [rows] = await db.query(`
    SELECT
      id,
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

    ORDER BY id ASC

    LIMIT 1
  `);

  if (rows.length > 0) {
    return {
      ...rows[0],

      porcentaje_iva: Number(
        rows[0].porcentaje_iva ?? 0,
      ),

      stock_minimo_predeterminado: Number(
        rows[0].stock_minimo_predeterminado ?? 0,
      ),
    };
  }

  const [resultado] = await db.query(
    `
      INSERT INTO configuracion_negocio
      (
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

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      CONFIGURACION_PREDETERMINADA.nombre_negocio,
      CONFIGURACION_PREDETERMINADA.eslogan,
      CONFIGURACION_PREDETERMINADA.telefono,
      CONFIGURACION_PREDETERMINADA.email,
      CONFIGURACION_PREDETERMINADA.direccion,
      CONFIGURACION_PREDETERMINADA.moneda,
      CONFIGURACION_PREDETERMINADA.porcentaje_iva,
      CONFIGURACION_PREDETERMINADA.stock_minimo_predeterminado,
      CONFIGURACION_PREDETERMINADA.encabezado_comprobante,
      CONFIGURACION_PREDETERMINADA.pie_comprobante,
    ],
  );

  return obtenerConfiguracionPorId(
    resultado.insertId,
  );
};

const obtenerConfiguracionPorId = async (id) => {
  const [rows] = await db.query(
    `
      SELECT
        id,
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

      WHERE id = ?

      LIMIT 1
    `,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    ...rows[0],

    porcentaje_iva: Number(
      rows[0].porcentaje_iva ?? 0,
    ),

    stock_minimo_predeterminado: Number(
      rows[0].stock_minimo_predeterminado ?? 0,
    ),
  };
};

const actualizarConfiguracion = async (datos) => {
  const configuracionActual =
    await obtenerConfiguracion();

  const [resultado] = await db.query(
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

      WHERE id = ?
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
    ],
  );

  if (resultado.affectedRows === 0) {
    return null;
  }

  return obtenerConfiguracionPorId(
    configuracionActual.id,
  );
};

module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
};