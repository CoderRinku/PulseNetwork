const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const outDir = path.join(__dirname, '..', 'out');

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        cleanDir(curPath);
      } else {
        try {
          fs.unlinkSync(curPath);
        } catch (e) {
          try {
            fs.chmodSync(curPath, 0o666);
            fs.unlinkSync(curPath);
          } catch (err) {}
        }
      }
    });
    for (let i = 0; i < 5; i++) {
      try {
        fs.rmdirSync(dirPath);
        break;
      } catch (err) {
        if (i === 4) throw err;
        const start = Date.now();
        while (Date.now() - start < 100) {}
      }
    }
  }
}

function run() {
  const nextFolder = path.join(publicDir, '_next');
  const indexHtml = path.join(publicDir, 'index.html');
  const errorHtml = path.join(publicDir, '404.html');
  const errorFolder = path.join(publicDir, '404');

  if (fs.existsSync(nextFolder)) {
    cleanDir(nextFolder);
  }
  if (fs.existsSync(errorFolder)) {
    cleanDir(errorFolder);
  }
  if (fs.existsSync(indexHtml)) {
    try {
      fs.unlinkSync(indexHtml);
    } catch (e) {}
  }
  if (fs.existsSync(errorHtml)) {
    try {
      fs.unlinkSync(errorHtml);
    } catch (e) {}
  }
  if (fs.existsSync(outDir)) {
    cleanDir(outDir);
  }
}

run();
