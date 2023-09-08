const { createMessage } = require('./helpers');
const { getJoke } = require('./joke-api');

let waitingSocket = null;
const games = new Map();

const MSG_WAIT = 'wait';
const MSG_START = 'start';
const MSG_UPDATE = 'update';
const MSG_FINISH = 'finish';

const RESULT_WIN = 'win';
const RESULT_LOSE = 'lose';
const RESULT_DRAW = 'draw';

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
    const connectedPlayer = game.getPlayerBySocket(socket, false);
    games.delete(socket);
    games.delete(connectedPlayer.getSocket());
    handleConnection(connectedPlayer.getSocket());
  }
}

function handleMove(socket, data) {
  const game = games.get(socket);
  if (game) {
    const player = game.getPlayerBySocket(socket, true);

    if (game.board[data.row][data.col] === '') {
      game.board[data.row][data.col] = player.getSymbol();

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
    this.activePlayer = 'X';
  }

  start() {
    this.players.forEach((player) => {
      player.getSocket().send(
        createMessage(MSG_START, {
          board: this.board,
          activePlayer: this.activePlayer,
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
          activePlayer: this.activePlayer,
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

  getActivePlayer() {
    return this.players.find(
      (player) => player.getSymbol() === this.activePlayer
    );
  }

  getIdlePlayer() {
    return this.players.find((pl) => pl.getSymbol() !== this.activePlayer);
  }

  switchActivePlayer() {
    this.activePlayer = this.activePlayer == 'X' ? 'O' : 'X';
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

function createBoard(size = 3) {
  const board = [];
  for (let i = 0; i < size; i++) {
    board.push(new Array(size).fill(''));
  }
  return board;
}

module.exports = {
  handleConnection,
  handleDisconnection,
  handleMove,
};
