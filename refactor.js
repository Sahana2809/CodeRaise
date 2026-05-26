const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/src');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const replacements = {
    'glass-panel': 'clean-panel',
    'glass-card': 'clean-card',
    'glass-input': 'clean-input',
    'bg-slate-900': 'bg-slate-50',
    'bg-slate-950': 'bg-slate-100',
    'border-slate-800': 'border-slate-200',
    'border-slate-850': 'border-slate-200',
    'border-slate-900': 'border-slate-200',
    'text-white': 'text-slate-900',
    'text-gray-400': 'text-slate-500',
    'text-gray-300': 'text-slate-600',
    'text-indigo-400': 'text-indigo-600',
    'text-indigo-300': 'text-indigo-600',
    'text-rose-400': 'text-rose-600',
    'text-emerald-400': 'text-emerald-600',
    'bg-slate-800': 'bg-slate-200',
    'border-slate-800/40': 'border-slate-200'
  };

  for (const [oldClass, newClass] of Object.entries(replacements)) {
    content = content.split(oldClass).join(newClass);
  }

  fs.writeFileSync(filePath, content);
}

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(dir);
console.log("Refactoring complete");
