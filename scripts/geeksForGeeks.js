const codeLanguage = {
  C: ".c",
  "C++": ".cpp",
  "C#": ".cs",
  Java: ".java",
  Python: ".py",
  Python3: ".py",
  JavaScript: ".js",
  Javascript: ".js",
};
let uploadState = {
  uploading: false,
};
let successfulSubmissionFlag = true;
let difficulty = "";

// const uploadToGitHubRepository = (
//   githubAccessToken,
//   linkedRepository,
//   solution,
//   problemTitle,
//   uploadFileName,
//   sha,
//   commitMessage,
//   problemDifficulty
// ) => {
//   const uploadPathURL = `https://api.github.com/repos/${linkedRepository}/contents/${problemDifficulty}/${problemTitle}/${uploadFileName}`;

//   let uploadData = {
//     message: commitMessage,
//     content: solution,
//     sha,
//   };

//   uploadData = JSON.stringify(uploadData);

//   const xhttp = new XMLHttpRequest();
//   xhttp.addEventListener("readystatechange", function () {
//     if (xhttp.readyState === 4) {
//       if (xhttp.status === 200 || xhttp.status === 201) {
//         const updatedSha = JSON.parse(xhttp.responseText).content.sha;

//         chrome.storage.local.get("userStatistics", (statistics) => {
//           let { userStatistics } = statistics;
//           if (userStatistics === null || userStatistics === undefined) {
//             userStatistics = {};
//             userStatistics.solved = 0;
//             userStatistics.easy = 0;
//             userStatistics.medium = 0;
//             userStatistics.hard = 0;
//             userStatistics.sha = {};
//           }
//           const githubFilePath = problemTitle + uploadFileName;

//           if (uploadFileName === "README.md" && sha === null) {
//             userStatistics.solved += 1;
//             console.log(difficulty);
//             userStatistics.easy += difficulty === "Difficulty: Easy" ? 1 : 0;
//             userStatistics.medium +=
//               difficulty === "Difficulty: Medium" ? 1 : 0;
//             userStatistics.hard += difficulty === "Difficulty: Hard" ? 1 : 0;
//           }
//           userStatistics.sha[githubFilePath] = updatedSha;
//           chrome.storage.local.set({ userStatistics }, () => {
//             uploadState.uploading = false;
//             console.log(`${uploadFileName} - Commit Successful`);
//           });
//         });
//       }
//     }
//   });
//   xhttp.open("PUT", uploadPathURL, true);
//   xhttp.setRequestHeader("Authorization", `token ${githubAccessToken}`);
//   xhttp.setRequestHeader("Accept", "application/vnd.github.v3+json");
//   xhttp.send(uploadData);
// };

const uploadToGitHubRepository = (
  githubAccessToken,
  linkedRepository,
  solution,
  problemTitle,
  uploadFileName,
  sha,
  commitMessage,
  problemDifficulty
) => {
  const uploadPathURL = `https://api.github.com/repos/${linkedRepository}/contents/${problemDifficulty}/${problemTitle}/${uploadFileName}`;

  let uploadData = {
    message: commitMessage,
    content: solution,
  };

  // If sha is provided, it means the file already exists and we're updating it
  if (sha) {
    uploadData.sha = sha;
  }

  uploadData = JSON.stringify(uploadData);

  const xhttp = new XMLHttpRequest();
  xhttp.addEventListener("readystatechange", function () {
    if (xhttp.readyState === 4) {
      if (xhttp.status === 200 || xhttp.status === 201) {
        const updatedSha = JSON.parse(xhttp.responseText).content.sha;

        chrome.storage.local.get("userStatistics", (statistics) => {
          let { userStatistics } = statistics;
          if (userStatistics === null || userStatistics === undefined) {
            userStatistics = {
              solved: 0,
              easy: 0,
              medium: 0,
              hard: 0,
              sha: {},
            };
          }
          const githubFilePath = `${problemTitle}/${uploadFileName}`;

          if (uploadFileName === "README.md" && !sha) {
            userStatistics.solved += 1;
            userStatistics[problemDifficulty.toLowerCase()] += 1;
          }
          userStatistics.sha[githubFilePath] = updatedSha;
          chrome.storage.local.set({ userStatistics }, () => {
            uploadState.uploading = false;
            console.log(`${uploadFileName} - Commit Successful`);
          });
        });
      } else if (xhttp.status === 409) {
        // Conflict error, file has been modified
        console.log(
          "Conflict detected. Fetching latest version and retrying..."
        );
        fetchLatestSha(
          githubAccessToken,
          linkedRepository,
          problemDifficulty,
          problemTitle,
          uploadFileName,
          (latestSha) => {
            uploadToGitHubRepository(
              githubAccessToken,
              linkedRepository,
              solution,
              problemTitle,
              uploadFileName,
              latestSha,
              commitMessage,
              problemDifficulty
            );
          }
        );
      } else {
        console.error("Upload failed:", xhttp.status, xhttp.statusText);
        uploadState.uploading = false;
      }
    }
  });
  xhttp.open("PUT", uploadPathURL, true);
  xhttp.setRequestHeader("Authorization", `token ${githubAccessToken}`);
  xhttp.setRequestHeader("Accept", "application/vnd.github.v3+json");
  xhttp.send(uploadData);
};

