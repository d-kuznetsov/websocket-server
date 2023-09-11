const http = require('https');
const { getRandomInt } = require('./utils');
const { FACT_COUNT } = require('./constants');

const options = {
  method: 'GET',
  hostname: 'catfact.ninja',
  path: '/fact',
};

const facts = [];

function fetchFact() {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);

        const { fact } = JSON.parse(buffer);

        facts.push(fact);
        resolve(fact);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

function getFact() {
  return facts[getRandomInt(0, FACT_COUNT - 1)];
}

module.exports = {
  fetchFact,
  getFact,
};
