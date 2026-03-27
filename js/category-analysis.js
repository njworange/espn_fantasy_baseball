export class CategoryAnalysisView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.categories = ['R', 'HR', 'RBI', 'SB', 'AVG', 'K', 'W', 'SV', 'ERA', 'WHIP'];
    this.currentRankings = null;
    this.currentTeams = null;
  }

  render() {
    const container = document.querySelector('.category-analysis-container');
    if (!container) {
      console.warn('Category analysis container not found');
      return;
    }

    const teams = this.dataManager.getTeams();
    this.currentTeams = teams;
    
    // Get category stats from team data (already calculated by fetcher)
    this.currentRankings = this.calculateCategoryRankings(teams);
    
    // Render grid of spider charts
    this.renderGrid(container, teams, this.currentRankings);
    
    // Setup modal close handler
    this.setupModalHandlers();
  }

  calculateCategoryRankings(teams) {
    const rankings = {};
    
    this.categories.forEach(category => {
      // Get all teams' win counts for this category from regularSeason stats
      const teamScores = teams.map(team => {
        const catStats = team.categoryStats?.regularSeason?.[category] || { wins: 0, ties: 0 };
        return {
          teamId: team.teamId,
          score: catStats.wins + (catStats.ties * 0.5)
        };
      });

      // Sort by score descending (higher score = better rank = outer side)
      teamScores.sort((a, b) => b.score - a.score);

      // Assign ranks (1st = outer, 12th = inner)
      let currentRank = 1;
      let lastScore = null;
      let rankOffset = 0;

      teamScores.forEach((team, index) => {
        if (lastScore !== null && team.score < lastScore) {
          currentRank = currentRank + rankOffset;
          rankOffset = 1;
        } else if (lastScore !== null && team.score === lastScore) {
          rankOffset++;
        } else {
          rankOffset = 1;
        }

        lastScore = team.score;
        if (!rankings[team.teamId]) rankings[team.teamId] = {};
        rankings[team.teamId][category] = currentRank;
      });
    });

    return rankings;
  }

  renderGrid(container, teams, rankings) {
    const teamsList = teams.slice().sort((a, b) => {
      const ownerA = this.dataManager.OWNER_MAP[a.name] || a.owner;
      const ownerB = this.dataManager.OWNER_MAP[b.name] || b.owner;
      return ownerA.localeCompare(ownerB, 'ko-KR');
    });

    // Responsive grid: 4 columns on desktop, 2 on mobile
    let html = `
      <div class="category-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
    `;
    
    // Add desktop styles via media query
    html += `
      <style>
        @media (min-width: 768px) {
          .category-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
          }
        }
        .team-spider-chart {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .team-spider-chart:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .team-spider-chart:active {
          transform: translateY(0);
        }
      </style>
    `;
    
    teamsList.forEach((team, index) => {
      const color = this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length];
      const owner = this.dataManager.OWNER_MAP[team.name] || team.owner;
      
      html += `
        <div class="team-spider-chart" 
             data-team-id="${team.teamId}"
             data-team-index="${index}"
             style="background: white; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-weight: 600; margin-bottom: 8px; color: ${color}; text-align: center; font-size: 14px;">
            ${owner}
          </div>
          <canvas id="spider-team-${team.teamId}" width="200" height="200" style="width: 100%; height: auto;"></canvas>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Render individual spider charts
    teamsList.forEach((team, index) => {
      const canvas = document.getElementById(`spider-team-${team.teamId}`);
      if (canvas) {
        this.renderIndividualChart(canvas, team, index, rankings);
      }
    });

    // Add click handlers
    container.querySelectorAll('.team-spider-chart').forEach(chartDiv => {
      chartDiv.addEventListener('click', (e) => {
        const teamId = parseInt(chartDiv.dataset.teamId);
        const teamIndex = parseInt(chartDiv.dataset.teamIndex);
        this.openModal(teamId, teamIndex);
      });
    });
  }

  renderIndividualChart(canvas, team, index, rankings) {
    const color = this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length];
    const ctx = canvas.getContext('2d');
    
    // Get rankings for this team
    const data = this.categories.map(cat => rankings[team.teamId][cat]);
    
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.categories,
        datasets: [{
          data: data,
          borderColor: color,
          backgroundColor: color + '30',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          datalabels: {
            display: true,
            color: '#fff',
            font: {
              size: 7,
              weight: 'bold'
            },
            formatter: (value) => value,
            anchor: 'center',
            align: 'center'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.raw}위`;
              }
            }
          }
        },
        scales: {
          r: {
            min: 1,
            max: 12,
            reverse: true,
            ticks: {
              display: false,
              stepSize: 1
            },
            pointLabels: {
              font: {
                size: 8,
                weight: 'bold'
              },
              color: '#1C1B1F',
              backdropColor: 'rgba(255,255,255,0.9)',
              backdropPadding: 3,
              borderRadius: 3
            },
            grid: {
              color: 'rgba(0,0,0,0.15)',
              lineWidth: 1
            },
            angleLines: {
              color: 'rgba(0,0,0,0.2)',
              lineWidth: 1
            }
          }
        }
      }
    });
  }

  openModal(teamId, teamIndex) {
    const modal = document.getElementById('spider-modal');
    const canvas = document.getElementById('spider-modal-canvas');
    
    if (!modal || !canvas) return;
    
    const team = this.currentTeams.find(t => t.teamId === teamId);
    if (!team) return;
    
    const color = this.dataManager.TEAM_COLORS[teamIndex % this.dataManager.TEAM_COLORS.length];
    const owner = this.dataManager.OWNER_MAP[team.name] || team.owner;
    
    // Update modal title
    const titleEl = document.getElementById('spider-modal-title');
    if (titleEl) {
      titleEl.textContent = owner;
      titleEl.style.color = color;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Destroy existing chart if any
    if (this.modalChart) {
      this.modalChart.destroy();
    }
    
    // Render enlarged chart
    const ctx = canvas.getContext('2d');
    const data = this.categories.map(cat => this.currentRankings[teamId][cat]);
    
    this.modalChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.categories,
        datasets: [{
          label: owner,
          data: data,
          borderColor: color,
          backgroundColor: color + '40',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          datalabels: {
            display: true,
            color: '#fff',
            font: {
              size: 11,
              weight: 'bold'
            },
            formatter: (value) => value,
            anchor: 'center',
            align: 'center',
            offset: 0
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1C1B1F',
            bodyColor: '#1C1B1F',
            borderColor: '#E7E0EC',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.raw}위`;
              }
            }
          }
        },
        scales: {
          r: {
            min: 1,
            max: 12,
            reverse: true,
            ticks: {
              display: false
            },
            pointLabels: {
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#1C1B1F',
              backdropColor: 'rgba(255,255,255,0.9)',
              backdropPadding: 6,
              borderRadius: 4
            },
            grid: {
              color: 'rgba(0,0,0,0.15)',
              lineWidth: 1.5
            },
            angleLines: {
              color: 'rgba(0,0,0,0.2)',
              lineWidth: 1.5
            }
          }
        }
      }
    });
  }

  setupModalHandlers() {
    const modal = document.getElementById('spider-modal');
    const closeBtn = document.getElementById('spider-modal-close');
    
    if (!modal) return;
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });
    
    // Close on button click
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        this.closeModal();
      }
    });
  }

  closeModal() {
    const modal = document.getElementById('spider-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    if (this.modalChart) {
      this.modalChart.destroy();
      this.modalChart = null;
    }
  }
}
