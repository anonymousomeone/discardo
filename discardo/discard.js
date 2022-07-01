const Client = require("./client");


class Discard {
    constructor(token) {
        this.client = new Client(token);
    }

    start() {
        this.client.connect();
    }

}

module.exports = Discard;