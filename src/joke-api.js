const http = require('https');
const { getRandomInt } = require('./helpers');

const options = {
  method: 'GET',
  hostname: 'matchilling-chuck-norris-jokes-v1.p.rapidapi.com',
  port: null,
  path: '/jokes/random',
  headers: {
    accept: 'application/json',
    'X-RapidAPI-Key': 'fa2b5aefb1msh4008d4dd0c37f5fp1220ffjsn1663f53195f9',
    'X-RapidAPI-Host': 'matchilling-chuck-norris-jokes-v1.p.rapidapi.com',
  },
};

const jokes = [];

function fetchJoke() {
  return new Promise((resolve, reject) => {
    const req = http.request(options, function (res) {
      const chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        const buffer = Buffer.concat(chunks);
        const { value } = JSON.parse(buffer);
        jokes.push(value);
        resolve(value);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function getJoke() {
  return jokes[getRandomInt(0, 19)];
}

module.exports = {
  fetchJoke,
  getJoke,
};
