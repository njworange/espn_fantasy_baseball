// Register DataLabels plugin if available
if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

export class WeeklyTrendView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.mode = 'static';
    this.yAxisMode = 'ranking'; // Default to ranking
    this.chart = null;
    this.visibleTeams = new Set(); // Empty by default - nothing selected
    this.isRecording = false; // Flag for recording mode
  }

  setMode(mode) {
    this.mode = mode;
    this.render();
  }

  setYAxisMode(mode) {
    this.yAxisMode = mode;
    this.render();
  }

  render() {
    if (this.mode === 'static') {
      this.renderStaticChart();
    } else {
      this.renderAnimatedChart();
    }
  }

  renderStaticChart() {
    // Show canvas and hide animated message
    this.showCanvas();
    
    // Hide race controls
    const controls = document.getElementById('race-controls');
    if (controls) {
      controls.style.display = 'none';
    }
    
    // Stop any existing animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Check if canvas exists
    const canvas = document.getElementById('trend-chart');
    if (!canvas) {
      console.warn('Canvas element not found');
      return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      setTimeout(() => this.renderStaticChart(), 100);
      return;
    }

    const teams = this.dataManager.getTeams();
    const maxWeeks = Math.min(22, Math.max(...teams.map(t => t.weeklyTrend?.length || 0)));
    
    // Prepare data - show only regular season (Week 1-22)
    const labels = Array.from({ length: maxWeeks }, (_, i) => `Week ${i + 1}`);
    
    // Create gradient fills for each team
    const ctx = canvas.getContext('2d');
    
    // Get data based on yAxisMode
    const datasets = teams.map((team, index) => {
      const color = this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length];
      const isWinRateMode = this.yAxisMode === 'winRate';
      
      // Create gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, color + (isWinRateMode ? '60' : '30')); // More opaque at top for win rate
      gradient.addColorStop(1, color + '05'); // Very transparent at bottom
      
      return {
        label: this.dataManager.OWNER_MAP[team.name] || team.owner,
        data: isWinRateMode
          ? this.calculateWinRates(team.weeklyTrend, maxWeeks)
          : this.calculateRankings(team, teams, maxWeeks),
        borderColor: color,
        backgroundColor: gradient,
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
        hidden: !this.visibleTeams.has(team.teamId),
        tension: 0, // Straight lines
        fill: true, // Area chart effect
        shadowColor: color + '40',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        datalabels: {
          display: this.yAxisMode === 'ranking' && this.visibleTeams.has(team.teamId),
          align: 'center',
          anchor: 'center',
          color: '#fff',
          font: {
            size: 10,
            weight: 'bold'
          },
          formatter: (value) => {
            return Math.round(value);
          },
          offset: 0,
          backgroundColor: color,
          borderRadius: 8,
          padding: {
            top: 2,
            bottom: 2,
            left: 4,
            right: 4
          }
        }
      };
    });

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }
    
    // Configure chart options based on yAxisMode
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          display: false // Default to false, enabled per dataset
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1C1B1F',
          bodyColor: '#1C1B1F',
          borderColor: '#E7E0EC',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: {
            size: 14,
            weight: '600'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              const label = context.dataset.label;
              if (this.yAxisMode === 'winRate') {
                return `${label}: ${(value * 100).toFixed(1)}%`;
              } else {
                return `${label}: ${Math.round(value)}위`;
              }
            },
            labelPointStyle: (context) => {
              return {
                pointStyle: 'circle',
                rotation: 0
              };
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#79747E',
            font: {
              size: 11
            },
            maxRotation: 0,
            minRotation: 0
          }
        },
        y: this.yAxisMode === 'winRate' ? {
          min: 0,
          max: 1,
          ticks: {
            callback: (value) => value.toFixed(3).replace(/^0\./, '.'),
            color: '#79747E',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(231, 224, 236, 0.5)',
            borderDash: [5, 5]
          }
        } : {
          min: 0.5,
          max: 12.5,
          reverse: true,
          ticks: {
            stepSize: 1,
            callback: (value) => {
              // Only show integer ranks 1-12
              if (value >= 1 && value <= 12 && Number.isInteger(value)) {
                return `${value}위`;
              }
              return '';
            },
            color: '#79747E',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(231, 224, 236, 0.6)',
            borderDash: [4, 4],
            lineWidth: 1,
            tickLength: 0
          }
        }
      }
    };

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: chartOptions
    });

    this.renderLegend(teams);
  }

  calculateWinRates(weeklyTrend, maxWeeks) {
    // Use only regular season weeks (1-22)
    const regularSeasonWeeks = Math.min(maxWeeks, 22);
    
    return Array.from({ length: regularSeasonWeeks }, (_, weekIdx) => {
      const trend = weeklyTrend?.slice(0, weekIdx + 1) || [];
      
      // Sum category wins/losses/ties for H2H Category league
      const wins = trend.reduce((sum, w) => sum + (w.categoryWins || 0), 0);
      const losses = trend.reduce((sum, w) => sum + (w.categoryLosses || 0), 0);
      const ties = trend.reduce((sum, w) => sum + (w.categoryTies || 0), 0);
      
      const totalGames = wins + losses + ties;
      if (totalGames === 0) return 0;
      
      // Winning percentage: wins + 0.5 * ties / total
      return (wins + ties * 0.5) / totalGames;
    });
  }

  calculateRankings(targetTeam, allTeams, maxWeeks) {
    // Use only regular season weeks (1-22)
    const regularSeasonWeeks = Math.min(maxWeeks, 22);
    
    // Pre-calculate week 22 tiebreaker rankMap if applicable
    let week22RankMap = null;
    if (regularSeasonWeeks >= 22) {
      const week22Stats = allTeams.map(team => {
        const trend = team.weeklyTrend?.slice(0, 22) || [];
        const wins = trend.reduce((sum, w) => sum + (w.categoryWins || 0), 0);
        const losses = trend.reduce((sum, w) => sum + (w.categoryLosses || 0), 0);
        const ties = trend.reduce((sum, w) => sum + (w.categoryTies || 0), 0);
        const totalGames = wins + losses + ties;
        const winRate = totalGames === 0 ? 0 : (wins + ties * 0.5) / totalGames;
        return { teamId: team.teamId, winRate, winPct: winRate };
      });
      week22Stats.sort((a, b) => b.winRate - a.winRate);
      week22RankMap = this.dataManager.calculateRankWithTiebreaker(week22Stats, 21);
    }
    
    return Array.from({ length: regularSeasonWeeks }, (_, weekIdx) => {
      // Week 22: use pre-calculated tiebreaker rankMap
      if (weekIdx === 21 && week22RankMap) {
        return week22RankMap.get(targetTeam.teamId);
      }
      
      // Weeks 1-21: dense ranking (same winRate = same rank)
      const teamRecords = allTeams.map(team => {
        const trend = team.weeklyTrend?.slice(0, weekIdx + 1) || [];
        const wins = trend.reduce((sum, w) => sum + (w.categoryWins || 0), 0);
        const losses = trend.reduce((sum, w) => sum + (w.categoryLosses || 0), 0);
        const ties = trend.reduce((sum, w) => sum + (w.categoryTies || 0), 0);
        const totalGames = wins + losses + ties;
        const winRate = totalGames === 0 ? 0 : (wins + ties * 0.5) / totalGames;
        return { teamId: team.teamId, winRate };
      });
      
      // Sort by winRate descending to determine rankings
      teamRecords.sort((a, b) => b.winRate - a.winRate);
      
      // Find target team's rank (handle ties - same winRate = same rank)
      let currentRank = 1;
      let lastWinRate = null;
      let rankOffset = 0;
      
      for (let i = 0; i < teamRecords.length; i++) {
        const record = teamRecords[i];
        
        if (lastWinRate !== null && record.winRate < lastWinRate) {
          currentRank = currentRank + rankOffset;
          rankOffset = 1;
        } else if (lastWinRate !== null && record.winRate === lastWinRate) {
          rankOffset++;
        } else {
          rankOffset = 1;
        }
        
        lastWinRate = record.winRate;
        
        if (record.teamId === targetTeam.teamId) {
          return currentRank;
        }
      }
      
      return 12; // Default to last place if not found
    });
  }

  renderLegend(teams) {
    const legendContainer = document.getElementById('chart-legend');
    
    // Sort teams alphabetically by owner name
    const sortedTeams = [...teams].sort((a, b) => {
      const ownerA = this.dataManager.OWNER_MAP[a.name] || a.owner;
      const ownerB = this.dataManager.OWNER_MAP[b.name] || b.owner;
      if (ownerA === '고스트') return 1;
      if (ownerB === '고스트') return -1;
      return ownerA.localeCompare(ownerB, 'ko-KR');
    });

    // Check if all teams are selected
    const allSelected = sortedTeams.length > 0 && sortedTeams.every(t => this.visibleTeams.has(t.teamId));

    // Create "Select All" checkbox at the top
    let html = `
      <label class="legend-item select-all-item" style="background-color: ${allSelected ? '#E8DEF8' : 'transparent'}; color: ${allSelected ? '#4A4458' : '#79747E'}; grid-column: span 4; margin-bottom: 8px; border: 1px dashed ${allSelected ? '#6750A4' : '#79747E'};">
        <input type="checkbox" ${allSelected ? 'checked' : ''} data-select-all="true"
          style="accent-color: #6750A4">
        <span style="font-weight: ${allSelected ? 600 : 500}">전체 선택</span>
      </label>
    `;

    // Add team checkboxes in 4 columns
    html += sortedTeams.map((team, index) => {
      const color = this.dataManager.TEAM_COLORS[teams.indexOf(team) % this.dataManager.TEAM_COLORS.length];
      const owner = this.dataManager.OWNER_MAP[team.name] || team.owner;
      const isVisible = this.visibleTeams.has(team.teamId);
      
      return `
        <label class="legend-item" style="background-color: ${isVisible ? color + '15' : 'transparent'}; color: ${isVisible ? color : '#79747E'}">
          <input type="checkbox" ${isVisible ? 'checked' : ''} data-team-id="${team.teamId}"
            style="accent-color: ${color}">
          <span style="font-weight: ${isVisible ? 500 : 400}">${owner}</span>
        </label>
      `;
    }).join('');

    legendContainer.innerHTML = html;

    // Add change handlers
    legendContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.dataset.selectAll === 'true') {
          // Select/deselect all
          if (e.target.checked) {
            sortedTeams.forEach(t => this.visibleTeams.add(t.teamId));
          } else {
            this.visibleTeams.clear();
          }
        } else {
          const teamId = parseInt(e.target.dataset.teamId);
          if (e.target.checked) {
            this.visibleTeams.add(teamId);
          } else {
            this.visibleTeams.delete(teamId);
          }
        }
        this.render();
      });
    });
  }

  renderAnimatedChart() {
    // Show canvas
    this.showCanvas();
    
    const canvas = document.getElementById('trend-chart');
    if (!canvas) {
      console.warn('Canvas element not found');
      return;
    }
    
    // Stop any existing animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    const ctx = canvas.getContext('2d');
    const teams = this.dataManager.getTeams();
    const maxWeeks = Math.min(22, Math.max(...teams.map(t => t.weeklyTrend?.length || 0)));
    
    // Prepare ranking data for all teams
    const rankingData = teams.map((team, index) => {
      const rankings = this.calculateRankings(team, teams, maxWeeks);
      return {
        teamId: team.teamId,
        owner: this.dataManager.OWNER_MAP[team.name] || team.owner,
        color: this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length],
        rankings: rankings
      };
    });
    
    // Animation state
    this.animationState = {
      currentWeek: 1,
      isPlaying: false,
      speed: 1, // weeks per second
      lastFrameTime: 0
    };
    
    // Setup canvas size
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    
    // Animation loop
    const animate = (timestamp) => {
      if (!this.animationState.isPlaying) {
        this.animationId = requestAnimationFrame(animate);
        return;
      }
      
      if (!this.animationState.lastFrameTime) {
        this.animationState.lastFrameTime = timestamp;
      }
      
      const deltaTime = (timestamp - this.animationState.lastFrameTime) / 1000;
      this.animationState.lastFrameTime = timestamp;
      
      // Update current week
      this.animationState.currentWeek += deltaTime * this.animationState.speed;
      
      // Stop at end (don't loop)
      if (this.animationState.currentWeek >= maxWeeks) {
        this.animationState.currentWeek = maxWeeks;
        this.animationState.isPlaying = false;
        
        // Update play button to show play icon
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (playIcon) playIcon.style.display = 'inline';
        if (pauseIcon) pauseIcon.style.display = 'none';
      }
      
      // Render frame
      this.renderRaceFrame(ctx, canvas, rankingData, maxWeeks);
      
      // Update slider if exists
      const slider = document.getElementById('race-slider');
      if (slider) {
        slider.value = this.animationState.currentWeek;
      }
      
      // Update week display
      const weekDisplay = document.getElementById('race-week-display');
      if (weekDisplay) {
        weekDisplay.textContent = `Week ${Math.floor(this.animationState.currentWeek)}`;
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    // Initial render
    this.renderRaceFrame(ctx, canvas, rankingData, maxWeeks);
    
    // Don't auto-start animation - wait for user to click play
    this.animationId = requestAnimationFrame(animate);
    
    // Setup controls
    this.setupRaceControls(maxWeeks);
    
    // Render legend (only selected teams)
    this.renderLegend(teams);
  }
  
  setupRaceControls(maxWeeks) {
    // Show controls
    const controls = document.getElementById('race-controls');
    if (controls) {
      controls.style.display = 'block';
    }
    
    // Play/Pause button
    const playPauseBtn = document.getElementById('race-play-pause');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (playPauseBtn) {
      playPauseBtn.onclick = () => {
        this.animationState.isPlaying = !this.animationState.isPlaying;
        if (this.animationState.isPlaying) {
          this.animationState.lastFrameTime = 0;
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'inline';
        } else {
          playIcon.style.display = 'inline';
          pauseIcon.style.display = 'none';
        }
      };
    }
    
    // Slider
    const slider = document.getElementById('race-slider');
    if (slider) {
      slider.max = maxWeeks;
      slider.value = this.animationState.currentWeek;
      
      slider.oninput = (e) => {
        this.animationState.currentWeek = parseFloat(e.target.value);
        this.animationState.lastFrameTime = 0;
        
        // Trigger a frame render
        const canvas = document.getElementById('trend-chart');
        const ctx = canvas.getContext('2d');
        const teams = this.dataManager.getTeams();
        const rankingData = teams.map((team, index) => {
          const rankings = this.calculateRankings(team, teams, maxWeeks);
          return {
            teamId: team.teamId,
            owner: this.dataManager.OWNER_MAP[team.name] || team.owner,
            color: this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length],
            rankings: rankings
          };
        });
        this.renderRaceFrame(ctx, canvas, rankingData, maxWeeks);
        
        // Update display
        const weekDisplay = document.getElementById('race-week-display');
        if (weekDisplay) {
          weekDisplay.textContent = `Week ${Math.floor(this.animationState.currentWeek)}`;
        }
      };
    }
    
    // Set initial button state (paused)
    if (playIcon) playIcon.style.display = 'inline';
    if (pauseIcon) pauseIcon.style.display = 'none';
    
    // Record button
    const recordBtn = document.getElementById('race-record');
    if (recordBtn) {
      recordBtn.onclick = () => this.startRecording(maxWeeks);
    }
  }
  
  async startRecording(maxWeeks) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;
    
    // Check if any team is selected
    if (this.visibleTeams.size === 0) {
      alert('녹화하려면 최소 한 팀을 선택해주세요.');
      return;
    }
    
    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      alert('이 브라우저는 동영상 녹화를 지원하지 않습니다.\nChrome, Edge, Firefox 최신 버전을 사용해주세요.');
      return;
    }
    
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Show recording status
    const recordBtn = document.getElementById('race-record');
    const statusEl = document.getElementById('recording-status');
    if (recordBtn) recordBtn.style.display = 'none';
    if (statusEl) statusEl.style.display = 'flex';
    
    try {
      // Save original canvas size
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      
      // Set resolution based on device (lower for mobile)
      let recordWidth = 1920;
      let recordHeight = 1080;
      let videoBitsPerSecond = 8000000; // 8Mbps for desktop
      
      if (isMobile) {
        recordWidth = 1280;  // HD instead of Full HD
        recordHeight = 720;
        videoBitsPerSecond = 4000000; // 4Mbps for mobile
        console.log('Mobile device detected - using 1280x720 resolution');
      }
      
      canvas.width = recordWidth;
      canvas.height = recordHeight;
      
      // Setup MediaRecorder with appropriate codec
      const stream = canvas.captureStream(30); // 30fps
      
      // Determine supported mime type
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=h264';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error('No supported video codec found');
          }
        }
      }
      console.log('Using codec:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitsPerSecond
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Restore original canvas size
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        
        // Reset recording flag
        this.isRecording = false;
        
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `fantasy-ranking-week1-22-${new Date().toISOString().slice(0,10)}.${extension}`;
        
        // For mobile, use different approach if download doesn't work
        if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // iOS: Open in new tab for manual save
          window.open(url, '_blank');
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 60000); // Keep URL valid for 1 minute
        } else {
          // Android/Desktop: Direct download
          a.click();
          URL.revokeObjectURL(url);
        }
        
        // Reset UI
        if (recordBtn) recordBtn.style.display = 'inline-block';
        if (statusEl) statusEl.style.display = 'none';
        
        // Re-render at original size
        this.renderRaceFrame(canvas.getContext('2d'), canvas, 
          this.dataManager.getTeams().map((team, index) => ({
            teamId: team.teamId,
            owner: this.dataManager.OWNER_MAP[team.name] || team.owner,
            color: this.dataManager.TEAM_COLORS[index % this.dataManager.TEAM_COLORS.length],
            rankings: this.calculateRankings(team, this.dataManager.getTeams(), maxWeeks)
          })), maxWeeks);
      };
      
      // Enable recording mode for larger fonts
      this.isRecording = true;
      
      // Reset to week 1 and start recording
      this.animationState.currentWeek = 1;
      this.animationState.isPlaying = true;
      this.animationState.lastFrameTime = 0;
      
      // Update play button
      const playIcon = document.getElementById('play-icon');
      const pauseIcon = document.getElementById('pause-icon');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'inline';
      
      // Start recording
      mediaRecorder.start();
      
      // Stop recording when animation ends
      const checkEnd = setInterval(() => {
        if (this.animationState.currentWeek >= maxWeeks || !this.animationState.isPlaying) {
          clearInterval(checkEnd);
          setTimeout(() => {
            mediaRecorder.stop();
          }, 500); // Wait a bit for final frame
        }
      }, 100);
      
    } catch (err) {
      console.error('Recording failed:', err);
      
      // Restore canvas size on error
      canvas.width = originalWidth || canvas.width;
      canvas.height = originalHeight || canvas.height;
      
      let errorMessage = '동영상 녹화에 실패했습니다.';
      if (isMobile) {
        errorMessage += '\n\n모바일에서는 다음을 시도핳세요:\n' +
          '1. Chrome 또는 Safari 최신 버전 사용\n' +
          '2. PC에서 녹화 후 공유\n' +
          '3. 화면 녹화 기능 사용 (iOS: 제어 센터, Android: 빠른 설정)';
      } else {
        errorMessage += '\nChrome, Edge, Firefox 최신 버전을 사용해주세요.';
      }
      
      alert(errorMessage);
      
      if (recordBtn) recordBtn.style.display = 'inline-block';
      if (statusEl) statusEl.style.display = 'none';
    }
  }
  
  renderRaceFrame(ctx, canvas, rankingData, maxWeeks) {
    const padding = { top: 40, right: 100, bottom: 40, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Font sizes: larger when recording
    const fontSize = this.isRecording ? 20 : 14;
    const rankLabelFont = `bold ${fontSize}px Inter`;
    const teamNameFont = `bold ${fontSize}px Inter`;
    const dotRadius = this.isRecording ? 14 : 10;
    const labelOffset = this.isRecording ? 22 : 18;
    const labelMargin = this.isRecording ? 15 : 12;
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines (horizontal for ranks)
    ctx.strokeStyle = 'rgba(231, 224, 236, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    
    for (let rank = 1; rank <= 12; rank++) {
      const y = padding.top + ((rank - 0.5) / 12) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      // Draw rank label
      ctx.fillStyle = '#1C1B1F';
      ctx.font = rankLabelFont;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${rank}위`, padding.left - labelMargin, y);
    }
    ctx.setLineDash([]);
    
    const currentWeek = this.animationState?.currentWeek || 1;
    const currentWeekIndex = Math.floor(currentWeek) - 1;
    const weekProgress = currentWeek - Math.floor(currentWeek);
    
    // Draw team lines
    rankingData.forEach(team => {
      // Only draw if team is selected
      if (!this.visibleTeams.has(team.teamId)) return;
      
      ctx.strokeStyle = team.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      
      // Draw line up to current week
      for (let week = 0; week <= currentWeekIndex && week < team.rankings.length; week++) {
        const x = padding.left + (week / (maxWeeks - 1)) * chartWidth;
        const y = padding.top + ((team.rankings[week] - 0.5) / 12) * chartHeight;
        
        if (week === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Interpolate to next week for smooth animation
      if (currentWeekIndex < team.rankings.length - 1) {
        const x1 = padding.left + (currentWeekIndex / (maxWeeks - 1)) * chartWidth;
        const x2 = padding.left + ((currentWeekIndex + 1) / (maxWeeks - 1)) * chartWidth;
        const y1 = padding.top + ((team.rankings[currentWeekIndex] - 0.5) / 12) * chartHeight;
        const y2 = padding.top + ((team.rankings[currentWeekIndex + 1] - 0.5) / 12) * chartHeight;
        
        const x = x1 + (x2 - x1) * weekProgress;
        const y = y1 + (y2 - y1) * weekProgress;
        ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      
      // Draw current position dot
      if (currentWeekIndex < team.rankings.length) {
        let currentRank = team.rankings[currentWeekIndex];
        
        // Interpolate rank if between weeks
        if (currentWeekIndex < team.rankings.length - 1) {
          const nextRank = team.rankings[currentWeekIndex + 1];
          currentRank = currentRank + (nextRank - currentRank) * weekProgress;
        }
        
        const currentX = padding.left + ((currentWeek - 1) / (maxWeeks - 1)) * chartWidth;
        const currentY = padding.top + ((currentRank - 0.5) / 12) * chartHeight;
        
        // Draw dot
        ctx.beginPath();
        ctx.arc(currentX, currentY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = team.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw rank number inside dot
        ctx.fillStyle = '#fff';
        ctx.font = teamNameFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(currentRank), currentX, currentY);
        
        // Draw team name label next to the dot (following the dot)
        ctx.fillStyle = team.color;
        ctx.font = teamNameFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(team.owner, currentX + labelOffset, currentY);
      }
    });
  }

  showCanvas() {
    // Show canvas and hide animated message
    const canvas = document.getElementById('trend-chart');
    if (canvas) {
      canvas.style.display = 'block';
    }
    const messageEl = document.getElementById('animated-message');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }
}
