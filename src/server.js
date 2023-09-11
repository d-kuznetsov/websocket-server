require('dotenv').config();

const Fastify = require('fastify');
const fstWebsocket = require('@fastify/websocket');
const gameLogic = require('./game-logic');
const { MSG_MOVE, JOKE_COUNT } = require('./constants');
const { fetchJoke } = require('./joke-api');

const fastify = Fastify();
fastify.register(fstWebsocket);

fastify.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (conn, { id }) => {
    console.info(`${id} connected`);
    gameLogic.handleConnection(conn.socket);

    conn.socket.on('message', (message) => {
      console.log(`${id} received message: ${message}`);
      const { type, data } = JSON.parse(message);
      if (type === MSG_MOVE) {
        gameLogic.handleMove(conn.socket, data);
      }
    });

    conn.socket.on('close', () => {
      console.info(`${id} disconnected`);
      gameLogic.handleDisconnection(conn.socket);
    });
  });
});

async function run() {
  try {
    const jokePromises = [];
    for (let i = 0; i < JOKE_COUNT; i++) {
      jokePromises.push(fetchJoke());
    }
    await Promise.all(jokePromises);

    const address = await fastify.listen({
      host: process.env.HOST,
      port: process.env.PORT,
    });
    console.info(`Server listening on ${address}`);
  } catch (err) {
    console.error(`Error starting server: ${err}`);
    process.exit(1);
  }
}

run();
