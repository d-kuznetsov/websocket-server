'use strict';

const fastify = require('fastify')();
fastify.register(require('@fastify/websocket'));
const gameLogic = require('./game-logic');

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const { id } = req;
    console.log('onConnect');
    gameLogic.handlePlayerJoin(connection.socket);

    connection.socket.on('message', (message) => {
      console.log(`Received: ${message}. Id: ${id}`);
      connection.socket.send(
        JSON.stringify({
          text: 'Hi from server',
        })
      );
    });

    connection.socket.on('close', () => {
      console.log(`Disconnected ${id}`);
      gameLogic.handlePlayerDisconnect(connection.socket);
    });
  });
});

const run = async () => {
  try {
    const address = await fastify.listen({
      port: 3000,
    });
    console.info(`Server listening on ${address}`);
  } catch (err) {
    console.error(`Error starting server: ${err}`);
    process.exit(1);
  }
};

run();
