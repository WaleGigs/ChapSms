const express = require("express");
const {
  listRules,
  upsertRule,
  updateRule,
  disableRule,
  previewPricing,
  getDashboardSummary,
  getSales,
  getPayments,
} = require("../controllers/adminPricingController");
const {
  protect,
  admin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, admin);

router.get("/rules", listRules);
router.post("/rules", upsertRule);
router.patch("/rules/:id", updateRule);
router.delete("/rules/:id", disableRule);

router.post("/preview", previewPricing);
router.get("/summary", getDashboardSummary);
router.get("/sales", getSales);
router.get("/payments", getPayments);

module.exports = router;
