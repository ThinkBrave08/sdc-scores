import { supabase, Player, Match, Score, LeagueState } from './supabaseClient'

// Re-export types for convenience
export type { Player, Match, Score, LeagueState }

// Database operations
export const db = {
  // Players
  async getPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async createPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .insert(player)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deletePlayer(id: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Matches
  async getMatches(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        player_a:players!matches_player_a_id_fkey(*),
        player_b:players!matches_player_b_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createMatch(match: Omit<Match, 'id' | 'created_at' | 'updated_at' | 'player_a' | 'player_b'>): Promise<Match> {
    const { data, error } = await supabase
      .from('matches')
      .insert(match)
      .select(`
        *,
        player_a:players!matches_player_a_id_fkey(*),
        player_b:players!matches_player_b_id_fkey(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match> {
    const { data, error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        player_a:players!matches_player_a_id_fkey(*),
        player_b:players!matches_player_b_id_fkey(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Scores
  async getScores(matchId: string): Promise<Score[]> {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('match_id', matchId)
      .order('hole')
    
    if (error) throw error
    return data || []
  },

  async upsertScore(score: Omit<Score, 'id' | 'created_at' | 'updated_at'>): Promise<Score> {
    const { data, error } = await supabase
      .from('scores')
      .upsert(score, { onConflict: 'match_id,hole' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // League State
  async getLeagueState(): Promise<LeagueState | null> {
    const { data, error } = await supabase
      .from('league_state')
      .select('*')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateLeagueState(updates: Partial<LeagueState>): Promise<LeagueState> {
    const { data, error } = await supabase
      .from('league_state')
      .upsert(updates, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Utility functions
export const calculateStrokes = (handicapA: number, handicapB: number): { a: number, b: number } => {
  const diff = Math.abs(handicapA - handicapB)
  const higherHandicap = handicapA > handicapB ? 'a' : 'b'
  
  return {
    a: higherHandicap === 'a' ? diff : 0,
    b: higherHandicap === 'b' ? diff : 0
  }
}

export const getHoleResult = (
  scoreA: number,
  scoreB: number,
  strokesA: number,
  strokesB: number,
  hole: number
): 'A' | 'B' | 'AS' => {
  const netA = scoreA - strokesA
  const netB = scoreB - strokesB
  
  if (netA < netB) return 'A'
  if (netB < netA) return 'B'
  return 'AS'
}

export const calculateMatchResult = (holeResults: ('A' | 'B' | 'AS')[]): number => {
  let pointsA = 0
  let pointsB = 0
  
  holeResults.forEach(result => {
    if (result === 'A') pointsA += 1
    else if (result === 'B') pointsB += 1
    else {
      pointsA += 0.5
      pointsB += 0.5
    }
  })
  
  if (pointsA > pointsB) return 1
  if (pointsB > pointsA) return 0
  return 0.5
}

// Stroke index for 18 holes (1-18, where 1 is hardest)
export const STROKE_INDEX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

export const getStrokesForHole = (handicap: number, hole: number): number => {
  const strokeIndex = STROKE_INDEX[hole - 1]
  return strokeIndex <= handicap ? 1 : 0
}
