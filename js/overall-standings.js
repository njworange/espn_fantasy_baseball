export class OverallStandingsView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.sortField = 'winPct';
    this.sortDirection = 'desc';
  }

  render() {
    const container = document.querySelector('.overall-standings-container');
    if (!container) {
      console.warn('Overall standings container not found');
      return;
    }

    // Load data from all seasons and calculate cumulative stats
    this.calculateOverallStats().then(ownerStats => {
      this.renderTable(container, ownerStats);
    });
  }

  async calculateOverallStats() {
    const allSeasons = this.dataManager.availableSeasons;
    const ownerStats = {};

    // Load data from each season
    for (const season of allSeasons) {
      try {
        const response = await fetch(`./data/league-snapshot-${season}.json`, {
          cache: 'no-store'
        });
        
        if (!response.ok) continue;
        
        const seasonData = await response.json();
        const teams = seasonData.teams || [];
        
        // Process each team's data
        teams.forEach(team => {
          const owner = this.dataManager.OWNER_MAP[team.name] || team.owner;
          
          if (!ownerStats[owner]) {
            ownerStats[owner] = {
              owner: owner,
              seasons: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              teamNames: new Set()
            };
          }
          
          // Calculate cumulative stats from weeklyTrend
          const weeklyTrend = team.weeklyTrend || [];
          weeklyTrend.forEach(week => {
            ownerStats[owner].wins += (week.categoryWins || 0);
            ownerStats[owner].losses += (week.categoryLosses || 0);
            ownerStats[owner].ties += (week.categoryTies || 0);
          });
          
          ownerStats[owner].seasons++;
          ownerStats[owner].teamNames.add(team.name);
        });
        
      } catch (error) {
        console.warn(`Failed to load season ${season}:`, error);
      }
    }

    // Convert to array and calculate win percentage
    const statsArray = Object.values(ownerStats).map(stats => {
      const totalGames = stats.wins + stats.losses + stats.ties;
      const winPct = totalGames > 0 ? (stats.wins + stats.ties * 0.5) / totalGames : 0;
      
      return {
        ...stats,
        totalGames,
        winPct,
        teamNames: Array.from(stats.teamNames).join(', ')
      };
    });

    // Calculate GB
    const firstPlace = statsArray.reduce((max, s) => s.winPct > max.winPct ? s : max, statsArray[0]);
    
    return statsArray.map(stats => {
      if (stats.owner !== firstPlace.owner) {
        stats.gb = ((firstPlace.wins - stats.wins + (stats.losses - firstPlace.losses)) / 2);
      } else {
        stats.gb = 0;
      }
      return stats;
    });
  }

  renderTable(container, ownerStats) {
    // Sort data
    let sortedStats = [...ownerStats];
    if (this.sortField) {
      sortedStats.sort((a, b) => {
        let comparison = 0;
        switch (this.sortField) {
          case 'seasons': comparison = a.seasons - b.seasons; break;
          case 'wins': comparison = a.wins - b.wins; break;
          case 'losses': comparison = a.losses - b.losses; break;
          case 'ties': comparison = a.ties - b.ties; break;
          case 'winPct': comparison = a.winPct - b.winPct; break;
          case 'gb': comparison = a.gb - b.gb; break;
        }
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    const tableHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">통산 순위</h2>
          <p class="card-subtitle">전체 시즌 Owner 기준 누적 성적 (플레이오프 포함)</p>
        </div>
        <div class="table-container">
          <table id="overall-standings-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>Owner</th>
                <th class="sortable" data-sort="seasons">참여시즌 ↕</th>
                <th class="sortable" data-sort="wins">승 ↕</th>
                <th class="sortable" data-sort="losses">패 ↕</th>
                <th class="sortable" data-sort="ties">무 ↕</th>
                <th class="sortable" data-sort="winPct">승률 ↕</th>
                <th class="sortable" data-sort="gb">GB ↕</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStats.map((stats, index) => {
                const winPctFormatted = stats.winPct.toFixed(3).replace(/^0\./, '.');
                const gbFormatted = stats.gb === 0 ? '—' : stats.gb.toFixed(1);
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      <strong>${stats.owner}</strong>
                      <span style="margin-left: 8px; font-size: 11px; color: #79747E;">
                        ${stats.teamNames}
                      </span>
                    </td>
                    <td>${stats.seasons}</td>
                    <td>${stats.wins}</td>
                    <td>${stats.losses}</td>
                    <td>${stats.ties}</td>
                    <td>${winPctFormatted}</td>
                    <td>${gbFormatted}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = tableHTML;

    // Setup sort handlers
    this.setupSortHandlers();
  }

  setupSortHandlers() {
    const headers = document.querySelectorAll('#overall-standings-table th.sortable');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.dataset.sort;
        this.handleSort(field);
      });
    });
  }

  handleSort(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.render();
  }
}
