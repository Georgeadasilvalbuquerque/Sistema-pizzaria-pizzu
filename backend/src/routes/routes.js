const express = require("express");
const controller = require("../controllers/controller");

const router = express.Router();

router.post("/auth/register", controller.register);
router.post("/auth/login", controller.login);

router.get("/products", controller.getProducts);
router.post("/products", controller.requireAuth, controller.requireAdmin, controller.createProduct);
router.put("/products/:id", controller.requireAuth, controller.requireAdmin, controller.updateProduct);
router.delete("/products/:id", controller.requireAuth, controller.requireAdmin, controller.removeProduct);

router.get("/cart", controller.requireAuth, controller.getCart);
router.post("/cart/add", controller.requireAuth, controller.addToCart);
router.delete("/cart/remove/:productId", controller.requireAuth, controller.removeFromCart);
router.post("/cart/checkout", controller.requireAuth, controller.checkout);

router.get("/orders", controller.requireAuth, controller.getOrders);

module.exports = router;
