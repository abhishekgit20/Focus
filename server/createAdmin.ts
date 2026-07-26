// Script to create admin user
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./security/passwordHashing";
import { isUniqueViolation } from "./lib/dbErrors";
import crypto from "crypto";
import "dotenv/config";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@focus.com";

function generateSecurePassword(): string {
  return crypto.randomBytes(18).toString("base64url");
}

async function createAdmin() {
  console.log("🔐 Creating admin user...");

  try {
    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists!");
      console.log(`📧 Email: ${ADMIN_EMAIL}`);
      console.log("🔑 Password: (check your database or reset it)");
      process.exit(0);
    }

    // Create admin user with a freshly generated random password
    const generatedPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    await db.insert(users).values({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      fullName: "Focus Admin",
      phone: "+91 99999 99999",
      emailVerified: true,
    }).returning();

    console.log("✅ Admin user created successfully!");
    console.log("\n📝 Admin Credentials (shown only this once):");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${generatedPassword}`);
    console.log("\n⚠️  IMPORTANT: Store this password in a password manager now. Change it after first login.");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error creating admin user:", error.message);
    if (isUniqueViolation(error)) {
      console.error("   Admin user already exists!");
    }
    process.exit(1);
  }
}

createAdmin();



