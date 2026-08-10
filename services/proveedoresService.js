const db = require("../config/db");

const obtenerProveedores = async ({
  busqueda = "",
} = {}) => {
  const texto =
    String(busqueda ?? "").trim();

  const parametros = [];
  let where = "";

  if (texto) {
    const filtro =
      `%${texto}%`;

    where = `
      WHERE
        nombre LIKE ?
        OR telefono LIKE ?
        OR email LIKE ?
        OR direccion LIKE ?
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
          nombre,
          telefono,
          email,
          direccion,
          observaciones,
          created_at

        FROM proveedores

        ${where}

        ORDER BY nombre ASC
      `,
      parametros,
    );

  return rows;
};

const obtenerProveedorPorId =
  async (id) => {
    const [rows] =
      await db.query(
        `
          SELECT
            id,
            nombre,
            telefono,
            email,
            direccion,
            observaciones,
            created_at

          FROM proveedores

          WHERE id = ?

          LIMIT 1
        `,
        [id],
      );

    return rows[0] ?? null;
  };

const crearProveedor = async (
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
          nombre,
          telefono,
          email,
          direccion,
          observaciones
        )

        VALUES (?, ?, ?, ?, ?)
      `,
      [
        nombre,
        telefono,
        email,
        direccion,
        observaciones,
      ],
    );

  return obtenerProveedorPorId(
    result.insertId,
  );
};

const actualizarProveedor =
  async (
    id,
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

          WHERE id = ?
        `,
        [
          nombre,
          telefono,
          email,
          direccion,
          observaciones,
          id,
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
    );
  };

const proveedorTieneRelaciones =
  async (id) => {
    const [rows] =
      await db.query(
        `
          SELECT
            (
              SELECT COUNT(*)
              FROM productos
              WHERE proveedor_id = ?
            ) AS productos,

            (
              SELECT COUNT(*)
              FROM ingresos
              WHERE proveedor_id = ?
            ) AS ingresos
        `,
        [id, id],
      );

    const resultado =
      rows[0] ?? {};

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

const eliminarProveedor =
  async (id) => {
    const proveedor =
      await obtenerProveedorPorId(
        id,
      );

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
          WHERE id = ?
        `,
        [id],
      );

    return {
      eliminado:
        result.affectedRows > 0,

      motivo:
        result.affectedRows > 0
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