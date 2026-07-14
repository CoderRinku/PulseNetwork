const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

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

function main() {
  console.log('[Pre-Build] Cleaning up compiled assets in public folder...');
  const nextFolder = path.join(publicDir, '_next');
  const indexHtml = path.join(publicDir, 'index.html');
  const errorHtml = path.join(publicDir, '404.html');

  if (fs.existsSync(nextFolder)) {
    console.log('[Pre-Build] Deleting public/_next...');
    deleteFolderRecursive(nextFolder);
  }
  if (fs.existsSync(indexHtml)) {
    console.log('[Pre-Build] Deleting public/index.html...');
    fs.unlinkSync(indexHtml);
  }
  if (fs.existsSync(errorHtml)) {
    console.log('[Pre-Build] Deleting public/404.html...');
    fs.unlinkSync(errorHtml);
  }
  console.log('[Pre-Build] Clean completed.');
}

main();
