const express = require("express");
const cors = require("cors");

require("dotenv").config();

const db = require("./config/db");

// =======================
// RUTAS
// =======================

const authRoutes = require(
  "./routes/authRoutes",
);

const productosRoutes = require(
  "./routes/productosRoutes",
);

const proveedoresRoutes = require(
  "./routes/proveedoresRoutes",
);

const variantesRoutes = require(
  "./routes/variantesRoutes",
);

const imagenesRoutes = require(
  "./routes/imagenesRoutes",
);

const ingresosRoutes = require(
  "./routes/ingresosRoutes",
);

const catalogosRoutes = require(
  "./routes/catalogosRoutes",
);

const movimientosRoutes = require(
  "./routes/movimientosRoutes",
);

const reportesRoutes = require(
  "./routes/reportesRoutes",
);

const dashboardRoutes = require(
  "./routes/dashboardRoutes",
);

const ventasRoutes = require(
  "./routes/ventasRoutes",
);

const clientesRoutes = require(
  "./routes/clientesRoutes",
);

const catalogosAdminRoutes = require(
  "./routes/catalogosAdminRoutes",
);

const ajustesStockRoutes = require(
  "./routes/ajustesStockRoutes",
);

const configuracionRoutes = require(
  "./routes/configuracionRoutes",
);

const usuariosRoutes = require(
  "./routes/usuariosRoutes",
);

// =======================
// AUTENTICACIÓN
// =======================

const {
  verificarAutenticacion,
} = require(
  "./middlewares/authMiddleware",
);

// =======================
// APP
// =======================

const app = express();

// =======================
// MIDDLEWARES GENERALES
// =======================

app.use(cors());

app.use(express.json());

// =======================
// ARCHIVOS PÚBLICOS
// =======================

app.use(
  "/uploads",
  express.static("uploads"),
);

// =======================
// RUTA PRINCIPAL
// =======================

app.get("/", (req, res) => {
  res.json({
    app: "Stock System",
    version: "1.0.0",
    status: "OK",
  });
});

// =======================
// RUTAS PÚBLICAS
// =======================

/*
 * IMPORTANTE:
 * auth debe declararse ANTES
 * del middleware de autenticación.
 *
 * De lo contrario /login también
 * pediría un token.
 */
app.use(
  "/api/auth",
  authRoutes,
);

// =======================
// PROTECCIÓN GLOBAL API
// =======================

/*
 * Todo lo declarado desde acá
 * requiere un JWT válido.
 */
app.use(
  "/api",
  verificarAutenticacion,
);

// =======================
// RUTAS PROTEGIDAS
// =======================

app.use(
  "/api/productos",
  productosRoutes,
);

app.use(
  "/api/variantes",
  variantesRoutes,
);

app.use(
  "/api/imagenes",
  imagenesRoutes,
);

app.use(
  "/api/ingresos",
  ingresosRoutes,
);

app.use(
  "/api/movimientos",
  movimientosRoutes,
);

app.use(
  "/api/ventas",
  ventasRoutes,
);

app.use(
  "/api/clientes",
  clientesRoutes,
);

app.use(
  "/api/dashboard",
  dashboardRoutes,
);

app.use(
  "/api/proveedores",
  proveedoresRoutes,
);

app.use(
  "/api/reportes",
  reportesRoutes,
);

app.use(
  "/api/admin/catalogos",
  catalogosAdminRoutes,
);

app.use(
  "/api/ajustes-stock",
  ajustesStockRoutes,
);

app.use(
  "/api/configuracion",
  configuracionRoutes,
);

/*
 * Este router está montado sobre /api
 * porque seguramente contiene rutas
 * como /api/categorias, /api/marcas, etc.
 */
app.use(
  "/api",
  catalogosRoutes,
);

app.use(
  "/api/usuarios",
  usuariosRoutes,
);

// =======================
// TEST BASE DE DATOS
// =======================

/*
 * Al estar después del middleware
 * global, esta ruta también requiere
 * estar autenticado.
 */
app.get(
  "/api/test-db",
  async (req, res) => {
    try {
      const [rows] =
        await db.query(
          "SELECT NOW() AS fecha",
        );

      res.json({
        ok: true,
        servidor:
          "Backend funcionando",
        mysql: "Conectado",
        fecha: rows[0].fecha,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        ok: false,
        error: error.message,
        code: error.code,
      });
    }
  },
);

// =======================
// RUTA INEXISTENTE
// =======================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      "Ruta no encontrada.",
  });
});

// =======================
// INICIO SERVIDOR
// =======================

const PORT =
  process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `Servidor iniciado en puerto ${PORT}`,
  );
});