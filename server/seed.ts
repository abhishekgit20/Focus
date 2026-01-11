// Seed script to populate database with sample data
import { db } from "./db";
import { users, professionalProfiles, wallets } from "@shared/schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");
  
  try {
    // Create sample client user
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const [client] = await db.insert(users).values({
      email: "rahul@example.com",
      password: hashedPassword,
      role: "client",
      fullName: "Rahul Verma",
      phone: "+91 98765 43210",
      profileImage: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60",
    }).returning();
    
    console.log("✅ Created client user:", client.email);
    
    // Create wallet for client
    await db.insert(wallets).values({
      userId: client.id,
      balance: "500.00",
      totalRecharged: "500.00",
    });
    
    console.log("✅ Created wallet for client");
    
    // Create sample professional user - Dr. Arjun Mehta
    const [professional1] = await db.insert(users).values({
      email: "dr.mehta@focus.com",
      password: hashedPassword,
      role: "professional",
      fullName: "Dr. Arjun Mehta",
      phone: "+91 98765 12345",
      profileImage: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200",
    }).returning();
    
    console.log("✅ Created professional user:", professional1.email);
    
    await db.insert(professionalProfiles).values({
      userId: professional1.id,
      specialization: "Psychiatrist",
      qualification: "MBBS, MD (Psychiatry)",
      experience: 12,
      bio: "Specialized in treating anxiety, depression, and stress-related disorders with a holistic approach combining modern therapy and ancient wisdom.",
      languages: sql`ARRAY['English', 'Hindi', 'Gujarati']::text[]`,
      pricePerMinute: "8.00",
      rating: "4.9",
      totalReviews: 124,
      isOnline: true,
      isAvailable: true,
      licenseNumber: "MH-PSY-2012-45678",
    });
    
    console.log("✅ Created professional profile for Dr. Mehta");
    
    // Create more professionals
    const professionals = [
      {
        email: "dr.sharma@focus.com",
        fullName: "Dr. Priya Sharma",
        specialization: "Clinical Psychologist",
        qualification: "MA, PhD (Clinical Psychology)",
        experience: 8,
        bio: "Expert in cognitive behavioral therapy and mindfulness-based interventions for depression and anxiety.",
        languages: sql`ARRAY['English', 'Hindi', 'Marathi']::text[]`,
        pricePerMinute: "6.50",
        profileImage: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200&h=200",
        rating: "4.8",
        totalReviews: 89,
      },
      {
        email: "dr.kumar@focus.com",
        fullName: "Dr. Rajesh Kumar",
        specialization: "Counseling Psychologist",
        qualification: "MA (Psychology), MPhil (Clinical Psychology)",
        experience: 6,
        bio: "Helping individuals navigate relationship issues, career stress, and life transitions with compassionate counseling.",
        languages: sql`ARRAY['English', 'Hindi', 'Tamil']::text[]`,
        pricePerMinute: "5.00",
        profileImage: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200&h=200",
        rating: "4.7",
        totalReviews: 56,
      },
      {
        email: "dr.singh@focus.com",
        fullName: "Dr. Aisha Singh",
        specialization: "Trauma Specialist",
        qualification: "MBBS, MD (Psychiatry), Fellowship in Trauma",
        experience: 10,
        bio: "Specialized in PTSD, trauma recovery, and helping survivors heal through evidence-based therapies.",
        languages: sql`ARRAY['English', 'Hindi', 'Punjabi']::text[]`,
        pricePerMinute: "7.50",
        profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200",
        rating: "4.9",
        totalReviews: 102,
      },
    ];
    
    for (const prof of professionals) {
      const [user] = await db.insert(users).values({
        email: prof.email,
        password: hashedPassword,
        role: "professional",
        fullName: prof.fullName,
        phone: "+91 98765 00000",
        profileImage: prof.profileImage,
      }).returning();
      
      await db.insert(professionalProfiles).values({
        userId: user.id,
        specialization: prof.specialization,
        qualification: prof.qualification,
        experience: prof.experience,
        bio: prof.bio,
        languages: prof.languages,
        pricePerMinute: prof.pricePerMinute,
        rating: prof.rating,
        totalReviews: prof.totalReviews,
        isOnline: Math.random() > 0.5,
        isAvailable: true,
        licenseNumber: `MH-${prof.specialization.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 100000)}`,
      });
      
      console.log("✅ Created professional:", prof.fullName);
    }
    
    // Create admin user
    const [admin] = await db.insert(users).values({
      email: "admin@focus.com",
      password: hashedPassword,
      role: "admin",
      fullName: "Focus Admin",
      phone: "+91 99999 99999",
    }).returning();
    
    console.log("✅ Created admin user:", admin.email);
    
    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📝 Test credentials:");
    console.log("Client: rahul@example.com / password123");
    console.log("Professional: dr.mehta@focus.com / password123");
    console.log("Admin: admin@focus.com / password123");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
  
  process.exit(0);
}

seed();
