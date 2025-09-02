'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { db, Match, Score, Player } from '@/lib/database'
import { getStrokesForHole, getHoleResult, calculateMatchResult } from '@/lib/database'

interface HoleScore {
  hole: number
  playerA: number
  playerB: number
  strokesA: number
  strokesB: number
  result: 'A' | 'B' | 'AS'
}

export default function MatchDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const isReadOnly = searchParams.get('ro') === '1'
  
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [holeScores, setHoleScores] = useState<HoleScore[]>([])
  const [matchResult, setMatchResult] = useState<number | null>(null)

  useEffect(() => {
    if (matchId) {
      loadMatchData()
    }
  }, [matchId])

  useEffect(() => {
    if (match && scores.length > 0) {
      calculateHoleResults()
    }
  }, [match, scores])

  const loadMatchData = async () => {
    try {
      setLoading(true)
      const [matchData, scoresData] = await Promise.all([
        db.getMatches().then(matches => matches.find(m => m.id === matchId)),
        db.getScores(matchId)
      ])
      
      if (!matchData) {
        throw new Error('Match not found')
      }
      
      setMatch(matchData)
      setScores(scoresData)
    } catch (error) {
      console.error('Error loading match data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateHoleResults = () => {
    if (!match?.player_a || !match?.player_b) return

    const results: HoleScore[] = []
    
    for (let hole = 1; hole <= 18; hole++) {
      const score = scores.find(s => s.hole === hole)
      const strokesA = getStrokesForHole(match.player_a!.handicap, hole)
      const strokesB = getStrokesForHole(match.player_b!.handicap, hole)
      
      const result = score ? getHoleResult(
        score.player_a_score,
        score.player_b_score,
        strokesA,
        strokesB,
        hole
      ) : 'AS'
      
      results.push({
        hole,
        playerA: score?.player_a_score || 0,
        playerB: score?.player_b_score || 0,
        strokesA,
        strokesB,
        result
      })
    }
    
    setHoleScores(results)
    
    // Calculate match result
    const holeResults = results.map(r => r.result)
    const result = calculateMatchResult(holeResults)
    setMatchResult(result)
  }

  const updateScore = async (hole: number, player: 'A' | 'B', value: number) => {
    if (isReadOnly) return

    try {
      const existingScore = scores.find(s => s.hole === hole)
      const newScore = {
        match_id: matchId,
        hole,
        player_a_score: player === 'A' ? value : (existingScore?.player_a_score || 0),
        player_b_score: player === 'B' ? value : (existingScore?.player_b_score || 0)
      }

      // Optimistic update
      const updatedScores = scores.filter(s => s.hole !== hole)
      if (newScore.player_a_score > 0 || newScore.player_b_score > 0) {
        updatedScores.push(newScore as Score)
      }
      setScores(updatedScores)

      await db.upsertScore(newScore)
    } catch (error) {
      console.error('Error updating score:', error)
      // Revert optimistic update
      loadMatchData()
    }
  }

  const getResultColor = (result: 'A' | 'B' | 'AS') => {
    switch (result) {
      case 'A': return 'text-blue-600 font-semibold'
      case 'B': return 'text-red-600 font-semibold'
      case 'AS': return 'text-gray-600'
      default: return 'text-gray-400'
    }
  }

  const getResultText = (result: 'A' | 'B' | 'AS') => {
    switch (result) {
      case 'A': return 'A Win'
      case 'B': return 'B Win'
      case 'AS': return 'All Square'
      default: return '-'
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading match...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Match Not Found</h2>
            <p className="text-gray-600">The requested match could not be found.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Match Scoring</h1>
        {isReadOnly && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800">Read-only mode enabled</p>
          </div>
        )}
      </div>

      {/* Match Header */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {match.player_a?.name || 'Unknown Player'}
              </div>
              <div className="text-sm text-blue-600">
                {match.player_a?.team} • HCP: {match.player_a?.handicap}
              </div>
            </div>
            
            <div className="text-gray-400 text-2xl">vs</div>
            
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {match.player_b?.name || 'Unknown Player'}
              </div>
              <div className="text-sm text-red-600">
                {match.player_b?.team} • HCP: {match.player_b?.handicap}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              match.counts 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {match.counts ? 'Counts for Points' : 'For Sport Only'}
            </div>
            {matchResult !== null && (
              <div className="mt-2 text-lg font-semibold">
                {matchResult === 1 ? 'Player A Wins' : 
                 matchResult === 0 ? 'Player B Wins' : 'Tie'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Scoring Grid */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Hole-by-Hole Scoring</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hole
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {match.player_a?.name}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strokes
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {match.player_b?.name}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strokes
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holeScores.map((hole) => (
                <tr key={hole.hole} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {hole.hole}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <Input
                      type="number"
                      min="1"
                      max="15"
                      value={hole.playerA || ''}
                      onChange={(e) => updateScore(hole.hole, 'A', parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                      disabled={isReadOnly}
                    />
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {hole.strokesA > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        +{hole.strokesA}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <Input
                      type="number"
                      min="1"
                      max="15"
                      value={hole.playerB || ''}
                      onChange={(e) => updateScore(hole.hole, 'B', parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                      disabled={isReadOnly}
                    />
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {hole.strokesB > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                        +{hole.strokesB}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={getResultColor(hole.result)}>
                      {getResultText(hole.result)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Match Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {holeScores.filter(h => h.result === 'A').length}
                </div>
                <div className="text-sm text-gray-600">Holes Won (A)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {holeScores.filter(h => h.result === 'AS').length}
                </div>
                <div className="text-sm text-gray-600">All Square</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {holeScores.filter(h => h.result === 'B').length}
                </div>
                <div className="text-sm text-gray-600">Holes Won (B)</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
