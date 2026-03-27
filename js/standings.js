export class StandingsView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.periodFilter = 'all';
    this.sortField = 'winPct';  // Default sort by win percentage
    this.sortDirection = 'desc';
    this._container = null;
    this._sortHandlersSetup = false;
  }

  get container() {
    if (!this._container) {
      this._container = document.getElementById('standings-body');
    }
    return this._container;
  }

  setupSortHandlers() {
    const headers = document.querySelectorAll('#standings-table th.sortable');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.dataset.sort;
        this.handleSort(field);
      });
    });
  }

  setPeriodFilter(period) {
    this.periodFilter = period;
    this.render();
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

  render() {
    // Setup sort handlers on first render
    if (!this._sortHandlersSetup) {
      this.setupSortHandlers();
      this._sortHandlersSetup = true;
    }
    
    // Check if container exists
    if (!this.container) {
      console.warn('Standings container not found');
      return;
    }
    
    const stats = this.dataManager.calculateTeamStats(this.periodFilter);
    
    // Sort if needed
    let sortedStats = [...stats];
    if (this.sortField) {
      sortedStats.sort((a, b) => {
        let comparison = 0;
        switch (this.sortField) {
          case 'wins': comparison = a.wins - b.wins; break;
          case 'losses': comparison = a.losses - b.losses; break;
          case 'ties': comparison = a.ties - b.ties; break;
          case 'winPct': comparison = a.winPct - b.winPct; break;
          case 'gb': comparison = a.gb - b.gb; break;
        }
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Update sort indicators
    document.querySelectorAll('#standings-table th.sortable').forEach(th => {
      const field = th.dataset.sort;
      const icon = field === this.sortField 
        ? (this.sortDirection === 'desc' ? '↓' : '↑')
        : '↕';
      th.innerHTML = `${this.getColumnLabel(field)} ${icon}`;
    });

    // Build rank map: always based on winPct order (not display sort)
    const byWinPct = [...stats].sort((a, b) => b.winPct - a.winPct);
    const currentWeek = this.dataManager.getCurrentWeek();

    let rankMap;
    if (currentWeek >= 22) {
      rankMap = this.dataManager.calculateRankWithTiebreaker(byWinPct, 21);
    } else {
      // Dense ranking: same winPct = same rank
      rankMap = new Map();
      byWinPct.forEach((team, index) => {
        if (index === 0) {
          rankMap.set(team.teamId, 1);
        } else if (team.winPct === byWinPct[index - 1].winPct) {
          rankMap.set(team.teamId, rankMap.get(byWinPct[index - 1].teamId));
        } else {
          rankMap.set(team.teamId, index + 1);
        }
      });
    }

    this.container.innerHTML = sortedStats.map((team) => {
      const rank = rankMap.get(team.teamId);
      
      const winPctFormatted = team.winPct.toFixed(3).replace(/^0\./, '.');
      const gbFormatted = team.gb === 0 ? '—' : team.gb.toFixed(1);
      
      return `
        <tr>
          <td>${rank}</td>
          <td>
            <span style="color: var(--md-sys-color-on-surface-variant)">${team.owner}</span>
            <span style="margin: 0 6px; color: var(--md-sys-color-outline)">|</span>
            <strong>${team.name}</strong>
          </td>
          <td>${team.wins}</td>
          <td>${team.losses}</td>
          <td>${team.ties}</td>
          <td>${winPctFormatted}</td>
          <td>${gbFormatted}</td>
          ${this.periodFilter === 'all' ? `
            <td>
              <span class="chip ${team.weeklyOutcome === 'win' ? 'chip-success' : team.weeklyOutcome === 'loss' ? 'chip-error' : 'chip-neutral'}">
                ${team.weeklyRecord}
              </span>
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');
  }

  getColumnLabel(field) {
    const labels = {
      wins: '승',
      losses: '패',
      ties: '무',
      winPct: '승률',
      gb: 'GB'
    };
    return labels[field] || field;
  }
}