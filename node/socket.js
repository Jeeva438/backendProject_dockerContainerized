let server = require('./server')
const io = require("socket.io")(server);

console.log("socket connected ");

let users = [];
const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) &&
        users.push({ userId, socketId });
};

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
    //when connect
    console.log("a user connected.");

    //take userId and socketId from user
    socket.on("addUser", (userId) => {
        addUser(userId, socket.id);
        // users.push({user: userId, socketId: socket.id})
        console.log(users);
        io.emit("getUsers", users);
    });

    //send and get message
    socket.on("sendMessage", ({ senderId, receiverId, text }) => {
        console.log(senderId, receiverId, text);
        const user = getUser(receiverId);
        console.log(users);
        console.log(user);
        if (user) {
            io.to(user.socketId).emit("getMessage", {
                senderId,
                text
            });
        }
        // console.log({ receiver: user.socketId, senderId, text });
    });

    //when disconnect
    socket.on("disconnect", () => {
        console.log("a user disconnected!", users);
        removeUser(socket.id);
        console.log(users);
        io.emit("getUsers", users);
    });
});