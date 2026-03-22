
const { prisma } = require("../lib/prisma");

async function connectDb() {
  await prisma.$connect();
  console.log("Prisma connected");
}

module.exports = { connectDb };
