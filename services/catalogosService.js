const db = require(
  "../config/db",
);

const CONFIGURACION_CATALOGOS = {
  categorias: {
    tabla: "categorias",
  },

  marcas: {
    tabla: "marcas",
  },

  colores: {
    tabla: "colores",
  },

  talles: {
    tabla: "talles",
  },
};

function obtenerConfiguracion(tipo) {
  const configuracion =
    CONFIGURACION_CATALOGOS[tipo];

  if (!configuracion) {
    const error = new Error(
      "El catálogo solicitado no es válido.",
    );

    error.code =
      "CATALOGO_NO_VALIDO";

    throw error;
  }

  return configuracion;
}

const obtenerElementos = async (
  tipo,
  empresaId,
  {
    busqueda = "",
  } = {},
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const texto = String(
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
      AND nombre LIKE ?
    `;

    parametros.push(
      `%${texto}%`,
    );
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        empresa_id,
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
  empresaId,
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const [rows] = await db.query(
    `
      SELECT
        id,
        empresa_id,
        nombre

      FROM ${configuracion.tabla}

      WHERE id = ?
        AND empresa_id = ?

      LIMIT 1
    `,
    [
      id,
      empresaId,
    ],
  );

  return rows[0] ?? null;
};

const existeNombre = async (
  tipo,
  nombre,
  empresaId,
  excluirId = null,
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const parametros = [
    empresaId,
    nombre,
  ];

  let condicionExcluir = "";

  if (excluirId) {
    condicionExcluir =
      "AND id <> ?";

    parametros.push(
      excluirId,
    );
  }

  const [rows] = await db.query(
    `
      SELECT
        id

      FROM ${configuracion.tabla}

      WHERE empresa_id = ?

        AND LOWER(TRIM(nombre)) =
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
  empresaId,
  {
    nombre,
  },
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const nombreExiste =
    await existeNombre(
      tipo,
      nombre,
      empresaId,
    );

  if (nombreExiste) {
    const error = new Error(
      "Ya existe un elemento con ese nombre.",
    );

    error.code =
      "ELEMENTO_DUPLICADO";

    throw error;
  }

  const [result] = await db.query(
    `
      INSERT INTO ${configuracion.tabla}
      (
        empresa_id,
        nombre
      )

      VALUES (?, ?)
    `,
    [
      empresaId,
      nombre,
    ],
  );

  return obtenerElementoPorId(
    tipo,
    result.insertId,
    empresaId,
  );
};

const actualizarElemento = async (
  tipo,
  id,
  empresaId,
  {
    nombre,
  },
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const elementoActual =
    await obtenerElementoPorId(
      tipo,
      id,
      empresaId,
    );

  if (!elementoActual) {
    return null;
  }

  const nombreExiste =
    await existeNombre(
      tipo,
      nombre,
      empresaId,
      id,
    );

  if (nombreExiste) {
    const error = new Error(
      "Ya existe otro elemento con ese nombre.",
    );

    error.code =
      "ELEMENTO_DUPLICADO";

    throw error;
  }

  const [result] = await db.query(
    `
      UPDATE ${configuracion.tabla}

      SET nombre = ?

      WHERE id = ?
        AND empresa_id = ?
    `,
    [
      nombre,
      id,
      empresaId,
    ],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return obtenerElementoPorId(
    tipo,
    id,
    empresaId,
  );
};

const tieneRelaciones = async (
  tipo,
  id,
  empresaId,
) => {
  if (tipo === "categorias") {
    const [rows] = await db.query(
      `
        SELECT
          COUNT(*) AS cantidad

        FROM productos

        WHERE categoria_id = ?
          AND empresa_id = ?
      `,
      [
        id,
        empresaId,
      ],
    );

    return (
      Number(
        rows[0]?.cantidad ?? 0,
      ) > 0
    );
  }

  if (tipo === "marcas") {
    const [rows] = await db.query(
      `
        SELECT
          COUNT(*) AS cantidad

        FROM productos

        WHERE marca_id = ?
          AND empresa_id = ?
      `,
      [
        id,
        empresaId,
      ],
    );

    return (
      Number(
        rows[0]?.cantidad ?? 0,
      ) > 0
    );
  }

  if (tipo === "colores") {
    const [rows] = await db.query(
      `
        SELECT
          COUNT(*) AS cantidad

        FROM producto_variantes v

        INNER JOIN productos p
          ON p.id = v.producto_id

        WHERE v.color_id = ?
          AND p.empresa_id = ?
      `,
      [
        id,
        empresaId,
      ],
    );

    return (
      Number(
        rows[0]?.cantidad ?? 0,
      ) > 0
    );
  }

  if (tipo === "talles") {
    const [rows] = await db.query(
      `
        SELECT
          COUNT(*) AS cantidad

        FROM producto_variantes v

        INNER JOIN productos p
          ON p.id = v.producto_id

        WHERE v.talle_id = ?
          AND p.empresa_id = ?
      `,
      [
        id,
        empresaId,
      ],
    );

    return (
      Number(
        rows[0]?.cantidad ?? 0,
      ) > 0
    );
  }

  return false;
};

const eliminarElemento = async (
  tipo,
  id,
  empresaId,
) => {
  const configuracion =
    obtenerConfiguracion(tipo);

  const elemento =
    await obtenerElementoPorId(
      tipo,
      id,
      empresaId,
    );

  if (!elemento) {
    return {
      eliminado: false,
      motivo:
        "NO_ENCONTRADO",
    };
  }

  const relacionado =
    await tieneRelaciones(
      tipo,
      id,
      empresaId,
    );

  if (relacionado) {
    return {
      eliminado: false,
      motivo:
        "TIENE_RELACIONES",
    };
  }

  const [result] = await db.query(
    `
      DELETE FROM ${configuracion.tabla}

      WHERE id = ?
        AND empresa_id = ?
    `,
    [
      id,
      empresaId,
    ],
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