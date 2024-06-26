const express = require("express");
const path = require("path");
const app = express();

const server = require("http").Server(app);
const io = require("socket.io")(server);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const rooms = {};

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.post("/room", (req, res) => {
  if (rooms[req.body.room]) {
    return res.redirect("/");
  }

  rooms[req.body.room] = { users: {} };
  res.redirect(`/${req.body.room}`);
  io.emit("room-created", req.body.room);
});

app.get("/:room", (req, res) => {
  if (!rooms[req.params.room]) {
    return res.redirect("/");
  }

  res.render("rooms", { roomName: req.params.room });
});

server.listen(3000);

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;

    socket.to(room).emit("user-connected", name);
  });

  socket.on("send-message", (room, message) => {
    socket.to(room).emit("chat-message", {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });

  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket.to(room).emit("user-disconnected", rooms[room].users[socket.id]);
      delete rooms[room].users[socket.id];
    });
  });
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}
