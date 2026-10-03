import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, usePlane, useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import io from 'socket.io-client';

// 🎵 브라우저 내장 기능을 이용한 경쾌한 효과음 (파일 필요 없음!)
const playScoreSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    // '띠링~' 하는 느낌을 위해 주파수를 빠르게 높임 (도 -> 높은 도)
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); 

    // 소리가 부드럽게 사라지도록 볼륨 조절
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('오디오를 지원하지 않는 브라우저입니다.');
  }
};
// 🔴 다른 기기에서 접속하려면 localhost 대신 본체 IP(예: 192.168.0.x)로 변경하세요.
const socket = io.connect('https://game-site-j11p.onrender.com');

import { useRef, useEffect } from 'react';
import { useBox } from '@react-three/cannon';

export function Dice({ isKept, ...props }) {
  // 1. 현재 위치와 각도를 기억할 공간(Ref) 만들기
  const positionRef = useRef([0, 0, 0]);
  const rotationRef = useRef([0, 0, 0]);

  const [ref, api] = useBox(() => ({
    mass: isKept ? 0 : 1, // 킵 상태면 무게를 0으로 만들어 허공에 고정
    // 2. 렌더링될 때 기본값이 아닌, 기억해둔 마지막 위치와 각도 사용
    position: positionRef.current,
    rotation: rotationRef.current,
    ...props
  }));

  // 3. 물리 엔진이 주사위를 굴릴 때마다 실시간으로 현재 위치/각도 백업
  useEffect(() => {
    const unsubPos = api.position.subscribe((p) => {
      positionRef.current = p;
    });
    const unsubRot = api.rotation.subscribe((r) => {
      rotationRef.current = r;
    });

    // 컴포넌트가 사라질 때 추적 중지
    return () => {
      unsubPos();
      unsubRot();
    };
  }, [api]);

  return (
    <mesh ref={ref}>
      {/* 주사위 재질 및 형태 코드는 기존 그대로 유지 */}
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

// 기존의 diceTextures 배열 아래쪽에 추가해 주세요.
const diceTextures = [
  createDiceTexture(1), createDiceTexture(2), createDiceTexture(3),
  createDiceTexture(4), createDiceTexture(5), createDiceTexture(6)
];

const staticMaterials = [
  new THREE.MeshStandardMaterial({ map: diceTextures[2] }), // 3
  new THREE.MeshStandardMaterial({ map: diceTextures[3] }), // 4
  new THREE.MeshStandardMaterial({ map: diceTextures[5] }), // 6
  new THREE.MeshStandardMaterial({ map: diceTextures[0] }), // 1
  new THREE.MeshStandardMaterial({ map: diceTextures[1] }), // 2
  new THREE.MeshStandardMaterial({ map: diceTextures[4] })  // 5
];

function Arena() {
  const [floorRef] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], material: { friction: 0.8, restitution: 0.2 } }));
  useBox(() => ({ position: [0, 2, -4.5], args: [12, 10, 4], type: 'Static' })); 
  useBox(() => ({ position: [0, 2, 4.5], args: [12, 10, 4], type: 'Static' }));  
  useBox(() => ({ position: [-4.5, 2, 0], args: [4, 10, 12], type: 'Static' })); 
  useBox(() => ({ position: [4.5, 2, 0], args: [4, 10, 12], type: 'Static' }));  
  useBox(() => ({ position: [0, 8, 0], args: [12, 2, 12], type: 'Static' }));    

  return (
    <mesh ref={floorRef} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#1a3c34" />
    </mesh>
  );
}

  const texMapping = { 0: 2, 1: 3, 2: 5, 3: 0, 4: 1, 5: 4 };
  if (syncedValue && currentTopFace) {
    const upIdx = faceToMaterialIdx[currentTopFace];
    if (upIdx !== undefined) texMapping[upIdx] = syncedValue - 1; 
  }
  return [
    new THREE.MeshStandardMaterial({ map: diceTextures[texMapping[0]] }),
    new THREE.MeshStandardMaterial({ map: diceTextures[texMapping[1]] }),
    new THREE.MeshStandardMaterial({ map: diceTextures[texMapping[2]] }),
    new THREE.MeshStandardMaterial({ map: diceTextures[texMapping[3]] }),
    new THREE.MeshStandardMaterial({ map: diceTextures[texMapping[4]] }),
    new THREE.MeshStandardMaterial({ map: diceTextures[texMapping[5]] })
  ];
};

