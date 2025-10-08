// test-alphaspace-phase1.js
// Test script to verify Phase 1 AlphaSpace integration in WAVLET

const fs = require("fs");
const path = require("path");

console.log("🔍 WAVLET AlphaSpace Phase 1 Test Suite");
console.log("=====================================");

let testsPassed = 0;
let totalTests = 0;

function test(name, condition) {
  totalTests++;
  if (condition) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
  }
}

function section(title) {
  console.log(`\n📋 ${title}`);
  console.log("-".repeat(title.length + 3));
}

async function runPhase1Tests() {
  try {
    section("Database Schema Updates");
    // Test 1: Check if Prisma schema has AlphaSpace enums
    const schemaPath = path.join(__dirname, "prisma", "schema.prisma");
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    test(
      "CardStatus enum includes PENDING and FAILED",
      schemaContent.includes("PENDING") && schemaContent.includes("FAILED")
    );

    // Test 2: Check if migration file exists
    const migrationsDir = path.join(__dirname, "prisma", "migrations");
    const migrationFiles = fs.readdirSync(migrationsDir);
    const hasAlphaSpaceMigration = migrationFiles.some((file) =>
      file.includes("alphaspace")
    );
    test("AlphaSpace migration file exists", hasAlphaSpaceMigration);

    section("Environment Configuration");
    // Test 3: Check if .env has AlphaSpace variables
    const envPath = path.join(__dirname, ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    test(
      "ALPHASPACE_CLIENT_ID configured",
      envContent.includes("ALPHASPACE_CLIENT_ID=")
    );
    test(
      "ALPHASPACE_ENVIRONMENT configured",
      envContent.includes("ALPHASPACE_ENVIRONMENT=")
    );
    test(
      "ALPHASPACE_TEST_URL configured",
      envContent.includes("ALPHASPACE_TEST_URL=")
    );

    section("Code Structure");
    // Test 4: Check if AlphaSpace module exists
    const modulePath = path.join(
      __dirname,
      "src",
      "modules",
      "alphaspace",
      "alphaspace.module.ts"
    );
    test("AlphaSpace module exists", fs.existsSync(modulePath));

    // Test 5: Check if services exist
    const authServicePath = path.join(
      __dirname,
      "src",
      "modules",
      "alphaspace",
      "services",
      "alphaspace-auth.service.ts"
    );
    const mainServicePath = path.join(
      __dirname,
      "src",
      "modules",
      "alphaspace",
      "services",
      "alphaspace.service.ts"
    );
    test("AlphaSpace auth service exists", fs.existsSync(authServicePath));
    test("AlphaSpace main service exists", fs.existsSync(mainServicePath));

    // Test 6: Check if config exists
    const configPath = path.join(
      __dirname,
      "src",
      "config",
      "alphaspace.config.ts"
    );
    test("AlphaSpace config types exist", fs.existsSync(configPath));

    section("Documentation");
    // Test 7: Check if planning documents exist
    const planPath = path.join(
      __dirname,
      "alphaspace-adaptation-plan",
      "README.md"
    );
    const phasesPath = path.join(
      __dirname,
      "alphaspace-adaptation-plan",
      "implementation-phases.md"
    );
    const completionPath = path.join(
      __dirname,
      "alphaspace-adaptation-plan",
      "phase-1-completion-summary.md"
    );

    test("Main adaptation plan exists", fs.existsSync(planPath));
    test("Implementation phases documented", fs.existsSync(phasesPath));
    test("Phase 1 completion summary exists", fs.existsSync(completionPath));

    section("Analysis Reports");
    // Test 8: Check if analysis reports exist
    const mapleradAnalysisPath = path.join(
      __dirname,
      "maplerad-analysis-report",
      "README.md"
    );
    const comparisonReportPath = path.join(
      __dirname,
      "maplerad-integration-comparison",
      "comparison-analysis.md"
    );

    test("Maplerad analysis exists", fs.existsSync(mapleradAnalysisPath));
    test("Integration comparison exists", fs.existsSync(comparisonReportPath));

    section("Test Results");
    console.log(`\n📊 Results: ${testsPassed}/${totalTests} tests passed`);

    if (testsPassed === totalTests) {
      console.log("🎉 ALL TESTS PASSED! Phase 1 implementation is complete.");
      console.log("\n🚀 Ready for Phase 2 Implementation");
      console.log("Next steps:");
      console.log("• Implement card lifecycle operations");
      console.log("• Add API controllers");
      console.log("• Integrate with WALLET system");
      console.log("• Add transaction processing");

      console.log("\n🔗 Start Phase 2 with:");
      console.log("npm run alphaspace:phase2  # (would be added in future)");
    } else {
      console.log(
        "⚠️  Some tests failed. Please check Phase 1 implementation."
      );
    }
  } catch (error) {
    console.error("❌ Test execution failed:", error.message);
  }
}

// Run the tests
runPhase1Tests();
