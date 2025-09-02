-- SDC Scores Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('Prince', 'Bowman')),
  handicap INTEGER NOT NULL CHECK (handicap >= 0 AND handicap <= 36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_a_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_b_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  counts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  hole INTEGER NOT NULL CHECK (hole >= 1 AND hole <= 18),
  player_a_score INTEGER NOT NULL CHECK (player_a_score >= 1 AND player_a_score <= 15),
  player_b_score INTEGER NOT NULL CHECK (player_b_score >= 1 AND player_b_score <= 15),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, hole)
);

-- League state table
CREATE TABLE IF NOT EXISTS league_state (
  id TEXT PRIMARY KEY DEFAULT '1',
  prince_base_points DECIMAL(3,1) NOT NULL DEFAULT 2.0,
  bowman_base_points DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches(player_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches(player_b_id);
CREATE INDEX IF NOT EXISTS idx_scores_match_id ON scores(match_id);
CREATE INDEX IF NOT EXISTS idx_scores_hole ON scores(hole);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_state_updated_at BEFORE UPDATE ON league_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_state ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON players FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON players FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON players FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON matches FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON matches FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON matches FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON scores FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON scores FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON scores FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON league_state FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON league_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON league_state FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON league_state FOR DELETE USING (true);

-- Insert initial league state
INSERT INTO league_state (id, prince_base_points, bowman_base_points) 
VALUES ('1', 2.0, 0.0) 
ON CONFLICT (id) DO NOTHING;
