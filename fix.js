const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/src');

function fixInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find bg-<color> followed by text-slate-900 in className and replace text-slate-900 with text-white
  // A regex replacement is best
  content = content.replace(/(bg-(?:indigo|rose|emerald)-\w+[\s\S]*?)text-slate-900/g, '$1text-white');
  // Also any button with text-slate-900 on dark backgrounds
  content = content.replace(/text-slate-900(?=.*?\bbg-(?:indigo|rose|emerald)-[56]00)/g, 'text-white');
  content = content.replace(/text-slate-900\b/g, (match, offset, str) => {
    const surrounding = str.substring(Math.max(0, offset - 100), Math.min(str.length, offset + 100));
    if (surrounding.includes('bg-indigo') || surrounding.includes('bg-rose') || surrounding.includes('bg-emerald')) {
        return 'text-white';
    }
    return match;
  });

  fs.writeFileSync(filePath, content);
}

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      fixInFile(fullPath);
    }
  }
}

walkDir(dir);
console.log("Fix complete");
