const db = require(
  "../config/db",
);

/*
 * =====================================
 * OBTENER PROVEEDORES
 * =====================================
 */

const obtenerProveedores =
  async ({
    empresaId,
    busqueda = "",
  } = {}) => {
    const texto =
      String(
        busqueda ?? "",
      ).trim();

    const parametros = [
      empresaId,
    ];

    let where = `
      WHERE empresa_id = ?
    `;

    if (texto) {
      const filtro =
        `%${texto}%`;

      where += `
        AND (
          nombre LIKE ?
          OR telefono LIKE ?
          OR email LIKE ?
          OR direccion LIKE ?
        )
      `;

      parametros.push(
        filtro,
        filtro,
        filtro,
        filtro,
      );
    }

    const [rows] =
      await db.query(
        `
          SELECT
            id,
            empresa_id,
            nombre,
            telefono,
            email,
            direccion,
            observaciones,
            created_at

          FROM proveedores

          ${where}

          ORDER BY
            nombre ASC
        `,
        parametros,
      );

    return rows;
  };

/*
 * =====================================
 * OBTENER PROVEEDOR POR ID
 * =====================================
 */

const obtenerProveedorPorId =
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
            nombre,
            telefono,
            email,
            direccion,
            observaciones,
            created_at

          FROM proveedores

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

    return (
      rows[0] ??
      null
    );
  };

/*
 * =====================================
 * CREAR PROVEEDOR
 * =====================================
 */

const crearProveedor =
  async (
    empresaId,
    data,
  ) => {
    const {
      nombre,
      telefono = null,
      email = null,
      direccion = null,
      observaciones = null,
    } = data;

    const [result] =
      await db.query(
        `
          INSERT INTO proveedores
          (
            empresa_id,
            nombre,
            telefono,
            email,
            direccion,
            observaciones
          )

          VALUES (
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
          nombre,
          telefono,
          email,
          direccion,
          observaciones,
        ],
      );

    return obtenerProveedorPorId(
      result.insertId,
      empresaId,
    );
  };

/*
 * =====================================
 * ACTUALIZAR PROVEEDOR
 * =====================================
 */

const actualizarProveedor =
  async (
    id,
    empresaId,
    data,
  ) => {
    const {
      nombre,
      telefono = null,
      email = null,
      direccion = null,
      observaciones = null,
    } = data;

    const [result] =
      await db.query(
        `
          UPDATE proveedores

          SET
            nombre = ?,
            telefono = ?,
            email = ?,
            direccion = ?,
            observaciones = ?

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          nombre,
          telefono,
          email,
          direccion,
          observaciones,
          id,
          empresaId,
        ],
      );

    if (
      result.affectedRows ===
      0
    ) {
      return null;
    }

    return obtenerProveedorPorId(
      id,
      empresaId,
    );
  };

/*
 * =====================================
 * PROVEEDOR TIENE RELACIONES
 * =====================================
 */

const proveedorTieneRelaciones =
  async (
    id,
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            (
              SELECT
                COUNT(*)

              FROM productos

              WHERE
                proveedor_id = ?
                AND empresa_id = ?
            ) AS productos,

            (
              SELECT
                COUNT(*)

              FROM ingresos

              WHERE
                proveedor_id = ?
                AND empresa_id = ?
            ) AS ingresos
        `,
        [
          id,
          empresaId,
          id,
          empresaId,
        ],
      );

    const resultado =
      rows[0] ??
      {};

    return (
      Number(
        resultado.productos ??
          0,
      ) > 0 ||
      Number(
        resultado.ingresos ??
          0,
      ) > 0
    );
  };

/*
 * =====================================
 * ELIMINAR PROVEEDOR
 * =====================================
 */

const eliminarProveedor =
  async (
    id,
    empresaId,
  ) => {
    const proveedor =
      await obtenerProveedorPorId(
        id,
        empresaId,
      );

    /*
     * Si pertenece a otra empresa,
     * se comporta como inexistente.
     */

    if (!proveedor) {
      return {
        eliminado: false,

        motivo:
          "NO_ENCONTRADO",
      };
    }

    const tieneRelaciones =
      await proveedorTieneRelaciones(
        id,
        empresaId,
      );

    if (tieneRelaciones) {
      return {
        eliminado: false,

        motivo:
          "TIENE_RELACIONES",
      };
    }

    const [result] =
      await db.query(
        `
          DELETE FROM proveedores

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          id,
          empresaId,
        ],
      );

    return {
      eliminado:
        result.affectedRows >
        0,

      motivo:
        result.affectedRows >
        0
          ? null
          : "NO_ENCONTRADO",
    };
  };

module.exports = {
  obtenerProveedores,

  obtenerProveedorPorId,

  crearProveedor,

  actualizarProveedor,

  eliminarProveedor,
};