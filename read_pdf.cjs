const fs = require('fs');
const pdf = require('pdf-parse');

console.log('pdf is:', typeof pdf, pdf);

let dataBuffer = fs.readFileSync('./DPBARROS/Relatorio obra 601 - 17-04-2026.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error(err);
});
