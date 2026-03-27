export class MatchupsView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.selectedMatchupId = '';
    this.setupMatchupSelect();
  }

  setupMatchupSelect() {
    const select = document.getElementById('matchup-select');
    select.addEventListener('change', (e) => {
      this.selectedMatchupId = e.target.value;
      this.render();
    });
  }

  render() {
    const matchups = this.dataManager.getMatchups();
    const select = document.getElementById('matchup-select');
    
    // Populate select if empty
    if (!select.options.length) {
      select.innerHTML = matchups.map(m => 
        `<option value="${m.id}">${m.label}</option>`
      ).join('');
      if (matchups.length > 0) {
        this.selectedMatchupId = matchups[0].id;
        select.value = this.selectedMatchupId;
      }
    }

    const matchup = this.dataManager.getMatchupById(this.selectedMatchupId);
    const container = document.getElementById('category-comparison');

    if (!matchup) {
      container.innerHTML = '<div class="empty-state"><p>매치업을 선택해주세요.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">카테고리 비교</h2>
          <p class="card-subtitle">${matchup.label}</p>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>카테고리</th>
                <th>${matchup.awayTeam}</th>
                <th>${matchup.homeTeam}</th>
                <th>우세</th>
              </tr>
            </thead>
            <tbody>
              ${matchup.categories?.map(cat => `
                <tr>
                  <td>${cat.name}</td>
                  <td>${cat.away}</td>
                  <td>${cat.home}</td>
                  <td>
                    <span class="chip ${cat.leader === 'home' ? 'chip-filled' : cat.leader === 'away' ? 'chip-success' : 'chip-neutral'}">
                      ${cat.leader === 'home' ? '홈' : cat.leader === 'away' ? '원정' : '동률'}
                    </span>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="4">카테고리 데이터가 없습니다.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}