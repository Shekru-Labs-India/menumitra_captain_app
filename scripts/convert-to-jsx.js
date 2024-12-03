const fs = require('fs');
const path = require('path');

function convertTsToJs(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      convertTsToJs(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Remove type annotations
      let newContent = content
        .replace(/: [A-Za-z<>[\]|&{}]+/g, '') // Remove type annotations
        .replace(/interface [^{]+{[^}]+}/g, '') // Remove interfaces
        .replace(/type [^=]+=.*?;/g, '') // Remove type definitions
        .replace(/: React\.FC(\<[^>]+\>)?/g, '') // Remove React.FC type
        .replace(/\<[A-Za-z]+\>/g, '') // Remove generic type parameters
        .replace(/export type.*?;/g, '') // Remove exported types
        .replace(/import.*?from\s+['"].*?['"];?\n/g, (match) => {
          // Keep only non-type imports
          return match.includes('type ') ? '' : match;
        });
      
      const newPath = filePath.replace(/\.tsx?$/, '.jsx');
      fs.writeFileSync(newPath, newContent);
      fs.unlinkSync(filePath);
    }
  });
}

const appDir = path.join(__dirname, '..');
convertTsToJs(appDir);
