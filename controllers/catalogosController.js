const db = require("../config/db");

async function obtenerCatalogo({
  tabla,
  columnas = "id, nombre",
  orden = "nombre ASC",
}) {

  const tablasPermitidas = [
    "categorias",
    "marcas",
    "proveedores",
    "colores",
    "talles",
  ];

  if (!tablasPermitidas.includes(tabla)) {
    throw new Error("Catálogo no permitido.");
  }

  const [rows] = await db.query(`
    SELECT ${columnas}
    FROM ${tabla}
    ORDER BY ${orden}
  `);

  return rows;
}

function responderError(res, error, catalogo) {
  console.error(
    `Error obteniendo ${catalogo}:`,
    error,
  );

  return res.status(500).json({
    success: false,
    message: `No se pudo obtener el catálogo de ${catalogo}.`,
    error:
      process.env.NODE_ENV === "development"
        ? {
          code: error.code,
          detail: error.message,
        }
        : undefined,
  });
}

exports.obtenerCategorias = async (req, res) => {
  try {
    const categorias = await obtenerCatalogo({
      tabla: "categorias",
    });

    return res.status(200).json({
      success: true,
      data: categorias,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "categorías",
    );
  }
};

exports.obtenerMarcas = async (req, res) => {
  try {
    const marcas = await obtenerCatalogo({
      tabla: "marcas",
    });

    return res.status(200).json({
      success: true,
      data: marcas,
    });
  } catch (error) {
    return responderError(res, error, "marcas");
  }
};

exports.obtenerProveedores = async (req, res) => {
  try {
    const proveedores = await obtenerCatalogo({
      tabla: "proveedores",
      columnas:
        "id, nombre, telefono, email, direccion, observaciones",
    });

    return res.status(200).json({
      success: true,
      data: proveedores,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "proveedores",
    );
  }
};

exports.obtenerColores = async (req, res) => {
  try {
    const colores = await obtenerCatalogo({
      tabla: "colores",
    });

    return res.status(200).json({
      success: true,
      data: colores,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "colores",
    );
  }
};

exports.obtenerTalles = async (req, res) => {
  try {
    const talles = await obtenerCatalogo({
      tabla: "talles",
    });

    return res.status(200).json({
      success: true,
      data: talles,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "talles",
    );
  }
};