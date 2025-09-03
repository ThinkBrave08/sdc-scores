'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UUID = string;
type Team = { id: UUID; name: 'Prince'|'Bowman' };
type Player = { id: UUID; display_name: string; handicap: number; team_id: UUID };
type Match = { id: UUID; match_date: string; counts: boolean; notes: string|null; tee_time: string|null };
type MatchPlayer = { id: UUID; match_id: UUID; player_id: UUID; side: 'A'|'B' };
type MatchHole = { match_id: UUID; hole_number: number; side_a_gross: number|null; side_b_gross: number|null };
type HoleInfo = { hole_number: number; par: number; stroke_index: number };

const PRINCE_BG = 'bg-gray-200';
const BOWMAN_BG = 'bg-[#FFCB05]';

function strokeHoles(strokeIndexByHole: number[], hcapA: number, hcapB: number) {
  const diff = Math.abs(hcapA - hcapB);
  if (!diff) return { aGets: new Set<number>(), bGets: new Set<number>() };
  const higherIsA = hcapA > hcapB;
  const stroked = new Set<number>();
  strokeIndexByHole.forEach((si, idx) => { if (si <= diff) stroked.add(idx + 1); });
  return higherIsA ? { aGets: stroked, bGets: new Set() } : { aGets: new Set(), bGets: stroked };
}
function holeOutcome(grossA?: number|null, grossB?: number|null, aGets=false, bGets=false) {
  if (!grossA || !grossB) return 'pending' as const;
  const netA = grossA - (aGets ? 1 : 0);
  const netB = grossB - (bGets ? 1 : 0);
  if (netA < netB) return 'A' as const;
  if (netB < netA) return 'B' as const;
  return 'AS' as const;
}

