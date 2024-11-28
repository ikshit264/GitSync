chrome.storage.local.set({
  'darkmodeFlag': 0
});
// alert("Inside background.js");

chrome.runtime.onMessage.addListener(
  function(request, sender,sendResponse) {
    console.log("Listener invoked");
    
    if (request.type === 'getUserSolution') {
      console.log("get user solution request received");
      chrome.scripting.executeScript({
        target: {tabId: sender.tab.id},
        files: ['scripts/extractCode.js'],
        world: 'MAIN',
      });
      sendResponse({status: true});
    }

    if ( request.type === 'deleteNode' ) {
      console.log("Deleting node request received");
      
      chrome.scripting.executeScript({
        target: {tabId: sender.tab.id},
        files: ['scripts/nodeDeletion.js'],
        world: 'MAIN',
      });
      sendResponse({status: true});
    }

    if (request && request.removeCurrentTab === true && request.AuthenticationSuccessful === true) {
      chrome.storage.local.set({ githubUsername: request.githubUsername }, () => {});
      chrome.storage.local.set({ githubAccessToken: request.accessToken }, () => {});
      chrome.storage.local.set({ pipeFlag: false }, () => {});
      const indexURL = chrome.runtime.getURL('index.html');
      chrome.tabs.create({ url: indexURL, active: true });
    }

    else if (request && request.removeCurrentTab === true && request.AuthenticationSuccessful === false) {
      alert('Couldn\'t Authenticate your GitHub Account. Please try again later!');
    }
  }
);