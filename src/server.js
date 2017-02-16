const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end(0);
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1 ${port}`);

const io = socketio(app);

const users = {};

// Taken from stackoverflow
// http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
const randomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
    if (color === '#FF0000') {
      color = '#';
      i = 0;
    }
  }
  return color;
};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} users online`,
      color: '#FF0000',
    };

    socket.name = data.name;
    for (let i = 0; i < Object.keys(users).length; i++) {
      if (users[socket.name]) {
        socket.name += Object.keys(users).length;
      }
    }
    users[socket.name] = { name: socket.name, color: randomColor() };

    socket.emit('msg', joinMsg);

    socket.join('room1');

    const response = {
      name: 'server',
      msg: `${data.name} has joined the room`,
      color: '#FF0000',
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);

    socket.emit('msg', { name: 'server', msg: 'You joined the room', color: '#FF0000' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    if (data.msg.charAt(0) === '/') {
      if (data.msg === '/bikeshed') {
        io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg, color: randomColor() });
      }
    } else {
      io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg, color: users[socket.name].color });
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', (data) => {
    console.log(data);
    const leaveMessage = {
      name: 'server',
      msg: `${socket.name} has left the room`,
      color: '#FF0000',
    };

    socket.broadcast.to('room1').emit('msg', leaveMessage);

    console.log(`${socket.name} left`);
    socket.leave('room1');

    delete users[socket.name];
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
