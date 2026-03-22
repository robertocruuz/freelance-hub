const fs = require('fs');
let c = fs.readFileSync('src/pages/ProjectsPage.tsx', 'utf8');

const sMarker = '                                <FolderKanban className="w-3.5 h-3.5" />\n                              </div>\n                            </div>\n                          </div>';
const eMarker = '                        </div>\n                      );\n            })}\n        </div>\n      )}\n\n      {/* Import from budget modal */}';

const sIdx = c.indexOf('                                <FolderKanban className="w-3.5 h-3.5" />');
const eIdx = c.indexOf('      {/* Import from budget modal */}');

if (sIdx > -1 && eIdx > -1) {
  const newContent = c.substring(0, sIdx + sMarker.length) + '\n' + c.substring(eIdx - '                        </div>\n                      );\n            })}\n        </div>\n      )}\n\n'.length);
  fs.writeFileSync('src/pages/ProjectsPage.tsx', newContent);
  console.log('Fixed using robust markers');
} else {
  console.log('Markers not found');
}
