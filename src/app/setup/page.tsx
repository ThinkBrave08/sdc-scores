'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import { db, Player } from '@/lib/database'

export default function SetupPage() {
  const searchParams = useSearchParams()
  const isReadOnly = searchParams.get('ro') === '1'
  
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    team: 'Prince' as 'Prince' | 'Bowman',
    handicap: 0
  })
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const data = await db.getPlayers()
      setPlayers(data)
    } catch (error) {
      console.error('Error loading players:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return

    try {
      if (editingPlayer) {
        await db.updatePlayer(editingPlayer.id, formData)
        setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? { ...p, ...formData } : p))
      } else {
        const newPlayer = await db.createPlayer(formData)
        setPlayers(prev => [...prev, newPlayer])
      }
      
      setFormData({ name: '', team: 'Prince', handicap: 0 })
      setEditingPlayer(null)
    } catch (error) {
      console.error('Error saving player:', error)
    }
  }

  const handleEdit = (player: Player) => {
    if (isReadOnly) return
    setEditingPlayer(player)
    setFormData({
      name: player.name,
      team: player.team,
      handicap: player.handicap
    })
  }

  const handleDelete = async (id: string) => {
    if (isReadOnly) return
    if (!confirm('Are you sure you want to delete this player?')) return

    try {
      await db.deletePlayer(id)
      setPlayers(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting player:', error)
    }
  }

  const handleSeedData = async () => {
    if (isReadOnly) return
    if (!confirm('This will create 22 demo players and 11 matches. Continue?')) return

    try {
      setSeeding(true)
      
      // Create demo players
      const demoPlayers = [
        // Prince team
        { name: 'Alex Prince', team: 'Prince' as const, handicap: 5 },
        { name: 'Ben Prince', team: 'Prince' as const, handicap: 8 },
        { name: 'Chris Prince', team: 'Prince' as const, handicap: 12 },
        { name: 'David Prince', team: 'Prince' as const, handicap: 15 },
        { name: 'Eric Prince', team: 'Prince' as const, handicap: 18 },
        { name: 'Frank Prince', team: 'Prince' as const, handicap: 22 },
        { name: 'George Prince', team: 'Prince' as const, handicap: 6 },
        { name: 'Henry Prince', team: 'Prince' as const, handicap: 9 },
        { name: 'Ian Prince', team: 'Prince' as const, handicap: 14 },
        { name: 'Jack Prince', team: 'Prince' as const, handicap: 20 },
        { name: 'Kevin Prince', team: 'Prince' as const, handicap: 16 },
        
        // Bowman team
        { name: 'Liam Bowman', team: 'Bowman' as const, handicap: 7 },
        { name: 'Mike Bowman', team: 'Bowman' as const, handicap: 10 },
        { name: 'Nick Bowman', team: 'Bowman' as const, handicap: 13 },
        { name: 'Oscar Bowman', team: 'Bowman' as const, handicap: 17 },
        { name: 'Paul Bowman', team: 'Bowman' as const, handicap: 21 },
        { name: 'Quinn Bowman', team: 'Bowman' as const, handicap: 4 },
        { name: 'Ryan Bowman', team: 'Bowman' as const, handicap: 11 },
        { name: 'Sam Bowman', team: 'Bowman' as const, handicap: 19 },
        { name: 'Tom Bowman', team: 'Bowman' as const, handicap: 3 },
        { name: 'Ulysses Bowman', team: 'Bowman' as const, handicap: 8 },
        { name: 'Victor Bowman', team: 'Bowman' as const, handicap: 15 }
      ]

      // Create players
      const createdPlayers = []
      for (const player of demoPlayers) {
        const created = await db.createPlayer(player)
        createdPlayers.push(created)
      }

      // Create demo matches
      const princePlayers = createdPlayers.filter(p => p.team === 'Prince')
      const bowmanPlayers = createdPlayers.filter(p => p.team === 'Bowman')
      
      const demoMatches = []
      for (let i = 0; i < 11; i++) {
        const match = await db.createMatch({
          player_a_id: princePlayers[i].id,
          player_b_id: bowmanPlayers[i].id,
          counts: i < 8 // First 8 matches count, last 3 are for sport
        })
        demoMatches.push(match)
      }

      // Initialize league state
      await db.updateLeagueState({
        id: '1',
        prince_base_points: 2,
        bowman_base_points: 0
      })

      await loadPlayers()
      alert('Demo data created successfully!')
    } catch (error) {
      console.error('Error seeding data:', error)
      alert('Error creating demo data')
    } finally {
      setSeeding(false)
    }
  }

  const teamOptions = [
    { value: 'Prince', label: 'Prince' },
    { value: 'Bowman', label: 'Bowman' }
  ]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading players...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Player Setup</h1>
        <p className="text-gray-600">Manage players and teams</p>
        {isReadOnly && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800">Read-only mode enabled</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isReadOnly}
            />
            
            <Select
              label="Team"
              value={formData.team}
              onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value as 'Prince' | 'Bowman' }))}
              options={teamOptions}
              disabled={isReadOnly}
            />
            
            <Input
              label="Handicap"
              type="number"
              min="0"
              max="36"
              value={formData.handicap}
              onChange={(e) => setFormData(prev => ({ ...prev, handicap: parseInt(e.target.value) || 0 }))}
              required
              disabled={isReadOnly}
            />
            
            <div className="flex space-x-3">
              <Button type="submit" disabled={isReadOnly}>
                {editingPlayer ? 'Update Player' : 'Add Player'}
              </Button>
              {editingPlayer && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setEditingPlayer(null)
                    setFormData({ name: '', team: 'Prince', handicap: 0 })
                  }}
                  disabled={isReadOnly}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Players</h2>
            <Button 
              onClick={handleSeedData} 
              variant="secondary"
              disabled={isReadOnly || seeding}
            >
              {seeding ? 'Seeding...' : 'Seed Demo Data'}
            </Button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No players found</p>
            ) : (
              players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{player.name}</div>
                    <div className="text-sm text-gray-600">
                      {player.team} • Handicap: {player.handicap}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleEdit(player)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger"
                        onClick={() => handleDelete(player.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {players.filter(p => p.team === 'Prince').length}
                </div>
                <div className="text-sm text-gray-600">Prince Players</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {players.filter(p => p.team === 'Bowman').length}
                </div>
                <div className="text-sm text-gray-600">Bowman Players</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
