const Discardo = require('./discardo/discard.js');
const token = require('./token.json').token;

const discard = new Discardo(token);

discard.connect()