/**
 * Seed the initial admin user.
 * Usage: node scripts/create-admin.js
 * 
 * Uses better-sqlite3 directly to avoid ESM/CJS issues with Prisma generated client.
 */
const bcrypt = require("bcryptjs");
const path = require("path");

async function main() {
  const Database = require("better-sqlite3");
  const dbPath = path.resolve(__dirname, "..", "prisma", "dev.db");
  const db = new Database(dbPath);

  const adminEmail = "admin@asteredu.buzz";
  const adminPassword = "Admin@123";
  const adminName = "Admin";

  // Check if user already exists
  const existing = db.prepare("SELECT * FROM User WHERE email = ?").get(adminEmail);

  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    console.log(`Role: ${existing.role}`);
    console.log(`Active: ${existing.isActive}`);
    db.close();
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const id = require("crypto").randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO User (id, name, email, passwordHash, role, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, adminName, adminEmail, passwordHash, "admin", 1, now, now);

  console.log("✅ Admin user created successfully!");
  console.log(`   Name:     ${adminName}`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role:     admin`);
  console.log("");
  console.log("⚠️  IMPORTANT: Change this password after first login via Admin Dashboard!");

  db.close();
}

main();
