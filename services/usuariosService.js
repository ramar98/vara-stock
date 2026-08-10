const bcrypt = require("bcryptjs");

const db = require("../config/db");

const CAMPOS_USUARIO = `
  SELECT
    u.id,
    u.nombre,
    u.apellido,
    u.usuario,
    u.email,
    u.rol_id,
    r.nombre AS rol,
    u.activo,
    u.created_at,
    u.updated_at

  FROM usuarios u

  INNER JOIN roles r
    ON r.id = u.rol_id
`;

function normalizarUsuario(fila) {
  if (!fila) {
    return null;
  }

  return {
    ...fila,

    id: Number(fila.id),

    rol_id: Number(
      fila.rol_id,
    ),

    activo: Boolean(
      fila.activo,
    ),
  };
}

const obtenerUsuarios = async ({
  busqueda = "",
} = {}) => {
  const texto =
    String(
      busqueda ?? "",
    ).trim();

  const parametros = [];

  let where = "";

  if (texto) {
    const filtro =
      `%${texto}%`;

    where = `
      WHERE
        u.nombre LIKE ?
        OR u.apellido LIKE ?
        OR u.usuario LIKE ?
        OR u.email LIKE ?
        OR r.nombre LIKE ?
    `;

    parametros.push(
      filtro,
      filtro,
      filtro,
      filtro,
      filtro,
    );
  }

  const [rows] =
    await db.query(
      `
        ${CAMPOS_USUARIO}

        ${where}

        ORDER BY
          u.activo DESC,
          u.nombre ASC,
          u.apellido ASC
      `,
      parametros,
    );

  return rows.map(
    normalizarUsuario,
  );
};

const obtenerUsuarioPorId =
  async (id) => {
    const [rows] =
      await db.query(
        `
          ${CAMPOS_USUARIO}

          WHERE u.id = ?

          LIMIT 1
        `,
        [id],
      );

    return normalizarUsuario(
      rows[0] ?? null,
    );
  };

const obtenerRoles = async () => {
  const [rows] =
    await db.query(
      `
        SELECT
          id,
          nombre

        FROM roles

        ORDER BY nombre ASC
      `,
    );

  return rows.map(
    (rol) => ({
      ...rol,
      id: Number(rol.id),
    }),
  );
};

const obtenerRolPorId =
  async (id) => {
    const [rows] =
      await db.query(
        `
          SELECT
            id,
            nombre

          FROM roles

          WHERE id = ?

          LIMIT 1
        `,
        [id],
      );

    return rows[0] ?? null;
  };

const verificarDuplicado =
  async ({
    usuario,
    email,
    excluirId = null,
  }) => {
    const condiciones = [
      `
        (
          LOWER(usuario) = LOWER(?)
          OR LOWER(email) = LOWER(?)
        )
      `,
    ];

    const parametros = [
      usuario,
      email,
    ];

    if (excluirId) {
      condiciones.push(
        "id <> ?",
      );

      parametros.push(
        excluirId,
      );
    }

    const [rows] =
      await db.query(
        `
          SELECT
            id,
            usuario,
            email

          FROM usuarios

          WHERE
            ${condiciones.join(
              " AND ",
            )}

          LIMIT 1
        `,
        parametros,
      );

    return rows[0] ?? null;
  };

const crearUsuario = async ({
  nombre,
  apellido,
  usuario,
  email,
  password,
  rol_id,
  activo = true,
}) => {
  const duplicado =
    await verificarDuplicado({
      usuario,
      email,
    });

  if (duplicado) {
    const mismoUsuario =
      String(
        duplicado.usuario,
      ).toLowerCase() ===
      String(
        usuario,
      ).toLowerCase();

    const error =
      new Error(
        mismoUsuario
          ? "Ya existe un usuario con ese nombre de usuario."
          : "Ya existe un usuario con ese correo electrónico.",
      );

    error.code =
      "USUARIO_DUPLICADO";

    throw error;
  }

  const rol =
    await obtenerRolPorId(
      rol_id,
    );

  if (!rol) {
    const error =
      new Error(
        "El rol seleccionado no existe.",
      );

    error.code =
      "ROL_NO_ENCONTRADO";

    throw error;
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    );

  const [resultado] =
    await db.query(
      `
        INSERT INTO usuarios
        (
          nombre,
          apellido,
          usuario,
          email,
          password,
          rol_id,
          activo
        )

        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nombre,
        apellido,
        usuario,
        email,
        passwordHash,
        rol_id,
        Boolean(activo),
      ],
    );

  return obtenerUsuarioPorId(
    resultado.insertId,
  );
};

const actualizarUsuario =
  async (
    id,
    {
      nombre,
      apellido,
      usuario,
      email,
      rol_id,
      activo,
    },
  ) => {
    const usuarioActual =
      await obtenerUsuarioPorId(
        id,
      );

    if (!usuarioActual) {
      return null;
    }

    const duplicado =
      await verificarDuplicado({
        usuario,
        email,
        excluirId: id,
      });

    if (duplicado) {
      const mismoUsuario =
        String(
          duplicado.usuario,
        ).toLowerCase() ===
        String(
          usuario,
        ).toLowerCase();

      const error =
        new Error(
          mismoUsuario
            ? "Ya existe un usuario con ese nombre de usuario."
            : "Ya existe un usuario con ese correo electrónico.",
        );

      error.code =
        "USUARIO_DUPLICADO";

      throw error;
    }

    const rol =
      await obtenerRolPorId(
        rol_id,
      );

    if (!rol) {
      const error =
        new Error(
          "El rol seleccionado no existe.",
        );

      error.code =
        "ROL_NO_ENCONTRADO";

      throw error;
    }

    await db.query(
      `
        UPDATE usuarios

        SET
          nombre = ?,
          apellido = ?,
          usuario = ?,
          email = ?,
          rol_id = ?,
          activo = ?

        WHERE id = ?
      `,
      [
        nombre,
        apellido,
        usuario,
        email,
        rol_id,
        Boolean(activo),
        id,
      ],
    );

    return obtenerUsuarioPorId(
      id,
    );
  };

const cambiarEstadoUsuario =
  async (
    id,
    activo,
  ) => {
    const usuario =
      await obtenerUsuarioPorId(
        id,
      );

    if (!usuario) {
      return null;
    }

    await db.query(
      `
        UPDATE usuarios

        SET activo = ?

        WHERE id = ?
      `,
      [
        Boolean(activo),
        id,
      ],
    );

    return obtenerUsuarioPorId(
      id,
    );
  };

const cambiarPassword =
  async (
    id,
    nuevaPassword,
  ) => {
    const usuario =
      await obtenerUsuarioPorId(
        id,
      );

    if (!usuario) {
      return null;
    }

    const passwordHash =
      await bcrypt.hash(
        nuevaPassword,
        12,
      );

    await db.query(
      `
        UPDATE usuarios

        SET password = ?

        WHERE id = ?
      `,
      [
        passwordHash,
        id,
      ],
    );

    return true;
  };

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  cambiarPassword,
};