function Dice({ id, onUpdateValue, isKept, cupStatus, isMyTurn, syncedValue, initialPos, visible }) {
  const isInitiallySettled = cupStatus === 'settled'; 

  const [ref, api] = useBox(() => ({
    mass: 1,
    args: [0.65, 0.65, 0.65],
    position: isInitiallySettled 
      ? [initialPos[0], 0.325, initialPos[1]] // 🚨 0.35에서 0.325(바닥 밀착)로 변경
      : [
          (Math.random() - 0.5) * 1.5,
          3.5 + Math.random() * 1.0,
          -1 + (Math.random() - 0.5) * 1.5
        ],
    rotation: isInitiallySettled 
      ? [0, 0, 0] 
      : [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    material: { restitution: 0.5, friction: 0.4 }
  }));

  const positionRef = useRef([0, 0, 0]);
  const quaternionRef = useRef(new THREE.Quaternion());
  const velocityRef = useRef([0, 0, 0]);
  const angularVelocityRef = useRef([0, 0, 0]);
  
  const settledFramesRef = useRef(0);
  const stuckFramesRef = useRef(0);
  const dropFramesRef = useRef(0);
  const spillFramesRef = useRef(0);

  const isSettledRef = useRef(isInitiallySettled);
  const currentTopFaceRef = useRef(isInitiallySettled ? (syncedValue || 6) : 1); 

  const prevKept = useRef(isKept);
  const targetQuatRef = useRef(null); 

  const faces = [
    { num: 1, vector: new THREE.Vector3(0, -1, 0), targetRot: [Math.PI, 0, 0] }, 
    { num: 2, vector: new THREE.Vector3(0, 0, 1), targetRot: [-Math.PI/2, 0, 0] },
    { num: 3, vector: new THREE.Vector3(1, 0, 0), targetRot: [0, 0, Math.PI/2] }, 
    { num: 4, vector: new THREE.Vector3(-1, 0, 0), targetRot: [0, 0, -Math.PI/2] },
    { num: 5, vector: new THREE.Vector3(0, 0, -1), targetRot: [Math.PI/2, 0, 0] }, 
    { num: 6, vector: new THREE.Vector3(0, 1, 0), targetRot: [0, 0, 0] }
  ];

  useEffect(() => {
    const unsubPos = api.position.subscribe((p) => positionRef.current = p);
    const unsubRot = api.quaternion.subscribe((q) => quaternionRef.current.set(q[0], q[1], q[2], q[3]));
    const unsubVel = api.velocity.subscribe((v) => velocityRef.current = v);
    const unsubAng = api.angularVelocity.subscribe((v) => angularVelocityRef.current = v);
    return () => { unsubPos(); unsubRot(); unsubVel(); unsubAng(); };
  }, [api]);

  // 🚨 [핵심 수정] 킵 해제 시 물리 엔진 충돌 방지 로직
  useEffect(() => {
    if (isKept) {
      api.mass.set(0); 
    } else if (prevKept.current && !isKept) {
      api.mass.set(1); 
      const targetNum = syncedValue || currentTopFaceRef.current || 6;
      const target = faces.find(f => f.num === targetNum);
      
      if (target) {
        // 부드럽게 도는 애니메이션(slerp)을 버리고 즉시 완벽한 정답 각도로 강제 꽂음
        const exactQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...target.targetRot));
        api.quaternion.set(exactQuat.x, exactQuat.y, exactQuat.z, exactQuat.w);
        quaternionRef.current.copy(exactQuat);
      }
      currentTopFaceRef.current = targetNum;
      
      // 높이를 주사위 크기의 절반(0.65 / 2 = 0.325)으로 설정해 바닥과 충돌(튕김)을 원천 차단
      api.position.set(initialPos[0], 0.325, initialPos[1]);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      
      targetQuatRef.current = null; // slerp 무효화
    }
    prevKept.current = isKept;
  }, [isKept, api, initialPos, syncedValue]);

  useEffect(() => {
    if (cupStatus === 'shaking') {
      isSettledRef.current = false;
      settledFramesRef.current = 0;
      stuckFramesRef.current = 0;
      dropFramesRef.current = 0;
      spillFramesRef.current = 0;
      targetQuatRef.current = null; 
      
      api.position.set(
        (Math.random() - 0.5) * 1.5,
        3.5 + Math.random() * 1.0,
        -1 + (Math.random() - 0.5) * 1.5
      );
      api.velocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 10);
      api.angularVelocity.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
      
    } else if (cupStatus === 'spilling') {
      api.velocity.set((Math.random() - 0.5) * 8, -6, 1 + Math.random() * 5);
      api.angularVelocity.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    }
  }, [cupStatus, api]);

  useEffect(() => {
    if (isSettledRef.current && syncedValue !== null) {
      if (currentTopFaceRef.current !== syncedValue) {
        const target = faces.find(f => f.num === syncedValue);
        if (target) {
          targetQuatRef.current = new THREE.Quaternion().setFromEuler(new THREE.Euler(...target.targetRot));
          currentTopFaceRef.current = syncedValue;
        }
      }
    }
  }, [syncedValue]);

  useFrame(() => {
    if (!visible || isKept) {
      api.position.set(id * 2, -100, 0); 
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      return;
    }

    if (targetQuatRef.current) {
      quaternionRef.current.slerp(targetQuatRef.current, 0.15); 
      api.quaternion.set(quaternionRef.current.x, quaternionRef.current.y, quaternionRef.current.z, quaternionRef.current.w);
      if (quaternionRef.current.angleTo(targetQuatRef.current) < 0.05) {
        targetQuatRef.current = null; 
      }
      return; 
    }

    if (cupStatus === 'shaking') {
      dropFramesRef.current = 0;
      spillFramesRef.current = 0;
      if (Math.random() < 0.2) {
        api.velocity.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
      }
      return;
    }

    if (isSettledRef.current) return;

    dropFramesRef.current++;
    spillFramesRef.current++; 

    if (dropFramesRef.current < 50) {
      settledFramesRef.current = 0;
      return;
    }

    const quat = quaternionRef.current;
    let maxDot = -Infinity;
    let topFace = 1;
    let finalRot = [0, 0, 0];
    
    faces.forEach(({ num, vector, targetRot }) => {
      const dot = vector.clone().applyQuaternion(quat).dot(new THREE.Vector3(0, 1, 0));
      if (dot > maxDot) { maxDot = dot; topFace = num; finalRot = targetRot; }
    });

    const speed = Math.hypot(...velocityRef.current);
    const spin = Math.hypot(...angularVelocityRef.current);

    const isStuckOnEdge = speed < 0.1 && spin < 0.1 && maxDot <= 0.92;
    const isTimeout = spillFramesRef.current > 180; 

    if (isStuckOnEdge) stuckFramesRef.current++;
    else stuckFramesRef.current = 0;

    const triggerSettle = (face, targetRotArr, forceSnap) => {
      if (!isSettledRef.current) {
        isSettledRef.current = true;
        currentTopFaceRef.current = face;
        
        if (forceSnap) {
          targetQuatRef.current = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetRotArr));
          // 🚨 여기서도 0.35에서 0.325로 수정
          api.position.set(positionRef.current[0], 0.325, positionRef.current[2]);
          api.velocity.set(0, 0, 0);
          api.angularVelocity.set(0, 0, 0);
        }

        if (isMyTurn) onUpdateValue(id, face);
      }
    };

    if (speed < 0.1 && spin < 0.1 && maxDot > 0.92) {
      settledFramesRef.current++;
      if (settledFramesRef.current >= 15) triggerSettle(topFace, finalRot, false);
    } else if (stuckFramesRef.current >= 30 || isTimeout) {
      stuckFramesRef.current = 0;
      dropFramesRef.current = 0;
      spillFramesRef.current = 0;
      triggerSettle(topFace, finalRot, true);
    } else {
      settledFramesRef.current = 0;
    }
  });

  return (
    <mesh ref={ref} material={staticMaterials} castShadow visible={visible && !isKept}>
      <boxGeometry args={[0.65, 0.65, 0.65]} />
    </mesh>
  );
}

