try {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.resolve('src/pages/ProjectsPage.tsx');
  if (!fs.existsSync(filePath)) throw new Error('File not found at ' + filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  const startStr = '                                  {items.map(item => {';
  const endStr = '                        </div>\n                      );\n            })}';
  const startIdx = content.indexOf(startStr);
  const endIdx = content.indexOf(endStr);
  if (startIdx === -1) throw new Error('Start string not found:\n' + startStr);
  if (endIdx === -1) throw new Error('End string not found:\n' + endStr);
  content = content.slice(0, startIdx) + content.slice(endIdx + endStr.length);
  fs.writeFileSync(filePath, content);
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR:', e.stack);
}
