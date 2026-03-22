const fs = require('fs');
let c = fs.readFileSync('src/pages/ProjectsPage.tsx', 'utf8');

const sIdx = c.indexOf('{items.map(item => {');
const eIdxStr = '                        </div>\n                      );\n            })}';
const eIdx = c.indexOf(eIdxStr);

if (sIdx > -1 && eIdx > -1) {
  const beforeStart = c.lastIndexOf('\n', sIdx);
  c = c.substring(0, beforeStart) + '\n' + c.substring(eIdx);
  fs.writeFileSync('src/pages/ProjectsPage.tsx', c);
  console.log('Fixed syntax error by removing orphaned tab content.');
} else {
  console.log('Could not find start or end', { sIdx, eIdx });
}
