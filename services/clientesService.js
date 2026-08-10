const db = require("../config/db");

const obtenerClientes = async ({
  busqueda = "",
} = {}) => {
  const texto = String(busqueda ?? "").trim();

  const parametros = [];
  let where = "";

  if (texto) {
    where = `
      WHERE
        nombre LIKE ?
        OR telefono LIKE ?
        OR email LIKE ?
    `;

    const filtro = `%${texto}%`;

    parametros.push(
      filtro,
      filtro,
      filtro,
    );
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        nombre,
        telefono,
        email,
        direccion,
        created_at

      FROM clientes

      ${where}

      ORDER BY nombre ASC
    `,
    parametros,
  );

  return rows;
};

const obtenerClientePorId = async (id) => {
  const [rows] = await db.query(
    `
      SELECT
        id,
        nombre,
        telefono,
        email,
        direccion,
        created_at

      FROM clientes

      WHERE id = ?

      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

const crearCliente = async (data) => {
  const {
    nombre,
    telefono = null,
    email = null,
    direccion = null,
  } = data;

  const [result] = await db.query(
    `
      INSERT INTO clientes
      (
        nombre,
        telefono,
        email,
        direccion
      )

      VALUES (?, ?, ?, ?)
    `,
    [
      nombre,
      telefono,
      email,
      direccion,
    ],
  );

  return obtenerClientePorId(
    result.insertId,
  );
};

const actualizarCliente = async (
  id,
  data,
) => {
  const {
    nombre,
    telefono = null,
    email = null,
    direccion = null,
  } = data;

  const [result] = await db.query(
    `
      UPDATE clientes

      SET
        nombre = ?,
        telefono = ?,
        email = ?,
        direccion = ?

      WHERE id = ?
    `,
    [
      nombre,
      telefono,
      email,
      direccion,
      id,
    ],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return obtenerClientePorId(id);
};

const clienteTieneVentas = async (id) => {
  const [rows] = await db.query(
    `
      SELECT COUNT(*) AS cantidad

      FROM ventas

      WHERE cliente_id = ?
    `,
    [id],
  );

  return Number(
    rows[0]?.cantidad ?? 0,
  ) > 0;
};

const eliminarCliente = async (id) => {
  const cliente =
    await obtenerClientePorId(id);

  if (!cliente) {
    return {
      eliminado: false,
      motivo: "NO_ENCONTRADO",
    };
  }

  const tieneVentas =
    await clienteTieneVentas(id);

  if (tieneVentas) {
    return {
      eliminado: false,
      motivo: "TIENE_VENTAS",
    };
  }

  const [result] = await db.query(
    `
      DELETE FROM clientes

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
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};