

(function(){
  const ROWS=6;
  const COLS=7;

  let grid,  //creates the board itself, where all pieces are stored
      currentPlayer, //whos turn it is (1 =player 1/red, 2 = player2/blue)
      gameActive, //is the game over ir still going 
      mode, //AI, Local or network mode
      aiLevel; //AI mode easy intermediate or difficult 

      //getting the HTML elements connect the JavaScript to HTML
  const board = document.getElementById('board'); //Gets the game board container element
  const status = document.getElementById('status'); // gets the status display 
  const resetBtn = document.getElementById('reset');
  const startBtn = document.getElementById('start');
  const playerNameInput = document.getElementById('playerName');
  const modeSelect = document.getElementById('mode');
  const aiSelect = document.getElementById('aiLevel');
  const leaderboardTable = document.getElementById('leaderboard');

  //remembers which colmn is highlighted when using keyboad arrows
  let selectedCol = 0; //so when press enter using accessibility conrols it starts far left 
  
  function makeEmpty(){ return Array.from({length:ROWS},()=>Array(COLS).fill(0)); }

  function render(){
    console.log('Rendering board. Current grid:', JSON.stringify(grid)); // ADD THIS
    
    board.innerHTML='';
    board.style.setProperty('--cell','clamp(40px, 6vw, 64px)');
    board.style.gridTemplateColumns = `repeat(${COLS}, var(--cell))`;
    for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
            const cell = document.createElement('div'); cell.className='cell';
            cell.setAttribute('role','button');
            cell.setAttribute('aria-label',`Row ${r+1} Column ${c+1}`);
            const slot = document.createElement('span'); slot.className='slot';
            cell.appendChild(slot);
            
            // Make sure this is working
            if(grid[r][c]===1) {
                cell.classList.add('p1');
                console.log('Adding p1 at:', r, c); // ADD THIS
            }
            else if(grid[r][c]===2) {
                cell.classList.add('p2');
                console.log('Adding p2 at:', r, c); // ADD THIS
            }
            
            board.appendChild(cell);
        }
    }
    highlightSelected();
}

  function highlightSelected(){
    const cells = board.children;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const idx = r*COLS + c;
        cells[idx].classList.toggle('sel', c===selectedCol && r===0);
        cells[idx].tabIndex = 0;
      }
    }
  }

  function dropLocal(col){
    for(let r=ROWS-1;r>=0;r--){ if(grid[r][col]===0){ grid[r][col]=currentPlayer; return r; } }
    return -1;
  }

  function checkWinLocal(){
    const dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
        const p = grid[r][c]; if(p===0) continue;
        for(const [dr,dc] of dirs){
            const coords=[[r,c]];
            for(let k=1;k<4;k++){ 
                const nr=r+dr*k, nc=c+dc*k; 
                if(nr<0||nr>=ROWS||nc<0||nc>=COLS||grid[nr][nc]!==p) break; 
                coords.push([nr,nc]); 
            }
            if(coords.length===4) {
                console.log('WIN FOUND! Player:', p, 'Coords:', coords); // ADD THIS
                return {player:p,coords};
            }
        }
    }
    if(grid.every(row=>row.every(cell=>cell!==0))) return {player:0,coords:[]};
    return null;
}

  /*AI Function*/
  //getting the columns that arnt full
  function getAvailableColumns() {
    const available = [];
    for(let col = 0; col < COLS; col++) {
        if(grid[0][col] === 0) available.push(col);
    }
    return available;
}

// LEVEL 1: Naive (Random)
  function makeRandomMove() {
    const availableCols = getAvailableColumns();
    if (availableCols.length === 0) return -1; //board full

    //pick randomecolumn from available ones
    const randomIndex = Math.floor(Math.random() * availableCols.length);
    return availableCols[randomIndex];
  }

  function makeIntermediateAIMove() {
    const availableCols = getAvailableColumns();
    
    // 1. Check if AI can win
    for(let col of availableCols) {
        for(let r = ROWS-1; r >= 0; r--) {
            if(grid[r][col] === 0) {
                grid[r][col] = 2; // AI is player 2
                if(checkWinLocal()) {
                    grid[r][col] = 0; // Undo
                    console.log('Intermediate AI: WINNING MOVE!', col);
                    return col;
                }
                grid[r][col] = 0; // Undo
                break;
            }
        }
    }

    function makeAdvancedAIMove() {
    const availableCols = getAvailableColumns();
    if(availableCols.length === 0) return -1;
    
    console.log('Advanced AI: Thinking...');
    
    // Try each possible move and pick the best one
    let bestScore = -Infinity;
    let bestCol = availableCols[0];
    
    for(let col of availableCols) {
        // Simulate AI move
        for(let r = ROWS-1; r >= 0; r--) {
            if(grid[r][col] === 0) {
                grid[r][col] = 2; // AI move
                
                // Evaluate how good this move is
                let score = evaluateMove(col, r);
                
                grid[r][col] = 0; // Undo
                
                console.log(`Column ${col} score: ${score}`);
                
                if(score > bestScore) {
                    bestScore = score;
                    bestCol = col;
                }
                break;
            }
        }
    }
    
    console.log(`Advanced AI chooses column ${bestCol} with score ${bestScore}`);
    return bestCol;
}
    
    // 2. Check if need to block player
    for(let col of availableCols) {
        for(let r = ROWS-1; r >= 0; r--) {
            if(grid[r][col] === 0) {
                grid[r][col] = 1; // Player is 1
                if(checkWinLocal()) {
                    grid[r][col] = 0; // Undo
                    console.log('Intermediate AI: BLOCKING MOVE!', col);
                    return col;
                }
                grid[r][col] = 0; // Undo
                break;
            }
        }
    }
    
    // 3. Otherwise random
    console.log('Intermediate AI: RANDOM MOVE');
    return availableCols[Math.floor(Math.random() * availableCols.length)];
}

