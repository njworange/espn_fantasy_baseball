export class Router {
  constructor(app) {
    this.app = app;
    this.currentTab = 'overview';
  }

  init() {
    // Setup tab click handlers
    const tabButtons = document.querySelectorAll('.fantasy-tab');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        this.navigate(tabId);
      });
    });
  }

  navigate(tabId) {
    console.log('Navigating to tab:', tabId);
    
    // Update active tab button
    document.querySelectorAll('.fantasy-tab').forEach(btn => {
      btn.classList.remove('active');
    });
    const tabButton = document.querySelector(`.fantasy-tab[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.classList.add('active');
    } else {
      console.error('Tab button not found:', tabId);
      return;
    }

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
      tabContent.classList.add('active');
    } else {
      console.error('Tab content not found:', tabId);
      return;
    }

    // Render the view
    this.currentTab = tabId;
    console.log('Views available:', Object.keys(this.app.views));
    if (this.app.views[tabId]) {
      console.log('Rendering view:', tabId);
      this.app.views[tabId].render();
    } else {
      console.error('View not found for tab:', tabId);
    }
  }
}