console.log("LOCALSETUP");
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});
const localSetupInit = {
  init() {
    this.githubUserToken = "githubAccessToken";
    this.OAuthClientID = "Ov23linj2ZwExyEwAfbn";
    this.OAuthClientSecret = "e5a9a311c22b4ed1615fc32072e44b0d33ef510b";
    this.githubAccessTokenURL = "https://github.com/login/oauth/access_token";
  },

  getGithubAccessCode(githubAccessCodeURL) {
    if (githubAccessCodeURL.match(/\?error=(.+)/)) {
      chrome.tabs.getCurrent(function (tab) {
        chrome.tabs.remove(tab.id, function () {});
      });
    } else {
      this.getGithubToken(githubAccessCodeURL.match(/\?code=([\w\/\-]+)/)[1]);
    }
  },

  getGithubToken(githubAccessCode) {
    const that = this;
    const formData = new FormData();
    formData.append("client_id", this.OAuthClientID);
    formData.append("client_secret", this.OAuthClientSecret);
    formData.append("code", githubAccessCode);

    const xhttp = new XMLHttpRequest();
    xhttp.addEventListener("readystatechange", function () {
      if (xhttp.readyState === 4) {
        if (xhttp.status === 200) {
          that.sendMessageLocalSetup(
            xhttp.responseText.match(/access_token=([^&]*)/)[1]
          );
        } else {
          chrome.runtime.sendMessage({
            removeCurrentTab: true,
            AuthenticationSuccessful: false,
          });
        }
      }
    });
    xhttp.open("POST", this.githubAccessTokenURL, true);
    xhttp.send(formData);
  },

  sendMessageLocalSetup(accessToken) {
    const githubUserAuthenticationURL = "https://api.github.com/user";

    const xhttp = new XMLHttpRequest();
    xhttp.addEventListener("readystatechange", function () {
      if (xhttp.readyState === 4) {
        if (xhttp.status === 200) {
          const githubUsername = JSON.parse(xhttp.responseText).login;
          chrome.runtime.sendMessage({
            removeCurrentTab: true,
            AuthenticationSuccessful: true,
            accessToken,
            githubUsername,
            KEY: this.githubUserToken,
          });
        }
      }
    });
    xhttp.open("GET", githubUserAuthenticationURL, true);
    xhttp.setRequestHeader("Authorization", `token ${accessToken}`);
    xhttp.send();
  },
};

localSetupInit.init();
const link = window.location.href;

if (window.location.host === "github.com") {
  chrome.storage.local.get("pipeFlag", (flag) => {
    console.log(flag);
    if (flag && flag.pipeFlag) {
      localSetupInit.getGithubAccessCode(link);
    }
  });
}
