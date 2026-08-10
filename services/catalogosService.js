const db = require("../config/db");

const CONFIGURACION_CATALOGOS = {
  categorias: {
    tabla: "categorias",
    relaciones: [
      {
        tabla: "productos",
        columna: "categoria_id",
      },
    ],
  },

  marcas: {
    tabla: "marcas",
    relaciones: [
      {
        tabla: "productos",
        columna: "marca_id",
      },
    ],
  },

  colores: {
    tabla: "colores",
    relaciones: [
      {
        tabla: "producto_variantes",
        columna: "color_id",
      },
    ],
  },

  talles: {
    tabla: "talles",
    relaciones: [
      {
        tabla: "producto_variantes",
        columna: "talle_id",
      },
    ],
  },
};

function obtenerConfiguracion(tipo) {
  const configuracion =
    CONFIGURACION_CATALOGOS[tipo];

  if (!configuracion) {
    const error = new Error(
      "El catálogo solicitado no es válido.",
    );

    error.code = "CATALOGO_NO_VALIDO";

    throw error;
  }

  return configuracion;
}

const obtenerElementos = async (
  tipo,
  { busqueda = "" } = {},
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const texto = String(
    busqueda ?? "",
  ).trim();

  const parametros = [];
  let where = "";

  if (texto) {
    where = "WHERE nombre LIKE ?";
    parametros.push(`%${texto}%`);
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        nombre
      FROM ${configuracion.tabla}
      ${where}
      ORDER BY nombre ASC
    `,
    parametros,
  );

  return rows;
};

const obtenerElementoPorId = async (
  tipo,
  id,
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const [rows] = await db.query(
    `
      SELECT
        id,
        nombre
      FROM ${configuracion.tabla}
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

const existeNombre = async (
  tipo,
  nombre,
  excluirId = null,
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const parametros = [nombre];

  let condicionExcluir = "";

  if (excluirId) {
    condicionExcluir = "AND id <> ?";
    parametros.push(excluirId);
  }

  const [rows] = await db.query(
    `
      SELECT id
      FROM ${configuracion.tabla}
      WHERE LOWER(TRIM(nombre)) =
            LOWER(TRIM(?))
        ${condicionExcluir}
      LIMIT 1
    `,
    parametros,
  );

  return rows.length > 0;
};

const crearElemento = async (
  tipo,
  { nombre },
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const nombreExiste =
    await existeNombre(tipo, nombre);

  if (nombreExiste) {
    const error = new Error(
      "Ya existe un elemento con ese nombre.",
    );

    error.code = "ELEMENTO_DUPLICADO";

    throw error;
  }

  const [result] = await db.query(
    `
      INSERT INTO ${configuracion.tabla}
      (
        nombre
      )
      VALUES (?)
    `,
    [nombre],
  );

  return obtenerElementoPorId(
    tipo,
    result.insertId,
  );
};

const actualizarElemento = async (
  tipo,
  id,
  { nombre },
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const elementoActual =
    await obtenerElementoPorId(tipo, id);

  if (!elementoActual) {
    return null;
  }

  const nombreExiste =
    await existeNombre(
      tipo,
      nombre,
      id,
    );

  if (nombreExiste) {
    const error = new Error(
      "Ya existe otro elemento con ese nombre.",
    );

    error.code = "ELEMENTO_DUPLICADO";

    throw error;
  }

  await db.query(
    `
      UPDATE ${configuracion.tabla}
      SET nombre = ?
      WHERE id = ?
    `,
    [nombre, id],
  );

  return obtenerElementoPorId(tipo, id);
};

const tieneRelaciones = async (
  configuracion,
  id,
) => {
  for (
    const relacion of configuracion.relaciones
  ) {
    const [rows] = await db.query(
      `
        SELECT COUNT(*) AS cantidad
        FROM ${relacion.tabla}
        WHERE ${relacion.columna} = ?
      `,
      [id],
    );

    if (
      Number(rows[0]?.cantidad ?? 0) > 0
    ) {
      return true;
    }
  }

  return false;
};

const eliminarElemento = async (
  tipo,
  id,
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const elemento =
    await obtenerElementoPorId(
      tipo,
      id,
    );

  if (!elemento) {
    return {
      eliminado: false,
      motivo: "NO_ENCONTRADO",
    };
  }

  const relacionado =
    await tieneRelaciones(
      configuracion,
      id,
    );

  if (relacionado) {
    return {
      eliminado: false,
      motivo: "TIENE_RELACIONES",
    };
  }

  const [result] = await db.query(
    `
      DELETE FROM ${configuracion.tabla}
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
  obtenerElementos,
  obtenerElementoPorId,
  crearElemento,
  actualizarElemento,
  eliminarElemento,
};