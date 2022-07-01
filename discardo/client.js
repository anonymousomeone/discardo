// Discord Gateway url
const GATEWAY_URL = "wss://gateway.discord.gg/?v=6&encoding=json";
const WebSocketClient = require('websocket').client;
const codes = require('./stuff.json');

class Client {
    /**
     * websocket connections handler
     */
    constructor(token) {
        this.token = token;

        this.client = new WebSocketClient();
        this.connection;
        this.connected = false;

        this.client.on('connect', connection => {
            this.connection = connection;
            this.connected = true;
            connection.on('message', msg => {
                this.messageHandler(msg);
            })
            connection.on('close', gfoog => {
                this.connected = false;
                console.log('discord disconnected... 😔\n' + gfoog)
                clearInterval(this.heartbeatInterval);

                if (this.shouldReconnect(gfoog)) {
                    this.connect()
                } else {
                    console.error('wtf???')
                    process.exit(1)
                }
            })
        });

        // goofy ahh discord moment
        this.sequences = null;
        this.authenticated = false;
        this.sessionId = 0;

        // keep track of last server heartbeat ack
        this.heartbeatInterval;
        this.lastHeartbeat = 0;
    }

    connect() {
        this.client.connect(GATEWAY_URL);
    }

    
    doLogin() {
        let msg = { // required parameters in order to identify as the bot user
            "token": this.token,
            "properties": {
                "$os": "browser",
                "$browser": "chrome",
                "$device": "cloud9"
            },
            "compress": false
        };
        let payload = {"op": 2, "d": msg}; // identify
        this.connection.sendUTF(JSON.stringify(payload));
        // make it into a JSON string & send it out the door
    }

    send(data) {
        this.connection.sendUTF(JSON.stringify(data))
    }

    messageHandler(message) {
        let json = message.utf8Data; // string version of the JSON data
        json = JSON.parse(json);
        console.log(json)
        
        this.sequences = json.s;
        
        if (json.op == 0 && json.t == 'READY') {
            this.authenticated = true;
        }
        else if (json.op == 10) { // hello gateway event
            if (!this.authenticated) {
                this.doLogin();
            }
    
            // // heartbeat
            // this.heartbeatInterval = setInterval(() => {
            //     let payload = {
            //         d: this.sequences,
            //         op: 1
            //     }
            //     this.connection.sendUTF(JSON.stringify(payload));
            //     console.log('❤');
            // }, json.d.heartbeat_interval)
    
        } 
        else if (json.op == 0) { // dispatch gateway event
            if (json.t == "MESSAGE_CREATE") {
                let author = json.d.author.username;
                let userid = json.d.author.id;
                let avatar = json.d.author.avatar;
                let msg = json.d.content;
                this.insertMessage(avatar, userid, author, msg);
            }
        }
    }

    shouldReconnect(code) {
        if (!(code >= 4000 && code <= 4014)) return true

        console.error(`Server disconnected with code ${code}: ${codes.reasons[code]}`)
        if (codes.reconnect[code]) return true
        else return false
    }
}

module.exports = Client;