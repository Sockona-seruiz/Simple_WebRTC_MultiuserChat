// launch with : node index.js

const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

var rooms = [];
var hostOffers = [];

wss.on("connection", ws => {
    console.log("New connection");

    ws.on("close", () => {
        console.log("Client disconnected");
    });

    ws.on("message", (data) => {
        const obj = JSON.parse(data);

        if (obj.type === "host") {
            if (!rooms[obj.roomName]) {
                ws.send(JSON.stringify(
                    {
                        type: "host",
                        sucess: true,
                        roomName: obj.roomName,
                    }));
                rooms[obj.roomName] = ws;
            }
            else {
                ws.send(JSON.stringify(
                    {
                        type: "host",
                        sucess: false,
                    }));              
            }
        }
        else if (obj.type === "join") {
            if (rooms[obj.roomName]) {
                ws.send(JSON.stringify(
                    {
                        type: "join",
                        sucess: true,
                        roomName: obj.roomName,
                        offer: hostOffers[obj.roomName],
                    }));
            }
            else {
                ws.send(JSON.stringify(
                    {
                        type: "join",
                        sucess: false,
                    }));              
            }
        } else if (obj.type === "leave") {
            if (obj.isHost) {
                console.log("Host wants to leave " + obj.roomName);
                rooms[obj.roomName] = null;
                hostOffers[obj.roomName] = null;
            } else {
                console.log("User wants to leave " + obj.roomName);
                rooms[obj.roomName].send(JSON.stringify(
                    {
                        type: "clientLeftRoom",
                        roomName: obj.roomName,
                        peer: obj.peer,
                    }));
            }

        } else if (obj.type === "hostOffer") {
            hostOffers[obj.roomName] = obj.offer;
            console.log("storing " + obj.roomName + " host offer");
            // Envoyer l'offre client à l'host et inversemenet
        } else if (obj.type === "clientOffer") {
            console.log("receiving " + obj.roomName + " client offer");
            rooms[obj.roomName].send(JSON.stringify(
                {
                    type: "recieveClientOffer",
                    roomName: obj.roomName,
                    offer: obj.offer,
                }));
        }
    });
});
