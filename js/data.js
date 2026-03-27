const TEAM_COLORS = [
  "#6750A4", "#1976D2", "#388E3C", "#F57C00",
  "#7B1FA2", "#D32F2F", "#0097A7", "#5D4037",
  "#C62828", "#1565C0", "#2E7D32", "#E65100",
];

export class DataManager {
  constructor() {
    this.data = null;
    this.config = null;
    // Automatically generate available seasons from 2025 to current year
    const currentYear = new Date().getFullYear();
    this.availableSeasons = [];
    for (let year = 2025; year <= currentYear; year++) {
      this.availableSeasons.push(year);
    }
    this.TEAM_COLORS = TEAM_COLORS;
  }

  async loadConfig() {
    try {
      const response = await fetch('./config.json', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Config file not found');
      }
      
      this.config = await response.json();
      
      // Validate required fields
      if (!this.config.owners || Object.keys(this.config.owners).length === 0) {
        throw new Error('config.json must contain "owners" field with team mappings');
      }
      
      if (!this.config.league) {
        throw new Error('config.json must contain "league" field');
      }
      
      if (!this.config.league.regularSeasonWeeks) {
        throw new Error('config.json must contain "league.regularSeasonWeeks"');
      }
      
    } catch (error) {
      console.error('Failed to load config:', error);
      throw new Error(
        'config.json 파일을 불러올 수 없습니다.\n\n' +
        '설정 파일이 필요합니다. 다음 단계를 따라주세요:\n' +
        '1. config.json.example 파일을 config.json으로 복사\n' +
        '2. config.json 파일을 열어 팀 이름과 오너 이름을 수정\n' +
        '3. league.regularSeasonWeeks를 실제 리그 주차로 설정\n\n' +
        '자세한 내용은 README.md를 참고하세요.'
      );
    }
  }