function DiceCup({ status }) {
  const [ref, api] = useCompoundBody(() => ({
    mass: 0, type: 'Kinematic', position: [0, 15, -10],
    shapes: [
      { type: 'Box', args: [3.4, 0.2, 3.4], position: [0, -1.5, 0] },
      { type: 'Box', args: [3.4, 4, 0.2], position: [0, 0, 1.7] },
      { type: 'Box', args: [3.4, 4, 0.2], position: [0, 0, -1.7] },
      { type: 'Box', args: [0.2, 4, 3.4], position: [1.7, 0, 0] },
      { type: 'Box', args: [0.2, 4, 3.4], position: [-1.7, 0, 0] },
    ],
  }));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (status === 'shaking') {
      api.position.set(Math.sin(t * 40) * 0.2, 4 + Math.cos(t * 30) * 0.2, -1);
      api.rotation.set(Math.sin(t * 20) * 0.2, 0, Math.cos(t * 20) * 0.2);
    } else if (status === 'spilling') {
      api.position.set(0, 15, -5);
      api.rotation.set(Math.PI * 0.8, 0, 0); 
    } else {
      api.position.set(0, 15, -10);
      api.rotation.set(Math.PI, 0, 0); 
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.9, 1.7, 3.2, 32, 1, true]} />
        <meshStandardMaterial color="#8b4513" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[1.9, 1.9, 0.2, 32]} />
        <meshStandardMaterial color="#5c2e0b" />
      </mesh>
    </group>
  );
}

