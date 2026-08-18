const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
 * =====================================
 * CARPETA DE IMÁGENES
 * =====================================
 *
 * En Railway:
 *
 * process.cwd() = /app
 *
 * por lo tanto físicamente será:
 *
 * /app/uploads/productos
 *
 * y eso está dentro del Volume
 * montado en:
 *
 * /app/uploads
 */

const uploadDirFisico =
  path.join(
    process.cwd(),
    "uploads",
    "productos",
  );

/*
 * Creamos la carpeta productos
 * si todavía no existe.
 */

if (
  !fs.existsSync(
    uploadDirFisico,
  )
) {
  fs.mkdirSync(
    uploadDirFisico,
    {
      recursive: true,
    },
  );
}

/*
 * =====================================
 * STORAGE
 * =====================================
 */

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb,
    ) => {
      /*
       * IMPORTANTE:
       *
       * usamos una ruta RELATIVA.
       *
       * De esta manera req.file.path será:
       *
       * uploads/productos/archivo.jpg
       *
       * y NO:
       *
       * /app/uploads/productos/archivo.jpg
       */

      cb(
        null,
        path.join(
          "uploads",
          "productos",
        ),
      );
    },

    filename: (
      req,
      file,
      cb,
    ) => {
      /*
       * Evitamos problemas con nombres
       * repetidos.
       */

      const extension =
        path.extname(
          file.originalname,
        );

      const nombreBase =
        path
          .basename(
            file.originalname,
            extension,
          )
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "_",
          );

      const nombre =
        `${Date.now()}-${nombreBase}${extension}`;

      cb(
        null,
        nombre,
      );
    },
  });

/*
 * =====================================
 * TIPOS PERMITIDOS
 * =====================================
 */

const fileFilter = (
  req,
  file,
  cb,
) => {
  const tipos = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    tipos.includes(
      file.mimetype,
    )
  ) {
    cb(
      null,
      true,
    );
  } else {
    cb(
      new Error(
        "Solo se permiten imágenes JPG, PNG o WEBP.",
      ),
      false,
    );
  }
};

/*
 * =====================================
 * MULTER
 * =====================================
 */

const upload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,
    },
  });

module.exports =
  upload;