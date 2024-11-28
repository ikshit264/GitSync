const getCodeScript = `
  var userSolution = ace.edit("ace-editor").getValue();
  var scriptInjectedElement = document.createElement("pre");
  scriptInjectedElement.innerText+=userSolution;
  scriptInjectedElement.setAttribute("id","extractedUserSolution");
  scriptInjectedElement.setAttribute("style","color:#fff");
  document.body.appendChild(scriptInjectedElement);
  console.log("Inside extract code  111111");

  `;

var extractCodeScript = document.createElement("script");
extractCodeScript.id = "extractCodeScript";
extractCodeScript.appendChild(document.createTextNode(getCodeScript));

(document.body || document.head || document.documentElement).appendChild(
  extractCodeScript
);

console.log("Inside extract code");

// // Function to retrieve user solution from the ACE editor
// function retrieveUserSolution() {
//   // Check if ACE is defined
//   if (typeof ace !== "undefined" && ace.edit("ace-editor")) {
//     // Attempt to retrieve the solution from the ACE editor
//     var userSolution = ace.edit("ace-editor").getValue();
//     if (userSolution) {
//       // Create an element to store the solution
//       var scriptInjectedElement = document.createElement("pre");
//       scriptInjectedElement.innerText += userSolution;
//       scriptInjectedElement.setAttribute("id", "extractedUserSolution");
//       scriptInjectedElement.setAttribute("style", "color:#fff");
//       document.body.appendChild(scriptInjectedElement);

//       console.log("insider script executed");
//       console.log("User solution: ", userSolution); // Log the solution for debugging

//       // Store the solution in chrome.storage
//       chrome.storage.local.set({ userSolution: userSolution }, function () {
//         console.log("Solution stored in chrome.storage.");
//       });
//     } else {
//       console.error("No solution found in the ACE editor.");
//     }
//   } else {
//     console.error("ACE editor is not loaded yet or not found.");
//   }
// }

// // Function to repeatedly check for the ACE editor and retrieve the solution
// function checkForAceEditor() {
//   const maxRetries = 20; // Set a maximum number of retries
//   let retries = 0;

//   const interval = setInterval(function () {
//     if (typeof ace !== "undefined" && ace.edit("ace-editor")) {
//       clearInterval(interval); // Stop polling if ACE is found
//       retrieveUserSolution(); // Retrieve the user solution
//     } else {
//       retries++;
//       console.log("Checking for ACE editor... Attempt:", retries);

//       if (retries >= maxRetries) {
//         clearInterval(interval); // Stop after max retries
//         console.error("ACE editor not found after multiple attempts.");
//       }
//     }
//   }, 500); // Check every 500 ms
// }

// // Start checking for the ACE editor
// checkForAceEditor();
