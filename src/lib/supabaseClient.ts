import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Player {
  id: string
  name: string
  team: 'Prince' | 'Bowman'
  handicap: number
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  player_a_id: string
  player_b_id: string
  counts: boolean
  created_at: string
  updated_at: string
  player_a?: Player
  player_b?: Player
}

export interface Score {
  id: string
  match_id: string
  hole: number
  player_a_score: number
  player_b_score: number
  created_at: string
  updated_at: string
}

export interface LeagueState {
  id: string
  prince_base_points: number
  bowman_base_points: number
  created_at: string
  updated_at: string
}
