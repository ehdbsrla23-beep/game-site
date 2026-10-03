import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, useBox, usePlane, useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import io from 'socket.io-client';

// 🚨 백엔드 서버 주소 (절대 수정하지 마세요)
const socket = io.connect('https://game-site-j11p.onrender.com');

// =========================================================
// 💡 기존에 만드신 주사위 텍스처(createDiceTexture) 등
// 외부 함수들이 있다면 여기에 그대로 복사해 주세요.
// =========================================================

export default function App() {
  // 화면 전환을 위한 상태 관리
  const [roomCode, setRoomCode] = useState('');      
  const [joinCode, setJoinCode] = useState('');      
  const [isPlaying, setIsPlaying] = useState(false); // true가 되면 게임 화면으로 넘어감

  useEffect(() => {
    // 서버가 방을 만들어주면, 화면을 게임 창으로 넘김
    socket.on('roomCreated', (code) => {
      setRoomCode(code);
      setIsPlaying(true); 
    });

    // 방 참가에 성공하면, 화면을 게임 창으로 넘김
    socket.on('joinedRoom', (code) => {
      setRoomCode(code);
      setIsPlaying(true); 
    });

    // 없는 방을 입력했을 때 에러창 띄우기
    socket.on('errorMsg', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('joinedRoom');
      socket.off('errorMsg');
    };
  }, []);

  const handleCreateRoom = () => {
    socket.emit('createRoom'); // 서버야 방 만들어줘!
  };

  const handleJoinRoom = () => {
    if (joinCode.trim() !== '') {
      socket.emit('joinRoom', joinCode); // 서버야 나 이 방 들어갈래!
    }
  };

  // ---------------------------------------------------------
  // 화면 1: 로비 화면 (방 만들기 / 참가하기)
  // ---------------------------------------------------------
  if (!isPlaying) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ marginBottom: '30px' }}>🎲 3D 멀티플레이 주사위 게임</h1>
        
        <button 
          onClick={handleCreateRoom} 
          style={{ padding: '15px 30px', fontSize: '18px', marginBottom: '40px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          새로운 방 만들기
        </button>
        
        <div style={{ border: '2px solid #ddd', padding: '30px', borderRadius: '12px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>친구 방에 참가하기</h3>
          <input 
            id="roomInput"
            name="roomInput"
            type="text" 
            placeholder="방 번호 입력" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ padding: '12px', fontSize: '16px', marginRight: '10px', width: '150px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            onClick={handleJoinRoom}
            style={{ padding: '12px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            접속
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 화면 2: 게임 화면 (3D Canvas)
  // ---------------------------------------------------------
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: '#222' }}>
      
      {/* 화면 좌측 상단 방 번호 표시 */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(255, 255, 255, 0.9)', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: 0, color: '#333' }}>방 번호: <span style={{ color: '#E91E63' }}>{roomCode}</span></h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>이 번호를 친구에게 알려주세요!</p>
      </div>

      {/* 3D 렌더링 공간 */}
      <Canvas camera={{ position: [0, 8, 8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        
        <Physics>
          {/* ========================================================= */}
          {/* 💡 여기에 기존에 작성하셨던 주사위(useBox), 바닥(usePlane) 등 
               물리 엔진을 사용하는 3D 컴포넌트들을 복사해서 넣어주세요. */}
          {/* ========================================================= */}
        </Physics>
      </Canvas>
    </div>
  );
}
