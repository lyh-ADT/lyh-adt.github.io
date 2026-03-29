import { useState } from 'react'
import AudioDetector from './components/AudioDetector/AudioDetector'
import RandomDelayBeep from './components/RandomDelayBeep'
import CustomModePage from './components/CustomModePage'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('detector')

  return (
    <>
      <nav className="app-nav">
        <div className="nav-container">
          <button
            className={`nav-btn ${currentPage === 'detector' ? 'active' : ''}`}
            onClick={() => setCurrentPage('detector')}
          >
            🔫 Shot Timer
          </button>
          <button
            className={`nav-btn ${currentPage === 'random' ? 'active' : ''}`}
            onClick={() => setCurrentPage('random')}
          >
            🎲 随机 Beep 计时器
          </button>
          <button
            className={`nav-btn ${currentPage === 'custom' ? 'active' : ''}`}
            onClick={() => setCurrentPage('custom')}
          >
            🎯 自定义模式
          </button>
        </div>
      </nav>
      {currentPage === 'detector' ? <AudioDetector /> :
       currentPage === 'random' ? <RandomDelayBeep /> :
       <CustomModePage />}
    </>
  )
}

export default App
