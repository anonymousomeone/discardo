// Discord Gateway url
const GATEWAY_URL = "wss://gateway.discord.gg/?v=6&encoding=json";
const WebSocketClient = require('websocket').client;
const codes = require('./stuff.json');

class Websock {
    /**
     * websocket connections handler
     * 
     * dont mind the stains... 💀
     */
    constructor(token, discard) {
        this.token = token;

        this.client = new WebSocketClient();
        this.connection;
        this.connected = false;

        this.client.on('connect', connection => {
            this.connection = connection;
            this.connected = true;
            connection.on('message', msg => {
                this.handle(msg);
            })
            connection.on('close', gfoog => {
                this.connected = false;
                console.log('discord disconnected... 😔\n' + gfoog)
                clearInterval(this.heartbeatInterval);

                if (this.shouldReconnect(gfoog)) {
                    this.connect()
                } else {
                    process.exit(1)
                }
            })
        });

        // goofy ahh discord moment
        this.sequences = null;
        this.authenticated = false;
        this.sessionId = '';

        this.heartbeatInterval;
        this.reconnecting = false;
        // keep track of last server heartbeat ack
        this.lastHeartbeatAck = 0;

        // discord stuff
        this.channels = [];
        this.guilds = [];
    }

    connect() {
        this.client.connect(GATEWAY_URL);
    }

    reconnect() {
        
    }

    send(data) {
        this.connection.sendUTF(JSON.stringify(data))
    }

    shouldReconnect(code) {
        if (!(code >= 4000 && code <= 4014)) return true

        console.error(`Server disconnected with code ${code}: ${codes.reasons[code]}`)

        if (codes.reconnect[code]) return true
        else return false
    }


    handle(message) {
        let json = message.utf8Data; // string version of the JSON data
        json = JSON.parse(json);
        console.log(json);
        
        if (typeof json.s == 'number') this.sequences = json.s
        
        if (json.op == 0) {
            if (json.t == "READY") {
                this.authenticated = true;
                this.sessionid = json.d['session_id'];
            }
            else if (json.t == "MESSAGE_CREATE") {
                let author = json.d.author.username;
                let userid = json.d.author.id;
                let avatar = json.d.author.avatar;
                let msg = json.d.content;
                this.insertMessage(avatar, userid, author, msg);
            }
            else if (json.t == "GUILD_CREATE") {
                this.guilds.push(json.d);
                this.channels.push(...json.d.channels);
            }
        }

        else if (json.op == 10) { // hello gateway event
            this.lastHeartbeatAck = Date.now()
            if (!this.authenticated) {
                this.login();
            }
    
            // heartbeat
            this.heartbeatInterval = setInterval(() => {
                if (Date.now() - this.lastHeartbeatAck > json.d.heartbeatInterval + 2000) {
                    console.error("Server timed out");
                    process.exit(1);
                }
                let payload = {
                    d: this.sequences,
                    op: 1
                }
                this.connection.sendUTF(JSON.stringify(payload));
                console.log('❤');
            }, json.d.heartbeat_interval)
    
        } 

        else if (json.op == 11) { // heartbeat ack
            this.lastHeartbeatAck = Date.now()
        }

        console.log(this)
    }

    login() {
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
        this.send(payload);
        // make it into a JSON string & send it out the door
    }
}

module.exports = Websock;