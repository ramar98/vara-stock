const db = require(
  "../config/db",
);

/*
 * =====================================
 * OBTENER CLIENTES
 * =====================================
 */

const obtenerClientes =
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
      where += `
        AND (
          nombre LIKE ?
          OR telefono LIKE ?
          OR email LIKE ?
        )
      `;

      const filtro =
        `%${texto}%`;

      parametros.push(
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
            created_at

          FROM clientes

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
 * OBTENER CLIENTE POR ID
 * =====================================
 */

const obtenerClientePorId =
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
            created_at

          FROM clientes

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
 * CREAR CLIENTE
 * =====================================
 */

const crearCliente =
  async (
    empresaId,
    data,
  ) => {
    const {
      nombre,
      telefono = null,
      email = null,
      direccion = null,
    } = data;

    const [result] =
      await db.query(
        `
          INSERT INTO clientes
          (
            empresa_id,
            nombre,
            telefono,
            email,
            direccion
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
          empresaId,
          nombre,
          telefono,
          email,
          direccion,
        ],
      );

    return obtenerClientePorId(
      result.insertId,
      empresaId,
    );
  };

/*
 * =====================================
 * ACTUALIZAR CLIENTE
 * =====================================
 */

const actualizarCliente =
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
    } = data;

    const [result] =
      await db.query(
        `
          UPDATE clientes

          SET
            nombre = ?,
            telefono = ?,
            email = ?,
            direccion = ?

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          nombre,
          telefono,
          email,
          direccion,
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

    return obtenerClientePorId(
      id,
      empresaId,
    );
  };

/*
 * =====================================
 * CLIENTE TIENE VENTAS
 * =====================================
 */

const clienteTieneVentas =
  async (
    id,
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          SELECT
            COUNT(*) AS cantidad

          FROM ventas

          WHERE
            cliente_id = ?
            AND empresa_id = ?
        `,
        [
          id,
          empresaId,
        ],
      );

    return (
      Number(
        rows[0]?.cantidad ??
          0,
      ) > 0
    );
  };

/*
 * =====================================
 * ELIMINAR CLIENTE
 * =====================================
 */

const eliminarCliente =
  async (
    id,
    empresaId,
  ) => {
    const cliente =
      await obtenerClientePorId(
        id,
        empresaId,
      );

    /*
     * Si existe en otra empresa,
     * para este usuario simplemente
     * no existe.
     */

    if (!cliente) {
      return {
        eliminado: false,

        motivo:
          "NO_ENCONTRADO",
      };
    }

    const tieneVentas =
      await clienteTieneVentas(
        id,
        empresaId,
      );

    if (tieneVentas) {
      return {
        eliminado: false,

        motivo:
          "TIENE_VENTAS",
      };
    }

    const [result] =
      await db.query(
        `
          DELETE FROM clientes

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
  obtenerClientes,

  obtenerClientePorId,

  crearCliente,

  actualizarCliente,

  eliminarCliente,
};