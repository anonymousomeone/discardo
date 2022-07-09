const Websock = require("./gateway/websock.js");


class Discard {
    constructor(token) {
        this.websock = new Websock(token, this);
    }

    start() {
        this.websock.connect();
    }

}

module.exports = Discard;