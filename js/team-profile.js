export class TeamProfileView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.selectedTeamId = null;
    this.miniTrendChart = null;
    this.categoryStrengthChart = null;
    this.h2hSortField = null;
    this.h2hSortDirection = 'desc';
  }

  render() {
    const container = document.querySelector('.team-profile-container');
    if (!container) {
      console.warn('Team profile container not found');
      return;
    }

    const teams = this.dataManager.getTeams();
    
    // Setup team selector
    this.setupTeamSelector(teams);
    
    // If no team selected, show first team by default
    if (!this.selectedTeamId && teams.length > 0) {
      this.selectedTeamId = teams[0].teamId;
    }
    
    // Render selected team profile
    if (this.selectedTeamId) {
      this.renderTeamProfile(this.selectedTeamId);
    }
  }

  setupTeamSelector(teams) {
    const select = document.getElementById('team-profile-select');
    if (!select) return;

    // Sort teams alphabetically by owner
    const sortedTeams = [...teams].sort((a, b) => {
      const ownerA = this.dataManager.OWNER_MAP[a.name] || a.owner;
      const ownerB = this.dataManager.OWNER_MAP[b.name] || b.owner;
      return ownerA.localeCompare(ownerB, 'ko-KR');
    });

    // Populate dropdown
    select.innerHTML = sortedTeams.map(team => {
      const owner = this.dataManager.OWNER_MAP[team.name] || team.owner;
      return `<option value="${team.teamId}" ${team.teamId === this.selectedTeamId ? 'selected' : ''}>
        ${owner} - ${team.name}
      </option>`;
    }).join('');

    // Add change handler
    select.addEventListener('change', (e) => {
      this.selectedTeamId = parseInt(e.target.value);
      this.renderTeamProfile(this.selectedTeamId);
    });
  }

  renderTeamProfile(teamId) {
    const team = this.dataManager.getTeams().find(t => t.teamId === teamId);
    if (!team) return;

    // Show all cards
    document.getElementById('team-info-card').style.display = 'block';
    document.getElementById('mini-trend-card').style.display = 'block';
    document.getElementById('category-strength-card').style.display = 'block';
    document.getElementById('h2h-matrix-card').style.display = 'block';
    document.getElementById('recent-games-card').style.display = 'block';

    // Render each section
    this.renderTeamInfo(team);
    this.renderMiniTrend(team);
    this.renderCategoryStrength(team);
    this.renderH2HMatrix(team);
    this.renderRecentGames(team);
  }

  renderTeamInfo(team) {
    const owner = this.dataManager.OWNER_MAP[team.name] || team.owner;
    const color = this.getTeamColor(team.teamId);
    
    // Calculate standing using the same stats as Standings tab
    const stats = this.dataManager.calculateTeamStats('all');
    const teamStat = stats.find(s => s.teamId === team.teamId);
    const wins = teamStat ? teamStat.wins : 0;
    const losses = teamStat ? teamStat.losses : 0;
    const ties = teamStat ? teamStat.ties : 0;
    const winPct = teamStat ? teamStat.winPct : 0;
    
    const sortedStats = [...stats].sort((a, b) => b.winPct - a.winPct);
    const currentWeek = this.dataManager.getCurrentWeek();

    let rank;
    if (currentWeek >= 22) {
      const rankMap = this.dataManager.calculateRankWithTiebreaker(sortedStats, 21);
      rank = rankMap.get(team.teamId);
    } else {
      // Dense ranking: same winPct = same rank
      const rankMap = new Map();
      sortedStats.forEach((s, index) => {
        if (index === 0) {
          rankMap.set(s.teamId, 1);
        } else if (s.winPct === sortedStats[index - 1].winPct) {
          rankMap.set(s.teamId, rankMap.get(sortedStats[index - 1].teamId));
        } else {
          rankMap.set(s.teamId, index + 1);
        }
      });
      rank = rankMap.get(team.teamId);
    }
    const gb = teamStat ? (teamStat.gb === 0 ? '0.0' : teamStat.gb.toFixed(1)) : '0.0';

    document.getElementById('profile-team-name').textContent = team.name;
    document.getElementById('profile-team-name').style.color = color;
    document.getElementById('profile-team-owner').textContent = `Owner: ${owner}`;
    document.getElementById('profile-team-rank').textContent = `#${rank}`;
    document.getElementById('profile-record').textContent = `${wins}-${losses}-${ties}`;
    document.getElementById('profile-win-pct').textContent = winPct.toFixed(3).replace(/^0\./, '.');
    document.getElementById('profile-gb').textContent = gb;
  }

  renderMiniTrend(team) {
    const canvas = document.getElementById('mini-trend-chart');
    if (!canvas) return;

    // Destroy existing chart
    if (this.miniTrendChart) {
      this.miniTrendChart.destroy();
    }

    const weeklyTrend = team.weeklyTrend?.slice(0, 22) || [];
    const labels = weeklyTrend.map(w => `W${w.week}`);
    const categoryWins = weeklyTrend.map(w => w.categoryWins || 0);

    const ctx = canvas.getContext('2d');
    const color = this.getTeamColor(team.teamId);
    const isMobile = window.innerWidth <= 768;

    this.miniTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Category Wins',
          data: categoryWins,
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: isMobile ? 7 : 8,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: isMobile ? 2 : 3,
          datalabels: {
            display: true,
            align: 'center',
            anchor: 'center',
            color: '#fff',
            font: {
              size: isMobile ? 9 : 12,
              weight: 'bold'
            },
            formatter: (value) => value,
            offset: 0
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true
          }
        },
        scales: {
          y: {
            min: -0.5,
            max: 10,
            ticks: {
              stepSize: 1,
              font: { size: isMobile ? 8 : 10 },
              callback: (value) => value >= 0 ? value : ''
            },
            title: {
              display: true,
              text: 'Category Wins',
              font: { size: isMobile ? 8 : 10 }
            }
          },
          x: {
            ticks: {
              font: { size: isMobile ? 8 : 9 },
              maxRotation: isMobile ? 0 : 45,
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 22
            }
          }
        }
      }
    });
  }

  renderCategoryStrength(team) {
    const canvas = document.getElementById('category-strength-chart');
    if (!canvas) return;

    // Destroy existing chart
    if (this.categoryStrengthChart) {
      this.categoryStrengthChart.destroy();
    }

    const categories = ['R', 'HR', 'RBI', 'SB', 'AVG', 'K', 'W', 'SV', 'ERA', 'WHIP'];
    const stats = team.categoryStats?.regularSeason || {};
    
    // Calculate win rate for each category (as decimal for .000 format)
    const data = categories.map(cat => {
      const catStats = stats[cat] || { wins: 0, losses: 0, ties: 0 };
      const total = catStats.wins + catStats.losses + catStats.ties;
      if (total === 0) return 0;
      return (catStats.wins + catStats.ties * 0.5) / total;
    });

    const ctx = canvas.getContext('2d');
    const color = this.getTeamColor(team.teamId);
    const isMobile = window.innerWidth <= 768;

    this.categoryStrengthChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Win Rate',
          data: data,
          backgroundColor: data.map(v => {
            const val = v;
            if (val >= 0.600) return '#4CAF50'; // Green for strong
            if (val >= 0.400) return '#FFC107'; // Yellow for average
            return '#F44336'; // Red for weak
          }),
          borderRadius: 4,
          datalabels: {
            display: true,
            color: '#fff',
            font: {
              size: isMobile ? 10 : 13,
              weight: 'bold'
            },
            formatter: (value) => value.toFixed(3).replace(/^0\./, '.'),
            anchor: 'center',
            align: 'center'
          },
          barThickness: isMobile ? 'flex' : 40,
          maxBarThickness: isMobile ? 30 : 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true
          }
        },
        scales: {
          y: {
            min: 0,
            max: 1,
            ticks: {
              callback: (value) => value.toFixed(3).replace(/^0\./, '.'),
              font: { size: isMobile ? 8 : 10 }
            }
          },
          x: {
            ticks: {
              font: { size: isMobile ? 9 : 13, weight: 'bold' },
              maxRotation: 0,
              autoSkip: false
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  renderH2HMatrix(team) {
    const tbody = document.getElementById('h2h-matrix-body');
    if (!tbody) return;

    // Calculate H2H records against each team
    const allTeams = this.dataManager.getTeams();
    
    const h2hRecords = {};
    allTeams.forEach(t => {
      if (t.teamId !== team.teamId) {
        h2hRecords[t.teamId] = { 
          wins: 0, 
          losses: 0, 
          ties: 0,
          winRate: 0,
          opponent: t
        };
      }
    });

    // Helper function for case-insensitive team name matching
    const normalizeName = (name) => name?.toString().trim().toLowerCase() || '';
    const findTeamByName = (name) => {
      const normalizedName = normalizeName(name);
      return allTeams.find(t => normalizeName(t.name) === normalizedName);
    };

    // Calculate H2H from weeklyTrend data
    if (team.weeklyTrend) {
      team.weeklyTrend.forEach(week => {
        const opponent = findTeamByName(week.opponent);
        if (opponent && opponent.teamId !== team.teamId) {
          h2hRecords[opponent.teamId].wins += (week.categoryWins || 0);
          h2hRecords[opponent.teamId].losses += (week.categoryLosses || 0);
          h2hRecords[opponent.teamId].ties += (week.categoryTies || 0);
        }
      });
    }

    // Calculate win rates
    Object.values(h2hRecords).forEach(record => {
      const total = record.wins + record.losses + record.ties;
      record.winRate = total > 0 ? (record.wins + record.ties * 0.5) / total : 0;
      record.total = total;
    });

    // Convert to array and apply current sort
    let recordsArray = Object.entries(h2hRecords).map(([teamId, record]) => ({
      teamId: parseInt(teamId),
      ...record,
      owner: this.dataManager.OWNER_MAP[record.opponent.name] || record.opponent.owner
    }));

    // Apply sort if set
    if (this.h2hSortField) {
      recordsArray.sort((a, b) => {
        let comparison = 0;
        switch (this.h2hSortField) {
          case 'wins': comparison = a.wins - b.wins; break;
          case 'losses': comparison = a.losses - b.losses; break;
          case 'ties': comparison = a.ties - b.ties; break;
          case 'winRate': comparison = a.winRate - b.winRate; break;
        }
        return this.h2hSortDirection === 'asc' ? comparison : -comparison;
      });
    } else {
      // Default sort by owner name
      recordsArray.sort((a, b) => a.owner.localeCompare(b.owner, 'ko-KR'));
    }

    // Render table
    tbody.innerHTML = recordsArray.map(record => {
      const winRateFormatted = record.winRate.toFixed(3).replace(/^0\./, '.');
      
      return `
        <tr style="border-bottom: 1px solid #F0F0F0;">
          <td style="padding: 8px; font-size: 13px;">${record.owner}</td>
          <td style="padding: 8px; text-align: center; font-size: 13px; color: #4CAF50; font-weight: 600;">${record.wins}</td>
          <td style="padding: 8px; text-align: center; font-size: 13px; color: #F44336; font-weight: 600;">${record.losses}</td>
          <td style="padding: 8px; text-align: center; font-size: 13px; color: #FFC107; font-weight: 600;">${record.ties}</td>
          <td style="padding: 8px; text-align: center; font-size: 13px; font-weight: 600;">${winRateFormatted}</td>
        </tr>
      `;
    }).join('');

    // Setup sort handlers
    this.setupH2HSortHandlers();
  }

  setupH2HSortHandlers() {
    const headers = document.querySelectorAll('.h2h-sortable');
    headers.forEach(header => {
      // Remove existing listeners to prevent duplicates
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      
      newHeader.addEventListener('click', () => {
        const field = newHeader.dataset.sort;
        this.handleH2HSort(field);
      });
    });
  }

  handleH2HSort(field) {
    if (this.h2hSortField === field) {
      this.h2hSortDirection = this.h2hSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.h2hSortField = field;
      this.h2hSortDirection = 'desc';
    }
    
    // Re-render with current team
    if (this.selectedTeamId) {
      const team = this.dataManager.getTeams().find(t => t.teamId === this.selectedTeamId);
      if (team) {
        this.renderH2HMatrix(team);
      }
    }
  }

  renderRecentGames(team) {
    const tbody = document.getElementById('recent-games-body');
    if (!tbody) return;

    const weeklyTrend = team.weeklyTrend?.slice(-5).reverse() || [];
    const allTeams = this.dataManager.getTeams();

    // Helper to find opponent owner
    const getOpponentOwner = (opponentName) => {
      const opponent = allTeams.find(t => 
        t.name.toLowerCase() === opponentName?.toLowerCase()
      );
      return opponent 
        ? (this.dataManager.OWNER_MAP[opponent.name] || opponent.owner)
        : opponentName;
    };

    tbody.innerHTML = weeklyTrend.map(week => {
      const resultColor = week.outcome === 'win' ? '#4CAF50' : 
                         week.outcome === 'loss' ? '#F44336' : '#FFC107';
      const resultText = week.outcome === 'win' ? 'W' : 
                        week.outcome === 'loss' ? 'L' : 'T';
      const opponentOwner = getOpponentOwner(week.opponent);

      return `
        <tr style="border-bottom: 1px solid #F0F0F0;">
          <td style="padding: 8px; font-size: 13px;">Week ${week.week}</td>
          <td style="padding: 8px; font-size: 13px;">${opponentOwner}</td>
          <td style="padding: 8px; text-align: center; font-size: 13px; font-weight: 600;">
            ${week.categoryWins || 0}-${week.categoryLosses || 0}-${week.categoryTies || 0}
          </td>
          <td style="padding: 8px; text-align: center;">
            <span style="background: ${resultColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${resultText}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  getTeamColor(teamId) {
    const teams = this.dataManager.getTeams();
    const index = teams.findIndex(t => t.teamId === teamId);
    return this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length];
  }
}