function evaluateMove(col, row) {
    let score = 0;
    const directions = [[0,1], [1,0], [1,1], [1,-1]];
    
    // Check each direction for potential
    for(let [dr, dc] of directions) {
        let count = 1; // The piece we just placed
        let blocks = 0;
        
        // Check positive direction
        for(let step = 1; step < 4; step++) {
            const nr = row + dr * step;
            const nc = col + dc * step;
            if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
            if(grid[nr][nc] === 2) count++;
            else if(grid[nr][nc] === 1) { blocks++; break; }
            else break; // Empty stops counting
        }
        
        // Check negative direction
        for(let step = 1; step < 4; step++) {
            const nr = row - dr * step;
            const nc = col - dc * step;
            if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
            if(grid[nr][nc] === 2) count++;
            else if(grid[nr][nc] === 1) { blocks++; break; }
            else break;
        }
        
        // Score based on count
        if(count >= 4) score += 1000; // Winning move
        else if(count === 3) score += 100;
        else if(count === 2) score += 10;
        
        // Penalize if blocked
        if(blocks > 0) score -= 20;
    }
    
    // Prefer center columns
    const centerDist = Math.abs(col - 3);
    score += (3 - centerDist) * 5;
    
    return score;
}



  //AI move functinoality
  function makeAIMove() {
    console.log('🤖 AI move started - Level:', aiLevel, 'Current player:', currentPlayer);
    
    if(!gameActive) {
        console.log('Game not active');
        return;
    }
    
    if(currentPlayer !== 2) {
        console.log('Not AI turn');
        return;
    }
    
    // Get available columns
    let availableCols = [];
    let startTime = Date.now();
    
    for(let col = 0; col < COLS; col++) {
        if(grid[0][col] === 0) {
            availableCols.push(col);
        }
    }
    
    console.log('Available columns:', availableCols);
    
    if(availableCols.length === 0) {
        console.log('No moves available');
        return;
    }
    
    let aiCol;
    
    // Simple random for ALL levels temporarily to test speed
    console.log('Using RANDOM move for testing');
    aiCol = availableCols[Math.floor(Math.random() * availableCols.length)];
    
    console.log('AI chose column:', aiCol);
    
    // Drop the piece
    let rowDropped = dropLocal(aiCol);
    console.log('Piece dropped at row:', rowDropped);
    
    if(rowDropped === -1) {
        console.log('Drop failed');
        return;
    }
    
    // Show the move
    render();
    
    // Check win
    let win = checkWinLocal();
    
    if(win) {
        console.log('Game over - winner:', win.player);
        gameActive = false;
        showWin(win);
        postResult(win.player);
    } else {
        currentPlayer = 1;
        status.textContent = `Player ${currentPlayer} to move`;
    }
    
    let endTime = Date.now();
    console.log('AI move took:', endTime - startTime, 'ms');
}

  function initLocal(){
    grid = makeEmpty(); 
    currentPlayer=1; 
    gameActive=true;
    if (mode === 'ai') {
      status.textContent='Player vs AI Your turn to move'; 
    } else {
      status.textContent = 'Local PVP - Player 1 to move';
    }

    render();
  }

  startBtn.addEventListener('click', ()=>{
    mode = modeSelect.value; 
    aiLevel = parseInt(aiSelect.value,10);

    if(mode==='ai'){ 
      initLocal(); 
      networkControls.hidden=true; 
    }
    else if(mode==='local'){ 
      initLocal(); 
      networkControls.hidden=true; 
    }
    else { 
      networkControls.hidden=false; 
      status.textContent='Network mode — create or join a room'; }
  });


  resetBtn.addEventListener('click', ()=>{ 
    initLocal(); 
    currentRoom=null; roomInfo.textContent=''; 
  });


  board.addEventListener('click', e=>{
    if(!gameActive) return;
    const idx = Array.prototype.indexOf.call(board.children, e.target.closest('.cell'));
    if(idx<0) return;
    const col = idx % COLS;
    handleMove(col);
  });

  function handleMove(col){
    if(mode==='local'){ 
      const r=dropLocal(col); 
      if(r===-1) return; 
      render();

      const win=checkWinLocal(); 

      if(win){
        gameActive=false; 
        showWin(win); 
        postResult(win.player); 
      } else { 
        currentPlayer = currentPlayer===1?2:1; 
        status.textContent=`Player ${currentPlayer} to move`; 
      }
    }
    else if (mode ==='ai') {
      if (currentPlayer === 1){
        const r = dropLocal(col);
        if (r === -1) return;
        render();
        
        const win=checkWinLocal();


        if (win) {
          gameActive = false;
          showWin(win);
          postResult(win.player);
        }else {
          currentPlayer = 2;
          status.textContent = 'AI thinking';
          setTimeout(()=>makeAIMove(), 3);
        }
      }
    }
  }

  function showWin(win){
    console.log('showWin called with:', win);
    if(win.player===0) {
        status.textContent='Draw!'; 
    } else {
        status.textContent=`Player ${win.player} wins!`;
    }
    if(win.coords && win.coords.length > 0) {
        for(const [r,c] of win.coords){ 
            const idx = r*COLS + c; 
            console.log('Adding win class to cell index:', idx, 'at row:', r, 'col:', c);
            board.children[idx].classList.add('win'); 
        }
    } else {
        console.log('No coordinates to highlight!'); 
    }
  }

  // keyboard navigation
  document.addEventListener('keydown', e=>{
    if(e.key==='ArrowLeft'){ selectedCol = Math.max(0, selectedCol-1); 
      highlightSelected(); 
    } else if(e.key==='ArrowRight'){ 
      selectedCol = Math.min(COLS-1, selectedCol+1); highlightSelected(); 
    } else if(e.key==='Enter'){ 
      handleMove(selectedCol); 
    }
  });

 
  // leaderboard
 // ========== LEADERBOARD FUNCTIONS ==========

