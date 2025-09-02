'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { db, Match } from '@/lib/database'

export default function MatchesPage() {
  const searchParams = useSearchParams()
  const isReadOnly = searchParams.get('ro') === '1'
  
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      setLoading(true)
      const data = await db.getMatches()
      setMatches(data)
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCounts = async (matchId: string, currentCounts: boolean) => {
    if (isReadOnly) return

    try {
      // Optimistic update
      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, counts: !currentCounts } : m
      ))

      await db.updateMatch(matchId, { counts: !currentCounts })
    } catch (error) {
      console.error('Error updating match:', error)
      // Revert optimistic update
      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, counts: currentCounts } : m
      ))
    }
  }

  const getMatchStatus = (match: Match) => {
    // This would need to be enhanced to check if scores exist
    return 'Not Started' // Placeholder
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Matches</h1>
        <p className="text-gray-600">Manage match settings and view results</p>
        {isReadOnly && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800">Read-only mode enabled</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
            <div className="text-sm text-gray-600">Total Matches</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {matches.filter(m => m.counts).length}
            </div>
            <div className="text-sm text-gray-600">Counts for Points</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {matches.filter(m => !m.counts).length}
            </div>
            <div className="text-sm text-gray-600">For Sport Only</div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Match List</h2>
        
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No matches found</p>
            <p className="text-sm text-gray-400">
              Create players in the Setup page to generate matches
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div key={match.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="font-medium text-gray-900">
                          {match.player_a?.name || 'Unknown Player'}
                        </div>
                        <div className="text-sm text-blue-600">
                          {match.player_a?.team} (HCP: {match.player_a?.handicap})
                        </div>
                      </div>
                      
                      <div className="text-gray-400">vs</div>
                      
                      <div className="text-center">
                        <div className="font-medium text-gray-900">
                          {match.player_b?.name || 'Unknown Player'}
                        </div>
                        <div className="text-sm text-red-600">
                          {match.player_b?.team} (HCP: {match.player_b?.handicap})
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>Status: {getMatchStatus(match)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        match.counts 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {match.counts ? 'Counts for Points' : 'For Sport Only'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        variant={match.counts ? "secondary" : "primary"}
                        onClick={() => toggleCounts(match.id, match.counts)}
                      >
                        {match.counts ? 'Mark as Sport' : 'Mark as Counts'}
                      </Button>
                    )}
                    
                    <Link href={`/match/${match.id}`}>
                      <Button size="sm" variant="primary">
                        {isReadOnly ? 'View' : 'Score'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
