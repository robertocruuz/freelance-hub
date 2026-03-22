const fs = require('fs');
let text = fs.readFileSync('src/pages/ProjectsPage.tsx', 'utf8');
text = text.replace(/\r\n/g, '\n');
const lines = text.split('\n');
console.log('Line 920 is:', lines[919]);
console.log('Line 1184 is:', lines[1183]);
lines.splice(919, 265);
fs.writeFileSync('src/pages/ProjectsPage.tsx', lines.join('\n'));
console.log('Fixed list slice');
