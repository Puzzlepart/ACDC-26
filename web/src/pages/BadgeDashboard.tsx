import { useState, useEffect, useMemo } from 'react'

const ACDC_BASE = 'https://stacdc2026.blob.core.windows.net/acdc'

interface Badge {
  id: number
  title: string
  description: string
  category: string
  score: number
  visible: boolean
}

interface Team {
  id: string
  name: string
  shortName: string
  score: number
  score_badge: number
  score_category: number
  memberCount: number
}

interface Claim {
  id: string
  badgeId: number
  teamId: string
  teamName: string
  playerName: string
  webUrl: string
  comment: string
  timestamp: number
  status: 'approved' | 'rejected' | 'pending'
  judgeMessage: string
  points: number
}

interface Ranking {
  id: string
  day: number
  badgeId: number
  teamId: string
  teamName: string
  rank: number
  isDraft: boolean
  timestamp: number
  judgePlayerName: string
}

type SortField = 'score' | 'name' | 'badges' | 'members'
type SortDir = 'asc' | 'desc'
type ClaimFilter = 'all' | 'approved' | 'pending' | 'rejected'

const BadgeDashboard = () => {
  const [badges, setBadges] = useState<Badge[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [metaRes, teamsRes, claimsRes, rankingsRes] = await Promise.all([
          fetch(`${ACDC_BASE}/metadata.json`).then(r => r.json()),
          fetch(`${ACDC_BASE}/teams.json`).then(r => r.json()),
          fetch(`${ACDC_BASE}/claims.json`).then(r => r.json()),
          fetch(`${ACDC_BASE}/rankings.json`).then(r => r.json()),
        ])

        setBadges(metaRes.data.badges || [])
        setTeams(teamsRes.data.teams || [])
        setClaims(claimsRes.data.claims || [])
        setRankings(rankingsRes.data.rankings || [])
        setError(null)
      } catch (err) {
        setError('Failed to fetch ACDC data. Check your connection.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const badgeMap = useMemo(() => {
    const map = new Map<number, Badge>()
    badges.forEach(b => map.set(b.id, b))
    return map
  }, [badges])

  const categories = useMemo(() => {
    const cats = new Set(badges.map(b => b.category))
    return ['all', ...Array.from(cats).sort()]
  }, [badges])

  const sortedTeams = useMemo(() => {
    let filtered = [...teams].filter(t => t.name !== 'committee')
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return filtered.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'score': cmp = a.score - b.score; break
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'badges': cmp = a.score_badge - b.score_badge; break
        case 'members': cmp = a.memberCount - b.memberCount; break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [teams, sortField, sortDir, searchQuery])

  const teamClaims = useMemo(() => {
    if (!selectedTeam) return []
    let filtered = claims.filter(c => c.teamId === selectedTeam.id)
    if (claimFilter !== 'all') {
      filtered = filtered.filter(c => c.status === claimFilter)
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(c => {
        const badge = badgeMap.get(c.badgeId)
        return badge?.category === categoryFilter
      })
    }
    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }, [selectedTeam, claims, claimFilter, categoryFilter, badgeMap])

  const teamRankings = useMemo(() => {
    if (!selectedTeam) return []
    return rankings.filter(r => r.teamId === selectedTeam.id && !r.isDraft)
  }, [selectedTeam, rankings])

  const teamStats = useMemo(() => {
    if (!selectedTeam) return null
    const approved = claims.filter(c => c.teamId === selectedTeam.id && c.status === 'approved').length
    const pending = claims.filter(c => c.teamId === selectedTeam.id && c.status === 'pending').length
    const rejected = claims.filter(c => c.teamId === selectedTeam.id && c.status === 'rejected').length
    const uniqueBadges = new Set(claims.filter(c => c.teamId === selectedTeam.id && c.status === 'approved').map(c => c.badgeId))
    return { approved, pending, rejected, uniqueBadges: uniqueBadges.size }
  }, [selectedTeam, claims])

  const missingBadges = useMemo(() => {
    if (!selectedTeam) return []
    const claimedIds = new Set(
      claims
        .filter(c => c.teamId === selectedTeam.id && c.status === 'approved')
        .map(c => c.badgeId)
    )
    return badges.filter(b => b.visible && !claimedIds.has(b.id))
  }, [selectedTeam, claims, badges])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/30'
      default: return 'text-gray-400'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Challenge': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'Soft Badges': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'Low Code': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'Pro Code': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'Head2Head': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'Sponsorship': return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-creeper-light animate-pulse mb-4">Loading ACDC Data...</div>
          <div className="text-gray-500 font-mono text-sm">Fetching badges, teams, and claims</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-red-400 mb-4">Error</div>
          <div className="text-gray-400">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-creeper text-white rounded hover:bg-creeper-light transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-bg text-white">
      {/* Header */}
      <header className="bg-black/50 border-b border-creeper/30 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="text-creeper-light hover:text-creeper transition">
                &larr; Home
              </a>
              <h1 className="text-xl font-bold text-creeper-light">ACDC Badge Dashboard</h1>
            </div>
            <div className="text-sm text-gray-500 font-mono">
              {teams.length - 1} teams &bull; {badges.length} badges &bull; {claims.length} claims
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {selectedTeam ? (
          /* Team Detail View */
          <div>
            <button
              onClick={() => setSelectedTeam(null)}
              className="mb-6 px-4 py-2 bg-creeper/20 border border-creeper/30 text-creeper-light rounded hover:bg-creeper/30 transition flex items-center gap-2"
            >
              &larr; Back to Leaderboard
            </button>

            {/* Team Header */}
            <div className="bg-black/30 border border-creeper/30 rounded-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-creeper-light mb-2">{selectedTeam.name}</h2>
                  <div className="text-gray-400 text-sm">
                    {selectedTeam.memberCount} members &bull; Team #{selectedTeam.shortName}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-creeper-light">{selectedTeam.score}</div>
                    <div className="text-xs text-gray-500 uppercase">Total Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{teamStats?.approved || 0}</div>
                    <div className="text-xs text-gray-500 uppercase">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{teamStats?.pending || 0}</div>
                    <div className="text-xs text-gray-500 uppercase">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{teamStats?.rejected || 0}</div>
                    <div className="text-xs text-gray-500 uppercase">Rejected</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Rankings */}
            {teamRankings.length > 0 && (
              <div className="bg-black/30 border border-purple-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-purple-300 mb-4">Day 1 Category Rankings</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {teamRankings.map(r => {
                    const badge = badgeMap.get(r.badgeId)
                    return (
                      <div
                        key={r.id}
                        className={`p-3 rounded border ${r.rank <= 3 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/20 border-gray-700'}`}
                      >
                        <div className="text-xs text-gray-400 truncate">{badge?.title || `Badge ${r.badgeId}`}</div>
                        <div className={`text-2xl font-bold ${r.rank === 1 ? 'text-yellow-400' : r.rank === 2 ? 'text-gray-300' : r.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                          #{r.rank}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex gap-1">
                {(['all', 'approved', 'pending', 'rejected'] as ClaimFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setClaimFilter(f)}
                    className={`px-3 py-1.5 text-sm rounded transition ${claimFilter === f ? 'bg-creeper text-white' : 'bg-black/30 text-gray-400 hover:bg-black/50'}`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded bg-black/30 text-gray-300 border border-gray-700 focus:border-creeper outline-none"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            {/* Claims List */}
            <div className="bg-black/30 border border-creeper/30 rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-creeper/20 bg-black/30">
                <h3 className="font-bold text-creeper-light">Badge Claims ({teamClaims.length})</h3>
              </div>
              {teamClaims.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No claims match your filters</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {teamClaims.map(claim => {
                    const badge = badgeMap.get(claim.badgeId)
                    return (
                      <div key={claim.id} className="p-4 hover:bg-black/20 transition">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(claim.status)}`}>
                                {claim.status}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded border ${getCategoryColor(badge?.category || '')}`}>
                                {badge?.category}
                              </span>
                              {claim.points !== 0 && (
                                <span className={`text-xs font-mono ${claim.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {claim.points > 0 ? '+' : ''}{claim.points} pts
                                </span>
                              )}
                            </div>
                            <div className="font-medium text-white mb-1">
                              {badge?.title || `Badge #${claim.badgeId}`}
                            </div>
                            {claim.comment && (
                              <div className="text-sm text-gray-400 mb-1">{claim.comment}</div>
                            )}
                            {claim.judgeMessage && (
                              <div className="text-sm text-gray-500 italic">
                                Judge: "{claim.judgeMessage}"
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <div>{claim.playerName}</div>
                            <div>{new Date(claim.timestamp).toLocaleString()}</div>
                            {claim.webUrl && !claim.webUrl.includes('direct-award') && (
                              <a
                                href={claim.webUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-creeper-light hover:underline"
                              >
                                View Evidence
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Missing Badges */}
            <div className="bg-black/30 border border-yellow-500/30 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-yellow-500/20 bg-black/30">
                <h3 className="font-bold text-yellow-400">Missing Badges ({missingBadges.length})</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {missingBadges.map(badge => (
                  <div
                    key={badge.id}
                    className="p-3 bg-black/20 border border-gray-800 rounded hover:border-yellow-500/30 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-white text-sm">{badge.title}</span>
                      <span className={`px-2 py-0.5 text-xs rounded border ${getCategoryColor(badge.category)}`}>
                        {badge.category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">{badge.description}</div>
                    <div className="text-xs text-creeper-light mt-1">{badge.score} pts</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Leaderboard View */
          <div>
            {/* Search and Sort */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-black/30 border border-creeper/30 rounded text-white placeholder-gray-500 focus:border-creeper outline-none"
              />
              <div className="flex gap-2">
                {([
                  { field: 'score', label: 'Score' },
                  { field: 'name', label: 'Name' },
                  { field: 'badges', label: 'Badges' },
                  { field: 'members', label: 'Members' },
                ] as { field: SortField; label: string }[]).map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`px-3 py-2 text-sm rounded transition flex items-center gap-1 ${sortField === field ? 'bg-creeper text-white' : 'bg-black/30 text-gray-400 hover:bg-black/50'}`}
                  >
                    {label}
                    {sortField === field && (
                      <span>{sortDir === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-black/30 border border-creeper/30 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-creeper/20 bg-black/30">
                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Team</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-400 uppercase">Score</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-400 uppercase hidden md:table-cell">Badge Pts</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-400 uppercase hidden md:table-cell">Category Pts</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-400 uppercase hidden sm:table-cell">Members</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team, idx) => {
                    const isMyTeam = team.id === 'b0835594-ab90-40c6-968e-7ac04b2b3667'
                    return (
                      <tr
                        key={team.id}
                        className={`border-b border-gray-800 hover:bg-black/20 transition cursor-pointer ${isMyTeam ? 'bg-creeper/10' : ''}`}
                        onClick={() => setSelectedTeam(team)}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isMyTeam ? 'text-creeper-light' : 'text-white'}`}>
                              {team.name}
                            </span>
                            {isMyTeam && (
                              <span className="px-1.5 py-0.5 text-xs bg-creeper/30 text-creeper-light rounded">YOU</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-creeper-light">{team.score}</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell text-gray-400">{team.score_badge}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell text-gray-400">{team.score_category}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-400">{team.memberCount}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="px-3 py-1 text-xs bg-creeper/20 text-creeper-light rounded hover:bg-creeper/30 transition"
                            onClick={e => { e.stopPropagation(); setSelectedTeam(team) }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* All Badges Overview */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-creeper-light mb-4">All Available Badges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => c !== 'all').map(category => (
                  <div key={category} className="bg-black/30 border border-creeper/30 rounded-lg overflow-hidden">
                    <div className={`px-4 py-2 border-b ${getCategoryColor(category)}`}>
                      <span className="font-bold">{category}</span>
                      <span className="ml-2 text-xs opacity-70">
                        ({badges.filter(b => b.category === category).length} badges)
                      </span>
                    </div>
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      {badges.filter(b => b.category === category).map(badge => (
                        <div
                          key={badge.id}
                          className="flex items-center justify-between text-sm p-2 bg-black/20 rounded"
                        >
                          <span className={badge.visible ? 'text-white' : 'text-gray-500'}>
                            {badge.title}
                            {!badge.visible && <span className="ml-1 text-xs">(hidden)</span>}
                          </span>
                          <span className={`font-mono text-xs ${badge.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {badge.score > 0 ? '+' : ''}{badge.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BadgeDashboard
