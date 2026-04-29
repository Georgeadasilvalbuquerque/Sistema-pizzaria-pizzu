const db = {
  users: [
    {
      id: 1,
      name: "Administrador",
      email: "admin@pizzaria.com",
      password: "123456",
      role: "ADMIN",
    },
  ],
  products: [
    { id: 1, name: "Margherita", price: 39.9, description: "Molho, mussarela e manjericao." },
    { id: 2, name: "Calabresa", price: 44.9, description: "Calabresa, cebola e mussarela." },
    { id: 3, name: "Frango com Catupiry", price: 47.9, description: "Frango desfiado e catupiry." },
    { id: 4, name: "Quatro Queijos", price: 49.9, description: "Mussarela, provolone, parmesao e gorgonzola." },
  ],
  carts: {},
  orders: [],
  sessions: {},
  counters: {
    users: 2,
    products: 5,
    orders: 1,
  },
};

module.exports = db;
