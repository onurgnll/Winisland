const path = require('path');
const { app } = require('electron');

function getResourcePath(...segments) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }
  return path.join(__dirname, ...segments);
}

module.exports = { getResourcePath };
