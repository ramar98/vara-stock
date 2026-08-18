const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir =
  path.join(
    process.cwd(),
    "uploads",
    "productos",
  );

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(
    uploadDir,
    {
      recursive: true,
    },
  );
}

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb,
    ) => {
      cb(
        null,
        uploadDir,
      );
    },

    filename: (
      req,
      file,
      cb,
    ) => {
      const nombre =
        Date.now() +
        "-" +
        file.originalname;

      cb(
        null,
        nombre,
      );
    },
  });

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

const upload = multer({
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