const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../config/db");

function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error(
      "JWT_SECRET no está configurado.",
    );

    error.code =
      "JWT_SECRET_NO_CONFIGURADO";

    throw error;
  }

  return secret;
}

function limpiarUsuario(usuario) {
  if (!usuario) {
    return null;
  }

  return {
    id: Number(usuario.id),

    nombre:
      usuario.nombre ?? "",

    apellido:
      usuario.apellido ?? "",

    usuario:
      usuario.usuario ?? "",

    email:
      usuario.email ?? "",

    rol_id: Number(
      usuario.rol_id,
    ),

    rol:
      usuario.rol ?? "",

    activo: Boolean(
      usuario.activo,
    ),
  };
}

function generarToken(usuario) {
  return jwt.sign(
    {
      userId: usuario.id,
      rolId: usuario.rol_id,
      rol: usuario.rol,
    },
    obtenerJwtSecret(),
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "8h",
    },
  );
}

const obtenerUsuarioPorIdentificador =
  async (identificador) => {
    const [rows] = await db.query(
      `
        SELECT
          u.id,
          u.nombre,
          u.apellido,
          u.usuario,
          u.email,
          u.password,
          u.rol_id,
          r.nombre AS rol,
          u.activo,
          u.created_at,
          u.updated_at

        FROM usuarios u

        INNER JOIN roles r
          ON r.id = u.rol_id

        WHERE
          LOWER(u.email) = LOWER(?)
          OR LOWER(u.usuario) = LOWER(?)

        LIMIT 1
      `,
      [
        identificador,
        identificador,
      ],
    );

    return rows[0] ?? null;
  };

const obtenerUsuarioPorId = async (
  id,
) => {
  const [rows] = await db.query(
    `
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

      WHERE u.id = ?

      LIMIT 1
    `,
    [id],
  );

  return limpiarUsuario(
    rows[0] ?? null,
  );
};

const validarRol = async (rolId) => {
  const [rows] = await db.query(
    `
      SELECT
        id,
        nombre

      FROM roles

      WHERE id = ?

      LIMIT 1
    `,
    [rolId],
  );

  return rows[0] ?? null;
};

const iniciarSesion = async ({
  identificador,
  password,
}) => {
  const usuarioEncontrado =
    await obtenerUsuarioPorIdentificador(
      identificador,
    );

  if (!usuarioEncontrado) {
    const error = new Error(
      "El usuario, correo o contraseña son incorrectos.",
    );

    error.code =
      "CREDENCIALES_INVALIDAS";

    throw error;
  }

  if (
    !Boolean(
      usuarioEncontrado.activo,
    )
  ) {
    const error = new Error(
      "El usuario se encuentra inactivo.",
    );

    error.code =
      "USUARIO_INACTIVO";

    throw error;
  }

  const passwordValida =
    await bcrypt.compare(
      password,
      usuarioEncontrado.password,
    );

  if (!passwordValida) {
    const error = new Error(
      "El usuario, correo o contraseña son incorrectos.",
    );

    error.code =
      "CREDENCIALES_INVALIDAS";

    throw error;
  }

  const usuario =
    limpiarUsuario(
      usuarioEncontrado,
    );

  const token =
    generarToken(usuario);

  return {
    token,
    usuario,
  };
};

const registrarUsuario = async ({
  nombre,
  apellido,
  usuario,
  email,
  password,
  rol_id = 2,
}) => {
  const [usuariosExistentes] =
    await db.query(
      `
        SELECT
          id,
          usuario,
          email

        FROM usuarios

        WHERE
          LOWER(email) = LOWER(?)
          OR LOWER(usuario) = LOWER(?)

        LIMIT 1
      `,
      [
        email,
        usuario,
      ],
    );

  if (
    usuariosExistentes.length > 0
  ) {
    const usuarioExistente =
      usuariosExistentes[0];

    const mismoEmail =
      String(
        usuarioExistente.email,
      ).toLowerCase() ===
      String(email).toLowerCase();

    const error = new Error(
      mismoEmail
        ? "Ya existe un usuario con ese correo electrónico."
        : "Ya existe un usuario con ese nombre de usuario.",
    );

    error.code =
      "USUARIO_DUPLICADO";

    throw error;
  }

  const rol =
    await validarRol(rol_id);

  if (!rol) {
    const error = new Error(
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

        VALUES (?, ?, ?, ?, ?, ?, TRUE)
      `,
      [
        nombre,
        apellido,
        usuario,
        email,
        passwordHash,
        rol_id,
      ],
    );

  const usuarioCreado =
    await obtenerUsuarioPorId(
      resultado.insertId,
    );

  const token =
    generarToken(
      usuarioCreado,
    );

  return {
    token,
    usuario:
      usuarioCreado,
  };
};

const verificarToken = async (
  token,
) => {
  let datosToken;

  try {
    datosToken = jwt.verify(
      token,
      obtenerJwtSecret(),
    );
  } catch (errorOriginal) {
    const error = new Error(
      "La sesión no es válida o ha vencido.",
    );

    error.code =
      "TOKEN_INVALIDO";

    error.originalError =
      errorOriginal;

    throw error;
  }

  const usuario =
    await obtenerUsuarioPorId(
      datosToken.userId,
    );

  if (!usuario) {
    const error = new Error(
      "El usuario de la sesión no existe.",
    );

    error.code =
      "USUARIO_NO_ENCONTRADO";

    throw error;
  }

  if (!usuario.activo) {
    const error = new Error(
      "El usuario se encuentra inactivo.",
    );

    error.code =
      "USUARIO_INACTIVO";

    throw error;
  }

  return usuario;
};

module.exports = {
  iniciarSesion,
  registrarUsuario,
  verificarToken,
  obtenerUsuarioPorId,
};