  async loadSeason(season) {
    try {
      const response = await fetch(`./data/league-snapshot-${season}.json`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load season ${season}`);
      }
      
      this.data = await response.json();
      return this.data;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  getData() {
    return this.data;
  }

  getTeams() {
    return this.data?.teams || [];
  }

  getStandings() {
    return this.data?.standings || [];
  }

  getMatchups() {
    return this.data?.matchups || [];
  }

  getTeamById(teamId) {
    return this.data?.teams.find(t => t.teamId === teamId);
  }

  getMatchupById(matchupId) {
    return this.data?.matchups.find(m => m.id === matchupId);
  }

  getCurrentWeek() {
    return this.data?.teams[0]?.weeklyTrend?.length || 0;
  }

  // Calculate team stats for a specific period
  calculateTeamStats(period = 'all') {
    const teams = this.getTeams();
    const currentWeek = this.getCurrentWeek();
    const regularSeasonWeeks = this.config?.league?.regularSeasonWeeks || 22;
    
    let weeksToInclude;
    switch (period) {
      case 'recent3':
        weeksToInclude = Math.min(3, currentWeek);
        break;
      case 'recent5':
        weeksToInclude = Math.min(5, currentWeek);
        break;
      default:
        weeksToInclude = currentWeek;
    }

    return teams.map((team, index) => {
      let recentTrend;
      if (period === 'all') {
        // Regular season: use config setting
        recentTrend = team.weeklyTrend?.slice(0, regularSeasonWeeks) || [];
      } else {
        recentTrend = team.weeklyTrend?.slice(-weeksToInclude) || [];
      }
      
      // Sum category wins/losses/ties
      const wins = recentTrend.reduce((sum, w) => sum + (w.categoryWins || 0), 0);
      const losses = recentTrend.reduce((sum, w) => sum + (w.categoryLosses || 0), 0);
      const ties = recentTrend.reduce((sum, w) => sum + (w.categoryTies || 0), 0);
      
      const totalGames = wins + losses + ties;
      const winPct = totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0;

      // Get weekly record for current week
      let weeklyRecord = '-';
      let weeklyOutcome = null;
      if (period === 'all') {
        const currentWeekData = team.weeklyTrend?.[currentWeek - 1];
        if (currentWeekData) {
          const cw = currentWeekData.categoryWins || 0;
          const cl = currentWeekData.categoryLosses || 0;
          const ct = currentWeekData.categoryTies || 0;
          weeklyRecord = `${cw}-${cl}-${ct}`;
          if (cw > cl) weeklyOutcome = 'win';
          else if (cw < cl) weeklyOutcome = 'loss';
          else weeklyOutcome = 'even';
        }
      }

      // Use owner from config if available, otherwise fallback to data
      const ownerName = this.config?.owners?.[team.name] || team.owner || 'Unknown';

      return {
        teamId: team.teamId,
        name: team.name,
        owner: ownerName,
        wins,
        losses,
        ties,
        winPct,
        gb: 0, // Will be calculated
        weeklyRecord,
        weeklyOutcome,
        color: TEAM_COLORS[index % TEAM_COLORS.length],
        originalRank: team.teamId
      };
    }).map((team, index, allTeams) => {
      // Calculate GB based on first place
      const firstPlace = allTeams.reduce((max, t) => t.winPct > max.winPct ? t : max, allTeams[0]);
      if (team.teamId !== firstPlace.teamId) {
        team.gb = ((firstPlace.wins - team.wins + (team.losses - firstPlace.losses)) / 2);
      }
      return team;
    });
  }

  /**
   * Calculate rankings with ESPN H2H tiebreaker.
   * Weeks 1 to (tiebreakerWeek-1): dense ranking (same winPct = same rank).
   * At tiebreakerWeek: breaks ties using H2H record among tied teams.
   * 
   * @param {Array} sortedByWinPct - teams sorted by winPct desc (objects with teamId, winPct or winRate)
   * @param {number} weekIndex - 0-indexed week
   * @returns {Map<number, number>} rankMap - teamId -> rank
   */
  calculateRankWithTiebreaker(sortedByWinPct, weekIndex) {
    const rankMap = new Map();
    const allTeams = this.getTeams();
    
    // Get tiebreaker settings from config
    const tiebreakerEnabled = this.config?.league?.tiebreaker?.enabled ?? true;
    const tiebreakerWeek = (this.config?.league?.tiebreaker?.applyAtWeek || 22) - 1; // Convert to 0-indexed

    let i = 0;
    while (i < sortedByWinPct.length) {
      const getWP = (t) => t.winPct ?? t.winRate;
      const currentWP = getWP(sortedByWinPct[i]);
      const tiedGroup = [];
      let j = i;
      while (j < sortedByWinPct.length && getWP(sortedByWinPct[j]) === currentWP) {
        tiedGroup.push(sortedByWinPct[j]);
        j++;
      }

      if (tiedGroup.length === 1 || !tiebreakerEnabled || weekIndex < tiebreakerWeek) {
        // Single team or before tiebreaker week: dense ranking
        const rank = i + 1;
        tiedGroup.forEach(t => rankMap.set(t.teamId, rank));
      } else {
        // At tiebreaker week: apply H2H tiebreaker among tied teams
        const h2hRates = this._calculateH2HRatesAmong(tiedGroup, allTeams, weekIndex);

        // Check if all tied teams played equal number of games against tied group
        const gameCounts = tiedGroup.map(t => h2hRates.get(t.teamId)?.totalMatchups || 0);
        const allEqual = gameCounts.length > 0 && gameCounts.every(g => g === gameCounts[0]) && gameCounts[0] > 0;

        if (allEqual) {
          // Sort by H2H rate among tied group, assign ranks
          const sorted = [...tiedGroup].sort((a, b) => {
            return (h2hRates.get(b.teamId)?.rate || 0) - (h2hRates.get(a.teamId)?.rate || 0);
          });

          // Dense ranking on H2H rate (teams with same H2H rate share rank)
          let rank = i + 1;
          rankMap.set(sorted[0].teamId, rank);
          for (let k = 1; k < sorted.length; k++) {
            const prevRate = h2hRates.get(sorted[k - 1].teamId)?.rate || 0;
            const currRate = h2hRates.get(sorted[k].teamId)?.rate || 0;
            if (currRate !== prevRate) {
              rank = i + k + 1;
            }
            rankMap.set(sorted[k].teamId, rank);
          }
        } else {
          // Tiebreaker invalid (unequal games): keep dense ranking
          const rank = i + 1;
          tiedGroup.forEach(t => rankMap.set(t.teamId, rank));
        }
      }

      i = j;
    }

    return rankMap;
  }

  /**
   * Calculate H2H category-level records among a group of tied teams.
   * Uses cumulative category wins/losses/ties (not weekly W/L/T).
   * Returns Map<teamId, {rate, catWins, catLosses, catTies, totalMatchups}>
   */
  _calculateH2HRatesAmong(tiedGroup, allTeams, weekIndex) {
    const tiedIds = new Set(tiedGroup.map(t => t.teamId));
    const h2hRates = new Map();

    tiedGroup.forEach(t => {
      const team = allTeams.find(at => at.teamId === t.teamId);
      if (!team?.weeklyTrend) {
        h2hRates.set(t.teamId, { rate: 0, catWins: 0, catLosses: 0, catTies: 0, totalMatchups: 0 });
        return;
      }

      let catWins = 0, catLosses = 0, catTies = 0, totalMatchups = 0;

      team.weeklyTrend.slice(0, weekIndex + 1).forEach(week => {
        const weekOpponent = week.opponent?.trim().toLowerCase();
        const opponent = allTeams.find(at =>
          at.name?.trim().toLowerCase() === weekOpponent
        );
        if (opponent && tiedIds.has(opponent.teamId)) {
          catWins += week.categoryWins || 0;
          catLosses += week.categoryLosses || 0;
          catTies += week.categoryTies || 0;
          totalMatchups++;
        }
      });

      const total = catWins + catLosses + catTies;
      const rate = total > 0 ? (catWins + catTies * 0.5) / total : 0;
      h2hRates.set(t.teamId, { rate, catWins, catLosses, catTies, totalMatchups });
    });

    return h2hRates;
  }
}
