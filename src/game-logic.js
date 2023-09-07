const { createMessage } = require('./helpers');
const { getJoke } = require('./joke-api');

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
      if (game.checkWin()) {
        game.getCurrentPlayer().gameOver('win', game.board, getJoke());
        game.getIdlePlayer().gameOver('lose', game.board);
        games.delete(game.getCurrentPlayer().socket);
        games.delete(game.getIdlePlayer().socket);
        return;
      }
      if (game.checkDraw()) {
        game.getCurrentPlayer().gameOver('draw', game.board);
        game.getIdlePlayer().gameOver('draw', game.board);
        games.delete(game.getCurrentPlayer().socket);
        games.delete(game.getIdlePlayer().socket);
        return;
      }
      game.activePlayer = game.activePlayer == 'X' ? 'O' : 'X';
      game.update();
    }
  }
}

class Game {
  constructor(socket1, socket2) {
    this.players = [new Player(socket1, 'X'), new Player(socket2, 'O')];
    this.board = createBoard();
    this.activePlayer = 'X';
  }
  start() {
    this.players.forEach((player) => {
      player.startGame(this.board, this.activePlayer, player.symbol);
    });
  }

  update() {
    const rowFull = this.players.forEach((player) => {
      player.update(this.board, this.activePlayer);
    });
  }

  checkWin() {
    const length = 3;
    const winRow = this.board.some((row) => {
      return row.every((col) => col === this.activePlayer);
    });
    if (winRow) {
      return true;
    }

    let winCol;
    for (let colIdx = 0; colIdx < length; colIdx++) {
      winCol = true;
      for (let rowIdx = 0; rowIdx < length; rowIdx++) {
        const symbol = this.board[rowIdx][colIdx];
        if (symbol !== this.activePlayer) {
          winCol = false;
          break;
        }
      }
      if (winCol) {
        break;
      }
    }

    if (winCol) {
      return true;
    }

    let winMainDiagonal = true;
    for (let idx = 0; idx < length; idx++) {
      if (this.board[idx][idx] !== this.activePlayer) {
        winMainDiagonal = false;
        break;
      }
    }
    if (winMainDiagonal) {
      return true;
    }

    let winSecondDiagonal = true;

    for (
      let rowIdx = 0, colIdx = length - 1;
      rowIdx < length;
      rowIdx++, colIdx--
    ) {
      if (this.board[rowIdx][colIdx] !== this.activePlayer) {
        winSecondDiagonal = false;
        break;
      }
    }
    if (winSecondDiagonal) {
      return true;
    }
    return false;
  }

  checkDraw() {
    return this.board.every((row) => row.every((col) => col !== ''));
  }

  getCurrentPlayer() {
    return this.players.find((pl) => pl.symbol === this.activePlayer);
  }
  getIdlePlayer() {
    return this.players.find((pl) => pl.symbol !== this.activePlayer);
  }
}

class Player {
  constructor(socket, symbol) {
    this.socket = socket;
    this.symbol = symbol;
  }
  startGame(board, activePlayer) {
    this.socket.send(
      createMessage('playing', {
        board,
        activePlayer,
        symbol: this.symbol,
      })
    );
  }

  update(board, activePlayer) {
    this.socket.send(
      createMessage('update', {
        board,
        activePlayer,
      })
    );
  }
  opponentDisconnected() {
    this.socket.send(createMessage('oponent Disconnected'));
  }

  gameOver(result, board, joke) {
    this.socket.send(
      createMessage('gameOver', {
        result,
        board,
        joke,
      })
    );
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