const fetchLatestSha = (
  githubAccessToken,
  linkedRepository,
  problemDifficulty,
  problemTitle,
  uploadFileName,
  callback
) => {
  const fileURL = `https://api.github.com/repos/${linkedRepository}/contents/${problemDifficulty}/${problemTitle}/${uploadFileName}`;

  const xhttp = new XMLHttpRequest();
  xhttp.addEventListener("readystatechange", function () {
    if (xhttp.readyState === 4) {
      if (xhttp.status === 200) {
        const fileInfo = JSON.parse(xhttp.responseText);
        callback(fileInfo.sha);
      } else {
        console.error(
          "Failed to fetch latest SHA:",
          xhttp.status,
          xhttp.statusText
        );
        callback(null);
      }
    }
  });
  xhttp.open("GET", fileURL, true);
  xhttp.setRequestHeader("Authorization", `token ${githubAccessToken}`);
  xhttp.setRequestHeader("Accept", "application/vnd.github.v3+json");
  xhttp.send();
};

function uploadGitHub(
  solution,
  problemName,
  uploadFileName,
  commitMessage,
  problemDifficulty = undefined
) {
  if (problemDifficulty && problemDifficulty !== undefined) {
    difficulty = problemDifficulty.trim();
    console.log(difficulty);
  }

  chrome.storage.local.get("githubAccessToken", (access_token) => {
    const accessToken = access_token.githubAccessToken;
    if (accessToken) {
      chrome.storage.local.get("current_phase", (phase) => {
        const currentPhase = phase.current_phase;
        if (currentPhase === "solve_and_push") {
          chrome.storage.local.get("github_LinkedRepository", (linkedRepo) => {
            const linkedRepository = linkedRepo.github_LinkedRepository;
            if (linkedRepository) {
              const githubFilePath = problemName + uploadFileName;
              chrome.storage.local.get("userStatistics", (statistics) => {
                const { userStatistics } = statistics;
                let sha = null;

                if (
                  userStatistics !== undefined &&
                  userStatistics.sha !== undefined &&
                  userStatistics.sha[githubFilePath] !== undefined
                ) {
                  sha = userStatistics.sha[githubFilePath];
                }
                uploadToGitHubRepository(
                  accessToken,
                  linkedRepository,
                  solution,
                  problemName,
                  uploadFileName,
                  sha,
                  commitMessage,
                  difficulty
                );
              });
            }
          });
        }
      });
    }
  });
}

const convertToKebabCase = (uploadFileName) => {
  return uploadFileName
    .replace(/[^a-zA-Z0-9\. ]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};

function getSolutionLanguage() {
  const languageElement =
    document.getElementsByClassName("divider text")[0].innerText;
  const lang = languageElement.split("(")[0].trim();
  if (lang.length > 0 && codeLanguage[lang]) {
    return codeLanguage[lang];
  }
  return null;
}

function getProblemTitle() {
  const problemTitleElement = document.querySelector(
    '[class^="problems_header_content__title"] > h3'
  ).innerText;
  if (problemTitleElement != null) {
    return problemTitleElement;
  }
  return "";
}

function getProblemDifficulty() {
  const problemDifficultyElement = document.querySelectorAll(
    '[class^="problems_header_description"]'
  )[0].children[0].innerText;
  if (problemDifficultyElement != null) {
    return problemDifficultyElement;
  }
  return "";
}

function getProblemStatement() {
  const problemStatementElement = document.querySelector(
    '[class^="problems_problem_content"]'
  );
  return `${problemStatementElement.outerHTML}`;
}

function getCompanyAndTopicTags(problemStatement) {
  let tagHeading = document.querySelectorAll(".problems_tag_container__kWANg");
  let tagContent = document.querySelectorAll(".content");

  for (let i = 0; i < tagHeading.length; i++) {
    if (tagHeading[i].innerText === "Company Tags") {
      tagContent[i].classList.add("active");
      problemStatement = problemStatement.concat(
        "<p><span style=font-size:18px><strong>Company Tags : </strong><br>"
      );
      let numOfTags = tagContent[i].childNodes[0].children.length;
      for (let j = 0; j < numOfTags; j++) {
        if (tagContent[i].childNodes[0].children[j].innerText !== null) {
          const company = tagContent[i].childNodes[0].children[j].innerText;
          problemStatement = problemStatement.concat(
            "<code>" + company + "</code>&nbsp;"
          );
        }
      }
      tagContent[i].classList.remove("active");
    } else if (tagHeading[i].innerText === "Topic Tags") {
      tagContent[i].classList.add("active");
      problemStatement = problemStatement.concat(
        "<br><p><span style=font-size:18px><strong>Topic Tags : </strong><br>"
      );
      let numOfTags = tagContent[i].childNodes[0].children.length;
      for (let j = 0; j < numOfTags; j++) {
        if (tagContent[i].childNodes[0].children[j].innerText !== null) {
          const company = tagContent[i].childNodes[0].children[j].innerText;
          problemStatement = problemStatement.concat(
            "<code>" + company + "</code>&nbsp;"
          );
        }
      }
      tagContent[i].classList.remove("active");
    }
  }
  return problemStatement;
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});

