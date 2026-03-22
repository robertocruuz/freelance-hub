const fs = require('fs');
const lines = fs.readFileSync('src/pages/ProjectsPage.tsx', 'utf8').split('\n');
if (lines[919] && lines[919].includes('{items.map(item => {')) {
  lines.splice(919, 1184 - 919 + 1);
  fs.writeFileSync('src/pages/ProjectsPage.tsx', lines.join('\n'));
  console.log('Fixed syntax error!');
} else {
  console.log('Line 919 was not {items.map(item => { :', lines[919]);
}
