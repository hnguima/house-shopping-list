#!/usr/bin/env node
import { execSync } from "child_process";

try {
  console.log("Running test coverage analysis...\n");

  // Run vitest with coverage using default reporter
  const result = execSync(
    "npx vitest run --coverage --coverage.reporter=text",
    {
      encoding: "utf8",
      timeout: 120000, // 2 minutes timeout
    }
  );

  // Extract just the coverage summary from the output
  const lines = result.split("\n");
  const coverageStart = lines.findIndex((line) => line.includes("Coverage"));
  const coverageEnd = lines.findIndex(
    (line, index) => index > coverageStart && line.includes("===")
  );

  if (coverageStart !== -1 && coverageEnd !== -1) {
    console.log("\n=== COVERAGE SUMMARY ===");
    lines
      .slice(coverageStart, coverageEnd + 1)
      .forEach((line) => console.log(line));
  } else {
    console.log(result);
  }
} catch (error) {
  console.error("Vitest coverage failed, trying c8 directly...\n");

  try {
    // Use c8 with vitest run (no problematic reporters)
    const result2 = execSync("npx c8 --reporter=text-summary npx vitest run", {
      encoding: "utf8",
      timeout: 120000,
    });
    console.log(result2);
  } catch (error2) {
    console.error(
      "All coverage methods failed. Running basic tests to check setup...\n"
    );
    try {
      const result3 = execSync("npx vitest run", {
        encoding: "utf8",
        timeout: 60000,
      });
      console.log("Tests run successfully but coverage collection failed.");
      console.log("Test summary:", result3.split("\n").slice(-10).join("\n"));
    } catch (error3) {
      console.error("Even basic tests failed:", error3.message);
    }
  }
}
