const fs = require('fs');
let file = fs.readFileSync('src/pages/BudgetsPage.tsx', 'utf8');

// The starting sequence is exactly:
//             return (
//               <div className="columns-1 xl:columns-2 gap-5">
//                 {sortedBudgets.map((b) => {
//                   const isExpanded = expandedBudget === b.id;

// The ending sequence is exactly:
//                     );
//                   })}
//               </div>
//             );

let startPattern = /return \(\s+<div className="columns-1 xl:columns-2 gap-5">\s+\{sortedBudgets\.map\(\(b\) => \{/;
let startMatch = file.match(startPattern);
if (!startMatch) {
  console.log("Could not find start pattern!");
  process.exit(1);
}

let startIndex = startMatch.index;

let endPattern = /\s+\);\s+\}\)}\s+<\/div>\s+\);\s+\}\)\(\)}\s+<\/div>\s+\) : null\}/;
let endMatch = file.match(endPattern);
if (!endMatch) {
  console.log("Could not find end pattern!");
  process.exit(1);
}

let endIndex = endMatch.index + endMatch[0].length;

let bodyStart = file.indexOf('const isExpanded =', startIndex);
let bodyEnd = file.indexOf('                    );\n                  })}', bodyStart);
let cardBody = file.substring(bodyStart, bodyEnd + '                    );'.length);

let newCode = `
            const renderCard = (b: any) => {
${cardBody}
            };
            
            if (!isDesktop) {
              return (
                <div className="flex flex-col gap-5">
                  {sortedBudgets.map(renderCard)}
                </div>
              );
            }
            
            const col1 = sortedBudgets.filter((_, i) => i % 2 === 0);
            const col2 = sortedBudgets.filter((_, i) => i % 2 === 1);
            
            return (
              <div className="grid grid-cols-2 gap-5 items-start">
                <div className="flex flex-col gap-5">
                  {col1.map(renderCard)}
                </div>
                <div className="flex flex-col gap-5">
                  {col2.map(renderCard)}
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}`;

let newFile = file.substring(0, startIndex) + newCode + file.substring(endIndex);

// Add import for useIsDesktop
if (!newFile.includes('useIsDesktop')) {
  newFile = newFile.replace("import { useIsMobile } from", "import { useIsMobile, useIsDesktop } from");
}
if (!newFile.includes('const isDesktop = useIsDesktop();')) {
  let innerStart = newFile.indexOf("const isMobile = useIsMobile();");
  if (innerStart !== -1) {
    newFile = newFile.slice(0, innerStart) + "const isDesktop = useIsDesktop();\n  " + newFile.slice(innerStart);
  } else {
    console.log("Could not insert hook");
  }
}

fs.writeFileSync('src/pages/BudgetsPage.tsx', newFile);
console.log("Done");
