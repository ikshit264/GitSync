const startGitHubOAuthProcess = {
  
    init() {
      this.githubUserToken = 'githubAccessToken';
      this.OAuthClientID = 'Ov23linj2ZwExyEwAfbn'; 
      this.githubOAuthURL = 'https://github.com/login/oauth/authorize';
      this.githubRedirectURL = 'https://github.com/';
    },

    githubOAuth() {
      this.init(); 
  
      let url = `${this.githubOAuthURL}?client_id=${this.OAuthClientID}&redirect_uri${this.githubRedirectURL}&scope=repo`;
  
      chrome.storage.local.set({ pipeFlag: true }, () => {
        chrome.tabs.create({ url, active: true }, function () {
          window.close();
        });
      });
    },
  };