const xlsx = require('xlsx');
const wb = xlsx.readFile('src/data/reference/intellia_modules.xlsx');
const fs = require('fs');
const data = {};
wb.SheetNames.forEach(name => {
  data[name] = xlsx.utils.sheet_to_json(wb.Sheets[name]);
});
fs.writeFileSync('src/data/reference/parsed_modules.json', JSON.stringify(data, null, 2));
console.log('Done parsing');
