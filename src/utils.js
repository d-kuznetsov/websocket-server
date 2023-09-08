function createMessage(type, data) {
  return JSON.stringify({
    type,
    data,
  });
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  createMessage,
  getRandomInt,
};