if (window.location.href.includes("leetcode.com/")) {
  /* Constants used through out the code */
  const constant = {
    elementTags: {
      problemStatsTag: "mt-3",
      percentileStatsTag: "mt-2",
      difficulty: {
        easy: ".text-olive" /* .text-olive is for easy problem */,
        medium: ".text-yellow" /* .text-yellow is for medium problem */,
        hard: ".text-pink" /* .text-pink is for hard problem */,
      },
      submitButtonTag: '[data-e2e-locator="console-submit-button"]',
      successTag: 'span[data-e2e-locator="submission-result"]',
    },
    regex: {
      percentageRegex: /(\d+(\.\d+)?%)/,
    },
    url: {
      apiURL: "https://leetcode.com/graphql",
      payload: {
        getAllSubmissions: `query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!, $lang: Int, $status: Int) {
        questionSubmissionList(
        offset: $offset
        limit: $limit
        lastKey: $lastKey
        questionSlug: $questionSlug
        lang: $lang
        status: $status
        ) {
          lastKey
          hasNext
          submissions {
            id
            title
            titleSlug
            status
            statusDisplay
            lang
            langName
            runtime
            timestamp
            url
            isPending
            memory
            hasNotes
            notes
          }
      }
      }`,
        getSubmission: `query submissionDetails($submissionId: Int!) {
        submissionDetails(submissionId: $submissionId) {
          runtime
          runtimeDisplay
          runtimePercentile
          runtimeDistribution
          memory
          memoryDisplay
          memoryPercentile
          memoryDistribution
          code
          timestamp
          statusCode
          user {
            username
            profile {
              realName
              userAvatar
            }
          }
          lang {
            name
            verboseName
          }
          question {
            questionId
            acRate
            difficulty
            freqBar
            frontendQuestionId: questionFrontendId
            isFavor
            paidOnly: isPaidOnly
            content
            status
            title
            titleSlug
            topicTags {
              name
              id
              slug
            }
            hasSolution
            hasVideoSolution
          }
          notes
          topicTags {
            tagId
            slug
            name
          }
          runtimeError
          compileError
          lastTestcase
        }
      }`,
        getQuestionTitle: `query consolePanelConfig($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          questionTitle
          enableDebugger
          enableRunCode
          enableSubmit
          enableTestMode
          exampleTestcaseList
          metaData
        }
      }`,
        getProblemStatement: `query questionContent($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          content
          mysqlSchemas
          dataSchemas
        }
      }`,
      },
    },
    languages: {
      Python: ".py",
      Python3: ".py",
      "C++": ".cpp",
      C: ".c",
      Java: ".java",
      "C#": ".cs",
      JavaScript: ".js",
      Javascript: ".js",
      Ruby: ".rb",
      Swift: ".swift",
      Go: ".go",
      Kotlin: ".kt",
      Scala: ".scala",
      Rust: ".rs",
      PHP: ".php",
      TypeScript: ".ts",
      MySQL: ".sql",
      "MS SQL Server": ".sql",
      Oracle: ".sql",
    },
  };

  /* Commit messages */
  const readmeMsg = "Create README - LeetHub";
  const discussionMsg = "Prepend discussion post - LeetHub";
  const createNotesMsg = "Attach NOTES - LeetHub";

  /* problem types */
  const NORMAL_PROBLEM = 0;
  const EXPLORE_SECTION_PROBLEM = 1;

  /* Difficulty of most recenty submitted question */

  /* state of upload for progress */

  /* ------------------------------------------------ UTILITIES------------------------------------------------------ */

  /* Util function to check if an element exists */
  function checkElem(elem) {
    return elem && elem.length > 0;
  }

  function convertToSlug(string) {
    const a =
      "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
    const b =
      "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------";
    const p = new RegExp(a.split("").join("|"), "g");

    return string
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, "-and-") // Replace & with 'and'
      .replace(/[^\w\-]+/g, "") // Remove all non-word characters
      .replace(/\-\-+/g, "-") // Replace multiple - with single -
      .replace(/^-+/, "") // Trim - from start of text
      .replace(/-+$/, ""); // Trim - from end of text
  }

  function addLeadingZeros(title) {
    const maxTitlePrefixLength = 4;
    var len = title.split("-")[0].length;
    if (len < maxTitlePrefixLength) {
      return "0".repeat(4 - len) + title;
    }
    return title;
  }

  /* inject css style required for the upload progress feature */
  function injectStyle() {
    const style = document.createElement("style");
    style.textContent =
      ".leethub_progress {pointer-events: none;width: 2.0em;height: 2.0em;border: 0.4em solid transparent;border-color: #eee;border-top-color: #3E67EC;border-radius: 50%;animation: loadingspin 1s linear infinite;} @keyframes loadingspin { 100% { transform: rotate(360deg) }}";
    document.head.append(style);
  }

  /* This will create a failed tick mark before "Run Code" button signalling that upload failed */
  function markUploadFailed() {
    elem = document.getElementById("leethub_progress_elem");
    if (elem) {
      elem.className = "";
      style =
        "display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid red;border-right:7px solid red;";
      elem.style = style;
    }
    console.log("UPLOAD FAILED");
  }

  /* Main parser function for the code */
  function parseCode() {
    const e = document.getElementsByClassName("CodeMirror-code");
    if (e !== undefined && e.length > 0) {
      const elem = e[0];
      let parsedCode = "";
      const textArr = elem.innerText.split("\n");
      for (let i = 1; i < textArr.length; i += 2) {
        parsedCode += `${textArr[i]}\n`;
      }
      return parsedCode;
    }
    return null;
  }

  /* ----------------------------------------- GIT FUNCTIONS ------------------------------------------------------------ */

  /* we will need specific anchor element that is specific to the page you are in Eg. Explore */
  function insertToAnchorElement(elem) {
    if (document.URL.startsWith("https://leetcode.com/explore/")) {
      // means we are in explore page
      action = document.getElementsByClassName("action");
      if (
        checkElem(action) &&
        checkElem(action[0].getElementsByClassName("row")) &&
        checkElem(
          action[0]
            .getElementsByClassName("row")[0]
            .getElementsByClassName("col-sm-6")
        ) &&
        action[0]
          .getElementsByClassName("row")[0]
          .getElementsByClassName("col-sm-6").length > 1
      ) {
        target = action[0]
          .getElementsByClassName("row")[0]
          .getElementsByClassName("col-sm-6")[1];
        elem.className = "pull-left";
        if (target.childNodes.length > 0) target.childNodes[0].prepend(elem);
      }
    } else {
      if (checkElem(document.getElementsByClassName("action__38Xc"))) {
        target = document.getElementsByClassName("action__38Xc")[0];
        elem.className = "runcode-wrapper__8rXm";
        if (target.childNodes.length > 0) target.childNodes[0].prepend(elem);
      }
    }
  }

  /* Since we dont yet have callbacks/promises that helps to find out if things went bad */
  /* we will start 10 seconds counter and even after that upload is not complete, then we conclude its failed */
  function startUploadCountDown() {
    uploadState.uploading = true;
    uploadState["countdown"] = setTimeout(() => {
      if (uploadState.uploading === true) {
        // still uploading, then it failed
        uploadState.uploading = false;
        markUploadFailed();
      }
      console.log("HELLO WORLD");
    }, 10000);
  }

  /* start upload will inject a spinner on left side to the "Run Code" button */
  function startUpload() {
    try {
      elem = document.getElementById("leethub_progress_anchor_element");
      if (!elem) {
        elem = document.createElement("span");
        elem.id = "leethub_progress_anchor_element";
        elem.style = "margin-right: 20px;padding-top: 2px;";
      }
      elem.innerHTML = `<div id="leethub_progress_elem" class="leethub_progress"></div>`;
      target = insertToAnchorElement(elem);
      // start the countdown
      startUploadCountDown();
    } catch (error) {
      console.log(error);
    }
  }

  /* Helper function to check if a file already exists in the directory */
  function checkFileExists(token, hook, directory, filename, cb) {
    const URL = `https://api.github.com/repos/${hook}/contents/${directory}/${filename}`;
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("readystatechange", function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // File exists, get the SHA of the existing file
          const response = JSON.parse(xhr.responseText);
          const sha = response.sha;
          cb(true, sha);
        } else if (xhr.status === 404) {
          // File doesn't exist
          cb(false, null);
        } else {
          // Error occurred
          cb(false, null);
        }
      }
    });

    xhr.open("GET", URL, true);
    xhr.setRequestHeader("Authorization", `token ${token}`);
    xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
    xhr.send();
  }

  /* Main function for uploading code to GitHub repo, and callback cb is called if success */
  const upload = (
    token,
    hook,
    code,
    directory,
    filename,
    msg,
    cb = undefined
  ) => {
    checkFileExists(token, hook, directory, filename, (fileExists, sha) => {
      // Define Payload
      let data = {
        message: msg,
        content: code,
      };

      // If file exists, update the data with the SHA of the existing file
      if (fileExists && sha) {
        data.sha = sha;
      }

      data = JSON.stringify(data);

      const URL = `https://api.github.com/repos/${hook}/contents/${directory}/${filename}`;

      const xhr = new XMLHttpRequest();
      xhr.addEventListener("readystatechange", function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            const updatedSha = response.content.sha; // Get updated SHA.

            if (filename === "README.md" && sha === null) {
              // If it's the README and sha is null, it means it's a new problem, so update stats
              chrome.storage.local.get("stats", (data2) => {
                let { stats } = data2;
                if (stats === null || stats === undefined) {
                  stats = {};
                  stats.solved = 0;
                  stats.easy = 0;
                  stats.medium = 0;
                  stats.hard = 0;
                  stats.sha = {};
                }
                const filePath = `${directory}/${filename}`;
                stats.solved += 1;
                stats.easy += difficulty === "Difficulty: Easy" ? 1 : 0;
                stats.medium += difficulty === "Difficulty: Medium" ? 1 : 0;
                stats.hard += difficulty === "Difficulty: Hard" ? 1 : 0;
                stats.sha[filePath] = updatedSha; // update sha key.
                console.log("IN UPLOAD FUNCTION");
                chrome.storage.local.set({ stats }, () => {
                  console.log(`Successfully committed ${filename} to GitHub`);

                  // If callback is defined, call it
                  if (cb !== undefined) {
                    cb();
                  }
                });
              });
            } else {
              // For other files, simply update the stats
              const filePath = `${directory}/${filename}`;
              chrome.storage.local.get("stats", (data2) => {
                let { stats } = data2;
                if (stats !== null && stats !== undefined) {
                  stats.sha[filePath] = updatedSha; // update sha key.
                  chrome.storage.local.set({ stats });
                }
              });

              console.log(`Successfully committed ${filename} to GitHub`);

              // If callback is defined, call it
              if (cb !== undefined) {
                cb();
              }
            }
          }
        }
      });

      xhr.open("PUT", URL, true);
      xhr.setRequestHeader("Authorization", `token ${token}`);
      xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
      xhr.send(data);
    });
  };

  /* Main function for updating code on GitHub Repo */
  /* Currently only used for prepending discussion posts to README */
  /* callback cb is called on success if it is defined */
  const update = (
    token,
    hook,
    addition,
    directory,
    msg,
    prepend,
    cb = undefined
  ) => {
    const URL = `https://api.github.com/repos/${hook}/contents/${directory}/README.md`;

    /* Read from existing file on GitHub */
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("readystatechange", function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          const existingContent = atob(response.content);

          let newContent = "";

          /* Discussion posts prepended at top of README */
          /* Future implementations may require appending to bottom of file */
          if (prepend) {
            newContent = btoa(addition + existingContent);
          }

          /* Write file with new content to GitHub */
          upload(
            token,
            hook,
            newContent,
            directory,
            "README.md",
            response.sha,
            msg,
            cb
          );
        }
      }
    });
    xhr.open("GET", URL, true);
    xhr.setRequestHeader("Authorization", `token ${token}`);
    xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
    xhr.send();
  };

  function uploadGit(
    code,
    problemNameSlug,
    fileName,
    msg,
    action,
    prepend = true,
    cb = undefined,
    _diff = undefined
  ) {
    // Assign difficulty
    if (_diff && _diff !== undefined) {
      difficulty = _diff.trim();
    }

    /* Get necessary payload data */
    // chrome.storage.local.get("leethub_token", (t) => {
    //   const token = t.leethub_token;
    //   if (token) {
    //     chrome.storage.local.get("mode_type", (m) => {
    //       const mode = m.mode_type;
    //       if (mode === "commit") {
    //         /* Get hook */
    //         chrome.storage.local.get("leethub_hook", (h) => {
    //           const hook = h.leethub_hook;
    //           if (hook) {
    //             if (action === "upload") {
    //               upload(token, hook, code, problemNameSlug, fileName, msg, cb);
    //             } else if (action === "update") {
    //               update(token, hook, code, problemNameSlug, msg, prepend, cb);
    //             }
    //           }
    //         });
    //       }
    //     });
    //   }
    // });
    console.log({ difficulty });
    uploadGitHub(code, problemNameSlug, fileName, msg, difficulty);
  }

  /* This will create a tick mark before "Run Code" button signalling LeetHub has done its job */
  function markUploaded() {
    elem = document.getElementById("leethub_progress_elem");
    if (elem) {
      elem.className = "";
      style =
        "display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid #78b13f;border-right:7px solid #78b13f;";
      elem.style = style;
    }
  }

  /* ------------------------------------------------ LEETCODE WEB PAGE PARSING FUNCTIONS ------------------------------------------------------ */

  /* Function for finding and parsing the full code. */
  function findCode(
    uploadGit,
    problemStatement,
    problemNameSlug,
    fileName,
    action,
    cb = undefined
  ) {
    const currentURL = window.location.href;
    const questionSlug = currentURL.split("/")[4];
    const variables = {
      questionSlug: questionSlug,
      limit: 20,
      offset: 0,
      lastKey: null,
      status: 10,
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: constant.url.payload.getAllSubmissions,
        variables: variables,
      }),
    };

    /* Fetching submission ID from graphql query to fetch code of the submission */
    fetch(constant.url.apiURL, requestOptions)
      .then((response) => response.json())
      .then((submissions) => {
        if (!submissions) return;

        const submissionId =
          submissions.data.questionSubmissionList.submissions[0].id;

        const variables = {
          submissionId: submissionId,
        };

        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: constant.url.payload.getSubmission,
            variables: variables,
          }),
        };

        /* Fetching code based on the submission id extracted from the above request */
        fetch(constant.url.apiURL, requestOptions)
          .then((response) => response.json())
          .then((submission) => {
            let code = submission.data.submissionDetails.code;
            let diffi = submission.data.submissionDetails.question.difficulty;

            // Find language extension of the submission
            let languageExtension =
              constant.languages[
                submission.data.submissionDetails.lang.verboseName
              ];

            code = code.replace(/\\u[\dA-F]{4}/gi, function (match) {
              return String.fromCharCode(
                parseInt(match.replace(/\\u/g, ""), 16)
              );
            });

            const timePercentile = parseFloat(
              submission.data.submissionDetails.runtimePercentile
            ).toFixed(2);
            const time = submission.data.submissionDetails.runtimeDisplay;
            const space = submission.data.submissionDetails.memory;
            const spacePercentile = parseFloat(
              submission.data.submissionDetails.memoryPercentile
            ).toFixed(2);

            const msg = formatStats(
              time,
              timePercentile,
              space,
              spacePercentile
            );

            if (code != null) {
              setTimeout(function () {
                uploadGit(
                  btoa(code),
                  problemNameSlug,
                  fileName + languageExtension,
                  msg,
                  action,
                  true,
                  cb,
                  diffi
                );
                uploadGit(
                  btoa(problemStatement),
                  problemNameSlug,
                  "README.md",
                  readmeMsg,
                  "upload",
                  true,
                  cb,
                  diffi
                );
              }, 5000);
            }
          });
      });
  }

  /* Function for parsing the difficulty level of the problem. */
  function parseProblemDifficulty() {
    let difficulty = null;

    const difficultySelectors = [
      constant.elementTags.difficulty.easy,
      constant.elementTags.difficulty.medium,
      constant.elementTags.difficulty.hard,
    ];

    const selectedElement = document.querySelector(
      difficultySelectors.join(", ")
    );

    if (selectedElement) {
      difficulty = selectedElement.innerText;
    }
    return difficulty;
  }

  /* Parser function for the question and tags */
  function parseQuestion() {
    const currentURL = window.location.href;
    const titleSlug = currentURL.split("/")[4];
    const variables = {
      titleSlug: titleSlug,
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: constant.url.payload.getProblemStatement,
        variables: variables,
      }),
    };

    /* Fetching question title and question id from graphql query to fetch problem statement */
    return new Promise((resolve, reject) => {
      fetch(constant.url.apiURL, requestOptions)
        .then((response) => response.json())
        .then((questionData) => {
          const problemStatement = questionData.data.question.content;
          resolve(problemStatement);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /* Formatter function for time/space stats */
  function formatStats(time, timePercentile, space, spacePercentile) {
    // Format commit message
    return `Time: ${time} (${timePercentile}%), Space: ${space} (${spacePercentile}%) - LeetHub`;
  }

  function getProblemNameSlug() {
    const currentURL = window.location.href;
    const titleSlug = currentURL.split("/")[4];
    const variables = {
      titleSlug: titleSlug,
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: constant.url.payload.getQuestionTitle,
        variables: variables,
      }),
    };

    /* Fetching question title and question id from graphql query to fetch problem statement */
    return new Promise((resolve, reject) => {
      fetch(constant.url.apiURL, requestOptions)
        .then((response) => response.json())
        .then((questionData) => {
          const problemName =
            questionData.data.question.questionId +
            ". " +
            questionData.data.question.questionTitle;
          const problemNameSlug = addLeadingZeros(convertToSlug(problemName));
          resolve({ problemName, problemNameSlug });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  function parserFunction() {
    return new Promise((resolve, reject) => {
      setTimeout(function () {
        // Get the current URL
        currentURL = window.location.href;

        // Get the current URL
        if (!currentURL.endsWith("/description/")) {
          try {
            // Checking if code has been accepted or not
            successTag = document.querySelector(
              constant.elementTags.successTag
            ).textContent;

            if (checkElem(successTag) && successTag === "Accepted") {
              problemType = NORMAL_PROBLEM;

              // Get problem name and slug
              getProblemNameSlug().then(({ problemName, problemNameSlug }) => {
                // Parse the problem statement
                parseQuestion().then((problemStatement) => {
                  const questionUrl = currentURL.substring(
                    0,
                    currentURL.indexOf("/submissions/")
                  );

                  // Modify the problem statement to include a link to the question
                  problemStatement =
                    `<h2><a href="${questionUrl}">${problemName}</a></h2>` +
                    problemStatement;

                  console.log({
                    problemStatement,
                    problemNameSlug,
                    problemName,
                  });

                  // Check if all required data is available
                  if (problemStatement && problemNameSlug && problemName) {
                    startUpload();

                    findCode(
                      uploadGit,
                      problemStatement,
                      problemNameSlug,
                      problemNameSlug,
                      "upload",
                      // Callback is called when the code upload to Git is successful
                      () => {
                        if (uploadState["countdown"]) {
                          clearTimeout(uploadState["countdown"]);
                        }
                        delete uploadState["countdown"];
                        uploadState.uploading = false;
                        markUploaded();
                      }
                    );
                  }
                });
              });
            }
          } catch (err) {
            console.error(err);
          }
        }
      }, 5000);
    });
  }

  /* Interval function to check if code has been submitted */
  function loaderFunction() {
    try {
      const submitButton = document.querySelector(
        constant.elementTags.submitButtonTag
      );

      if (!flag) {
        submitButton.addEventListener("click", function () {
          clearInterval(loaderInterval);
          successTag = null;
          parserFunction()
            .then(() => {
              loaderInterval = setInterval(loaderFunction, 1000);
            })
            .catch((error) => {
              console.error(error);
            });
        });
        flag = true;
      }
    } catch (err) {
      console.error(err);
    }
  }

  let flag = false;
  let successTag = null;
  let problemType;
  let problemStats;

  let loaderInterval = setInterval(loaderFunction, 1000);

  /* Sync to local storage */
  chrome.storage.local.get("isSync", (data) => {
    console.log({ data });
    keys = [
      "leethub_token",
      "leethub_username",
      "pipe_leethub",
      "stats",
      "leethub_hook",
      "mode_type",
    ];
    if (!data || !data.isSync) {
      keys.forEach((key) => {
        chrome.storage.sync.get(key, (data) => {
          chrome.storage.local.set({
            [key]: data[key],
          });
        });
      });
      chrome.storage.local.set(
        {
          isSync: true,
        },
        (data) => {
          console.log("LeetHub Synced to local values");
        }
      );
    } else {
      console.log("LeetHub Local storage already synced!!!!!!");
    }
  });

  /* inject the style */
  injectStyle();
}

const loader = setInterval(() => {
  let problemTitle = null;
  let problemStatement = null;
  let problemDifficulty = null;
  let solutionLanguage = null;
  let solution = null;

  if (
    window.location.href.includes("www.geeksforgeeks.org/problems") ||
    window.location.href.includes("practice.geeksforgeeks.org/problems")
  ) {
    const gfgSubmitButton = document.querySelector(
      '[class^="ui button problems_submit_button"]'
    );

    gfgSubmitButton.addEventListener("click", function () {
      document.querySelector(".problems_header_menu__items__BUrou").click();
      successfulSubmissionFlag = true;

      const submissionLoader = setInterval(() => {
        const submissionResult = document.querySelectorAll(
          '[class^="problems_content"]'
        )[0].innerText;
        if (
          submissionResult.includes("Problem Solved Successfully") &&
          successfulSubmissionFlag
        ) {
          successfulSubmissionFlag = false;
          clearInterval(loader);
          clearInterval(submissionLoader);
          document.querySelector(".problems_header_menu__items__BUrou").click();
          problemTitle = getProblemTitle().trim();
          problemDifficulty = getProblemDifficulty();
          problemStatement = getProblemStatement();
          solutionLanguage = getSolutionLanguage();
          console.log("Initialised Upload Variables");

          const probName = `${problemTitle}`;
          var questionUrl = window.location.href;
          problemStatement = `<h2><a href="${questionUrl}">${problemTitle}</a></h2><h3>Difficulty Level : ${problemDifficulty}</h3><hr>${problemStatement}`;
          problemStatement = getCompanyAndTopicTags(problemStatement);

          if (solutionLanguage !== null) {
            chrome.storage.local.get("userStatistics", (statistics) => {
              const { userStatistics } = statistics;
              const githubFilePath =
                probName + convertToKebabCase(problemTitle + solutionLanguage);
              let sha = null;
              if (
                userStatistics !== undefined &&
                userStatistics.sha !== undefined &&
                userStatistics.sha[githubFilePath] !== undefined
              ) {
                sha = userStatistics.sha[githubFilePath];
              }
              // if (sha === null) {
              //   uploadGitHub(
              //     btoa(unescape(encodeURIComponent(problemStatement))),
              //     probName,
              //     "README.md",
              //     "Create README - GfG to GitHub",
              //     problemDifficulty
              //   );
              // }

              chrome.runtime.sendMessage(
                { type: "getUserSolution" },
                function (res) {
                  console.log("getUserSolution - Message Sent.");
                  setTimeout(function () {
                    solution = document.getElementById(
                      "extractedUserSolution"
                    ).innerText;

                    console.log(solution);

                    if (solution !== "") {
                      setTimeout(function () {
                        if (sha === null) {
                          uploadGitHub(
                            btoa(unescape(encodeURIComponent(solution))),
                            probName,
                            convertToKebabCase(problemTitle + solutionLanguage),
                            "Added Solution - GfG to GitHub",
                            problemDifficulty
                          );
                        } else {
                          uploadGitHub(
                            btoa(unescape(encodeURIComponent(solution))),
                            probName,
                            convertToKebabCase(problemTitle + solutionLanguage),
                            "Updated Solution - GfG to GitHub",
                            problemDifficulty
                          );
                        }
                      }, 1000);
                    }
                    chrome.runtime.sendMessage(
                      { type: "deleteNode" },
                      function () {
                        console.log("deleteNode - Message Sent.");
                      }
                    );
                  }, 1000);
                }
              );
              if (sha === null) {
                uploadGitHub(
                  btoa(unescape(encodeURIComponent(problemStatement))),
                  probName,
                  "README.md",
                  "Create README - GfG to GitHub",
                  problemDifficulty
                );
              }
            });
          }
        } else if (submissionResult.includes("Compilation Error")) {
          clearInterval(submissionLoader);
        } else if (
          !successfulSubmissionFlag &&
          (submissionResult.includes("Compilation Error") ||
            submissionResult.includes("Correct Answer"))
        ) {
          clearInterval(submissionLoader);
        }
      }, 1000);
    });
  }
}, 1000);

// todo codechef solution

document.addEventListener("DOMContentLoaded", () => {
  const loader1 = setInterval(() => {
    let username = null;
    let submissionId = null;
    let problemCode = null;
    let language = null;
    let solutionCode = null;
    let contestCode = null;
    let successfulSubmissionFlag = false;

    console.log("Outside CodeChef Submission Loader");

    if (window.location.href.includes("codechef.com")) {
      const submitButton = document.getElementById("submit_btn");

      if (submitButton) {
        submitButton.addEventListener("click", function () {
          successfulSubmissionFlag = true;

          const submissionLoader = setInterval(async () => {
            if (successfulSubmissionFlag) {
              console.log("Inside CodeChef Submission Loader");

              submissionId = getSubmissionId();
              if (submissionId) {
                console.log("Submission ID: ", submissionId);
                clearInterval(loader1);
                clearInterval(submissionLoader);
                successfulSubmissionFlag = false;

                try {
                  // Fetch the solution details using submissionId
                  let solutionDetails = await fetchSolutionDetails(
                    submissionId
                  );

                  if (solutionDetails) {
                    // Destructure the fetched data
                    const {
                      problemCode: fetchedProblemCode,
                      language: fetchedLanguage,
                      solutionCode: fetchedSolutionCode,
                      contestCode: fetchedContestCode,
                    } = solutionDetails;

                    problemCode = fetchedProblemCode;
                    language = fetchedLanguage;
                    solutionCode = fetchedSolutionCode;
                    contestCode = fetchedContestCode;

                    console.log(
                      "Initialized Upload Variables for Problem:",
                      problemCode
                    );
                    console.log(solutionCode);

                    if (language !== null && solutionCode !== "") {
                      chrome.storage.local.get(
                        "userStatistics",
                        (statistics) => {
                          const { userStatistics } = statistics;
                          const githubFilePath = `${problemCode}-${language}`;
                          let sha = null;

                          if (
                            userStatistics !== undefined &&
                            userStatistics.sha !== undefined &&
                            userStatistics.sha[githubFilePath] !== undefined
                          ) {
                            sha = userStatistics.sha[githubFilePath];
                          }

                          // Upload the solution to GitHub
                          setTimeout(() => {
                            if (sha === null) {
                              // solution, problemname, uploadFileName, commitMessage
                              uploadGitHub(
                                btoa(
                                  unescape(encodeURIComponent(solutionCode))
                                ),
                                problemCode,
                                convertToKebabCase(
                                  problemCode + "." + language
                                ),
                                "Added solution CodeChef to GitHub"
                              );
                            } else {
                              uploadGitHub(
                                btoa(
                                  unescape(encodeURIComponent(solutionCode))
                                ),
                                problemCode,
                                convertToKebabCase(
                                  problemCode + "." + language
                                ),
                                "Added solution CodeChef to GitHub"
                              );
                            }
                          }, 1000);

                          if (sha === null) {
                            const readmeContent = `# Problem: ${problemCode}\n\n## Contest: ${contestCode}\n\n## Language: ${language}\n\n[View Problem](https://www.codechef.com/${contestCode}/problems/${problemCode})`;

                            uploadGitHub(
                              btoa(unescape(encodeURIComponent(readmeContent))),
                              problemCode,
                              "README.md",
                              "Create README - CodeChef to GitHub",
                              "Codechef"
                            );
                          }
                        }
                      );
                    } else {
                      console.log("Failed to fetch solution or language.");
                    }
                  } else {
                    console.error();
                  }
                } catch (error) {
                  console.error("Error in fetching solution details:", error);
                }
              }
            }
          }, 1000);
        });
      } else {
        console.error("Submit button not found!");
      }
    }
  }, 1000);

  // Helper functions
  function getSubmissionId() {
    const submissionAnchor = document.querySelector(
      "div._submission__container_vov4h_94 a._submission__anchor_vov4h_99"
    );
    return submissionAnchor ? submissionAnchor.href.split("/").pop() : null;
  }

  async function fetchSolutionDetails(submissionId) {
    try {
      const [solutionData, submissionData] = await Promise.all([
        fetch(
          `https://www.codechef.com/api/submission-code/${submissionId}`
        ).then((res) => res.json()),
        fetch(
          `https://www.codechef.com/api/submission-details/${submissionId}`
        ).then((res) => res.json()),
      ]);

      return {
        language: solutionData.data.language.extension,
        solutionCode: solutionData.data.code,
        problemCode: submissionData.data.other_details.problemCode,
        contestCode: submissionData.data.other_details.contestCode,
      };
    } catch (error) {
      return null;
    }
  }
});
