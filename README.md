Connect-4-Interactive-Game-Development
Developed a Tic-Tac-Toe game implementing game logic, player interactions and win-condition detection. The project demonstrates programming fundamentals, conditional logic and problem-solving through the development of an interactive game.

# 🔴 Connect 4 — Full-Stack Web Application

A feature-rich, responsive, full-stack **Connect 4** web application supporting **Local Player vs Player**, **Single Player vs AI** (with 3 difficulty levels), and real-time **Multiplayer over WebSockets**, backed by an **Express / SQLite REST API** leaderboard.

---

## 🌟 Key Features

- 🎮 **Multiple Game Modes:**
  - **Local PvP:** Play against a friend on the same device.
  - **Player vs AI:** Test your skills against 3 AI difficulty tiers (Easy, Intermediate, Advanced).
  - **Online Multiplayer:** Real-time multiplayer rooms supported via Socket.io.
- 🧠 **AI Engine:**
  - **Level 1 (Random):** Makes random valid column choices.
  - **Level 2 (Intermediate):** Prioritizes immediate winning moves and blocks opponent winning moves.
  - **Level 3 (Advanced):** Utilizes minimax search with alpha-beta pruning and heuristic board evaluation algorithms.
- 🏆 **Live Leaderboard & Persistence:**
  - Built-in **SQLite** database storing player stats (games played, wins).
  - RESTful API endpoints (`/api/leaderboard`, `/api/playerResult`) with dynamic updates upon game completion.
- 🎨 **Modern & Responsive UI:**
  - Dynamic CSS grid with custom properties and gradient visuals.
  - Fluid responsive layouts across desktop, tablet, and mobile browsers.
  - Winning tile animations and highlights.
- ♿ **Accessibility (A11y):**
  - Full keyboard navigation support (Left/Right Arrow keys to select column, Enter key to drop piece).
  - Proper ARIA roles and labels for screen readers.

---

## 📁 Project Structure

```
connect4/
├── public/                 # Static assets served by Express
│   ├── index.html          # Main HTML markup
│   ├── style.css           # Styling, themes, responsive CSS Grid layout
│   └── game.js             # Client-side game logic, AI fallbacks, UI rendering
├── data/
│   └── connect4.sqlite     # SQLite database (auto-created on server start)
├── server.js               # Node.js/Express server, Socket.io, SQLite integration, AI algorithms
├── package.json            # Dependencies and start script
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have **Node.js** (v14+ recommended) and **npm** installed on your system.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/connect4.git
   cd connect4
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in your browser:**
   Navigate to `http://localhost:3000`.

---

## 🛠️ Tech Stack & API Reference

### Technologies
- **Frontend:** HTML5, CSS3 (CSS Grid/Variables), Vanilla JavaScript (ES6+).
- **Backend:** Node.js, Express.js.
- **Real-Time Communication:** Socket.io.
- **Database:** SQLite3 (`sqlite` & `sqlite3` driver).

### REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/leaderboard` | Fetches top 20 players ranked by wins. |
| `POST` | `/api/playerResult` | Updates or creates player records (`{ name, played, won }`). |

---

## 🎮 How to Play

1. Enter your name in the **Name** input field.
2. Select your preferred **Mode** (Player vs Player, Player vs AI) and **AI Level** if applicable.
3. Click **Start Game**.
4. **Controls:**
   - **Mouse/Touch:** Click on any cell in a column to drop your piece into that column.
   - **Keyboard:** Press `←` (Left Arrow) or `→` (Right Arrow) to select a column, and press `Enter` to drop.
5. Align 4 of your colored discs vertically, horizontally, or diagonally to win!
