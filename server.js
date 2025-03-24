const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const users = new Map();

io.on("connection", (socket) => {
    console.log("新しいユーザーが接続しました");

    socket.on("join", (username) => {
        users.set(socket.id, username);
        io.emit("updateUsers", Array.from(users.values()));
        io.emit("userJoined", username);
    });

    socket.on("chatMessage", (message) => {
        io.emit("chatMessage", { message, username: users.get(socket.id) });
    });

    socket.on("disconnect", () => {
        const username = users.get(socket.id);
        if (username) {
            io.emit("userLeft", username);
            users.delete(socket.id);
            io.emit("updateUsers", Array.from(users.values()));
        }
    });
});

server.listen(3000, () => {
    console.log("サーバーが http://localhost:3000 で起動しました");
});
