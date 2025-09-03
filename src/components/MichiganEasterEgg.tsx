'use client'

import { useEffect, useState } from 'react'

interface MichiganEasterEggProps {
  trigger: boolean
}

export default function MichiganEasterEgg({ trigger }: MichiganEasterEggProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (trigger) {
      playMichiganFightSong()
    }
  }, [trigger])

  const playMichiganFightSong = () => {
    setIsPlaying(true)
    setShowAnimation(true)
    
    // Create audio context for the fight song
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Michigan Fight Song melody (simplified version)
    const notes = [
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 659.25, duration: 0.6 }, // E5
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 659.25, duration: 0.6 }, // E5
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 392.00, duration: 0.6 }, // G4
      { freq: 440.00, duration: 0.3 }, // A4
      { freq: 440.00, duration: 0.3 }, // A4
      { freq: 440.00, duration: 0.3 }, // A4
      { freq: 523.25, duration: 0.6 }, // C5
      { freq: 440.00, duration: 0.3 }, // A4
      { freq: 523.25, duration: 0.6 }, // C5
      { freq: 440.00, duration: 0.3 }, // A4
      { freq: 392.00, duration: 0.6 }, // G4
    ]

    let currentTime = audioContext.currentTime

    notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(note.freq, currentTime)
      oscillator.type = 'square'
      
      gainNode.gain.setValueAtTime(0, currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.duration)
      
      oscillator.start(currentTime)
      oscillator.stop(currentTime + note.duration)
      
      currentTime += note.duration
    })

    // Stop animation after song ends
    setTimeout(() => {
      setIsPlaying(false)
      setShowAnimation(false)
    }, 5000)
  }

  if (!showAnimation) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Michigan colors background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-blue-600 to-yellow-400 opacity-20 animate-pulse" />
      
      {/* Floating M's */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-6xl font-bold text-blue-600 animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1 + Math.random() * 2}s`,
            transform: 'rotate(0deg)',
            animation: `float 3s ease-in-out infinite, rotate 4s linear infinite`,
          }}
        >
          M
        </div>
      ))}
      
      {/* Go Blue text */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="text-8xl font-bold text-blue-600 animate-pulse">
          GO BLUE!
        </div>
        <div className="text-2xl font-semibold text-yellow-400 text-center mt-4 animate-bounce">
          Hail to the Victors!
        </div>
      </div>
      
      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