export default function App() {
  const [scorePopup, setScorePopup] = useState(null);
  const [myId, setMyId] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [maxPlayersSelect, setMaxPlayersSelect] = useState(2);
  const [publicRooms, setPublicRooms] = useState([]);
  
  const [gameState, setGameState] = useState(null);
  const [cupStatus, setCupStatus] = useState('idle'); 
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [keepList, setKeepList] = useState([false, false, false, false, false]);

  const keepListRef = useRef(keepList);
  useEffect(() => { keepListRef.current = keepList; }, [keepList]);

  const isMyTurn = gameState && myId === gameState.currentTurnId;
  const hasRolledAtLeastOnce = gameState && gameState.rollsLeft < 3; 

  const sharedLayoutPositions = [ [-1.2, -1], [-0.5, 0], [0.5, 0], [1.2, -1], [0, 1] ];

  useEffect(() => {
    const handleConnect = () => setMyId(socket.id);
    socket.on('connect', handleConnect);
    if (socket.id) setMyId(socket.id);

    socket.on('error_message', (msg) => alert(`❌ ${msg}`));
    socket.on('room_list_update', (rooms) => setPublicRooms(rooms));
    socket.on('room_created', (roomId) => socket.emit('join_room', { roomId }));
    
    socket.on('left_room', () => {
      setGameState(null); setCupStatus('idle'); setKeepList([false, false, false, false, false]);
    });

    socket.on('sync_game_state', (state) => {
      setGameState(state);
      if (state.rollsLeft === 3) {
        setKeepList([false, false, false, false, false]);
        setCupStatus('idle');
        setDiceValues([1, 1, 1, 1, 1]); 
      }
    });

    socket.on('update_dice_values', (newVals) => {
      if (Array.isArray(newVals)) {
        setDiceValues(newVals);
        setCupStatus('settled'); 
      }
    });

    socket.on('update_keep_list', (newKeep) => {
      if (Array.isArray(newKeep)) setKeepList(newKeep);
    });

    socket.on('trigger_shake_cup', () => {
      setDiceValues(prev => prev.map((v, i) => keepListRef.current[i] ? v : null));
      setCupStatus('shaking');
      setTimeout(() => setCupStatus('spilling'), 1200);
    });

    return () => {
      socket.off('connect', handleConnect); socket.off('error_message'); socket.off('room_list_update');
      socket.off('room_created'); socket.off('left_room'); socket.off('sync_game_state');
      socket.off('update_dice_values'); socket.off('trigger_shake_cup'); 
      socket.off('update_keep_list');
    };
  }, []);

  useEffect(() => {
    if (cupStatus === 'shaking' || cupStatus === 'spilling') {
      const globalTimeout = setTimeout(() => {
        setDiceValues(prev => {
          const updated = prev.map(v => (v === null ? (Math.floor(Math.random() * 6) + 1) : v));
          setCupStatus('settled');
          if (isMyTurn) socket.emit('sync_dice_values', updated);
          return updated;
        });
      }, 4000);
      return () => clearTimeout(globalTimeout);
    }
  }, [cupStatus, isMyTurn]);

  useEffect(() => {
    if (isMyTurn && cupStatus === 'spilling') {
      const allSettled = diceValues.every(val => val !== null);
      if (allSettled) {
        setCupStatus('settled');
        socket.emit('sync_dice_values', diceValues);
      }
    }
  }, [diceValues, cupStatus, isMyTurn]);

  const createRoom = () => socket.emit('create_room', { maxPlayers: Number(maxPlayersSelect) });
  const joinRoom = (code) => {
    const targetRoom = code || roomCodeInput;
    if (!targetRoom.trim()) return alert('방 코드를 입력하세요!');
    socket.emit('join_room', { roomId: targetRoom.toUpperCase() });
  };
  const leaveRoom = () => socket.emit('leave_room');

  const rollDice = () => {
    if (!isMyTurn || gameState.rollsLeft <= 0 || (cupStatus !== 'idle' && cupStatus !== 'settled')) return;
    setDiceValues(prev => prev.map((v, i) => keepList[i] ? v : null)); 
    socket.emit('request_roll_dice');
  };

  const toggleKeep = (idx) => {
    if (!isMyTurn || !hasRolledAtLeastOnce || cupStatus !== 'settled') return;
    const newKeep = [...keepList];
    newKeep[idx] = !newKeep[idx];
    setKeepList(newKeep);
    socket.emit('sync_keep_list', newKeep); 
  };

  const recordScore = (category, score) => {
    socket.emit('request_record_score', { category, score });
    setKeepList([false, false, false, false, false]);
    setCupStatus('idle');

    // 🌟 효과음 재생 및 "+몇점" 팝업 띄우기
    playScoreSound();
    setScorePopup(`+${score}점`);
    
    // 1.5초 뒤에 팝업 다시 숨기기
    setTimeout(() => {
      setScorePopup(null);
    }, 1500);
  };

  const handleUpdateValue = (id, value) => {
    if (!isMyTurn || keepListRef.current[id]) return;
    setDiceValues(prev => {
      const newVals = [...prev];
      newVals[id] = value;
      return newVals; 
    });
  };

  const sumOf = (num) => (dice) => dice.filter(d => d === num).length * num;
  const calcChoice = (dice) => dice.reduce((a, b) => a + b, 0);
  const calcFourOfAKind = (dice) => { const c=[0,0,0,0,0,0]; dice.forEach(d=>c[d-1]++); return c.some(x=>x>=4) ? calcChoice(dice) : 0; };
  const calcFullHouse = (dice) => { const c=[0,0,0,0,0,0]; dice.forEach(d=>c[d-1]++); return (c.includes(3)&&c.includes(2))||c.includes(5) ? calcChoice(dice) : 0; };
  const calcSmallStraight = (dice) => { const s=[...new Set(dice)].sort().join(''); return (s.includes('1234')||s.includes('2345')||s.includes('3456')) ? 15 : 0; };
  const calcLargeStraight = (dice) => { const s=[...new Set(dice)].sort().join(''); return (s.includes('12345')||s.includes('23456')) ? 30 : 0; };
  const calcYacht = (dice) => new Set(dice).size === 1 ? 50 : 0;
  
  const getSubtotal = (scores = {}) => ['ones','twos','threes','fours','fives','sixes'].reduce((sum,k) => sum + (scores[k]||0), 0);
  
  const getTotalScore = (scores = {}) => {
    const sub = getSubtotal(scores);
    const bonus = sub >= 63 ? 35 : 0;
    const lower = ['choice','fourOfAKind','fullHouse','smallStraight','largeStraight','yacht']
      .reduce((sum, k) => sum + (scores[k] || 0), 0);
    return sub + bonus + lower;
  };

  const isGameOver = gameState && gameState.players.every(p => 
    Object.values(p.scores || {}).every(val => val !== null)
  );

  if (!gameState) {
    return (
      <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#fff', padding: '50px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', width: '600px', display: 'flex', gap: '30px' }}>
          <div style={{ flex: 1, borderRight: '1px solid #eee', paddingRight: '30px' }}>
            <h2 style={{ color: '#2c3e50', fontWeight: '800', marginBottom: '30px' }}>YACHT LOBBY</h2>
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#7f8c8d', marginBottom: '10px' }}>새 게임 생성</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={maxPlayersSelect} onChange={(e) => setMaxPlayersSelect(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <option value={2}>2명</option><option value={3}>3명</option><option value={4}>4명</option>
                </select>
                <button onClick={createRoom} style={{ backgroundColor: '#2980b9', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>방 만들기</button>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#7f8c8d', marginBottom: '10px' }}>코드 접속</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="방 코드" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', width: '100px', textTransform: 'uppercase' }} />
                <button onClick={() => joinRoom()} style={{ backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>입장</button>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#7f8c8d', marginBottom: '15px' }}>온라인 방 ({publicRooms.length})</h4>
            {publicRooms.length === 0 ? (
              <p style={{ color: '#bdc3c7', fontSize: '0.9rem' }}>대기 중인 방이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                {publicRooms.map(room => (
                  <div key={room.roomId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
                    <div><span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{room.roomId}</span><span style={{ fontSize: '0.8rem', color: '#7f8c8d', marginLeft: '10px' }}>({room.current}/{room.max})</span></div>
                    <button onClick={() => joinRoom(room.roomId)} style={{ backgroundColor: '#fff', border: '1px solid #2980b9', color: '#2980b9', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>참여</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', color: '#333', minHeight: '100vh', padding: '15px', fontFamily: '"Segoe UI", sans-serif', boxSizing: 'border-box', position: 'relative' }}>
      
      {isGameOver && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🎉 게임 종료!</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontWeight: 'bold' }}>최종 승부 결과입니다.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              {(() => {
                const sortedPlayers = [...gameState.players].sort((a, b) => getTotalScore(b.scores) - getTotalScore(a.scores));
                const topScore = getTotalScore(sortedPlayers[0].scores);
                const winners = sortedPlayers.filter(p => getTotalScore(p.scores) === topScore);
                
                return (
                  <>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '10px' }}>
                      {winners.length > 1 ? '🤝 무승부입니다!' : `🏆 승자: ${winners[0].id === myId ? '나 (Victory!)' : `상대방 (${winners[0].id.substring(0,4)})`}`}
                    </div>
                    {sortedPlayers.map((p, idx) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <span style={{ fontWeight: '600' }}>{idx + 1}등 {p.id === myId ? '(나)' : `P${idx+1}`}</span>
                        <span style={{ fontWeight: 'bold', color: '#2980b9' }}>{getTotalScore(p.scores)}점</span>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            <button 
              onClick={leaveRoom}
              style={{ width: '100%', padding: '12px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🏠 로비로 돌아가기
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '10px 20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.3rem', fontWeight: '800' }}>YACHT DICE</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.95rem', color: '#7f8c8d', fontWeight: 'bold' }}>방 코드: <span style={{ color: '#e74c3c' }}>{gameState.roomId}</span></span>
          <span style={{ backgroundColor: '#ecf0f1', padding: '5px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', color: '#2980b9' }}>인원: {gameState.players.length} / {gameState.maxPlayers}</span>
          <button onClick={leaveRoom} style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>나가기</button>
        </div>
      </div>

      {!gameState.isGameStarted ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}><h1 style={{ color: '#2c3e50' }}>대기 중... ⏳</h1></div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', height: 'calc(100vh - 85px)' }}>
          
          <div style={{ flex: 1.2, backgroundColor: '#111', borderRadius: '16px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ position: 'absolute', top: 15, width: '100%', textAlign: 'center', color: '#fff', zIndex: 10 }}>
              <h3 style={{ color: isMyTurn ? '#2ecc71' : '#e74c3c', margin: 0, fontSize: '1.3rem' }}>
                {isMyTurn ? '🎯 나의 턴' : '⏳ 상대방 턴'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#aaa', margin: '3px 0 0 0' }}>남은 굴리기: {gameState.rollsLeft} / 3</p>
            </div>

            <Canvas shadows camera={{ position: [0, 7, 9], fov: 42 }}>
              <ambientLight intensity={0.6} />
              <directionalLight castShadow position={[5, 15, 5]} intensity={1.2} />

              <Physics>
                <Arena />
                <DiceCup status={cupStatus} />
                
                {/* ⭐️ 컴포넌트 삭제 로직을 없애고 visible 속성으로 통제 */}
                <group>
                  {[0, 1, 2, 3, 4].map((id) => (
                    <Dice 
                      key={id} id={id} 
                      initialPos={sharedLayoutPositions[id]} 
                      cupStatus={cupStatus} 
                      isMyTurn={isMyTurn}
                      isKept={keepList[id]} 
                      onUpdateValue={handleUpdateValue} 
                      syncedValue={diceValues[id]}
                      visible={hasRolledAtLeastOnce}
                    />
                  ))}
                </group>
              </Physics>
            </Canvas>

            <div style={{ position: 'absolute', bottom: 20, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {(diceValues || [1,1,1,1,1]).map((val, idx) => {
                  const displayValue = (!hasRolledAtLeastOnce || val === null) ? '?' : val;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleKeep(idx)}
                      style={{
                        width: '55px', height: '55px',
                        backgroundColor: keepList[idx] ? '#3498db' : '#fff',
                        color: keepList[idx] ? '#fff' : '#2c3e50',
                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.7rem', fontWeight: 'bold',
                        cursor: isMyTurn && hasRolledAtLeastOnce && cupStatus === 'settled' ? 'pointer' : 'default',
                        boxShadow: keepList[idx] ? '0 0 12px #3498db' : '0 4px 8px rgba(0,0,0,0.3)',
                        border: keepList[idx] ? '2px solid #fff' : '2px solid transparent',
                        transform: keepList[idx] ? 'translateY(-6px)' : 'translateY(0)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {displayValue}
                    </div>
                  )
                })}
              </div>

              <button 
                onClick={rollDice}
                disabled={!isMyTurn || gameState.rollsLeft === 0 || (cupStatus !== 'idle' && cupStatus !== 'settled')}
                style={{ 
                  padding: '12px 35px', fontSize: '1rem', fontWeight: 'bold', 
                  backgroundColor: isMyTurn && gameState.rollsLeft > 0 && (cupStatus === 'idle' || cupStatus === 'settled') ? '#ff007f' : '#555', 
                  color: 'white', border: 'none', borderRadius: '30px', 
                  cursor: isMyTurn && gameState.rollsLeft > 0 && (cupStatus === 'idle' || cupStatus === 'settled') ? 'pointer' : 'not-allowed',
                  boxShadow: '0 0 15px rgba(255, 0, 127, 0.4)', transition: 'background-color 0.2s'
                }}
              >
                {cupStatus === 'shaking' || cupStatus === 'spilling' ? '주사위 굴러가는 중...' : '다이스 컵 흔들기 🏺'}
              </button>
            </div>
          </div>

         {/* 👇 여기서부터 끝까지 복사해서 기존 코드 하단을 덮어써주세요! */}
          <div style={{ width: '270px', backgroundColor: '#fff', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#2c3e50', fontSize: '1.1rem' }}>SCORE BOARD</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #2980b9' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px', color: '#7f8c8d' }}>항목</th>
                  {gameState.players.map((p, i) => <th key={p.id} style={{ padding: '6px 4px', color: p.id === myId ? '#2980b9' : '#333' }}>{p.id === myId ? '나' : `P${i+1}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Aces', key: 'ones', calc: sumOf(1) }, { label: 'Deuces', key: 'twos', calc: sumOf(2) },
                  { label: 'Threes', key: 'threes', calc: sumOf(3) }, { label: 'Fours', key: 'fours', calc: sumOf(4) },
                  { label: 'Fives', key: 'fives', calc: sumOf(5) }, { label: 'Sixes', key: 'sixes', calc: sumOf(6) }
                ].map((item) => (
                  <tr key={item.key} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px', fontWeight: '600', color: '#555' }}>{item.label}</td>
                    {gameState.players.map(p => {
                      const mine = p.id === myId;
                      const val = (p.scores || {})[item.key] !== undefined ? p.scores[item.key] : null;
                      const canRecord = isMyTurn && mine && val === null && hasRolledAtLeastOnce && cupStatus === 'settled';
                      const previewScore = item.calc(diceValues);

                      return (
                        <td 
                          key={p.id} 
                          onClick={() => canRecord && recordScore(item.key, previewScore)}
                          style={{ 
                            textAlign: 'center', padding: '6px 2px',
                            cursor: canRecord ? 'pointer' : 'default',
                            backgroundColor: canRecord ? '#ebf5fb' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {val !== null ? (
                            <span style={{ fontWeight: 'bold', color: mine ? '#2980b9' : '#333' }}>{val}</span>
                          ) : (
                            canRecord ? (
                              <div style={{ padding: '3px', border: '1px solid #27ae60', borderRadius: '4px', color: '#27ae60', fontWeight: 'bold', fontSize: '0.7rem', backgroundColor: '#e8f8f5' }}>
                                {previewScore}점 기록
                              </div>
                            ) : <span style={{color:'#ccc'}}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #bdc3c7' }}>
                  <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#e67e22' }}>Subtotal</td>
                  {gameState.players.map(p => { 
                    const sub = getSubtotal(p.scores); 
                    return <td key={p.id} style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold', color: '#e67e22' }}>{sub} {sub >= 63 ? '(+35)' : ''}</td>; 
                  })}
                </tr>

                {[
                  { label: 'Choice', key: 'choice', calc: calcChoice }, { label: '4 of a Kind', key: 'fourOfAKind', calc: calcFourOfAKind },
                  { label: 'Full House', key: 'fullHouse', calc: calcFullHouse }, { label: 'S. Straight', key: 'smallStraight', calc: calcSmallStraight },
                  { label: 'L. Straight', key: 'largeStraight', calc: calcLargeStraight }, { label: 'Yacht', key: 'yacht', calc: calcYacht }
                ].map((item) => (
                  <tr key={item.key} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px', fontWeight: '600', color: '#555' }}>{item.label}</td>
                    {gameState.players.map(p => {
                      const mine = p.id === myId;
                      const val = (p.scores || {})[item.key] !== undefined ? p.scores[item.key] : null;
                      const canRecord = isMyTurn && mine && val === null && hasRolledAtLeastOnce && cupStatus === 'settled';
                      const previewScore = item.calc(diceValues);

                      return (
                        <td 
                          key={p.id} 
                          onClick={() => canRecord && recordScore(item.key, previewScore)}
                          style={{ 
                            textAlign: 'center', padding: '6px 2px',
                            cursor: canRecord ? 'pointer' : 'default',
                            backgroundColor: canRecord ? '#ebf5fb' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {val !== null ? (
                            <span style={{ fontWeight: 'bold', color: mine ? '#2980b9' : '#333' }}>{val}</span>
                          ) : (
                            canRecord ? (
                              <div style={{ padding: '3px', border: '1px solid #27ae60', borderRadius: '4px', color: '#27ae60', fontWeight: 'bold', fontSize: '0.7rem', backgroundColor: '#e8f8f5' }}>
                                {previewScore}점 기록
                              </div>
                            ) : <span style={{color:'#ccc'}}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr style={{ backgroundColor: '#2980b9', color: '#fff', borderTop: '2px solid #2980b9' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>TOTAL</td>
                  {gameState.players.map(p => {
                    const total = getTotalScore(p.scores);
                    return <td key={p.id} style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '800', fontSize: '0.95rem' }}>{total}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========================================================= */}
          {/* 🌟 애니메이션 스타일 및 팝업 화면 🌟 */}
          <style>
            {`
              @keyframes scoreFloatUp {
                0% { opacity: 0; transform: translate(-50%, 50px) scale(0.5); }
                15% { opacity: 1; transform: translate(-50%, 0px) scale(1.2); }
                30% { opacity: 1; transform: translate(-50%, 0px) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -40px) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -60px) scale(0.8); }
              }
            `}
          </style>

          {scorePopup && (
            <div style={{
              position: 'fixed',
              top: '40%',
              left: '40%',
              zIndex: 9999,
              fontSize: '5rem',
              fontWeight: '900',
              color: '#FFD700',
              textShadow: '0px 0px 20px rgba(255, 215, 0, 0.8), 2px 4px 0px #d35400',
              pointerEvents: 'none',
              animation: 'scoreFloatUp 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}>
              {scorePopup}
            </div>
          )}
          {/* ========================================================= */}

        </div>
      )}
    </div>
  );
}
