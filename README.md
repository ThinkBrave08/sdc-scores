# SDC Scores

A Next.js 14 golf scoring system for Prince vs Bowman team competition.

## Features

- **Leaderboard**: Real-time scoring between Prince and Bowman teams
- **Player Management**: Add, edit, and manage players with handicaps
- **Match Management**: Create matches and toggle between "counts for points" and "for sport"
- **Hole-by-Hole Scoring**: Enter scores with automatic stroke calculation
- **Optimistic Updates**: UI updates immediately with error reconciliation
- **Read-Only Mode**: Add `?ro=1` to any URL to disable inputs
- **Easter Egg**: Konami code on leaderboard triggers confetti

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `database-schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

### Getting Started

1. **Setup Page**: Add players or use the "Seed Demo Data" button to create 22 demo players and 11 matches
2. **Matches Page**: View all matches and toggle whether they count for points
3. **Match Scoring**: Click "Score" on any match to enter hole-by-hole scores
4. **Leaderboard**: View the current standings between teams

### Scoring System

- **Handicaps**: Higher handicap players get strokes on harder holes
- **Stroke Index**: Holes 1-18 ranked by difficulty (1 = hardest)
- **Net Scoring**: Gross score minus handicap strokes
- **Match Points**: 1 point for win, 0.5 for tie, 0 for loss
- **Base Points**: Prince starts with +2 points, Bowman with 0

### Read-Only Mode

Add `?ro=1` to any URL to disable all inputs and switches. Useful for viewing scores without accidentally making changes.

### Easter Egg

On the leaderboard page, enter the Konami code (↑↑↓↓←→←→BA) to trigger confetti animation.

## Database Schema

The application uses the following tables:

- **players**: Player information (name, team, handicap)
- **matches**: Match pairings and settings
- **scores**: Hole-by-hole scores for each match
- **league_state**: Base points for each team

## Technology Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Supabase** for database and real-time updates
- **Optimistic UI** for responsive user experience

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT License
