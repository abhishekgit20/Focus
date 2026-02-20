// Production Readiness Checker
// Run with: npx tsx scripts/check-production-ready.ts

import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, message: string, warning = false) {
  results.push({
    name,
    status: condition ? "pass" : warning ? "warning" : "fail",
    message,
  });
}

console.log("🔍 Checking Production Readiness...\n");

// 1. Environment Variables
console.log("📋 Checking Environment Variables...");
const envFile = join(process.cwd(), ".env");
let envExists = false;
let envContent = "";

try {
  envContent = readFileSync(envFile, "utf-8");
  envExists = true;
} catch {
  check("Environment File", false, ".env file not found");
}

if (envExists) {
  check("Environment File", true, ".env file exists");
  
  const requiredVars = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "NODE_ENV",
  ];
  
  const optionalVars = [
    "BASE_URL",
    "FRONTEND_URL",
    "STRIPE_SECRET_KEY",
    "RAZORPAY_KEY_ID",
    "GOOGLE_CLIENT_ID",
    "OPENAI_API_KEY",
  ];
  
  requiredVars.forEach((varName) => {
    const exists = envContent.includes(`${varName}=`);
    check(
      `Required: ${varName}`,
      exists,
      exists ? `${varName} is set` : `${varName} is missing (REQUIRED)`
    );
  });
  
  optionalVars.forEach((varName) => {
    const exists = envContent.includes(`${varName}=`);
    check(
      `Optional: ${varName}`,
      true,
      exists ? `${varName} is set` : `${varName} is not set (optional)`,
      true
    );
  });
  
  // Check SESSION_SECRET length
  const sessionSecretMatch = envContent.match(/SESSION_SECRET=(.+)/);
  if (sessionSecretMatch) {
    const secret = sessionSecretMatch[1].trim();
    check(
      "SESSION_SECRET Length",
      secret.length >= 32,
      secret.length >= 32
        ? `SESSION_SECRET is ${secret.length} characters (good)`
        : `SESSION_SECRET is only ${secret.length} characters (should be at least 32)`
    );
  }
  
  // Check NODE_ENV
  const nodeEnvMatch = envContent.match(/NODE_ENV=(.+)/);
  if (nodeEnvMatch) {
    const nodeEnv = nodeEnvMatch[1].trim();
    check(
      "NODE_ENV",
      nodeEnv === "production",
      nodeEnv === "production"
        ? "NODE_ENV is set to production"
        : `NODE_ENV is ${nodeEnv} (should be 'production' for production)`,
      nodeEnv !== "production"
    );
  }
}

// 2. Security Files
console.log("\n🔒 Checking Security Configuration...");

const securityFile = join(process.cwd(), "server/middleware/security.ts");
try {
  readFileSync(securityFile, "utf-8");
  check("Security Middleware", true, "security.ts exists");
} catch {
  check("Security Middleware", false, "security.ts not found");
}

const rateLimiterFile = join(process.cwd(), "server/rateLimiter.ts");
try {
  readFileSync(rateLimiterFile, "utf-8");
  check("Rate Limiter", true, "rateLimiter.ts exists");
} catch {
  check("Rate Limiter", false, "rateLimiter.ts not found");
}

// 3. Error Handling
console.log("\n⚠️  Checking Error Handling...");

const errorHandlerFile = join(process.cwd(), "server/middleware/errorHandler.ts");
try {
  readFileSync(errorHandlerFile, "utf-8");
  check("Error Handler", true, "errorHandler.ts exists");
} catch {
  check("Error Handler", false, "errorHandler.ts not found");
}

// 4. Monitoring
console.log("\n📊 Checking Monitoring...");

const monitoringFile = join(process.cwd(), "server/middleware/monitoring.ts");
try {
  readFileSync(monitoringFile, "utf-8");
  check("Monitoring Middleware", true, "monitoring.ts exists");
} catch {
  check("Monitoring Middleware", false, "monitoring.ts not found");
}

// 5. Environment Validation
console.log("\n✅ Checking Environment Validation...");

const envValidationFile = join(process.cwd(), "server/env.ts");
try {
  readFileSync(envValidationFile, "utf-8");
  check("Environment Validation", true, "env.ts exists");
} catch {
  check("Environment Validation", false, "env.ts not found");
}

