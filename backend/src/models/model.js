const crypto = require("crypto");
const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function normalizeRole(role) {
  if (!role) return "CLIENTE";
  if (role === "USUARIO") return "CLIENTE";
  if (role === "ADMIN" || role === "CLIENTE") return role;
  return "CLIENTE";
}

async function createUser({ name, email, passwordHash, role }) {
  const created = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: normalizeRole(role),
    },
  });
  return sanitizeUser(created);
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id: Number(id) },
  });
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: Number(userId),
    },
  });
  return token;
}

async function findUserByToken(token) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < new Date()) return null;
  return session.user || null;
}

async function listProducts() {
  return prisma.product.findMany({
    orderBy: { id: "asc" },
  });
}

function normalizeImageUrl(url) {
  if (url === undefined || url === null) return null;
  const s = String(url).trim();
  return s.length ? s : null;
}

async function createProduct({ name, price, description, imageUrl }) {
  return prisma.product.create({
    data: {
      name,
      price: new Prisma.Decimal(Number(price)),
      description: description || "",
      imageUrl: normalizeImageUrl(imageUrl),
    },
  });
}

async function updateProduct(id, payload) {
  const existing = await prisma.product.findUnique({
    where: { id: Number(id) },
  });
  if (!existing) return null;

  return prisma.product.update({
    where: { id: Number(id) },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.price !== undefined ? { price: new Prisma.Decimal(Number(payload.price)) } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.imageUrl !== undefined ? { imageUrl: normalizeImageUrl(payload.imageUrl) } : {}),
    },
  });
}

async function deleteProduct(id) {
  try {
    await prisma.product.delete({
      where: { id: Number(id) },
    });
    return true;
  } catch (_error) {
    return false;
  }
}

async function addProductToCart(userId, productId, quantity = 1) {
  const userIdNumber = Number(userId);
  const productIdNumber = Number(productId);
  const product = await prisma.product.findUnique({
    where: { id: productIdNumber },
  });
  if (!product) return { error: "Produto nao encontrado." };

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: userIdNumber,
        productId: productIdNumber,
      },
    },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + Number(quantity) },
    });
    return { cart: true };
  }

  await prisma.cartItem.create({
    data: {
      userId: userIdNumber,
      productId: productIdNumber,
      quantity: Number(quantity),
    },
  });
  return { cart: true };
}

async function removeProductFromCart(userId, productId) {
  const deleted = await prisma.cartItem.deleteMany({
    where: {
      userId: Number(userId),
      productId: Number(productId),
    },
  });
  return deleted.count > 0;
}

async function getDetailedCart(userId) {
  const cart = await prisma.cartItem.findMany({
    where: { userId: Number(userId) },
    include: { product: true },
    orderBy: { id: "asc" },
  });

  const items = cart.map((item) => {
    const price = Number(item.product.price);
    return {
      productId: item.product.id,
      name: item.product.name,
      price,
      quantity: item.quantity,
      subtotal: Number((price * item.quantity).toFixed(2)),
    };
  });

  const total = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  return { items, total };
}

async function checkout(userId) {
  const userIdNumber = Number(userId);
  const cartDetails = await getDetailedCart(userIdNumber);
  if (!cartDetails.items.length) return { error: "Carrinho vazio." };

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        userId: userIdNumber,
        total: new Prisma.Decimal(cartDetails.total),
        status: "FINALIZADO",
        items: {
          create: cartDetails.items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            unitPrice: new Prisma.Decimal(item.price),
            quantity: item.quantity,
            subtotal: new Prisma.Decimal(item.subtotal),
          })),
        },
      },
      include: { items: true },
    });

    await tx.cartItem.deleteMany({
      where: { userId: userIdNumber },
    });

    return createdOrder;
  });

  return { order };
}

async function listOrdersForUser(user) {
  if (user.role === "ADMIN") {
    return prisma.order.findMany({
      include: { items: true, user: true },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Fotos ilustrativas (Unsplash) — substitua por URLs proprias se preferir. */
const PRODUCT_IMAGE_SEED = {
  Margherita: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&auto=format&fit=crop",
  Calabresa: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80&auto=format&fit=crop",
  "Frango com Catupiry": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&auto=format&fit=crop",
  "Quatro Queijos": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80&auto=format&fit=crop",
};

async function backfillProductImagesFromSeed() {
  for (const [name, imageUrl] of Object.entries(PRODUCT_IMAGE_SEED)) {
    await prisma.product.updateMany({
      where: { name, imageUrl: null },
      data: { imageUrl },
    });
  }
}

async function bootstrapInitialData({ testPasswordHash }) {
  const seedUsers = [
    { name: "Usuario Teste", email: "usuario@pizzu.test", role: "CLIENTE" },
    { name: "Administrador Teste", email: "admin@pizzu.test", role: "ADMIN" },
  ];

  for (const u of seedUsers) {
    const exists = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (!exists) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          passwordHash: testPasswordHash,
          role: u.role,
        },
      });
    }
  }

  const productsCount = await prisma.product.count();
  if (productsCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: "Margherita",
          price: new Prisma.Decimal(39.9),
          description: "Molho, mussarela e manjericao.",
          imageUrl: PRODUCT_IMAGE_SEED.Margherita,
        },
        {
          name: "Calabresa",
          price: new Prisma.Decimal(44.9),
          description: "Calabresa, cebola e mussarela.",
          imageUrl: PRODUCT_IMAGE_SEED.Calabresa,
        },
        {
          name: "Frango com Catupiry",
          price: new Prisma.Decimal(47.9),
          description: "Frango desfiado e catupiry.",
          imageUrl: PRODUCT_IMAGE_SEED["Frango com Catupiry"],
        },
        {
          name: "Quatro Queijos",
          price: new Prisma.Decimal(49.9),
          description: "Mussarela, provolone, parmesao e gorgonzola.",
          imageUrl: PRODUCT_IMAGE_SEED["Quatro Queijos"],
        },
      ],
    });
  }

  await backfillProductImagesFromSeed();
}

module.exports = {
  sanitizeUser,
  createUser,
  findUserByEmail,
  createSession,
  findUserByToken,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductToCart,
  removeProductFromCart,
  getDetailedCart,
  checkout,
  listOrdersForUser,
  bootstrapInitialData,
};
