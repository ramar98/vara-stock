const express = require(
  "express",
);

const router =
  express.Router();

const empresasController =
  require(
    "../controllers/empresasController",
  );

/*
 * =====================================
 * ALTA DE NUEVA EMPRESA
 * =====================================
 *
 * Endpoint de onboarding.
 *
 * NO requiere una empresa existente.
 */

router.post(
  "/",
  empresasController.crearEmpresa,
);

module.exports = router;