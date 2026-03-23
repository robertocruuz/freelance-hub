const fs = require('fs');
let lines = fs.readFileSync('src/pages/BudgetsPage.tsx', 'utf8').split('\n');
lines[817] = '                    <div key={b.id} className="break-inside-avoid mb-5">';
lines[818] = '                      <div';
fs.writeFileSync('src/pages/BudgetsPage.tsx', lines.join('\n'));
