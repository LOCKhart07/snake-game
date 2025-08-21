# 🐍 Snake Game with Leaderboard 

[![Play Now](https://img.shields.io/badge/Play-Now-brightgreen)](https://slitherbite.lockhart.in)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-000000?logo=flask)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern take on the classic snake game with real-time competitive features! Challenge yourself and compete with players worldwide on our global leaderboard.

## ✨ Features

- 🎮 Classic snake gameplay with modern controls and smooth animations
- 🏆 Real-time global leaderboard with live score updates
- 📊 Personal best tracking and performance analytics
- 📱 Fully responsive design optimized for desktop
- 🔒 Advanced anti-cheat system with request validation and replay protection
- 🤫 Hidden auto-play cheat for those who can find it!

## 🛠️ Tech Stack

### Frontend
- Vue.js 3 - Progressive JavaScript Framework
- Vite - Next Generation Frontend Tooling
- Axios - HTTP Client
- Modern responsive UI design

### Backend
- FastAPI - Modern Python Web Framework
- SQLAlchemy - SQL Toolkit and ORM
- Pydantic - Data Validation
- SSE (Server-Sent Events) for real-time updates

## 🚀 Getting Started

### Frontend Development
```bash
cd frontend
npm install
npm run dev    # Start development server
npm run build  # Build for production
```

### Backend Development
```bash
cd backend
uv sync
uv run python app.py  # Start development server
```

## 🐳 Docker Deployment

The backend can be deployed using Docker:

```bash
# Create data directory
mkdir -p /mnt/snake-game

# Start the service
docker-compose up -d
```

The service includes:
- 🔄 Automatic container health checks
- 💾 Persistent data storage
- 🔄 Automatic image updates

## 📦 Deployment

- Frontend: Automatically deployed to GitHub Pages on push to main branch
- Backend: Deployed via Docker with automatic health checks and updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues and pull requests.
