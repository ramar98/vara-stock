const fs = require("fs");
const path = require("path");

const db = require("../config/db");

function normalizarRuta(ruta) {
  return String(ruta ?? "").replaceAll("\\", "/");
}

function obtenerRutaFisica(rutaGuardada) {
  const rutaNormalizada = normalizarRuta(rutaGuardada);

  return path.resolve(
    __dirname,
    "..",
    rutaNormalizada,
  );
}

const obtenerImagenPorId = async (id) => {
  const [rows] = await db.query(
    `
      SELECT
        id,
        producto_id,
        ruta,
        principal,
        created_at

      FROM producto_imagenes

      WHERE id = ?

      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

const obtenerImagenes = async (productoId) => {
  const [rows] = await db.query(
    `
      SELECT
        id,
        producto_id,
        ruta,
        principal,
        created_at

      FROM producto_imagenes

      WHERE producto_id = ?

      ORDER BY
        principal DESC,
        id ASC
    `,
    [productoId],
  );

  return rows;
};

const guardarImagen = async ({
  producto_id,
  ruta,
  principal = false,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [producto] = await connection.query(
      `
        SELECT id

        FROM productos

        WHERE id = ?
          AND activo = TRUE

        LIMIT 1
      `,
      [producto_id],
    );

    if (producto.length === 0) {
      const error = new Error(
        "El producto seleccionado no existe.",
      );

      error.code = "PRODUCTO_NO_ENCONTRADO";

      throw error;
    }

    const [imagenesExistentes] =
      await connection.query(
        `
          SELECT COUNT(*) AS cantidad

          FROM producto_imagenes

          WHERE producto_id = ?
        `,
        [producto_id],
      );

    const esPrimeraImagen =
      Number(imagenesExistentes[0].cantidad) === 0;

    const debeSerPrincipal =
      esPrimeraImagen || Boolean(principal);

    if (debeSerPrincipal) {
      await connection.query(
        `
          UPDATE producto_imagenes

          SET principal = FALSE

          WHERE producto_id = ?
        `,
        [producto_id],
      );
    }

    const rutaNormalizada = normalizarRuta(ruta);

    const [result] = await connection.query(
      `
        INSERT INTO producto_imagenes
        (
          producto_id,
          ruta,
          principal
        )

        VALUES (?, ?, ?)
      `,
      [
        producto_id,
        rutaNormalizada,
        debeSerPrincipal,
      ],
    );

    await connection.commit();

    return obtenerImagenPorId(result.insertId);
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
};

const marcarComoPrincipal = async (id) => {
  const imagen = await obtenerImagenPorId(id);

  if (!imagen) {
    return null;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE producto_imagenes

        SET principal = FALSE

        WHERE producto_id = ?
      `,
      [imagen.producto_id],
    );

    await connection.query(
      `
        UPDATE producto_imagenes

        SET principal = TRUE

        WHERE id = ?
      `,
      [id],
    );

    await connection.commit();

    return obtenerImagenPorId(id);
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
};

const eliminarImagen = async (id) => {
  const imagen = await obtenerImagenPorId(id);

  if (!imagen) {
    return {
      eliminada: false,
      motivo: "NO_ENCONTRADA",
    };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM producto_imagenes

        WHERE id = ?
      `,
      [id],
    );

    if (Boolean(imagen.principal)) {
      const [imagenesRestantes] =
        await connection.query(
          `
            SELECT id

            FROM producto_imagenes

            WHERE producto_id = ?

            ORDER BY id ASC

            LIMIT 1
          `,
          [imagen.producto_id],
        );

      if (imagenesRestantes.length > 0) {
        await connection.query(
          `
            UPDATE producto_imagenes

            SET principal = TRUE

            WHERE id = ?
          `,
          [imagenesRestantes[0].id],
        );
      }
    }

    await connection.commit();

    const rutaFisica = obtenerRutaFisica(
      imagen.ruta,
    );

    try {
      if (fs.existsSync(rutaFisica)) {
        fs.unlinkSync(rutaFisica);
      }
    } catch (errorArchivo) {
      console.error(
        "No se pudo eliminar el archivo físico:",
        errorArchivo,
      );
    }

    return {
      eliminada: true,
      producto_id: imagen.producto_id,
    };
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerImagenPorId,
  obtenerImagenes,
  guardarImagen,
  marcarComoPrincipal,
  eliminarImagen,
};