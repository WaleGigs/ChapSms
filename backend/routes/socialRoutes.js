const express =
  require("express");

const {
  getCatalog,
  refreshCatalog,
  buySocialProduct,
  getOrders,
} = require(
  "../controllers/socialController"
);

const {
  getAdminCatalog,
  setVisibility,
  getHouseProducts,
  createHouseProduct,
  updateHouseProduct,
  addHouseStock,
} = require(
  "../controllers/socialAdminController"
);

const {
  protect,
  admin,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

/*
 * All social endpoints require authentication.
 */
router.use(protect);

/* =========================================================
   CUSTOMER
========================================================= */

router.get(
  "/catalog",
  getCatalog
);

router.get(
  "/orders",
  getOrders
);

router.post(
  "/orders",
  buySocialProduct
);

/* =========================================================
   ADMIN
========================================================= */

router.get(
  "/admin/catalog",
  admin,
  getAdminCatalog
);

router.patch(
  "/admin/visibility",
  admin,
  setVisibility
);

router.get(
  "/admin/house-products",
  admin,
  getHouseProducts
);

router.post(
  "/admin/house-products",
  admin,
  createHouseProduct
);

router.patch(
  "/admin/house-products/:id",
  admin,
  updateHouseProduct
);

router.post(
  "/admin/house-products/:id/stock",
  admin,
  addHouseStock
);

/*
 * Manual upstream refresh.
 */
router.post(
  "/refresh",
  admin,
  refreshCatalog
);

module.exports =
  router;