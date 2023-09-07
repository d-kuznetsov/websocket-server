const { createMessage } = require('./helpers');

let waitingSocket = null;

const games = new Map();

function handlePlayerJoin(socket) {
  if (!waitingSocket) {
    waitingSocket = socket;
    socket.send(createMessage('waiting'));
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
  if (waitingSocket === socket) {
    waitingSocket = null;
  }
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

function handleMove(socket, data) {
  const game = games.get(socket);
  if (game) {
    const player = game.players.find((pl) => pl.socket == socket);
    if (game.board[data.row][data.col] === '') {
      game.board[data.row][data.col] = player.symbol;
      game.currentPlayer = game.currentPlayer == 'X' ? 'O' : 'X';
      game.update();
    }
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

  update() {
    this.players.forEach((player) => {
      player.update(this.board, this.currentPlayer);
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
      createMessage('playing', {
        board,
        currentPlayer,
        symbol: this.symbol,
      })
    );
  }

  update(board, currentPlayer) {
    this.socket.send(
      createMessage('update', {
        board,
        currentPlayer,
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
  handleMove,
};
