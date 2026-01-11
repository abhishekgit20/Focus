// Script to create admin user
import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function createAdmin() {
  console.log("🔐 Creating admin user...");
  
  try {
    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(
      (users, { eq }) => eq(users.email, "admin@focus.com")
    ).limit(1);

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists!");
      console.log("📧 Email: admin@focus.com");
      console.log("🔑 Password: (check your database or reset it)");
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const [admin] = await db.insert(users).values({
      email: "admin@focus.com",
      password: hashedPassword,
      role: "admin",
      fullName: "Focus Admin",
      phone: "+91 99999 99999",
    }).returning();
    
    console.log("✅ Admin user created successfully!");
    console.log("\n📝 Admin Credentials:");
    console.log("   Email: admin@focus.com");
    console.log("   Password: password123");
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error creating admin user:", error.message);
    if (error.code === '23505') {
      console.error("   Admin user already exists!");
    }
    process.exit(1);
  }
}

createAdmin();



