import { DataManager } from './data.js?v=27';
import { Router } from './router.js?v=24';
import { StandingsView } from './standings.js?v=24';
import { WeeklyTrendView } from './weekly-trend.js?v=25';
import { CategoryAnalysisView } from './category-analysis.js?v=26';
import { TeamProfileView } from './team-profile.js?v=5';
import { PlayoffsView } from './playoffs.js?v=1';
import { OverallStandingsView } from './overall-standings.js?v=1';

class App {
  constructor() {
    this.dataManager = new DataManager();
    this.router = new Router(this);
    this.views = {};
    this.currentSeason = null; // Will be set by populateSeasonDropdown
  }

  async init() {
    try {
      // Load config first (required)
      await this.dataManager.loadConfig();
      
      // Populate season dropdown first
      this.populateSeasonDropdown();
      
      // Load initial data
      await this.dataManager.loadSeason(this.currentSeason);
      
      // Initialize views
      this.views.overview = new StandingsView(this.dataManager);
      this.views.weeklyTrend = new WeeklyTrendView(this.dataManager);
      this.views.categoryAnalysis = new CategoryAnalysisView(this.dataManager);
      this.views.teamProfile = new TeamProfileView(this.dataManager);
      this.views.playoffs = new PlayoffsView(this.dataManager);
      this.views.overallStandings = new OverallStandingsView(this.dataManager);
      
      // Initialize router (attaches tab click handlers)
      this.router.init();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initial render
      this.updateAppBar();
      
      // Render all views with initial data
      Object.values(this.views).forEach(view => {
        if (view.render) view.render();
      });
      
      // Navigate to overview tab
      this.router.navigate('overview');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError(error.message || '데이터를 불러올 수 없습니다.');
    }
  }

  populateSeasonDropdown() {
    const seasonSelect = document.getElementById('season-select');
    if (!seasonSelect) return;

    const seasons = this.dataManager.availableSeasons;
    
    // Clear existing options
    seasonSelect.innerHTML = '';
    
    // Add options in reverse order (newest first)
    [...seasons].reverse().forEach((year, index) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `${year} 시즌`;
      
      // Select the most recent season by default
      if (index === 0) {
        option.selected = true;
        this.currentSeason = year;
      }
      
      seasonSelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // ESPN logo click - navigate to Standings
    const espnLogo = document.querySelector('.espn-logo');
    if (espnLogo) {
      espnLogo.addEventListener('click', (e) => {
        e.preventDefault();
        this.router.navigate('overview');
      });
    }

    // Season selector
    const seasonSelect = document.getElementById('season-select');
    seasonSelect.addEventListener('change', async (e) => {
      this.currentSeason = parseInt(e.target.value);
      await this.dataManager.loadSeason(this.currentSeason);
      this.updateAppBar();
      this.refreshCurrentView();
    });

    // Period filter
    const periodFilter = document.getElementById('period-filter');
    periodFilter.addEventListener('change', (e) => {
      this.views.overview.setPeriodFilter(e.target.value);
    });

    // Chart mode - default to 'static'
    const chartMode = document.getElementById('chart-mode');
    chartMode.value = 'static';
    chartMode.addEventListener('change', (e) => {
      this.views.weeklyTrend.setMode(e.target.value);
    });

    // Y-axis mode - default to 'ranking'
    const yAxisMode = document.getElementById('y-axis-mode');
    yAxisMode.value = 'ranking';
    yAxisMode.addEventListener('change', (e) => {
      this.views.weeklyTrend.setYAxisMode(e.target.value);
    });
  }

  updateAppBar() {
    const data = this.dataManager.getData();
    if (data) {
      const date = new Date(data.generatedAt);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const formatted = `${date.getMonth() + 1}월 ${date.getDate()}일 ${hours}:${minutes} 기록까지 반영`;
      document.getElementById('last-updated').textContent = formatted;
      
      // Calculate current week from data
      const teams = data.teams || [];
      let currentWeek = 0;
      if (teams.length > 0 && teams[0].weeklyTrend) {
        currentWeek = teams[0].weeklyTrend.length;
      }
      
      // Get current matchup period from league data
      const currentMatchupPeriod = data.league?.currentMatchupPeriod || currentWeek;
      
      // Determine if current week is completed or in progress
      // If currentMatchupPeriod > currentWeek, the current period is still in progress
      const isCompleted = currentMatchupPeriod <= currentWeek;
      // Format date as YY. M. D
      const year = date.getFullYear().toString().slice(-2);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      document.getElementById('standings-subtitle').textContent = 
        `Regular Season Standings - ${year}. ${month}. ${day} 기준`;
    }
  }

  refreshCurrentView() {
    const activeTab = document.querySelector('.fantasy-tab.active');
    if (activeTab) {
      const tabId = activeTab.dataset.tab;
      this.views[tabId]?.render();
    }
  }

  showError(message) {
    document.getElementById('app').innerHTML = `
      <div class="error-state">${message}</div>
    `;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
