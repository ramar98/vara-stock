const bcrypt = require(
  "bcryptjs",
);

const db = require(
  "../config/db",
);

const CAMPOS_USUARIO = `
  SELECT
    u.id,
    u.empresa_id,
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

function normalizarUsuario(
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

    rol_id:
      Number(
        fila.rol_id,
      ),

    activo:
      Boolean(
        fila.activo,
      ),
  };
}

/*
 * =====================================
 * OBTENER USUARIOS
 * =====================================
 */

const obtenerUsuarios =
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

    const condiciones = [
      "u.empresa_id = ?",
    ];

    if (texto) {
      const filtro =
        `%${texto}%`;

      condiciones.push(`
        (
          u.nombre LIKE ?
          OR u.apellido LIKE ?
          OR u.usuario LIKE ?
          OR u.email LIKE ?
          OR r.nombre LIKE ?
        )
      `);

      parametros.push(
        filtro,
        filtro,
        filtro,
        filtro,
        filtro,
      );
    }

    const where = `
      WHERE ${condiciones.join(
        " AND ",
      )}
    `;

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

/*
 * =====================================
 * OBTENER USUARIO POR ID
 * =====================================
 */

const obtenerUsuarioPorId =
  async (
    id,
    empresaId,
  ) => {
    const [rows] =
      await db.query(
        `
          ${CAMPOS_USUARIO}

          WHERE
            u.id = ?
            AND u.empresa_id = ?

          LIMIT 1
        `,
        [
          id,
          empresaId,
        ],
      );

    return normalizarUsuario(
      rows[0] ??
      null,
    );
  };

/*
 * =====================================
 * ROLES
 * =====================================
 *
 * Los roles siguen siendo globales.
 * =====================================
 */

const obtenerRoles =
  async () => {
    const [rows] =
      await db.query(
        `
          SELECT
            id,
            nombre

          FROM roles

          ORDER BY
            nombre ASC
        `,
      );

    return rows.map(
      (rol) => ({
        ...rol,

        id:
          Number(
            rol.id,
          ),
      }),
    );
  };

const obtenerRolPorId =
  async (
    id,
  ) => {
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
        [
          id,
        ],
      );

    return (
      rows[0] ??
      null
    );
  };

/*
 * =====================================
 * DUPLICADOS
 * =====================================
 *
 * usuario/email pueden repetirse
 * entre empresas distintas.
 * =====================================
 */

const verificarDuplicado =
  async ({
    empresaId,
    usuario,
    email,
    excluirId = null,
  }) => {
    const condiciones = [
      "empresa_id = ?",

      `
        (
          LOWER(usuario) =
            LOWER(?)

          OR

          LOWER(email) =
            LOWER(?)
        )
      `,
    ];

    const parametros = [
      empresaId,
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
            empresa_id,
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

    return (
      rows[0] ??
      null
    );
  };

/*
 * =====================================
 * CREAR USUARIO
 * =====================================
 */

const crearUsuario =
  async ({
    empresa_id,
    nombre,
    apellido,
    usuario,
    email,
    password,
    rol_id,
    activo = true,
  }) => {
    const empresaId =
      Number(
        empresa_id,
      );

    if (
      !Number.isInteger(
        empresaId,
      ) ||
      empresaId <= 0
    ) {
      const error =
        new Error(
          "No se pudo determinar la empresa.",
        );

      error.code =
        "EMPRESA_NO_ASIGNADA";

      throw error;
    }

    const duplicado =
      await verificarDuplicado({
        empresaId,
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
            ? "Ya existe un usuario con ese nombre de usuario dentro de la empresa."
            : "Ya existe un usuario con ese correo electrónico dentro de la empresa.",
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
            empresa_id,
            nombre,
            apellido,
            usuario,
            email,
            password,
            rol_id,
            activo
          )

          VALUES (
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
      empresaId,
    );
  };

/*
 * =====================================
 * ACTUALIZAR USUARIO
 * =====================================
 */

const actualizarUsuario =
  async (
    id,
    empresaId,
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
        empresaId,
      );

    if (!usuarioActual) {
      return null;
    }

    const duplicado =
      await verificarDuplicado({
        empresaId,
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
            ? "Ya existe un usuario con ese nombre de usuario dentro de la empresa."
            : "Ya existe un usuario con ese correo electrónico dentro de la empresa.",
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

    const [resultado] =
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

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          nombre,
          apellido,
          usuario,
          email,
          rol_id,
          Boolean(activo),
          id,
          empresaId,
        ],
      );

    if (
      resultado.affectedRows ===
      0
    ) {
      return null;
    }

    return obtenerUsuarioPorId(
      id,
      empresaId,
    );
  };

/*
 * =====================================
 * CAMBIAR ESTADO
 * =====================================
 */

const cambiarEstadoUsuario =
  async (
    id,
    empresaId,
    activo,
  ) => {
    const usuario =
      await obtenerUsuarioPorId(
        id,
        empresaId,
      );

    if (!usuario) {
      return null;
    }

    const [resultado] =
      await db.query(
        `
          UPDATE usuarios

          SET
            activo = ?

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          Boolean(activo),
          id,
          empresaId,
        ],
      );

    if (
      resultado.affectedRows ===
      0
    ) {
      return null;
    }

    return obtenerUsuarioPorId(
      id,
      empresaId,
    );
  };

/*
 * =====================================
 * CAMBIAR PASSWORD
 * =====================================
 */

const cambiarPassword =
  async (
    id,
    empresaId,
    nuevaPassword,
  ) => {
    const usuario =
      await obtenerUsuarioPorId(
        id,
        empresaId,
      );

    if (!usuario) {
      return null;
    }

    const passwordHash =
      await bcrypt.hash(
        nuevaPassword,
        12,
      );

    const [resultado] =
      await db.query(
        `
          UPDATE usuarios

          SET
            password = ?

          WHERE
            id = ?
            AND empresa_id = ?
        `,
        [
          passwordHash,
          id,
          empresaId,
        ],
      );

    return (
      resultado.affectedRows >
      0
    );
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