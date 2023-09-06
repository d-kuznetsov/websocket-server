const createMessage = (type, data) => {
  return JSON.stringify({
    type,
    data,
  });
};

module.exports = {
  createMessage,
};