// 6. Database Configuration
console.log("\n🗄️  Checking Database Configuration...");

const dbFile = join(process.cwd(), "server/db.ts");
try {
  const dbContent = readFileSync(dbFile, "utf-8");
  check("Database File", true, "db.ts exists");
  
  // Check for connection pooling
  check(
    "Connection Pooling",
    dbContent.includes("max:") && dbContent.includes("min:"),
    "Connection pooling configured"
  );
  
  // Check for error handling
  check(
    "Database Error Handling",
    dbContent.includes("pool.on('error'"),
    "Database error handling configured"
  );
} catch {
  check("Database File", false, "db.ts not found");
}

// 7. Documentation
console.log("\n📚 Checking Documentation...");

const productionReadme = join(process.cwd(), "PRODUCTION_README.md");
check(
  "Production README",
  existsSync(productionReadme),
  existsSync(productionReadme)
    ? "PRODUCTION_README.md exists"
    : "PRODUCTION_README.md not found"
);

const envExample = join(process.cwd(), ".env.example");
check(
  ".env.example",
  existsSync(envExample),
  existsSync(envExample)
    ? ".env.example exists"
    : ".env.example not found"
);

// 8. Build Configuration
console.log("\n🔨 Checking Build Configuration...");

const dockerfile = join(process.cwd(), "Dockerfile");
check(
  "Dockerfile",
  existsSync(dockerfile),
  existsSync(dockerfile)
    ? "Dockerfile exists"
    : "Dockerfile not found (optional but recommended)"
);

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8")
);

check(
  "Build Script",
  !!packageJson.scripts?.build,
  packageJson.scripts?.build
    ? "Build script exists"
    : "Build script not found"
);

check(
  "Start Script",
  !!packageJson.scripts?.start,
  packageJson.scripts?.start
    ? "Start script exists"
    : "Start script not found"
);

// 9. Server Configuration
console.log("\n🖥️  Checking Server Configuration...");

const serverIndex = join(process.cwd(), "server/index.ts");
try {
  const serverContent = readFileSync(serverIndex, "utf-8");
  
  check(
    "Security Headers",
    serverContent.includes("securityHeaders"),
    "Security headers middleware integrated"
  );
  
  check(
    "Request ID",
    serverContent.includes("requestId"),
    "Request ID tracking integrated"
  );
  
  check(
    "Error Handler",
    serverContent.includes("errorHandler"),
    "Enhanced error handler integrated"
  );
  
  check(
    "Metrics Collection",
    serverContent.includes("collectMetrics"),
    "Metrics collection integrated"
  );
  
  check(
    "Health Check",
    serverContent.includes("/health"),
    "Health check endpoint exists"
  );
  
  check(
    "Metrics Endpoint",
    serverContent.includes("/metrics"),
    "Metrics endpoint exists"
  );
  
  check(
    "Graceful Shutdown",
    serverContent.includes("gracefulShutdown") || serverContent.includes("SIGTERM"),
    "Graceful shutdown configured"
  );
} catch {
  check("Server Index", false, "server/index.ts not found");
}

// Print Results
console.log("\n" + "=".repeat(60));
console.log("📊 PRODUCTION READINESS REPORT");
console.log("=".repeat(60) + "\n");

const passed = results.filter((r) => r.status === "pass").length;
const failed = results.filter((r) => r.status === "fail").length;
const warnings = results.filter((r) => r.status === "warning").length;

results.forEach((result) => {
  const icon =
    result.status === "pass"
      ? "✅"
      : result.status === "fail"
      ? "❌"
      : "⚠️ ";
  console.log(`${icon} ${result.name}: ${result.message}`);
});

console.log("\n" + "=".repeat(60));
console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log("=".repeat(60) + "\n");

if (failed === 0) {
  console.log("🎉 All critical checks passed! Your app is production ready!");
} else {
  console.log("⚠️  Some critical checks failed. Please fix them before deploying.");
  console.log("\nNext steps:");
  console.log("1. Review the failed checks above");
  console.log("2. Fix any missing configuration");
  console.log("3. Run this script again to verify");
}

if (warnings > 0) {
  console.log("\n💡 Note: Some optional features are not configured.");
  console.log("   These are not required but recommended for production.");
}

process.exit(failed > 0 ? 1 : 0);

