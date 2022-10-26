const ws = new WebSocket("ws://localhost:8080");

var msg = document.getElementById('msginput');
var roomName = document.getElementById('roomName');

var joinedRoom = "";

// var p = null;

var peerList = [];
var hostPeer = null;
var isHost = null;

const sendMsg = document.getElementById("sendMsg");
const createRoom = document.getElementById("createRoom");
const joinRoom = document.getElementById("joinRoom");
const leaveRoom = document.getElementById("leaveRoom");

function toogleButtonHidden(isInRoom) {
    if (isInRoom) {
        leaveRoom.removeAttribute("hidden");
        joinRoom.setAttribute("hidden", "hidden");
        createRoom.setAttribute("hidden", "hidden");
        sendMsg.removeAttribute("hidden");
    } else {
        leaveRoom.setAttribute("hidden", "hidden");
        joinRoom.removeAttribute("hidden");
        createRoom.removeAttribute("hidden");
        sendMsg.setAttribute("hidden", "hidden");
    }
}



function MessageAdd(message) {
	var chat_messages = document.getElementById("chat-messages");

	chat_messages.insertAdjacentHTML("beforeend", "<p>" + message + "</p>");
	chat_messages.scrollTop = chat_messages.scrollHeight;
}

function bindEvents(p) {

    p.on('connect', () => {
        console.log("Connected !");
        p.send(JSON.stringify(
            {
                type: "msg",
                message: "Connection Established !",
            }));
    })

    p.on('data', data => {
        const obj = JSON.parse(data);

        console.log('data: ' + data);
        if (obj.type === "msg") {
            MessageAdd("other : " + obj.message);
            // On renvoit les datas recues a tout les peer
            if (isHost) {
                for (let i = 0; i < peerList.length - 1; i++) {
                    if (peerList[i] !== p) {
                        peerList[i].send(JSON.stringify(
                            {
                                type: "msg",
                                message: obj.message,
                            }));
                    }
                }
            }
        } else {
            console.log("Room left by host");
            hostPeer = null;
            isHost = null;
            toogleButtonHidden(false);
        }
      })

    p.on('error', function (err) {
        console.log('error', err);
    });

    p.on('signal', function (data) {
        //Se triger quand on crée un peer -> JSON.stringify(data) contient notre offer
        if (isHost) {
            ws.send(JSON.stringify(
                {
                    type: "hostOffer",
                    roomName: roomName.value,
                    offer: JSON.stringify(data),
                }));
        } else {
            ws.send(JSON.stringify(
                {
                    type: "clientOffer",
                    roomName: roomName.value,
                    offer: JSON.stringify(data),
                }));         
        }
    });
};

function strartPerr (initiator) {
    console.log("starting peer");
    let p = new SimplePeer({
        initiator: initiator,
        trickle: false,
    })
    bindEvents(p);
    return (p);
};

ws.addEventListener("open", () => {
    console.log("Connected to server");
});

ws.addEventListener("message", (e) => {
    const obj = JSON.parse(e.data);

    if (obj.type === "host" && obj.sucess) {
        console.log("room " + obj.roomName + " sucessfully created !");
        joinedRoom = obj.roomName;
        isHost = true;
        let p = strartPerr(isHost);
        peerList.push(p);
        toogleButtonHidden(true);
    }
    else if (obj.type === "join" && obj.sucess) {
        console.log("room " + obj.roomName + " sucessfully joined !");
        joinedRoom = obj.roomName;
        isHost = false;
        let p = strartPerr(isHost);
        p.signal(obj.offer);
        hostPeer = p;
        toogleButtonHidden(true);
    } else if (obj.type === "recieveClientOffer") {
        peerList[peerList.length - 1].signal(JSON.parse(obj.offer));
        // Recréer un peer et envoyer notre offre au server
        console.log("room " + obj.roomName + " needs host offer update");
        joinedRoom = obj.roomName;
        isHost = true;
        let p = strartPerr(isHost);
        peerList.push(p);

    } else if (obj.type === "clientLeftRoom") {
        // console.log(obj.peer);
        console.log(obj.peer.channelName);
        for (let i = 0; i < peerList.length - 1; i++) {
            // console.log(peerList[i]);
            console.log(peerList[i].channelName);
            if (peerList[i].channelName === obj.peer.channelName) {
                console.info("User removed from list");
                peerList.splice(i, 1);
            }
        }
    }
});


document.querySelector('#createRoom').addEventListener('click', function (e) {
    ws.send(JSON.stringify(
        {
            type: "host",
            roomName: roomName.value,
        }));
})

document.querySelector('#joinRoom').addEventListener('click', function (e) {
    p = strartPerr(false);
    ws.send(JSON.stringify(
        {
            type: "join",
            roomName: roomName.value,
        }));
})

document.querySelector('#leaveRoom').addEventListener('click', function (e) {
    if (isHost) {
        // On contacte tout les peer pour leur dire de leave la room
        // On ne peut pas envoyer de message vide du coup
        // message vide = clore la room
        console.log("send empty string");
        for (let i = 0; i < peerList.length - 1; i++) {
            peerList[i].send(JSON.stringify(
                {
                    type: "leave",
                }));
        }
        peerList = [];
    }
    ws.send(JSON.stringify(
        {
            type: "leave",
            roomName: joinedRoom,
            isHost: isHost,
            peer: hostPeer,
        }));
    hostPeer = null;
    isHost = null;
    toogleButtonHidden(false);
})

document.querySelector('#sendMsg').addEventListener('click', function (e) {
        console.log("Message to send : " + msg.value);
        if (msg.value !== "") {
            MessageAdd("me    : " + msg.value);
            if (isHost) {
                for (let i = 0; i < peerList.length - 1; i++) {
                    peerList[i].send(JSON.stringify(
                        {
                            type: "msg",
                            message: msg.value,
                        }));
                }
            } else {
                if (hostPeer !== null) {
                    hostPeer.send(JSON.stringify(
                        {
                            type: "msg",
                            message: msg.value,
                        }));
                }
            }
        }
})
