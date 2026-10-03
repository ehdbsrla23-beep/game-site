const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms[result] ? generateRoomId() : result;
};

const broadcastRoomList = () => {
  const roomList = Object.keys(rooms)
    .filter(roomId => !rooms[roomId].isGameStarted && rooms[roomId].players.length < rooms[roomId].maxPlayers)
    .map(roomId => ({
      roomId,
      current: rooms[roomId].players.length,
      max: rooms[roomId].maxPlayers
    }));
  io.emit('room_list_update', roomList);
};

io.on('connection', (socket) => {
  console.log(`🔌 접속: ${socket.id}`);
  broadcastRoomList();

  socket.on('create_room', ({ maxPlayers }) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      roomId,
      maxPlayers: Number(maxPlayers) || 2,
      isGameStarted: false,
      players: [],
      currentTurnIndex: 0,
      rollsLeft: 3,
    };
    socket.emit('room_created', roomId);
    broadcastRoomList();
  });

  socket.on('join_room', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error_message', '존재하지 않는 방입니다.');
    if (room.isGameStarted) return socket.emit('error_message', '이미 시작된 방입니다.');
    if (room.players.length >= room.maxPlayers) return socket.emit('error_message', '방이 가득 찼습니다.');

    socket.join(roomId);
    room.players.push({
      id: socket.id,
      scores: {
        ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
        choice: null, fourOfAKind: null, fullHouse: null, smallStraight: null, largeStraight: null, yacht: null
      }
    });

    if (room.players.length === room.maxPlayers) {
      room.isGameStarted = true;
      room.currentTurnIndex = 0;
      room.rollsLeft = 3;
    }

    io.to(roomId).emit('sync_game_state', getPublicGameState(room));
    broadcastRoomList();
  });

  socket.on('request_roll_dice', () => {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return;
    const room = rooms[roomId];

    if (!room || !room.isGameStarted) return;
    if (room.players[room.currentTurnIndex].id !== socket.id) return;
    if (room.rollsLeft <= 0) return;

    room.rollsLeft -= 1;
    io.to(roomId).emit('trigger_shake_cup');
    io.to(roomId).emit('sync_game_state', getPublicGameState(room));
  });

  socket.on('sync_dice_values', (newVals) => {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit('update_dice_values', newVals);
  });

  socket.on('sync_keep_list', (keepList) => {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit('update_keep_list', keepList);
  });

  socket.on('request_record_score', ({ category, score }) => {
    const roomId = getRoomIdBySocket(socket.id);
    if (!roomId) return;
    const room = rooms[roomId];

    if (!room || !room.isGameStarted) return;
    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer.id !== socket.id) return;
    if (currentPlayer.scores[category] !== null) return;

    currentPlayer.scores[category] = score;
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    room.rollsLeft = 3;

    io.to(roomId).emit('sync_game_state', getPublicGameState(room));
  });

  socket.on('leave_room', () => handleUserLeave(socket));
  socket.on('disconnect', () => handleUserLeave(socket));
});

const handleUserLeave = (socket) => {
  const roomId = getRoomIdBySocket(socket.id);
  if (!roomId || !rooms[roomId]) return;

  const room = rooms[roomId];
  room.players = room.players.filter(p => p.id !== socket.id);
  socket.leave(roomId);
  socket.emit('left_room');

  if (room.players.length === 0) {
    delete rooms[roomId];
  } else {
    room.isGameStarted = false;
    io.to(roomId).emit('error_message', '상대방이 퇴장하여 방이 해제되었습니다.');
    io.to(roomId).emit('left_room');
    delete rooms[roomId];
  }
  broadcastRoomList();
};

const getRoomIdBySocket = (socketId) => {
  for (const roomId in rooms) {
    if (rooms[roomId].players.some(p => p.id === socketId)) return roomId;
  }
  return null;
}

const getPublicGameState = (room) => ({
  roomId: room.roomId,
  maxPlayers: room.maxPlayers,
  isGameStarted: room.isGameStarted,
  currentTurnId: room.isGameStarted ? room.players[room.currentTurnIndex].id : null,
  rollsLeft: room.rollsLeft,
  players: room.players
});

const PORT = 4000;
server.listen(PORT, () => console.log(`🚀 서버 실행 중: 포트 ${PORT}`));