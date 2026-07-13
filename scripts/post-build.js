const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'out');
const destDir = path.join(__dirname, '..', 'public');

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  console.log('[Post-Build] Cleaning up public directory...');
  // Delete all contents in public, but don't delete the directory itself
  if (fs.existsSync(destDir)) {
    fs.readdirSync(destDir).forEach((file) => {
      const curPath = path.join(destDir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
  } else {
    fs.mkdirSync(destDir, { recursive: true });
  }

  console.log('[Post-Build] Copying compiled files from /out to /public...');
  if (fs.existsSync(srcDir)) {
    copyFolderRecursive(srcDir, destDir);
    console.log('[Post-Build] Copy complete! Static files are now ready.');
  } else {
    console.error('[Post-Build] Error: "/out" folder not found. Next.js export might have failed.');
    process.exit(1);
  }
}

main();
