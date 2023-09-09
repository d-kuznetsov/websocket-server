const { createMessage } = require('./utils');
const { getJoke } = require('./joke-api');
const {
  MSG_WAIT,
  MSG_START,
  MSG_UPDATE,
  MSG_FINISH,

  RESULT_WIN,
  RESULT_LOSE,
  RESULT_DRAW,

  BOARD_SIZE,
} = require('./constants');

let waitingSocket = null;
const games = new Map();

function handleConnection(socket) {
  if (!waitingSocket) {
    waitingSocket = socket;
    waitingSocket.send(createMessage(MSG_WAIT));
  } else {
    const game = new Game(waitingSocket, socket);
    games.set(waitingSocket, game);
    games.set(socket, game);
    waitingSocket = null;
    game.start();
  }
}

function handleDisconnection(socket) {
  if (waitingSocket === socket) {
    waitingSocket = null;
  }

  const game = games.get(socket);
  if (game) {
    const opponent = game.getPlayerBySocket(socket, false);
    games.delete(socket);
    games.delete(opponent.getSocket());
    handleConnection(opponent.getSocket());
  }
}

function handleMove(socket, { row, col }) {
  const game = games.get(socket);
  if (game) {
    const player = game.getPlayerBySocket(socket, true);

    if (game.board[row][col] === '') {
      game.board[row][col] = player.getSymbol();

      if (game.checkWin()) {
        game.finish();
        games.delete(game.getActivePlayer().getSocket());
        games.delete(game.getIdlePlayer().getSocket());
        return;
      }

      if (game.checkDraw()) {
        game.finish(true);
        games.delete(game.getActivePlayer().getSocket());
        games.delete(game.getIdlePlayer().getSocket());
        return;
      }

      game.switchActivePlayer();
      game.update();
    }
  }
}

class Game {
  constructor(socket1, socket2) {
    this.players = [new Player(socket1, 'X'), new Player(socket2, 'O')];
    this.board = createBoard();
    this.activePlayerSymbol = 'X';
  }

  start() {
    this.players.forEach((player) => {
      player.getSocket().send(
        createMessage(MSG_START, {
          board: this.board,
          activePlayerSymbol: this.activePlayerSymbol,
          symbol: player.getSymbol(),
        })
      );
    });
  }

  update() {
    this.players.forEach((player) => {
      player.getSocket().send(
        createMessage(MSG_UPDATE, {
          board: this.board,
          activePlayerSymbol: this.activePlayerSymbol,
        })
      );
    });
  }

  finish(isDraw) {
    this.getActivePlayer()
      .getSocket()
      .send(
        createMessage(MSG_FINISH, {
          result: isDraw ? RESULT_DRAW : RESULT_WIN,
          board: this.board,
          joke: isDraw ? null : getJoke(),
        })
      );

    this.getIdlePlayer()
      .getSocket()
      .send(
        createMessage(MSG_FINISH, {
          result: isDraw ? RESULT_DRAW : RESULT_LOSE,
          board: this.board,
        })
      );
  }

  checkWin() {
    const winningRow = this.board.some((row) => {
      return row.every((symbol) => symbol === this.activePlayerSymbol);
    });
    if (winningRow) {
      return true;
    }

    let winningCol;
    for (let colIdx = 0; colIdx < BOARD_SIZE; colIdx++) {
      winningCol = true;
      for (let rowIdx = 0; rowIdx < BOARD_SIZE; rowIdx++) {
        const symbol = this.board[rowIdx][colIdx];
        if (symbol !== this.activePlayerSymbol) {
          winningCol = false;
          break;
        }
      }
      if (winningCol) {
        break;
      }
    }

    if (winningCol) {
      return true;
    }

    let winningMajorDiag = true;
    for (let idx = 0; idx < BOARD_SIZE; idx++) {
      if (this.board[idx][idx] !== this.activePlayerSymbol) {
        winningMajorDiag = false;
        break;
      }
    }
    if (winningMajorDiag) {
      return true;
    }

    let winningManorDiag = true;

    for (
      let rowIdx = 0, colIdx = BOARD_SIZE - 1;
      rowIdx < BOARD_SIZE;
      rowIdx++, colIdx--
    ) {
      if (this.board[rowIdx][colIdx] !== this.activePlayerSymbol) {
        winningManorDiag = false;
        break;
      }
    }
    if (winningManorDiag) {
      return true;
    }
    return false;
  }

  checkDraw() {
    return this.board.every((row) => row.every((symbol) => symbol !== ''));
  }

  getActivePlayer() {
    return this.players.find(
      (player) => player.getSymbol() === this.activePlayerSymbol
    );
  }

  getIdlePlayer() {
    return this.players.find(
      (player) => player.getSymbol() !== this.activePlayerSymbol
    );
  }

  switchActivePlayer() {
    this.activePlayerSymbol = this.activePlayerSymbol == 'X' ? 'O' : 'X';
  }

  getPlayerBySocket(socket, isSocketEqual) {
    return this.players.find((player) =>
      isSocketEqual
        ? player.getSocket() === socket
        : player.getSocket() !== socket
    );
  }
}

class Player {
  constructor(socket, symbol) {
    this.socket = socket;
    this.symbol = symbol;
  }

  getSocket() {
    return this.socket;
  }

  getSymbol() {
    return this.symbol;
  }
}

function createBoard() {
  const board = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board.push(new Array(BOARD_SIZE).fill(''));
  }
  return board;
}

module.exports = {
  handleConnection,
  handleDisconnection,
  handleMove,
};
