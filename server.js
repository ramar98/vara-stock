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

app.get(
  "/",
  (req, res) => {
    res.json({
      app: "Stock System",
      version: "1.0.0",
      status: "OK",
    });
  },
);

// =======================
// RUTAS PÚBLICAS
// =======================

/*
 * IMPORTANTE:
 * Auth debe declararse ANTES
 * del middleware global de autenticación.
 *
 * De lo contrario /api/auth/login
 * también pediría token.
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
 *
 * verificarAutenticacion deja disponibles:
 *
 * req.usuario
 * req.usuarioId
 * req.empresaId
 * req.rol
 * req.rolId
 */

app.use(
  "/api",
  verificarAutenticacion,
);

// =======================
// RUTAS PROTEGIDAS
// =======================

/*
 * PRODUCTOS
 */

app.use(
  "/api/productos",
  productosRoutes,
);

/*
 * VARIANTES
 */

app.use(
  "/api/variantes",
  variantesRoutes,
);

/*
 * IMÁGENES
 */

app.use(
  "/api/imagenes",
  imagenesRoutes,
);

/*
 * INGRESOS / COMPRAS
 */

app.use(
  "/api/ingresos",
  ingresosRoutes,
);

/*
 * MOVIMIENTOS DE STOCK
 */

app.use(
  "/api/movimientos",
  movimientosRoutes,
);

/*
 * VENTAS
 */

app.use(
  "/api/ventas",
  ventasRoutes,
);

/*
 * CLIENTES
 */

app.use(
  "/api/clientes",
  clientesRoutes,
);

/*
 * DASHBOARD
 */

app.use(
  "/api/dashboard",
  dashboardRoutes,
);

/*
 * PROVEEDORES
 */

app.use(
  "/api/proveedores",
  proveedoresRoutes,
);

/*
 * REPORTES
 */

app.use(
  "/api/reportes",
  reportesRoutes,
);

/*
 * CATÁLOGOS ADMINISTRATIVOS
 *
 * Ejemplo:
 * /api/admin/catalogos/categorias
 * /api/admin/catalogos/marcas
 */

app.use(
  "/api/admin/catalogos",
  catalogosAdminRoutes,
);

/*
 * AJUSTES DE STOCK
 */

app.use(
  "/api/ajustes-stock",
  ajustesStockRoutes,
);

/*
 * CONFIGURACIÓN DEL NEGOCIO
 */

app.use(
  "/api/configuracion",
  configuracionRoutes,
);

/*
 * ============================
 * USUARIOS
 * ============================
 *
 * IMPORTANTE:
 *
 * Esta ruta debe estar ANTES
 * de catalogosRoutes.
 *
 * catalogosRoutes está montado
 * directamente sobre /api y puede
 * contener rutas dinámicas como:
 *
 * /:tipo
 *
 * Si usuarios estuviera después,
 * Express podría interpretar:
 *
 * /api/usuarios
 *
 * como:
 *
 * tipo = "usuarios"
 */

app.use(
  "/api/usuarios",
  usuariosRoutes,
);

/*
 * ============================
 * CATÁLOGOS GENERALES
 * ============================
 *
 * IMPORTANTE:
 *
 * Este router está montado sobre
 * /api porque contiene rutas como:
 *
 * /api/categorias
 * /api/marcas
 * /api/colores
 * /api/talles
 *
 * Debe quedar DESPUÉS de las rutas
 * específicas para evitar que una
 * ruta dinámica intercepte:
 *
 * /api/usuarios
 * /api/dashboard
 * /api/ventas
 * etc.
 */

app.use(
  "/api",
  catalogosRoutes,
);

// =======================
// TEST BASE DE DATOS
// =======================

/*
 * Al estar después del middleware
 * global:
 *
 * app.use("/api", verificarAutenticacion)
 *
 * esta ruta también requiere
 * autenticación.
 */

app.get(
  "/api/test-db",
  async (
    req,
    res,
  ) => {
    try {
      const [rows] =
        await db.query(
          "SELECT NOW() AS fecha",
        );

      res.json({
        ok: true,

        servidor:
          "Backend funcionando",

        mysql:
          "Conectado",

        fecha:
          rows[0].fecha,

        empresa_id:
          req.empresaId ??
          null,

        usuario_id:
          req.usuarioId ??
          null,
      });
    } catch (error) {
      console.error(
        "Error test-db:",
        error,
      );

      res
        .status(500)
        .json({
          ok: false,

          error:
            error.message,

          code:
            error.code,
        });
    }
  },
);

// =======================
// RUTA INEXISTENTE
// =======================

app.use(
  (
    req,
    res,
  ) => {
    res
      .status(404)
      .json({
        success: false,

        message:
          "Ruta no encontrada.",
      });
  },
);

// =======================
// INICIO SERVIDOR
// =======================

const PORT =
  process.env.PORT ||
  3001;

app.listen(
  PORT,
  () => {
    console.log(
      `Servidor iniciado en puerto ${PORT}`,
    );
  },
);