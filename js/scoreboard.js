export class ScoreboardView {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }

  render() {
    const data = this.dataManager.getData();
    const matchups = this.dataManager.getMatchups();
    
    // Update subtitle
    const period = data?.league?.currentMatchupPeriod;
    document.getElementById('matchup-subtitle').textContent = 
      period ? `Week ${period} 경기 현황` : '이번 주 경기 현황';

    const container = document.getElementById('matchups-list');
    
    if (!matchups.length) {
      container.innerHTML = '<div class="empty-state"><p>현재 매치업이 없습니다.</p></div>';
      return;
    }

    container.innerHTML = matchups.map(matchup => {
      const awayWins = matchup.categories?.filter(c => c.leader === 'away').length || 0;
      const homeWins = matchup.categories?.filter(c => c.leader === 'home').length || 0;
      const ties = matchup.categories?.filter(c => c.leader === 'even').length || 0;

      return `
        <div class="matchup-card">
          <div class="matchup-header">${matchup.label}</div>
          <div class="matchup-teams">
            <div class="matchup-team">
              <div class="matchup-team-name">${matchup.awayTeam}</div>
              <div class="matchup-team-record">${matchup.awayRecord}</div>
            </div>
            <div class="matchup-score">${matchup.awayScore}</div>
            <span class="matchup-vs">vs</span>
            <div class="matchup-score">${matchup.homeScore}</div>
            <div class="matchup-team">
              <div class="matchup-team-name">${matchup.homeTeam}</div>
              <div class="matchup-team-record">${matchup.homeRecord}</div>
            </div>
          </div>
          <div class="matchup-stats">
            <span class="chip chip-filled">${matchup.awayTeam}: ${awayWins}</span>
            <span class="chip chip-neutral">무: ${ties}</span>
            <span class="chip chip-filled">${matchup.homeTeam}: ${homeWins}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}