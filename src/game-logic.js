const { createMessage } = require('./helpers');

let waitingSocket = null;

const games = new Map();

function handlePlayerJoin(socket) {
  if (!waitingSocket) {
    waitingSocket = socket;
    socket.send(createMessage('waining'));
  } else {
    const game = new Game(waitingSocket, socket);
    games.set(waitingSocket, game);
    games.set(socket, game);
    waitingSocket = null;
    game.start();
  }
}

function handlePlayerDisconnect(socket) {
  const game = games.get(socket);
  if (game) {
    const alivePlayer = game.players.find((player) => {
      return player.socket != socket;
    });
    games.delete(socket);
    games.delete(alivePlayer.socket);
    alivePlayer.opponentDisconnected();
    handlePlayerJoin(alivePlayer.socket);
  }
}

class Game {
  constructor(socket1, socket2) {
    this.players = [new Player(socket1, 'X'), new Player(socket2, 'O')];
    this.board = createBoard();
    this.currentPlayer = 'X';
  }
  start() {
    this.players.forEach((player) => {
      player.startGame(this.board, this.currentPlayer, player.symbol);
    });
  }
}

class Player {
  constructor(socket, symbol) {
    this.socket = socket;
    this.symbol = symbol;
  }
  startGame(board, currentPlayer) {
    this.socket.send(
      createMessage('startGame', {
        board,
        currentPlayer,
        symbol: this.symbol,
      })
    );
  }
  opponentDisconnected() {
    this.socket.send(createMessage('oponent Disconnected'));
  }
}

function createBoard() {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
}

module.exports = {
  handlePlayerJoin,
  handlePlayerDisconnect,
};
