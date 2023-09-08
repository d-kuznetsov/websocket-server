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
    socket.send(createMessage(MSG_WAIT));
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
    games.delete(connectedPlayer.socket);
    handleConnection(connectedPlayer.socket);
  }
}

function handleMove(socket, data) {
  const game = games.get(socket);
  if (game) {
    const player = game.getPlayerBySocket(socket, true);

    if (game.board[data.row][data.col] === '') {
      game.board[data.row][data.col] = player.symbol;

      if (game.checkWin()) {
        game.finish();
        games.delete(game.getActivePlayer().socket);
        games.delete(game.getIdlePlayer().socket);
        return;
      }

      if (game.checkDraw()) {
        game.finish(true);
        games.delete(game.getActivePlayer().socket);
        games.delete(game.getIdlePlayer().socket);
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
      player.socket.send(
        createMessage(MSG_START, {
          board: this.board,
          activePlayer: this.activePlayer,
          symbol: player.symbol,
        })
      );
    });
  }

  update() {
    this.players.forEach((player) => {
      player.socket.send(
        createMessage(MSG_UPDATE, {
          board: this.board,
          activePlayer: this.activePlayer,
        })
      );
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

  getActivePlayer() {
    return this.players.find((player) => player.symbol === this.activePlayer);
  }
  getIdlePlayer() {
    return this.players.find((pl) => pl.symbol !== this.activePlayer);
  }

  switchActivePlayer() {
    this.activePlayer = this.activePlayer == 'X' ? 'O' : 'X';
  }

  getPlayerBySocket(socket, isSocketEqual) {
    return this.players.find((player) =>
      isSocketEqual ? player.socket === socket : player.socket !== socket
    );
  }
  finish(isDraw) {
    this.getActivePlayer().socket.send(
      createMessage(MSG_FINISH, {
        result: isDraw ? RESULT_DRAW : RESULT_WIN,
        board: this.board,
        joke: isDraw ? null : getJoke(),
      })
    );
    this.getIdlePlayer().socket.send(
      createMessage(MSG_FINISH, {
        result: isDraw ? RESULT_DRAW : RESULT_LOSE,
        board: this.board,
      })
    );
  }
}

class Player {
  constructor(socket, symbol) {
    this.socket = socket;
    this.symbol = symbol;
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
  handleConnection,
  handleDisconnection,
  handleMove,
};
