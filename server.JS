const express = require('express');
const http = require('http');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = path.join(__dirname, 'data', 'connect4.sqlite');

const ensureDb = async () => {
  const dbDir = path.join(__dirname, 'data');
  const fs = require('fs');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, name TEXT UNIQUE, games INTEGER DEFAULT 0, wins INTEGER DEFAULT 0)`);
  return db;
};

// Game room management
const rooms = {}; // roomId -> {grid, turn, players:[socketIds], status}

function makeEmptyGrid(){
  return Array.from({length:6},()=>Array(7).fill(0));
}

function drop(grid,col,player){
  for(let r=5;r>=0;r--){
    if(grid[r][col]===0){grid[r][col]=player;return r}
  }
  return -1;
}

function checkWin(grid){
  const rows=6,cols=7;
  const directions=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const player = grid[r][c];
      if(player===0) continue;
      for(const [dr,dc] of directions){
        const coords=[[r,c]];
        for(let k=1;k<4;k++){
          const nr=r+dr*k, nc=c+dc*k;
          if(nr<0||nr>=rows||nc<0||nc>=cols||grid[nr][nc]!==player){break}
          coords.push([nr,nc]);
        }
        if(coords.length===4) return {player,coords};
      }
    }
  }
  // draw?
  if(grid.every(row=>row.every(cell=>cell!==0))) return {player:0,coords:[]};
  return null;
}

// Simple evaluation for minimax
function evaluateGrid(grid, player){
  // heuristic: count 2/3 in a row
  const opp = player===1?2:1;
  let score=0;
  const rows=6,cols=7;
  const directions=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      for(const [dr,dc] of directions){
        let cntP=0,cntO=0,empt=0;
        for(let k=0;k<4;k++){
          const nr=r+dr*k,nc=c+dc*k;
          if(nr<0||nr>=rows||nc<0||nc>=cols){cntP=-1;break}
          const v = grid[nr][nc];
          if(v===player) cntP++;
          else if(v===opp) cntO++;
          else empt++;
        }
        if(cntP===-1) continue;
        if(cntO===0){
          if(cntP===4) score += 1000;
          else if(cntP===3) score += 50;
          else if(cntP===2) score += 10;
        }
        if(cntP===0){
          if(cntO===3) score -= 80;
          else if(cntO===2) score -= 8;
        }
      }
    }
  }
  return score;
}

function copyGrid(g){return g.map(r=>r.slice())}

function validCols(grid){
  const cols=[];
  for(let c=0;c<7;c++) if(grid[0][c]===0) cols.push(c);
  return cols;
}

// Minimax with alpha-beta
function minimax(grid,depth,alpha,beta,maximizingPlayer,player){
  const win = checkWin(grid);
  if(win){
    if(win.player===player) return {score:100000};
    if(win.player===0) return {score:0};
    return {score:-100000};
  }
  if(depth===0) return {score:evaluateGrid(grid,player)};
  const cols = validCols(grid);
  if(cols.length===0) return {score:0};
  if(maximizingPlayer){
    let best=-Infinity, bestCol=cols[0];
    for(const c of cols){
      const g2=copyGrid(grid); drop(g2,c,player);
      const res=minimax(g2,depth-1,alpha,beta,false,player);
      if(res.score>best){best=res.score;bestCol=c}
      alpha=Math.max(alpha,best); if(beta<=alpha) break;
    }
    return {score:best,col:bestCol};
  } else {
    const opp = player===1?2:1;
    let best=Infinity,bestCol=cols[0];
    for(const c of cols){
      const g2=copyGrid(grid); drop(g2,c,opp);
      const res=minimax(g2,depth-1,alpha,beta,true,player);
      if(res.score<best){best=res.score;bestCol=c}
      beta=Math.min(beta,best); if(beta<=alpha) break;
    }
    return {score:best,col:bestCol};
  }
}

// AI strategies
function aiChoose(grid, level, aiPlayer){
  const cols = validCols(grid);
  if(cols.length===0) return -1;
  if(level===1){
    return cols[Math.floor(Math.random()*cols.length)];
  }
  // level 2: try win, then block
  if(level===2){
    // win
    for(const c of cols){
      const g2=copyGrid(grid); drop(g2,c,aiPlayer);
      if(checkWin(g2) && checkWin(g2).player===aiPlayer) return c;
    }
    const opp = aiPlayer===1?2:1;
    for(const c of cols){
      const g2=copyGrid(grid); drop(g2,c,opp);
      if(checkWin(g2) && checkWin(g2).player===opp) return c;
    }
    // else random
    return cols[Math.floor(Math.random()*cols.length)];
  }
  // level 3: minimax depth-limited
  const depth = 4;
  const res = minimax(grid,depth,-Infinity,Infinity,true,aiPlayer);
  return typeof res.col==='number' ? res.col : cols[0];
}

io.on('connection', socket => {
  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).slice(2,8);
    rooms[roomId] = {grid: makeEmptyGrid(), turn:1, players:[socket.id], status:'waiting'};
    socket.join(roomId);
    socket.emit('roomCreated', {roomId});
  });

  socket.on('joinRoom', ({roomId}) => {
    const room = rooms[roomId];
    if(!room){ socket.emit('errorMsg','Room not found'); return; }
    if(room.players.length>=2){ socket.emit('errorMsg','Room full'); return; }
    room.players.push(socket.id);
    room.status='playing';
    socket.join(roomId);
    io.to(roomId).emit('roomJoined', {roomId});
    io.to(roomId).emit('state', room);
  });

  socket.on('move', ({roomId,col})=>{
    const room = rooms[roomId];
    if(!room) return;
    const playerIndex = room.players.indexOf(socket.id);
    if(playerIndex===-1) return;
    const player = playerIndex===0?1:2;
    if(room.turn!==player) return;
    const r = drop(room.grid,col,player);
    if(r===-1) return;
    const win = checkWin(room.grid);
    if(win){ room.status = win.player===0? 'draw' : 'won'; room.winner=win.player; room.winCoords=win.coords; }
    else room.turn = room.turn===1?2:1;
    io.to(roomId).emit('state', room);
  });

  socket.on('createAIGame', ({level, name})=>{
    const roomId = Math.random().toString(36).slice(2,8);
    const grid = makeEmptyGrid();
    const aiPlayer = 2;
    rooms[roomId] = {grid, turn:1, players:[socket.id], status:'playing', ai:{level,aiPlayer}, ownerName:name};
    socket.join(roomId);
    socket.emit('roomCreated', {roomId});
    io.to(roomId).emit('state', rooms[roomId]);
  });

  socket.on('aiMove', async ({roomId,col})=>{
    const room = rooms[roomId];
    if(!room) return;
    const grid = room.grid;
    const player = 1; // human assumed player 1
    const r = drop(grid,col,player);
    if(r===-1) return;
    const win = checkWin(grid);
    if(win){ room.status = win.player===0? 'draw' : 'won'; room.winner=win.player; room.winCoords=win.coords; io.to(roomId).emit('state', room); return; }
    // AI move
    const aiCol = aiChoose(grid, room.ai.level, room.ai.aiPlayer);
    if(aiCol>=0){ drop(grid,aiCol,room.ai.aiPlayer); const win2 = checkWin(grid); if(win2){ room.status='won'; room.winner=win2.player; room.winCoords=win2.coords; } else room.turn=1; }
    io.to(roomId).emit('state', room);
  });

  socket.on('disconnecting', () => {
    // remove from rooms
    for(const roomId of socket.rooms){
      if(rooms[roomId]){
        const idx = rooms[roomId].players.indexOf(socket.id);
        if(idx!==-1){
          rooms[roomId].players.splice(idx,1);
          rooms[roomId].status='ended';
          io.to(roomId).emit('state', rooms[roomId]);
        }
      }
    }
  });
});

// Leaderboard APIs
app.get('/api/leaderboard', async (req,res)=>{
  const db = await ensureDb();
  const rows = await db.all('SELECT name,games,wins FROM players ORDER BY wins DESC, games ASC LIMIT 20');
  res.json(rows);
});

app.post('/api/playerResult', async (req,res)=>{
  const {name, played, won} = req.body;
  if(!name) return res.status(400).json({error:'Missing name'});
  const db = await ensureDb();
  await db.run('INSERT INTO players(name,games,wins) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET games=games+?, wins=wins+?',[name,played?1:0,won?1:0,played?1:0,won?1:0]);
  res.json({ok:true});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{
  console.log('Server listening on',PORT);
});
