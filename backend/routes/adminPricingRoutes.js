const express = require("express");
const {
  listRules,
  getOperators,
  upsertRule,
  updateRule,
  disableRule,
  previewPricing,
  getDashboardSummary,
  getSales,
} = require("../controllers/adminPricingController");
const {
  protect,
  admin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, admin);

router.get("/operators", getOperators);
router.get("/rules", listRules);
router.post("/rules", upsertRule);
router.patch("/rules/:id", updateRule);
router.delete("/rules/:id", disableRule);

router.post("/preview", previewPricing);
router.get("/summary", getDashboardSummary);
router.get("/sales", getSales);

module.exports = router;