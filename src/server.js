'use strict';

const fastify = require('fastify')();
fastify.register(require('@fastify/websocket'));

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message) => {
      connection.socket.send(
        JSON.stringify({
          text: 'Hi from server',
        })
      );
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
