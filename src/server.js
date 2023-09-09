const Fastify = require('fastify');
const fstWebsocket = require('@fastify/websocket');
const gameLogic = require('./game-logic');
const { MSG_MOVE } = require('./config');
const { fetchJoke } = require('./joke-api');

const app = Fastify();
app.register(fstWebsocket);

app.register(async (fastify) => {
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
    for (let i = 0; i < 20; i++) {
      jokePromises.push(fetchJoke());
    }
    await Promise.all(jokePromises);

    const address = await app.listen({
      port: 3000,
    });
    console.info(`Server listening on ${address}`);
  } catch (err) {
    console.error(`Error starting server: ${err}`);
    process.exit(1);
  }
}

run();
