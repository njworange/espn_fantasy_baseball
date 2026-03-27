export class TeamsView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.selectedTeamId = null;
    this.setupTeamSelect();
  }

  setupTeamSelect() {
    const select = document.getElementById('team-select');
    select.addEventListener('change', (e) => {
      this.selectedTeamId = parseInt(e.target.value);
      this.render();
    });
  }

  render() {
    const teams = this.dataManager.getTeams();
    const select = document.getElementById('team-select');
    
    // Populate select if empty
    if (!select.options.length) {
      select.innerHTML = teams.map(t => 
        `<option value="${t.teamId}">${t.name} (${t.record})</option>`
      ).join('');
      if (teams.length > 0) {
        this.selectedTeamId = teams[0].teamId;
        select.value = this.selectedTeamId;
      }
    }

    const team = this.dataManager.getTeamById(this.selectedTeamId);
    const container = document.getElementById('team-detail');

    if (!team) {
      container.innerHTML = '<div class="empty-state"><p>팀을 선택해주세요.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">${team.name}</h2>
            <p class="card-subtitle">${team.record} 전적 | 오너: ${team.owner}</p>
          </div>
          <div class="card-content">
            <h3 style="font-size: 0.875rem; margin-bottom: 12px; color: var(--md-sys-color-on-surface-variant);">포지션 구성</h3>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
              ${team.rosterComposition?.map(pos => `
                <span class="chip chip-filled">${pos.position}: ${pos.count}</span>
              `).join('') || ''}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">주간 점수 추이</h2>
          </div>
          <div class="card-content">
            <div style="height: 150px; display: flex; align-items: center; justify-content: center; color: var(--md-sys-color-on-surface-variant);">
              차트 준비 중
            </div>
          </div>
        </div>

        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <h2 class="card-title">주차별 결과</h2>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>주차</th>
                  <th>상대</th>
                  <th>점수</th>
                  <th>상대 점수</th>
                  <th>카테고리</th>
                  <th>결과</th>
                </tr>
              </thead>
              <tbody>
                ${team.weeklyTrend?.map(week => `
                  <tr>
                    <td>${week.week}</td>
                    <td>${week.opponent}</td>
                    <td>${week.scoreDisplay}</td>
                    <td>${week.opponentScoreDisplay}</td>
                    <td>${week.categoryWins ?? 0}-${week.categoryLosses ?? 0}</td>
                    <td>
                      <span class="chip ${week.outcome === 'win' ? 'chip-success' : week.outcome === 'loss' ? 'chip-error' : 'chip-neutral'}">
                        ${week.outcome === 'win' ? '승' : week.outcome === 'loss' ? '패' : '무'}
                      </span>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6">데이터가 없습니다.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}