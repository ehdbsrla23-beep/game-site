const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// 🚨 클라우드(Vercel) 배포용 CORS 설정: 모든 접속 허용
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// 게임 방 목록을 관리할 객체
const rooms = {};

io.on('connection', (socket) => {
  console.log('🟢 유저 접속됨:', socket.id);

  // 1. 방 만들기
  socket.on('createRoom', () => {
    // 4자리 랜덤 방 코드 생성
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomCode] = { players: [socket.id] };
    socket.join(roomCode);
    
    // 방을 만든 사람에게 방 코드 전달
    socket.emit('roomCreated', roomCode);
    console.log(`🏠 방 생성됨: ${roomCode} (방장: ${socket.id})`);
  });

  // 2. 방 참가하기
  socket.on('joinRoom', (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(socket.id);
      socket.join(roomCode);
      socket.emit('joinedRoom', roomCode);
      
      // 방에 있던 다른 사람들에게 새 유저 접속 알림
      socket.to(roomCode).emit('playerJoined', socket.id);
      console.log(`🏃 유저 ${socket.id} 가 방 ${roomCode} 에 참가함`);
    } else {
      socket.emit('errorMsg', '존재하지 않는 방입니다.');
    }
  });

  // 3. 주사위 & 컵 물리 엔진 굴리기 동기화
  socket.on('rollDice', (data) => {
    const { roomCode, diceData } = data;
    // 내가 굴린 물리엔진 결과를 방 안의 다른 사람 화면에도 똑같이 적용
    socket.to(roomCode).emit('diceRolled', diceData);
  });

  // 4. 주사위 회전 고정 및 6면체 버그 방지 결과 동기화
  socket.on('syncDiceResult', (data) => {
    const { roomCode, finalValues } = data;
    socket.to(roomCode).emit('diceResultSynced', finalValues);
  });

  // 5. 점수판 및 턴 넘기기 동기화
  socket.on('updateScore', (data) => {
    const { roomCode, scoreData } = data;
    socket.to(roomCode).emit('scoreUpdated', scoreData);
  });

  socket.on('nextTurn', (roomCode) => {
    socket.to(roomCode).emit('turnChanged');
  });

  // 6. 유저 접속 종료 처리
  socket.on('disconnect', () => {
    console.log('🔴 유저 접속 해제:', socket.id);
    
    // 유저가 속해있던 방을 찾아내서 정리
    for (const roomCode in rooms) {
      const index = rooms[roomCode].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomCode].players.splice(index, 1);
        socket.to(roomCode).emit('playerLeft', socket.id);
        
        // 방에 남은 사람이 0명이면 메모리에서 방 삭제
        if (rooms[roomCode].players.length === 0) {
          delete rooms[roomCode];
          console.log(`🗑️ 빈 방 삭제됨: ${roomCode}`);
        }
        break;
      }
    }
  });
});

// 🚨 클라우드(Render) 배포용 포트 설정
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 서버 구동 완료: 포트 ${PORT}에서 대기 중`);
});
