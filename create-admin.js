// Quick script to create admin user
// Run with: node create-admin.js

import bcrypt from 'bcryptjs';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in .env file');
  console.log('Please make sure your .env file has DATABASE_URL set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Check if admin exists
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@focus.com']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email: admin@focus.com');
      console.log('🔑 You can reset the password if needed');
      await pool.end();
      process.exit(0);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create admin user
    await pool.query(`
      INSERT INTO users (id, email, password, role, full_name, phone, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
    `, [
      'admin@focus.com',
      hashedPassword,
      'admin',
      'Focus Admin',
      '+91 99999 99999'
    ]);
    
    console.log('✅ Admin user created successfully!');
    console.log('\n📝 Admin Credentials:');
    console.log('   Email: admin@focus.com');
    console.log('   Password: password123');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === '23505') {
      console.error('   Admin user already exists!');
    }
    await pool.end();
    process.exit(1);
  }
}

createAdmin();



