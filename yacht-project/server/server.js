const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Vercel 클라우드에서 오는 모든 통신을 허락합니다.
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('🟢 유저 접속:', socket.id);

  // 방 만들기
  socket.on('createRoom', () => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomCode] = { players: [socket.id] };
    socket.join(roomCode);
    
    // 방장에게 방 번호 전달
    socket.emit('roomCreated', roomCode);
    console.log(`🏠 방 생성 완료: ${roomCode}`);
  });

  // 방 참가하기
  socket.on('joinRoom', (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(socket.id);
      socket.join(roomCode);
      socket.emit('joinedRoom', roomCode);
      socket.to(roomCode).emit('playerJoined', socket.id);
      console.log(`🏃 유저 참가: 방 ${roomCode}`);
    } else {
      socket.emit('errorMsg', '존재하지 않는 방 번호입니다.');
    }
  });

  // 주사위 및 컵 물리 엔진 굴리기 동기화
  socket.on('rollDice', (data) => {
    socket.to(data.roomCode).emit('diceRolled', data.diceData);
  });

  // 주사위 회전 고정 및 점수 동기화
  socket.on('syncDiceResult', (data) => {
    socket.to(data.roomCode).emit('diceResultSynced', data.finalValues);
  });

  socket.on('updateScore', (data) => {
    socket.to(data.roomCode).emit('scoreUpdated', data.scoreData);
  });

  socket.on('nextTurn', (roomCode) => {
    socket.to(roomCode).emit('turnChanged');
  });

  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      const index = rooms[roomCode].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomCode].players.splice(index, 1);
        socket.to(roomCode).emit('playerLeft', socket.id);
        if (rooms[roomCode].players.length === 0) {
          delete rooms[roomCode];
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 서버 구동 완료: 포트 ${PORT}`);
});
