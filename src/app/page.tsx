'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import Confetti from '@/components/Confetti'
import { db, Match, Player, LeagueState } from '@/lib/database'
import { calculateMatchResult, getHoleResult, getStrokesForHole } from '@/lib/database'

interface LeaderboardData {
  princePoints: number
  bowmanPoints: number
  princeBasePoints: number
  bowmanBasePoints: number
  totalMatches: number
  completedMatches: number
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [konamiCode, setKonamiCode] = useState<string[]>([])

  const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ]

  useEffect(() => {
    loadLeaderboardData()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKonamiCode(prev => {
        const newCode = [...prev, event.code]
        if (newCode.length > konamiSequence.length) {
          newCode.shift()
        }
        
        if (newCode.length === konamiSequence.length && 
            newCode.every((key, index) => key === konamiSequence[index])) {
          setShowConfetti(true)
          return []
        }
        
        return newCode
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadLeaderboardData = async () => {
    try {
      setLoading(true)
      
      const [players, matches, leagueState] = await Promise.all([
        db.getPlayers(),
        db.getMatches(),
        db.getLeagueState()
      ])

      // Calculate points from matches
      let princePoints = 0
      let bowmanPoints = 0
      let completedMatches = 0

      for (const match of matches) {
        if (!match.counts) continue
        
        const scores = await db.getScores(match.id)
        if (scores.length === 0) continue
        
        completedMatches++
        
        const holeResults: ('A' | 'B' | 'AS')[] = []
        
        for (let hole = 1; hole <= 18; hole++) {
          const score = scores.find(s => s.hole === hole)
          if (!score) break
          
          const playerA = match.player_a!
          const playerB = match.player_b!
          
          const strokesA = getStrokesForHole(playerA.handicap, hole)
          const strokesB = getStrokesForHole(playerB.handicap, hole)
          
          const result = getHoleResult(
            score.player_a_score,
            score.player_b_score,
            strokesA,
            strokesB,
            hole
          )
          
          holeResults.push(result)
        }
        
        const matchResult = calculateMatchResult(holeResults)
        
        if (match.player_a!.team === 'Prince') {
          princePoints += matchResult
          bowmanPoints += 1 - matchResult
        } else {
          bowmanPoints += matchResult
          princePoints += 1 - matchResult
        }
      }

      const princeBasePoints = leagueState?.prince_base_points || 2
      const bowmanBasePoints = leagueState?.bowman_base_points || 0

      setData({
        princePoints: princePoints + princeBasePoints,
        bowmanPoints: bowmanPoints + bowmanBasePoints,
        princeBasePoints,
        bowmanBasePoints,
        totalMatches: matches.filter(m => m.counts).length,
        completedMatches
      })
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Data</h2>
            <p className="text-gray-600">Unable to load leaderboard data. Please try again.</p>
          </div>
        </Card>
      </div>
    )
  }

  const princeWinning = data.princePoints > data.bowmanPoints
  const bowmanWinning = data.bowmanPoints > data.princePoints
  const tied = data.princePoints === data.bowmanPoints

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Confetti trigger={showConfetti} />
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SDC Scores Leaderboard</h1>
        <p className="text-gray-600">Prince vs Bowman Team Competition</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className={`${princeWinning ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-blue-600 mb-2">Prince</h2>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {data.princePoints.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">
              Base: {data.princeBasePoints} | Match Points: {(data.princePoints - data.princeBasePoints).toFixed(1)}
            </div>
            {princeWinning && (
              <div className="mt-2 text-green-600 font-semibold">🏆 Leading</div>
            )}
          </div>
        </Card>

        <Card className={`${bowmanWinning ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Bowman</h2>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {data.bowmanPoints.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">
              Base: {data.bowmanBasePoints} | Match Points: {(data.bowmanPoints - data.bowmanBasePoints).toFixed(1)}
            </div>
            {bowmanWinning && (
              <div className="mt-2 text-green-600 font-semibold">🏆 Leading</div>
            )}
          </div>
        </Card>
      </div>

      {tied && (
        <Card className="text-center bg-yellow-50">
          <h3 className="text-xl font-semibold text-yellow-800 mb-2">Tied!</h3>
          <p className="text-yellow-700">Both teams are tied at {data.princePoints.toFixed(1)} points</p>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{data.completedMatches}</div>
            <div className="text-sm text-gray-600">Completed Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{data.totalMatches}</div>
            <div className="text-sm text-gray-600">Total Matches</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
