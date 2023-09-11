const http = require('https');
const { getRandomInt } = require('./utils');
const { JOKE_COUNT } = require('./constants');

const options = {
  method: 'GET',
  hostname: process.env.API_HOST,
  port: null,
  path: '/jokes/random',
  headers: {
    accept: 'application/json',
    'X-RapidAPI-Key': process.env.API_KEY,
    'X-RapidAPI-Host': process.env.API_HOST,
  },
};

const jokes = [];

function fetchJoke() {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const { value } = JSON.parse(buffer);
        jokes.push(value);
        resolve(value);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

function getJoke() {
  return jokes[getRandomInt(0, JOKE_COUNT - 1)];
}

module.exports = {
  fetchJoke,
  getJoke,
};
