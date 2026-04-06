#!/usr/bin/env node

/**
 * Geocoding Service Migration Helper
 *
 * Eski geocodingService.js import'larını bulur ve yeni yapıya geçiş için bilgi verir
 *
 * Usage:
 *   node scripts/migrate-geocoding-imports.js
 */

const fs = require("fs");
const path = require("path");

const OLD_IMPORT_PATTERNS = [
  /require\(['"]\.\.?\/.*geocodingService['"]\)/g,
  /from ['"]\.\.?\/.*geocodingService['"]/g,
];

const NEW_IMPORT = "require('./geocoding')";

function findFilesRecursive(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // node_modules, .git vb. skip et
      if (!["node_modules", ".git", "dist", "build"].includes(file)) {
        findFilesRecursive(filePath, fileList);
      }
    } else if (file.endsWith(".js")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const findings = [];

  OLD_IMPORT_PATTERNS.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches) {
      findings.push(...matches);
    }
  });

  return findings;
}

function main() {
  console.log("🔍 Geocoding Service Migration Helper\n");
  console.log("Scanning for old geocodingService.js imports...\n");

  const serverDir = path.join(process.cwd(), "server");

  if (!fs.existsSync(serverDir)) {
    console.log("❌ server/ directory not found");
    process.exit(1);
  }

  const jsFiles = findFilesRecursive(serverDir);
  const filesWithOldImports = [];

  jsFiles.forEach((file) => {
    const findings = checkFile(file);
    if (findings.length > 0) {
      filesWithOldImports.push({
        file: path.relative(process.cwd(), file),
        imports: findings,
      });
    }
  });

  if (filesWithOldImports.length === 0) {
    console.log("✅ No old imports found! Migration complete.\n");
    return;
  }

  console.log(
    `📋 Found ${filesWithOldImports.length} file(s) with old imports:\n`,
  );

  filesWithOldImports.forEach(({ file, imports }) => {
    console.log(`📄 ${file}`);
    imports.forEach((imp) => {
      console.log(`   ${imp}`);
    });
    console.log(
      '   → Should be: require("./geocoding") or require("../services/geocoding")\n',
    );
  });

  console.log("\n🔧 Migration Steps:");
  console.log("1. Replace old import patterns with new ones");
  console.log("2. Ensure geocoding/ directory structure is in place");
  console.log("3. Test each affected file");
  console.log("4. Remove old geocodingService.js file\n");

  console.log("💡 Tip: Use find & replace in your editor:");
  console.log('   Find: require("./geocodingService")');
  console.log('   Replace: require("./geocoding")\n');
}

main();