// Load and display leaderboard
async function loadLeaderboard(){
    try {
        console.log('📊 Fetching leaderboard...');
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Leaderboard data received:', data);
        
        // Clear table
        leaderboardTable.innerHTML = '';
        
        // Add header
        const header = document.createElement('tr');
        header.innerHTML = '<th>Name</th><th>Games</th><th>Wins</th>';
        leaderboardTable.appendChild(header);
        
        // Add data rows
        if (data.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="3">No games played yet</td>';
            leaderboardTable.appendChild(emptyRow);
        } else {
            data.forEach(player => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${player.name}</td><td>${player.games}</td><td>${player.wins}</td>`;
                leaderboardTable.appendChild(row);
            });
        }
    } catch(error) {
        console.error('❌ Failed to load leaderboard:', error);
        leaderboardTable.innerHTML = '<tr><th>Name</th><th>Games</th><th>Wins</th></tr><tr><td colspan="3">❌ Server not connected</td></tr>';
    }
}

// Save game result
async function postResult(winPlayer) {
    try {
        const name = playerNameInput.value.trim() || 'Anonymous';
        console.log('📝 Saving result for:', name, 'winner:', winPlayer);
        
        const response = await fetch('/api/playerResult', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                played: 1,
                won: winPlayer === 1
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Result saved:', result);
        
        // Refresh leaderboard
        loadLeaderboard();
        
    } catch(error) {
        console.error('❌ Failed to save result:', error);
    }
}
  function renderLeaderboard(rows){
    leaderboardTable.innerHTML = '<tr><th>Name</th><th class="small">Games</th><th class="small">Wins</th></tr>';
    rows.forEach(r=>{ const tr=document.createElement('tr'); 
      tr.innerHTML=`<td>${r.name}</td><td>${r.games}</td><td>${r.wins}</td>`; 
      leaderboardTable.appendChild(tr); 
    });
  }

  async function postResult(winPlayer){
    try{
      const name = playerNameInput.value || 'Player';
      await fetch('/api/playerResult',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,played:1,won: winPlayer===1})});
      loadLeaderboard();
    }catch(e){}
  }

  function initAIGame(){
    // create AI game on server
    socket.emit('createAIGame',{level:aiLevel,name:playerNameInput.value||'Player'});
  }

  // start as local default
  initLocal(); loadLeaderboard();
})();
