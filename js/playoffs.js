export class PlayoffsView {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }

  render() {
    const container = document.querySelector('.playoffs-container');
    if (!container) return;

    const currentWeek = this.dataManager.getCurrentWeek();
    const isPlayoffComplete = currentWeek >= 24;
    const isPlayoffStarted = currentWeek >= 23;

    const stats = this.dataManager.calculateTeamStats('all');
    const sortedByWinPct = [...stats].sort((a, b) => b.winPct - a.winPct);

    let seeds;
    if (currentWeek >= 22) {
      seeds = this.dataManager.calculateRankWithTiebreaker(sortedByWinPct, 21);
    } else {
      seeds = new Map();
      sortedByWinPct.forEach((s, i) => {
        if (i === 0) seeds.set(s.teamId, 1);
        else if (s.winPct === sortedByWinPct[i - 1].winPct) seeds.set(s.teamId, seeds.get(sortedByWinPct[i - 1].teamId));
        else seeds.set(s.teamId, i + 1);
      });
    }

    const seededTeams = [...sortedByWinPct].sort((a, b) =>
      (seeds.get(a.teamId) || 99) - (seeds.get(b.teamId) || 99)
    );

    const week23Results = this.getWeekResults(22);
    const week24Results = this.getWeekResults(23);
    const bracket = this.buildBracket(seededTeams, week23Results, week24Results, isPlayoffStarted);
    const finalRankings = this.buildFinalRankings(bracket);

    const isProjected = !isPlayoffStarted;
    const headerText = isProjected
      ? '현재 순위 기준 예상 브라켓'
      : isPlayoffComplete ? '플레이오프 최종 결과' : '플레이오프 진행 중';

    let html = `
      <div class="card" style="margin-bottom: 16px;">
        <div class="card-header" style="padding: 16px;">
          <h2 class="card-title" style="margin: 0;">${headerText}</h2>
          ${isProjected ? '<p class="card-subtitle" style="margin: 4px 0 0 0;">정규시즌 22주차 종료 후 확정됩니다</p>' : ''}
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px;">
        <div class="card-header" style="padding: 16px; border-bottom: 1px solid #E7E0EC;">
          <h3 class="card-title" style="margin: 0; font-size: 16px;">Winner's Bracket</h3>
        </div>
        <div style="padding: 16px;">
          ${this.renderWinnerBracket(bracket)}
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px;">
        <div class="card-header" style="padding: 16px; border-bottom: 1px solid #E7E0EC;">
          <h3 class="card-title" style="margin: 0; font-size: 16px;">Consolation Ladder</h3>
        </div>
        <div style="padding: 16px;">
          ${this.renderConsolationBracket(bracket)}
        </div>
      </div>

      ${!isProjected ? `
        <div class="playoffs-bottom-row">
          <div class="card">
            <div class="card-header" style="padding: 16px; border-bottom: 1px solid #E7E0EC;">
              <h3 class="card-title" style="margin: 0; font-size: 16px;">Top Finishers</h3>
            </div>
            <div style="padding: 16px;">
              ${this.renderTopFinishers(bracket)}
            </div>
          </div>

          <div class="card">
            <div class="card-header" style="padding: 16px; border-bottom: 1px solid #E7E0EC;">
              <h3 class="card-title" style="margin: 0; font-size: 16px;">최종 순위</h3>
            </div>
            <div style="padding: 0;">
              ${this.renderFinalRankings(finalRankings)}
            </div>
          </div>
        </div>
      ` : `
        <div class="card">
          <div class="card-header" style="padding: 16px; border-bottom: 1px solid #E7E0EC;">
            <h3 class="card-title" style="margin: 0; font-size: 16px;">최종 순위</h3>
          </div>
          <div style="padding: 0;">
            ${this.renderFinalRankings(finalRankings)}
          </div>
        </div>
      `}
     `;

    container.innerHTML = html;
  }


  getWeekResults(weekIndex) {
    const teams = this.dataManager.getTeams();
    const results = new Map();

    teams.forEach(team => {
      const week = team.weeklyTrend?.[weekIndex];
      if (week) {
        const opponentName = week.opponent?.trim().toLowerCase();
        const opponent = teams.find(t =>
          t.name?.trim().toLowerCase() === opponentName
        );
        if (opponent) {
          const cw = week.categoryWins || 0;
          const cl = week.categoryLosses || 0;
          const ct = week.categoryTies || 0;
          let result;
          if (cw > cl) result = 'win';
          else if (cw < cl) result = 'loss';
          else result = 'tie';

          results.set(team.teamId, {
            opponentId: opponent.teamId,
            cw, cl, ct,
            result
          });
        }
      }
    });

    return results;
  }

  buildBracket(seededTeams, week23Results, week24Results, isPlayoffStarted) {
    const getTeam = (index) => seededTeams[index] || null;
    const getOwner = (team) => team
      ? (this.dataManager.OWNER_MAP[team.name] || team.owner)
      : null;
    const getColor = (team) => team
      ? this.dataManager.TEAM_COLORS[seededTeams.indexOf(team) % this.dataManager.TEAM_COLORS.length]
      : '#999';

    const resolveMatchup = (teamA, teamB, results) => {
      if (!teamA || !teamB) return { winner: null, loser: null, isTie: false };
      const rA = results.get(teamA.teamId);
      if (!rA || !isPlayoffStarted) return { winner: null, loser: null, isTie: false };

      if (rA.result === 'win') return { winner: teamA, loser: teamB, isTie: false };
      if (rA.result === 'loss') return { winner: teamB, loser: teamA, isTie: false };
      const seedA = seededTeams.indexOf(teamA);
      const seedB = seededTeams.indexOf(teamB);
      return { winner: seedA < seedB ? teamA : teamB, loser: seedA < seedB ? teamB : teamA, isTie: true };
    };

    // Round 1 (Week 23)
    const r1A = resolveMatchup(getTeam(0), getTeam(3), week23Results);
    const r1B = resolveMatchup(getTeam(1), getTeam(2), week23Results);
    const r1C = resolveMatchup(getTeam(4), getTeam(5), week23Results);
    const r1D = resolveMatchup(getTeam(6), getTeam(7), week23Results);
    const r1E = resolveMatchup(getTeam(8), getTeam(9), week23Results);
    const r1F = resolveMatchup(getTeam(10), getTeam(11), week23Results);

    // Round 2 (Week 24)
    const r2Champ = resolveMatchup(r1A.winner, r1B.winner, week24Results);
    const r2Third = resolveMatchup(r1A.loser, r1B.loser, week24Results);
    const r2Fifth = resolveMatchup(r1C.winner, r1D.winner, week24Results);
    const r2Seventh = resolveMatchup(r1C.loser, r1E.winner, week24Results);
    const r2Ninth = resolveMatchup(r1D.loser, r1F.winner, week24Results);
    const r2Eleventh = resolveMatchup(r1E.loser, r1F.loser, week24Results);

    return {
      r1A, r1B, r1C, r1D, r1E, r1F,
      r2Champ, r2Third, r2Fifth, r2Seventh, r2Ninth, r2Eleventh,
      getOwner, getColor, seededTeams
    };
  }

  buildFinalRankings(b) {
    // 1-12 from all R2 results
    const rank = (match, winPlace, losePlace) => [
      { place: winPlace, team: match.winner },
      { place: losePlace, team: match.loser }
    ];

    return [
      ...rank(b.r2Champ, 1, 2),
      ...rank(b.r2Third, 3, 4),
      ...rank(b.r2Fifth, 5, 6),
      ...rank(b.r2Seventh, 7, 8),
      ...rank(b.r2Ninth, 9, 10),
      ...rank(b.r2Eleventh, 11, 12)
    ];
  }

  getOwnerName(team) {
    if (!team) return 'TBD';
    const found = this.dataManager.getTeams().find(t => t.teamId === team.teamId);
    return found ? (this.dataManager.OWNER_MAP[found.name] || found.owner) : 'TBD';
  }

  getTeamColor(team) {
    if (!team) return '#999';
    const found = this.dataManager.getTeams().find(t => t.teamId === team.teamId);
    if (!found) return '#999';
    const index = this.dataManager.getTeams().indexOf(found);
    return this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length];
  }

  getRegularSeasonStats(team) {
    if (!team) return null;
    const stats = this.dataManager.calculateTeamStats('all');
    return stats.find(s => s.teamId === team.teamId) || null;
  }

  getRegularSeasonSeed(team) {
    if (!team) return null;
    const currentWeek = this.dataManager.getCurrentWeek();
    const stats = this.dataManager.calculateTeamStats('all');
    const sortedByWinPct = [...stats].sort((a, b) => b.winPct - a.winPct);

    let seeds;
    if (currentWeek >= 22) {
      seeds = this.dataManager.calculateRankWithTiebreaker(sortedByWinPct, 21);
    } else {
      seeds = new Map();
      sortedByWinPct.forEach((s, i) => {
        if (i === 0) seeds.set(s.teamId, 1);
        else if (s.winPct === sortedByWinPct[i - 1].winPct) seeds.set(s.teamId, seeds.get(sortedByWinPct[i - 1].teamId));
        else seeds.set(s.teamId, i + 1);
      });
    }

    return seeds.get(team.teamId) || null;
  }

  getScore(team, isFinal) {
    if (!team) return '';
    const originalTeam = this.dataManager.getTeams().find(t => t.teamId === team.teamId);
    if (!originalTeam) return '';
    const weekIndex = isFinal ? 23 : 22;
    const week = originalTeam.weeklyTrend?.[weekIndex];
    if (!week) return '';
    return `${week.categoryWins || 0}-${week.categoryLosses || 0}-${week.categoryTies || 0}`;
  }

  renderMatchupCard(matchLabel, teamA, teamB, result, bracket, isFinal = false) {
    const hasResult = result && result.winner;

    const teamRow = (team) => {
      const isTBD = !team;
      const owner = this.getOwnerName(team);
      const seed = this.getRegularSeasonSeed(team);
      const color = this.getTeamColor(team);
      const isWinner = hasResult && team && result.winner?.teamId === team.teamId;
      const isLoser = hasResult && team && result.loser?.teamId === team.teamId;

      let borderStyle;
      if (isWinner) borderStyle = `border: 2px solid ${color}; background: ${color}10;`;
      else if (isLoser) borderStyle = 'border: 1px solid #E7E0EC; opacity: 0.5;';
      else borderStyle = 'border: 1px solid #E7E0EC;';

      let badge = '';
      if (isWinner) badge = '<span style="color: #4CAF50; font-weight: 700; font-size: 15px; width: 18px;">W</span>';
      else if (isLoser) badge = '<span style="color: #F44336; font-weight: 700; font-size: 15px; width: 18px;">L</span>';
      else badge = '<span style="width: 18px;"></span>';

      const score = this.getScore(team, isFinal);

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; ${borderStyle} ${isTBD ? 'opacity: 0.35;' : ''}">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            ${badge}
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
            <span style="font-weight: 600; font-size: 15px; color: ${isTBD ? '#999' : '#1C1B1F'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${owner}${!isTBD && seed ? `<sup style="font-size: 10px; vertical-align: super; margin-left: 2px; color: #79747E;">${seed}</sup>` : ''}</span>
          </div>
          <span style="font-size: 14px; font-weight: 600; color: #79747E; flex-shrink: 0; margin-left: 8px;">${score}</span>
        </div>
      `;
    };

    let resultSummary = '';
    if (hasResult) {
      const winnerOwner = this.getOwnerName(result.winner);
      const weekIdx = isFinal ? 23 : 22;
      const originalWinner = this.dataManager.getTeams().find(t => t.teamId === result.winner.teamId);
      const winnerWeek = originalWinner?.weeklyTrend?.[weekIdx];
      if (winnerWeek) {
        resultSummary = `<span style="font-size: 13px; font-weight: 600; color: #4CAF50;">${winnerOwner} ${(winnerWeek.categoryWins || 0)}-${(winnerWeek.categoryLosses || 0)}-${(winnerWeek.categoryTies || 0)} 승리</span>`;
      }
    }

    return `
      <div style="margin-bottom: 14px;">
        <div style="font-size: 12px; color: #79747E; font-weight: 600; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">${matchLabel}</div>
        <div style="display: flex; flex-direction: column; gap: 4px; background: #FAFAFA; border-radius: 10px; padding: 6px;">
          ${teamRow(teamA)}
          ${teamRow(teamB)}
        </div>
        ${resultSummary ? `<div style="margin-top: 4px; padding-left: 4px;">${resultSummary}</div>` : ''}
      </div>
    `;
  }

  renderWinnerBracket(b) {
    return `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; color: #6750A4; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #E8DEF8;">Round 1 (Week 23)</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            ${this.renderMatchupCard('1위 vs 4위', b.seededTeams[0], b.seededTeams[3], b.r1A, b)}
          </div>
          <div>
            ${this.renderMatchupCard('2위 vs 3위', b.seededTeams[1], b.seededTeams[2], b.r1B, b)}
          </div>
        </div>
      </div>
      <div>
        <div style="font-size: 13px; color: #6750A4; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #E8DEF8;">Round 2 (Week 24)</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            ${this.renderMatchupCard('최종 1위 결정전', b.r1A.winner, b.r1B.winner, b.r2Champ, b, true)}
          </div>
          <div>
            ${this.renderMatchupCard('최종 3위 결정전', b.r1A.loser, b.r1B.loser, b.r2Third, b, true)}
          </div>
        </div>
      </div>
    `;
  }

  renderConsolationBracket(b) {
    return `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; color: #6750A4; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #E8DEF8;">Round 1 (Week 23)</div>
        <div class="playoffs-desktop-only" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            ${this.renderMatchupCard('5위 vs 6위', b.seededTeams[4], b.seededTeams[5], b.r1C, b)}
            ${this.renderMatchupCard('9위 vs 10위', b.seededTeams[8], b.seededTeams[9], b.r1E, b)}
          </div>
          <div>
            ${this.renderMatchupCard('7위 vs 8위', b.seededTeams[6], b.seededTeams[7], b.r1D, b)}
            ${this.renderMatchupCard('11위 vs 12위', b.seededTeams[10], b.seededTeams[11], b.r1F, b)}
          </div>
        </div>
        <div class="playoffs-mobile-only">
          ${this.renderMatchupCard('5위 vs 6위', b.seededTeams[4], b.seededTeams[5], b.r1C, b)}
          ${this.renderMatchupCard('7위 vs 8위', b.seededTeams[6], b.seededTeams[7], b.r1D, b)}
          ${this.renderMatchupCard('9위 vs 10위', b.seededTeams[8], b.seededTeams[9], b.r1E, b)}
          ${this.renderMatchupCard('11위 vs 12위', b.seededTeams[10], b.seededTeams[11], b.r1F, b)}
        </div>
      </div>
      <div>
        <div style="font-size: 13px; color: #6750A4; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #E8DEF8;">Round 2 (Week 24)</div>
        <div class="playoffs-desktop-only" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            ${this.renderMatchupCard('최종 5위 결정전', b.r1C.winner, b.r1D.winner, b.r2Fifth, b, true)}
            ${this.renderMatchupCard('최종 9위 결정전', b.r1D.loser, b.r1F.winner, b.r2Ninth, b, true)}
          </div>
          <div>
            ${this.renderMatchupCard('최종 7위 결정전', b.r1C.loser, b.r1E.winner, b.r2Seventh, b, true)}
            ${this.renderMatchupCard('최종 11위 결정전', b.r1E.loser, b.r1F.loser, b.r2Eleventh, b, true)}
          </div>
        </div>
        <div class="playoffs-mobile-only">
          ${this.renderMatchupCard('최종 5위 결정전', b.r1C.winner, b.r1D.winner, b.r2Fifth, b, true)}
          ${this.renderMatchupCard('최종 7위 결정전', b.r1C.loser, b.r1E.winner, b.r2Seventh, b, true)}
          ${this.renderMatchupCard('최종 9위 결정전', b.r1D.loser, b.r1F.winner, b.r2Ninth, b, true)}
          ${this.renderMatchupCard('최종 11위 결정전', b.r1E.loser, b.r1F.loser, b.r2Eleventh, b, true)}
        </div>
      </div>
    `;
  }

  renderTopFinishers(b) {
    const finishers = [
      { place: 1, team: b.r2Champ.winner, trophy: 'https://g.espncdn.com/lm-static/flb/images/playoff_bracket/trophy_first.svg' },
      { place: 2, team: b.r2Champ.loser, trophy: 'https://g.espncdn.com/lm-static/flb/images/playoff_bracket/trophy_second.svg' },
      { place: 3, team: b.r2Third.winner, trophy: 'https://g.espncdn.com/lm-static/flb/images/playoff_bracket/trophy_third.svg' }
    ];

    const cards = finishers.map(f => {
      const owner = this.getOwnerName(f.team);
      const color = this.getTeamColor(f.team);
      const isTBD = !f.team;
      const placeLabel = f.place === 1 ? 'Champion' : f.place === 2 ? 'Runner-up' : '3rd Place';

      return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: ${isTBD ? '#FAFAFA' : '#F5F0FF'}; border: 1px solid ${isTBD ? '#E7E0EC' : color + '30'};">
          <img src="${f.trophy}" alt="${f.place}위 트로피" style="width: 48px; height: 48px; flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12px; color: #79747E; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${placeLabel}</div>
            <div style="font-size: 16px; font-weight: 700; color: ${isTBD ? '#999' : color}; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${isTBD ? 'TBD' : owner}</div>
          </div>
        </div>
      `;
    }).join('');

    return `<div style="display: flex; flex-direction: column; gap: 10px;">${cards}</div>`;
  }

  renderFinalRankings(rankings) {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

    const rows = rankings.map(r => {
      const team = r.team;
      const isTBD = !team;
      const owner = this.getOwnerName(team);
      const color = this.getTeamColor(team);
      const medal = medals[r.place] || '';
      const isTop3 = r.place <= 3;

      const regStats = this.getRegularSeasonStats(team);
      const wins = regStats ? regStats.wins : '-';
      const losses = regStats ? regStats.losses : '-';
      const ties = regStats ? regStats.ties : '-';
      const winPct = regStats ? regStats.winPct.toFixed(3).replace(/^0\./, '.') : '-';

      return `
        <tr style="${isTop3 && !isTBD ? 'background: #F5F0FF;' : ''} ${isTBD ? 'opacity: 0.4;' : ''}">
          <td style="text-align: center; font-weight: 800; font-size: 15px; color: #6750A4; width: 40px; padding: 10px 8px; white-space: nowrap;">${medal || r.place}</td>
          <td style="width: 16px; padding: 10px 4px; white-space: nowrap;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span></td>
          <td style="font-weight: 600; font-size: 15px; color: ${isTBD ? '#999' : '#1C1B1F'}; white-space: nowrap; padding: 10px 10px 10px 8px;">${isTBD ? 'TBD' : owner}</td>
          <td style="text-align: right; font-size: 14px; color: #79747E; width: 108px; font-variant-numeric: tabular-nums; white-space: nowrap; padding: 10px 8px;">${wins}-${losses}-${ties}</td>
          <td style="text-align: right; font-size: 14px; color: #79747E; font-weight: 600; width: 54px; font-variant-numeric: tabular-nums; white-space: nowrap; padding: 10px 8px;">${winPct}</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="overflow-x: auto; padding: 0 12px 8px 12px;">
        <table style="width: auto; min-width: 520px; border-collapse: collapse; table-layout: auto;">
          <thead>
            <tr style="background: #F5F5F5; border-bottom: 2px solid #E7E0EC;">
              <th style="width: 40px;"></th>
              <th style="width: 16px;"></th>
              <th style="text-align: center; font-size: 12px; color: #79747E; font-weight: 700; padding: 10px 8px; white-space: nowrap;">팀</th>
              <th style="text-align: center; font-size: 12px; color: #79747E; font-weight: 700; padding: 10px 8px; width: 108px; white-space: nowrap;">W-L-D</th>
              <th style="text-align: center; font-size: 12px; color: #79747E; font-weight: 700; padding: 10px 8px; width: 54px; white-space: nowrap;">승률</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }
}