export default function RoundSheet() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [mps, setMps] = useState<MatchPlayer[]>([]);
  const [holes, setHoles] = useState<HoleInfo[]>([]);
  const [scores, setScores] = useState<MatchHole[]>([]);
  const [basePrince, setBasePrince] = useState(2);
  const [baseBowman, setBaseBowman] = useState(0);
  const [readOnly, setReadOnly] = useState(false);

  // Magic button audio (Michigan fight song)
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const [audioError, setAudioError] = useState<string|null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setReadOnly(new URLSearchParams(location.search).get('ro') === '1');
  }, []);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

      const [{ data: t }, { data: cs }, { data: ms }, { data: mp }, { data: mh }, { data: ls }, { data: ps }] =
        await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('course_holes').select('hole_number,par,stroke_index').order('hole_number'),
          supabase.from('matches').select('*').eq('match_date', dateStr).order('tee_time', { ascending: true }).order('id'),
          supabase.from('match_players').select('*'),
          supabase.from('match_holes').select('*'),
          supabase.from('league_state').select('*').maybeSingle(),
          supabase.from('players').select('*'),
        ]);

      setTeams(t ?? []);
      setHoles(cs ?? []);
      setMatches(ms ?? []);
      setMps(mp ?? []);
      setScores(mh ?? []);
      if (ls) { setBasePrince(ls.base_prince_points ?? 2); setBaseBowman(ls.base_bowman_points ?? 0); }
      setPlayers(ps ?? []);
    })();
  }, []);

  const strokeIndexByHole = useMemo(() => holes.map(h => h.stroke_index), [holes]);
  const teamsByName = useMemo(() => new Map(teams.map(t => [t.name, t])), [teams]);
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const mpByMatch = useMemo(() => {
    const m = new Map<UUID, { A?: Player; B?: Player; mpA?: MatchPlayer; mpB?: MatchPlayer }>();
    mps.forEach(x => {
      const row = m.get(x.match_id) ?? {};
      const pl = playerById.get(x.player_id);
      if (x.side === 'A') { row.A = pl; row.mpA = x; } else { row.B = pl; row.mpB = x; }
      m.set(x.match_id, row);
    });
    return m;
  }, [mps, playerById]);

  const scoresByMatch = useMemo(() => {
    const m = new Map<UUID, Map<number, MatchHole>>();
    scores.forEach(s => {
      if (!m.has(s.match_id)) m.set(s.match_id, new Map());
      m.get(s.match_id)!.set(s.hole_number, s);
    });
    return m;
  }, [scores]);

  async function getOrCreatePlayer(name: string, team: 'Prince'|'Bowman', handicap: number) {
    const teamId = teamsByName.get(team)?.id; if (!teamId || !name.trim()) return null;
    const { data: ex } = await supabase.from('players').select('id,handicap,team_id').eq('display_name', name.trim()).maybeSingle();
    if (ex?.id) {
      if (ex.handicap !== handicap || ex.team_id !== teamId) await supabase.from('players').update({ handicap, team_id: teamId }).eq('id', ex.id);
      return ex.id as UUID;
    }
    const { data } = await supabase.from('players').insert({ display_name: name.trim(), handicap, team_id: teamId }).select('id').single();
    if (!data) return null;
    setPlayers(p => [...p, { id: data.id, display_name: name.trim(), handicap, team_id: teamId } as Player]);
    return data.id as UUID;
  }
  async function assignMatchPlayer(matchId: UUID, side: 'A'|'B', playerId: UUID) {
    const existing = mps.find(x => x.match_id === matchId && x.side === side);
    if (existing) {
      if (existing.player_id !== playerId) {
        await supabase.from('match_players').update({ player_id: playerId }).eq('id', existing.id);
        setMps(prev => prev.map(r => r.id === existing.id ? { ...r, player_id: playerId } : r));
      }
    } else {
      const { data } = await supabase.from('match_players').insert({ match_id: matchId, player_id: playerId, side }).select('*').single();
      if (data) setMps(prev => [...prev, data as any]);
    }
  }
  async function upsertScore(matchId: UUID, hole: number, side: 'A'|'B', val: string) {
    const v = val ? parseInt(val, 10) : null;
    const existing = scores.find(s => s.match_id === matchId && s.hole_number === hole);
    const patch = side === 'A'
      ? { match_id: matchId, hole_number: hole, side_a_gross: v, side_b_gross: existing?.side_b_gross ?? null }
      : { match_id: matchId, hole_number: hole, side_a_gross: existing?.side_a_gross ?? null, side_b_gross: v };
    setScores(prev => { const c=[...prev]; const i=c.findIndex(s=>s.match_id===matchId && s.hole_number===hole); if(i===-1) c.push(patch as any); else c[i]={...c[i],...patch} as any; return c; });
    await supabase.from('match_holes').upsert(patch, { onConflict: 'match_id,hole_number' });
  }
  async function toggleCounts(matchId: UUID, counts: boolean) {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, counts } : m));
    await supabase.from('matches').update({ counts }).eq('id', matchId);
  }
  async function updateMeta(matchId: UUID, field: 'tee_time'|'notes', value: string) {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [field]: value } : m));
    await supabase.from('matches').update({ [field]: value }).eq('id', matchId);
  }
  async function createTodaysMatchesIfEmpty() {
    if (matches.length) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const teeTimes = ["2:23","2:31","2:40","2:48","2:57","Early","","","","",""];
    const rows = teeTimes.map(tt => ({ match_date: dateStr, counts: tt !== "2:48", tee_time: tt }));
    const { data } = await supabase.from('matches').insert(rows).select('*');
    setMatches(data ?? []);
  }

  // team totals
  const totals = useMemo(() => {
    let pr = basePrince, bo = baseBowman;
    for (const m of matches) {
      const pm = mpByMatch.get(m.id); if (!pm?.A || !pm?.B || !m.counts) continue;
      const { aGets, bGets } = strokeHoles(strokeIndexByHole, pm.A.handicap ?? 0, pm.B.handicap ?? 0);
      let margin = 0;
      for (const h of holes) {
        const row = scoresByMatch.get(m.id)?.get(h.hole_number);
        const res = holeOutcome(row?.side_a_gross, row?.side_b_gross, aGets.has(h.hole_number), bGets.has(h.hole_number));
        if (res === 'A') margin++; else if (res === 'B') margin--;
      }
      if (margin > 0) pr += 1;
      else if (margin < 0) bo += 1;
      else { pr += 0.5; bo += 0.5; }
    }
    return { pr, bo };
  }, [matches, holes, scoresByMatch, basePrince, baseBowman, strokeIndexByHole, mpByMatch]);

  const todayMatches = useMemo(() => matches.map(m => ({ ...m, ...(mpByMatch.get(m.id) ?? {}) })), [matches, mpByMatch]);

  function WolverinesButton() {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (!audioRef.current) return;
            if (playing) { audioRef.current.pause(); setPlaying(false); }
            else {
              audioRef.current.play().then(()=>setPlaying(true)).catch(()=>setAudioError('Drop public/victors.mp3 to enable audio.'));
            }
          }}
          className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center"
          title="Magic button"
        >
          <img src="/wolverines.svg" alt="M" className="w-7 h-7" />
        </button>
        {audioError && <span className="text-xs text-gray-500">{audioError}</span>}
        <audio ref={audioRef} src="/victors.mp3" preload="none" />
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-semibold">SDC Round Sheet</div>
        <div className="flex items-center gap-4">
          <div className="text-lg font-medium">Prince {totals.pr.toFixed(1)} — {totals.bo.toFixed(1)} Bowman</div>
          <WolverinesButton />
        </div>
      </div>

      {matches.length === 0 && (
        <div className="mb-2">
          <button className="px-3 py-1 border rounded text-sm" onClick={createTodaysMatchesIfEmpty} disabled={readOnly}>
            Create today&apos;s 11 matches (tee times)
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full border border-gray-200">
          <thead className="text-xs sticky top-0 bg-white z-10">
            <tr>
              <th className="px-2 py-2 text-left">Time / Friendly</th>
              <th className={`px-2 py-2 text-left ${PRINCE_BG}`}>Team Princey: Name / HCP</th>
              <th className={`px-2 py-2 text-left ${BOWMAN_BG}`}>Team Bo: Name / HCP</th>
              {holes.map(h => <th key={h.hole_number} className="px-1 py-2 text-center">H{h.hole_number}</th>)}
              <th className="px-2 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {todayMatches.map(m => {
              const A = (mpByMatch.get(m.id)?.A);
              const B = (mpByMatch.get(m.id)?.B);
              const { aGets, bGets } = strokeHoles(strokeIndexByHole, A?.handicap ?? 0, B?.handicap ?? 0);
              let margin = 0;

              return (
                <tr key={m.id} className="border-b">
                  <td className="px-2 py-1 whitespace-nowrap">
                    <input disabled={readOnly} value={m.tee_time ?? ''} onChange={e=>updateMeta(m.id,'tee_time',e.target.value)} placeholder="2:23" className="w-16 border rounded px-1 py-0.5 text-sm"/>
                    <label className="ml-2 text-xs">
                      <input type="checkbox" disabled={readOnly} checked={!m.counts} onChange={e=>toggleCounts(m.id, !e.target.checked)} className="mr-1"/>Friendly
                    </label>
                  </td>

                  <td className={`px-2 py-1 ${PRINCE_BG}`}>
                    <div className="flex gap-2 items-center">
                      <input
                        disabled={readOnly}
                        defaultValue={A?.display_name ?? ''}
                        onBlur={async e=>{const pid=await getOrCreatePlayer(e.target.value,'Prince',A?.handicap ?? 0); if(pid) assignMatchPlayer(m.id,'A',pid);}}
                        placeholder="M WINKLER"
                        className="border rounded px-1 py-0.5 text-sm w-40"
                      />
                      <input
                        disabled={readOnly}
                        type="number"
                        min={0}
                        defaultValue={A?.handicap ?? 0}
                        onBlur={async e=>{
                          const text = (e.currentTarget.parentElement?.querySelector('input[type=text]') as HTMLInputElement)?.value || A?.display_name || '';
                          if (!text.trim()) return;
                          const pid = await getOrCreatePlayer(text,'Prince',parseInt(e.target.value||'0',10));
                          if (pid) assignMatchPlayer(m.id,'A',pid);
                        }}
                        className="border rounded px-1 py-0.5 text-sm w-14"
                      />
                    </div>
                  </td>

                  <td className={`px-2 py-1 ${BOWMAN_BG}`}>
                    <div className="flex gap-2 items-center">
                      <input
                        disabled={readOnly}
                        defaultValue={B?.display_name ?? ''}
                        onBlur={async e=>{const pid=await getOrCreatePlayer(e.target.value,'Bowman',B?.handicap ?? 0); if(pid) assignMatchPlayer(m.id,'B',pid);}}
                        placeholder="G PIGNANELLI"
                        className="border rounded px-1 py-0.5 text-sm w-40"
                      />
                      <input
                        disabled={readOnly}
                        type="number"
                        min={0}
                        defaultValue={B?.handicap ?? 0}
                        onBlur={async e=>{
                          const text = (e.currentTarget.parentElement?.querySelector('input[type=text]') as HTMLInputElement)?.value || B?.display_name || '';
                          if (!text.trim()) return;
                          const pid = await getOrCreatePlayer(text,'Bowman',parseInt(e.target.value||'0',10));
                          if (pid) assignMatchPlayer(m.id,'B',pid);
                        }}
                        className="border rounded px-1 py-0.5 text-sm w-14"
                      />
                    </div>
                  </td>

                  {holes.map(h => {
                    const row = scoresByMatch.get(m.id)?.get(h.hole_number);
                    const res = holeOutcome(row?.side_a_gross, row?.side_b_gross, aGets.has(h.hole_number), bGets.has(h.hole_number));
                    if (res === 'A') margin++;
                    else if (res === 'B') margin--;
                    const cum = margin === 0 ? 'AS' : margin > 0 ? `A+${margin}` : `B+${-margin}`;

                    return (
                      <td key={`${m.id}-${h.hole_number}`} className="px-1 py-1 text-center align-top">
                        <div className="relative">
                          <input disabled={readOnly} inputMode="numeric" placeholder="-" defaultValue={row?.side_a_gross ?? ''} onBlur={e=>upsertScore(m.id,h.hole_number,'A',e.target.value)} className="w-10 border rounded px-1 py-0.5 text-sm text-center"/>
                          {aGets.has(h.hole_number) && <span className="absolute -left-2 top-1 text-xs">•</span>}
                        </div>
                        <div className="relative mt-1">
                          <input disabled={readOnly} inputMode="numeric" placeholder="-" defaultValue={row?.side_b_gross ?? ''} onBlur={e=>upsertScore(m.id,h.hole_number,'B',e.target.value)} className="w-10 border rounded px-1 py-0.5 text-sm text-center"/>
                          {bGets.has(h.hole_number) && <span className="absolute -left-2 top-1 text-xs">•</span>}
                        </div>
                        <div className="text-[10px] leading-none mt-1">{cum}</div>
                      </td>
                    );
                  })}

                  <td className="px-2 py-1 text-sm whitespace-nowrap">
                    {margin===0 ? 'AS' : margin>0 ? `A ${margin}-up` : `B ${-margin}-up`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}