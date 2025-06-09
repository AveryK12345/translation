console.info("### Pira PZ 3.16.7");
///////////////////////////////////////////////
// Personalization Script
// -----------------------
// This script is used to personalize the content on the page.
//
// DEBUGGING INSTRUCTIONS:
//
// ## Check app state:
// Go to Chrome Debug => Application => Local Storage => http://localhost:4502
// Add filter "pira-pz"
//
// ## Simulates getting a user2Item recommendation.
// The recommendation will be printed to console.
// Also, this recommended page will be logged as visited.
// await debugRec();
//
// ## Simulates the situation that all cached user2item recommendations are used up:
// Update the following key-value pair in local storage:
// pira-pz-recomms = []
// Then refresh page.
//
// ## Simulates visiting a page (please provide core path). e.g.
// logPageVisit("/products/software/arena-simulation.html");
// logPageVisit("/products/software/arena-simulation/buying-options/download.html");
// logPageVisit("/products/details.22-him-a3.html");
// logPageVisit("/idc/groups/literature/documents/td/22f-td001_-en-p.pdf");
// logPageVisit("/products/details.1756-oa16.html");
// logPageVisit("/products/details.1756-if8i.html");

// ## Faster Group Switch
// You may lower GROUP_2_ITEM_THRESHOLD to 1 for a faster group switch according to visited pages.
//
// ## Force Group Change
// In the local session storage, update the "group" value (string) in "pira-pz-state".
// Then refresh the page.
//
// ## Complete Reset
// In the local session storage, remove all keys with "pira-pz".
// You may want to keep "pira-visited-pages" tho.
//
// ## Switch to another user
// Update the code in "main" function to change the EID and UID.
// Then do a complete reset.
///////////////////////////////////////////////

///////////////////////////////////////////////
// Constants
///////////////////////////////////////////////
const DISABLE_PERSONALIZATION = false; // will read from AEM config page later to handle over control to AEM
const API_ROOT = "/bin/rockwell-automation/content-score";
const LITERATURE_ROOT = "https://literature.rockwellautomation.com";
const MULE_API_ROOT_PATTERN =
  "https://api${dashEnv}.rockwellautomation.com/ra-eapi-cx-public-dashboard-vpc${env}/api/v1/personalization/user2group";
const MULE_CREDS = {
  dev: {
    cid: "bfb2dfc3629a442db9c2c1e392362c53",
    cs: "6bAa4c2D190b49D4AE9ef848B5aF8152",
    coid: "aem_dev_1725396092",
  },
  qa: {
    cid: "bfb2dfc3629a442db9c2c1e392362c53",
    cs: "6bAa4c2D190b49D4AE9ef848B5aF8152",
    coid: "aem_qa_1725396092",
  },
  prod: {
    cid: "56f7a6250cfe4ddca51b394b013f29d4",
    cs: "0859Fe17272b459298B542fEDaca5aaC",
    coid: "aem_prod_1725396092",
  },
};
const ITEM2ITEM = "i2i";
const USER2ITEM = "u2i";
const USER2GROUP = "user2group";
const GROUP2ITEM = "g2i";
const COLDSTART = "coldstart";
const GROUP_MAPPING_METHOD = "groupDistribution"; // groupDistribution, groupId

const LOCAL_STORAGE_PERSONALIZATION_STATE = "pira-pz-state";
const LOCAL_STORAGE_RECOMMENDATION_LIST = "pira-pz-recomms";
const LOCAL_STORAGE_VISITED_PAGES = "pira-pz-visited-pages";
const LOCAL_STORAGE_PAGE_GROUP_MAP = "pira-pz-page-group";

// The threshold to determine the group for group2Item recommendation.
// This value is also used to determine when to reevaluate the group.
// Group change will only be evaluated when the number of visited pages
// is a multiple of this number to minimize the number of API calls.
const GROUP_2_ITEM_THRESHOLD = 5;

// For debug use. Only 1 page is needed to determine the group.
// const GROUP_2_ITEM_THRESHOLD = 1;

// The number of clusters for clustering algorithm group distribution.
NUM_CLUSTERS = 50;

// The maximum number of API calls allowed.
const API_CALL_THRESHOLD = 10;

// Description length limit. If longer than that it will be truncated.
const DESCRIPTION_LENGTH_LIMIT = 200;

// The limit for visited pages. If more than that, the first page will be removed.
const VISITED_PAGES_LIMIT = 15;

const contentTileClassName = "content-tile";
const contentTileSelectors = {
  link: ".teaser__link-over",
  ctaLink: `.${contentTileClassName}__link`,
  imgWrapper: ".teaser__image",
  img: `.${contentTileClassName}__image img`,
  imgSource: `.${contentTileClassName}__image source`,
  subtitle: ".teaser__subtitle",
  title: ".teaser__title",
  text: ".teaser__text",
  gatedLink: `.${contentTileClassName}__personalized-gated-link`,
};

const DEFAULT_IMG = `/content/dam/rockwell-automation/images/illustrations/background-textures/16x9_backTexture_RARedOrange.svg`;
const PRODUCT_DEFAULT_IMG = `/etc.clientlibs/rockwell-aem-base/clientlibs/clientlib-base/resources/icons/Big_Image_Unavailable.webp`;

const SUBTITLE_MAPPINGS = [
  { path: "/products/details", label: "Product" },
  { path: "/products/hardware", label: "Hardware" },
  { path: "/products/software", label: "Software" },
  { path: "/sales/partner-details", label: "Partner" },
  { path: "/company/partnernetwork", label: "Partner" },
  { path: "/events/webinars", label: "Webinar" },
  { path: "/events", label: "Event" },
  { path: "/company/news/case-studies", label: "Case Study" },
  { path: "/company/news/blogs", label: "Blog" },
  { path: "/company/news/the-journal", label: "The Journal" },
  { path: "/company/news/automation-today", label: "Automation Today" },
  { path: "/company/news/podcasts", label: "Podcast" },
  { path: "/company/investor-relations", label: "Investors" },
  { path: "/solutions", label: "Solution" },
  { path: "/capabilities", label: "Solution" },
  { path: "/support", label: "Support" },
  { path: "/industries", label: "Industry" },
  { path: "/company/about-us/legal-notices", label: "Legal" },
];

const PDF_SUBTITLE_MAP = {
  AP: "Application Profile",
  AT: "Application Techniques",
  AR: "Article",
  BR: "Brochure",
  CA: "Catalog",
  CT: "Certification",
  CL: "Collection",
  CO: "Standards",
  DS: "Dimension Sheets",
  CU: "Document Update",
  GR: "Getting Results",
  IN: "Installation Instructions",
  PC: "Packaging Contents",
  PA: "Parts",
  DM: "Product Demo",
  PP: "Profile",
  PM: "Programming Manual",
  QR: "Quick Reference",
  QS: "Quick Start",
  RD: "Reference Data",
  RM: "Reference Manual",
  RN: "Release Notes",
  SP: "Sales Promotion",
  SG: "Selection Guide",
  SB: "Service Bulletin",
  SR: "Specification",
  TD: "Technical Data",
  TG: "Troubleshooting Guide",
  UM: "User Manual",
  WP: "White Paper",
  WD: "Wiring Diagram",
};

///////////////////////////////////////////////
// In-memory data
///////////////////////////////////////////////
let eid; // Hash value of either EID
let uid; // Hash value of email
let state = getObjectFromLocalStorage(LOCAL_STORAGE_PERSONALIZATION_STATE) || {
  eid: undefined, // Hash value of either EID. This is to log the previous value.
  uid: undefined, // Hash value of email. This is to log the previous value.
  runId: undefined, // To distinguish between different runs. Reinit if changed.
  // TODO: I should not need uid and eid. They are from cookie.
  user2ItemStrategies: [], // coldstart, group2Item, user2Item. The recommendation strategies used for user2Item.
  group: undefined, // The group for group2Item recommendation. It is determined by `getUserGroup` function.
};

// The set of used recommendations on the current page.
let usedSet = new Set();

// The "core path" of the current page.
// No locale. .html is included. e.g.  /industries/automotive-tire.html
let currentPageCorePath = getNoHashCorePath();

// Cached result for i2i fetch.
// This result is used to get the next i2i recommendation.
// Also used to get the group info and group probability
// of the current page.
let i2iFetchResult = null;

// current cumultivate cluster distribution
let cumulativeGroupDistribution = new Array(NUM_CLUSTERS).fill(0);

// The user2Item recommendation list.
// {url, contentType, title, description, imageUrl}
let recommendations =
  getObjectFromLocalStorage(LOCAL_STORAGE_RECOMMENDATION_LIST) || [];

// The item2Item recommendation list.
// {url, contentType, title, description, imageUrl}
let item2ItemList = [];

// The number of API calls left.
let apiCallLeft = API_CALL_THRESHOLD;

///////////////////////////////////////////////
// Utils
///////////////////////////////////////////////

function getObjectFromLocalStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    return null;
  }
}

function setObjectToLocalStorage(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

// Use this function to update state. It will also update the local storage.
function updateState(key, value) {
  // Caution: only shallow compare.
  const changed = state[key] !== value;
  if (changed) {
    if (value) {
      state[key] = value;
    } else {
      delete state[key];
    }
    saveState();
  }
}

function saveState() {
  setObjectToLocalStorage(LOCAL_STORAGE_PERSONALIZATION_STATE, state);
}

function saveRecommendationList() {
  setObjectToLocalStorage(LOCAL_STORAGE_RECOMMENDATION_LIST, recommendations);
}

function checkRunId(data) {
  return !state.runId || data.runId === state.runId;
}

function paramMapToQueryString(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined)
    .map((key) => key + "=" + encodeURIComponent(params[key]))
    .join("&");
}

function isLocalEnv() {
  return window.location.hostname === "localhost";
}

function addCommonParams(params) {
  params.runId = state.runId ? state.runId : generateRunId();

  const [language, region] = getLanguageRegion();
  params.locale = region; // Although the parameter is called locale, it is actually region. e.g. us
  params.language = language; // e.g. en
  params.type = "personalization";
  // TODO: Remove this cache buster
  // params.cb = "pirapz2";
}

function generateRunId() {
  // Return current date, e.g. 20240101
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
}

function strategyUsed(strategy) {
  return state.user2ItemStrategies?.includes(strategy);
}

function getLastStrategy() {
  return state.user2ItemStrategies?.slice(-1)[0];
}

function apiGuard() {
  if (apiCallLeft > 0) {
    apiCallLeft--;
    return true;
  } else {
    console.error("API call threshold reached.");
    return false;
  }
}

async function generateHash(inputString) {
  const encoder = new TextEncoder();
  const data = encoder.encode(inputString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

function getEnv() {
  const hostname = window.location.hostname;
  let env;
  if (hostname.startsWith("dev-aem")) {
    env = "dev";
  } else if (hostname.startsWith("qa-aem")) {
    env = "qa";
  } else {
    env = "prod";
  }
  return env;
}

function getLocale() {
  // If domain ends with .com.cn, return "zh-cn"
  // Otherwise, return the first part.
  // e.g. https://dev-aem.rockwellautomation.com/en-us.html return en-us
  // Get the hostname and pathname from the current URL
  let hostname = window.location.hostname;
  let pathname = window.location.pathname;

  // Use the hostname and pathname to perform further operations
  // Example: Check if domain ends with .com.cn
  if (hostname.endsWith(".com.cn")) {
    return "zh-cn";
  } else {
    // Check for a locale pattern in the path
    const pathParts = pathname.split("/");
    if (pathParts.length >= 2) {
      return pathParts[1].split(".")[0]; // Consider en-us.html as well
    } else {
      return "en-us";
    }
  }
}

// Returns a tuple of language and region.
function getLanguageRegion() {
  const locale = getLocale();
  return locale.split("-");
}

///////////////////////////////////////////////
// Core Recommendation Logic
///////////////////////////////////////////////

// Router function to get the next strategy for user2Item recommendation.
// Returns the next strategy according to the state.
function getNextUser2ItemStrategy() {
  // Init but has userId. Try user2Item.
  if (!strategyUsed("user2Item") && userItendified()) {
    return "user2Item";
  }

  if (!strategyUsed("group2Item") && state.group) {
    return "group2Item";
  }

  // Last resort. Try coldstart.
  if (!strategyUsed("coldstart")) {
    return "coldstart";
  }

  // Running out of strategies. Give up.
  return null;
}

// Whether the user has some sort of IDs.
function userItendified() {
  return !!(eid || uid);
}

async function callApi(
  algoType,
  queryParams,
  apiRoot = API_ROOT,
  headers = {}
) {
  if (!apiGuard()) {
    return [];
  }

  try {
    addCommonParams(queryParams);
    queryParams.algoType = algoType;

    const url = apiRoot + "?" + paramMapToQueryString(queryParams);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
    const json = await response.json();

    // IMPORTANT! If runId mismatch, reinit and call the API again.
    if (!checkRunId(json)) {
      await reInit(json);
      return await callApi(algoType, queryParams);
    }
    const data = json.data;
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
}

function reInit(data) {
  state.runId = data?.runId || state.runId;
  state.user2ItemStrategies = [];
  resetPageGroupInfo();
  saveState();

  recommendations = [];
  saveRecommendationList();
}

async function getUser2Item(conf) {
  const recommendation = pickRecommendationFromList(conf, recommendations);
  if (recommendation) {
    return recommendation;
  }

  // Try fetching the next batch of recommendations.
  const nextBatchRecommendations =
    await pickUser2ItemStrategyAndFetchRecommendations();
  if (nextBatchRecommendations !== null) {
    recommendations.push(...nextBatchRecommendations);
    saveRecommendationList();
    return await getUser2Item(conf);
  } else {
    // Exauhsted all recommendations. Return null.
    return null;
  }
}

function pickRecommendationFromList(conf, list) {
  conf = conf || {};
  let filteredList = list;

  filteredList = filteredList.filter(
    (rec) =>
      !usedSet.has(rec.page?.toLowerCase()) &&
      !visitedPages.includes(rec.page?.toLowerCase())
  );

  if (conf.excludePdf) {
    filteredList = filteredList.filter(
      (rec) => rec.contentType?.toLowerCase() !== "literature"
    );
  }
  if (conf.requireImage) {
    filteredList = filteredList.filter((rec) => rec.imageUrl);
  }
  if (conf.contentType) {
    // TODO: Fix contentType. Case Study vs case-study
    filteredList = filteredList.filter(
      (rec) =>
        rec.contentType?.toLowerCase().replaceAll(/ /g, "-") ===
        conf.contentType.toLowerCase()
    );
  }
  if (filteredList.length > 0) {
    const rec = filteredList[0];
    return rec;
  } else {
    return null;
  }
}

function removeVisitedPagesFromRecommendations() {
  let visitedPageFound = false;
  recommendations = recommendations.filter((rec) => {
    if (visitedPages.includes(rec.page)) {
      visitedPageFound = true;
      return false;
    }
    return true;
  });
  // Only save if visited page is found.
  if (visitedPageFound) {
    saveRecommendationList();
  }
}

// Fetch the next batch of user2item recommendations.
async function pickUser2ItemStrategyAndFetchRecommendations() {
  // Next user2Item strategy.
  let strategy;
  // Recommendation list;
  let list;
  while (true) {
    strategy = getNextUser2ItemStrategy();
    if (strategy) {
      state.user2ItemStrategies.push(strategy);
      saveState();
    }

    if (strategy === "coldstart") {
      list = await fetchColdStart();
    } else if (strategy === "group2Item") {
      list = await fetchGroup2Item();
    } else if (strategy === "user2Item") {
      list = await fetchUser2Item();
    } else {
      // No more strategies. Return empty list.
      list = null;
      break;
    }

    removeVisitedPagesFromRecommendations();

    // Fetch list successful.
    if (list?.length > 0) {
      break;
    }
  }

  return list;
}

// Fisher-Yates shuffle algorithm for efficient array shuffling
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchColdStart() {
  const data = await callApi(COLDSTART, {});
  const userToItem = data.userToItem;

  const keyOrder = [
    "general",
    "article",
    "blog",
    "literature",
    "product",
    "case study",
  ];
  let mergedArray = [];

  // Create a set of keys that are in keyOrder
  const keyOrderSet = new Set(keyOrder);

  // Merge arrays based on keyOrder
  keyOrder.forEach((key) => {
    if (userToItem[key]) {
      // Shuffle each category's items before adding to merged array
      const shuffledItems = shuffleArray([...userToItem[key]]);
      mergedArray = mergedArray.concat(shuffledItems);
    }
  });

  // Merge arrays for the rest of the keys
  Object.keys(userToItem).forEach((key) => {
    if (!keyOrderSet.has(key)) {
      // Shuffle remaining categories' items before adding to merged array
      const shuffledItems = shuffleArray([...userToItem[key]]);
      mergedArray = mergedArray.concat(shuffledItems);
    }
  });

  return mergedArray;
}

async function fetchGroup2Item() {
  const data = await callApi(GROUP2ITEM, { groupId: state.group });
  return data;
}

async function fetchUser2Item() {
  const groupData = await fetchUserGroup();
  if (groupData?.length > 0) {
    const groupId = groupData[0];
    const data = await callApi(GROUP2ITEM, { groupId });
    return data;
  } else {
    return [];
  }
}

async function fetchUserGroup() {
  const env = getEnv();
  const apiRoot = getMuleApiRoot(env);

  const envCreds = MULE_CREDS[env];
  const headers = {
    client_id: envCreds.cid,
    client_secret: envCreds.cs,
    correlation_id: envCreds.coid,
  };
  const data = await callApi("user2group", { uid, eid }, apiRoot, headers);
  return data.groupId;
}

function getMuleApiRoot(env) {
  const dashEnv = env === "prod" ? "" : `-${env}`;
  const apiRoot = MULE_API_ROOT_PATTERN.replace("${dashEnv}", dashEnv).replace(
    "${env}",
    env
  );
  return apiRoot;
}

async function fetchItem2Item(corePath) {
  corePath = corePath || currentPageCorePath;

  let data;
  if (i2iFetchResult === null) {
    data = await callApi(ITEM2ITEM, { currentPage: currentPageCorePath });
    if (data) {
      i2iFetchResult = data;
      item2ItemList = data.itemToItem || [];
    }
  }
  return data?.itemToItem;
}

async function getItem2Item(conf) {
  if (!item2ItemList || item2ItemList.length === 0) {
    await fetchItem2Item();
  }
  let recommendation = pickRecommendationFromList(conf, item2ItemList);
  if (!recommendation) {
    item2ItemList = await fetchColdStart();
    recommendation = pickRecommendationFromList(conf, item2ItemList);
  }
  return recommendation;
}

///////////////////////////////////////////////
// IDs
///////////////////////////////////////////////

async function getEId() {
  try {
    const eloquaIdCookie = gC("piraEID");
    if (eloquaIdCookie) {
      return await generateHash(`pisrc_eloq_${hex2a(eloquaIdCookie)}`);
    } else {
      return undefined;
    }
  } catch {
    return undefined;
  }
}

async function getUId() {
  let email;
  try {
    email = JSON.parse(hex2a(gC("pira")?.substring(1))).em;
  } catch {}
  try {
    if (!email) {
      email = JSON.parse(localStorage.getItem("loggedInData")).email;
    }
  } catch {}
  try {
    if (email) {
      return await generateHash(`pisrc_email_${email}`);
    } else {
      return undefined;
    }
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

///////////////////////////////////////////////
// Paths
///////////////////////////////////////////////

// `getCorePath` is already defined in launch.
// But it does not handle hash.
// TODO: Update launch `getCorePath` function to handle hash.
function getNoHashCorePath(path) {
  if (path) {
    path = getPathFromURL(path);
  } else {
    path = window.location.pathname;
  }
  path = stripHash(path);
  path = getCorePath(path);
  // TODO: Fix getCorePath. It does not work for homepage. (returns null)
  path = path || window.location.pathname;
  return path;
}

function getPathFromURL(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname;
  } catch {
    return urlString;
  }
}

function stripHash(url) {
  return url.split("#")[0];
}

function corePathToUrl(corePath) {
  if (corePath.startsWith("/idc/groups/literature")) {
    return `${LITERATURE_ROOT}${corePath}`;
  }

  if (window.location.pathname.startsWith("/content/rockwell-automation")) {
    // Assume /content/rockwell-automation/global/us/en
    return window.location.pathname.split("/").slice(0, 6).join("/") + corePath;
  }

  // TODO: en-us.html fix getBaseUrlWithLocale. Does not work for homepage.
  const url =
    getBaseUrlWithLocale().replace(/\/$/, "").replace("/en-us.html", "/en-us") +
    corePath;
  return url;
}

///////////////////////////////////////////////
// Visited Pages and Group
///////////////////////////////////////////////

// TODO:
// 1. Use piSight
// 2. Use more advanced probabilistic method.

// visitedPages is an array of core paths.
let visitedPages = getObjectFromLocalStorage(LOCAL_STORAGE_VISITED_PAGES) || [];
let pageGroupMap =
  getObjectFromLocalStorage(LOCAL_STORAGE_PAGE_GROUP_MAP) || {};

async function logPageVisit(corePath = currentPageCorePath) {
  corePath = corePath?.toLowerCase();
  const group = await getGroupInfo(corePath);

  if (!visitedPages.includes(corePath)) {
    if (visitedPages.length >= VISITED_PAGES_LIMIT) {
      visitedPages.shift();
    }
    visitedPages.push(corePath);
    localStorage.setItem(
      LOCAL_STORAGE_VISITED_PAGES,
      JSON.stringify(visitedPages)
    );
  }

  if (group && !pageGroupMap[corePath]) {
    pageGroupMap[corePath] = group;
    localStorage.setItem(
      LOCAL_STORAGE_PAGE_GROUP_MAP,
      JSON.stringify(pageGroupMap)
    );
  }
}

async function getGroupInfo(path) {
  if (pageGroupMap[path]) {
    return pageGroupMap[path];
  }
  const data = await fetchItem2Item(path);
  // Use i2iFetchResult since data is i2iFetchResult.ItemToItem.
  if (GROUP_MAPPING_METHOD === "groupDistribution") {
    // Group cumulative probability is an array of group probabilities
    return i2iFetchResult?.groupDistribution
      ? i2iFetchResult.groupDistribution
      : undefined;
  } else {
    // Group should be a string.
    return i2iFetchResult?.groupId ? i2iFetchResult.groupId + "" : undefined;
  }
}

function calculateGroup() {
  if (visitedPages.length < GROUP_2_ITEM_THRESHOLD) {
    return null;
  }
  if (GROUP_MAPPING_METHOD === "groupDistribution") {
    // Group cumulative multiplication
    const isInitialDistribution = cumulativeGroupDistribution.every(
      (value) => value === 0
    );
    for (let page of visitedPages) {
      const groupDistribution = pageGroupMap[page];
      if (groupDistribution) {
        cumulativeGroupDistribution = cumulativeGroupDistribution.map(
          (value, i) =>
            isInitialDistribution
              ? value + groupDistribution[i]
              : value * groupDistribution[i]
        );
      }
    }

    // Normalization
    const total = cumulativeGroupDistribution.reduce(
      (sum, value) => sum + value,
      0
    );
    if (total > 0) {
      cumulativeGroupDistribution = cumulativeGroupDistribution.map(
        (value) => value / total
      );
    }

    // get the highest top group probability (potentially more than 1 group)
    const mostCommonCluster = cumulativeGroupDistribution.indexOf(
      Math.max(...cumulativeGroupDistribution)
    );
    return mostCommonCluster;
  } else {
    // Group count
    const groupMap = visitedPages.reduce((acc, page) => {
      const group = pageGroupMap[page];
      if (group) {
        acc[group] = (acc[group] || 0) + 1;
      }
      return acc;
    }, {});

    // get the most frequent group from visited pages using map reduce.
    const mostFrequentGroup = Object.keys(groupMap).reduce(
      (a, b) => (groupMap[a] > groupMap[b] ? a : b),
      null
    );
    return mostFrequentGroup;
  }
}

function resetPageGroupInfo() {
  pageGroupMap = {};
  localStorage.removeItem(LOCAL_STORAGE_PAGE_GROUP_MAP);
  updateState("group", null);
}

///////////////////////////////////////////////
// Main
///////////////////////////////////////////////
async function main() {
  // The state and recommendation list are already loaded from local storage
  // from above when defining the in-memory data.
  if (!state.user2ItemStrategies) {
    updateState("user2ItemStrategies", []);
  }

  if (!eid) {
    if (isLocalEnv()) {
      eid = "15298c82fd4089cabe3d1e3429c9ac4a206cd09c77b53327d506ad7c267e2971";
    } else {
      eid = await getEId();
    }
  }

  if (!uid) {
    if (isLocalEnv()) {
      uid = "4397607eeeaf23ec403e41d60ad249ef3f3c2b9659e709b8610b3db7ec3192d5";
    } else {
      uid = await getUId();
    }
  }

  // Check if id changed. If changed, reset the state since it is a different user.

  if (state.eid !== eid || state.uid !== uid) {
    state.eid = eid;
    state.uid = uid;

    state.user2ItemStrategies = [];
    saveState();

    // Reset recommendation list.
    recommendations = [];
    saveRecommendationList();

    return main();
  }

  // Only evaluate group when the number of visited pages is a multiple of the threshold.

  if (visitedPages.length >= GROUP_2_ITEM_THRESHOLD) {
    const calculatedGroup = calculateGroup();

    let groupChanged = calculatedGroup !== state.group;
    if (calculatedGroup && groupChanged) {
      state.group = calculatedGroup;
      saveState();

      const lastStrategy = getLastStrategy();
      if (lastStrategy === "group2Item" || lastStrategy === "coldstart") {
        // Clear recommendation list since it is no longer valid.
        recommendations = [];
        saveRecommendationList();
        // Remove group2Item from the strategy list.
        state.user2ItemStrategies = state.user2ItemStrategies.filter(
          (s) => s !== "group2Item" && s !== "coldstart"
        );
        saveState();

        return main();
      }
    }
  }

  // On most pages, if we find the "recommended for you" section, we will automatically
  // configure the tiles to be personalized.
  // This is disabled in phase I.
  // automaticConfigPersonalizationTiles();

  const tiles = getPersonalizedTilesOnPage();
  for (const tile of tiles) {
    const conf = getTileConfig(tile);

    let recommendation;
    if (conf.type === "personalized") {
      recommendation = await getUser2Item(conf);
    } else if (conf.type === "related") {
      recommendation = await getItem2Item(conf);
    }
    if (recommendation) {
      usedSet.add(recommendation.page.toLowerCase());
      updateTile(tile, recommendation);
    }
  }

  // Add a listener to all PDF links to log the visit.
  // TODO: This should not be needed if using piSight.
  document.querySelectorAll("a[href$='.pdf']").forEach((pdfLink) => {
    pdfLink.addEventListener("click", function () {
      const corePath = pdfLink.href.replace(LITERATURE_ROOT, "");
      logPageVisit(corePath);
    });
  });
}

function addRelatedRecommendationsToProductPage() {
  const RECOMMENDATION_HTML = `<div class="generic-container push-top-full push-bottom-full aem-GridColumn aem-GridColumn--default--12" > <div class="generic-container__inner"> <div class="column-control"> <div class="column-control__container grid collapse-cols-mobile"> <div class="row"> <div class="col-mobile"> <div class="related-content"> <div id="related-content-pdp-recommendations" class="related-content__container related-content__container--pdp-recommendations" aria-roledescription="related-content" > <div class="h2">Others Also Viewed</div> <div class="loader" style="display: none"> <div class="loader-dots"> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> </div> <div class="loader-text">Loading</div> </div> <div class="related-content__list"> <div class="related-content__list-item"> <div class="content-tile-1 content-tile content-tile__related" > <div id="content-tile-564430491" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over"></a> <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="related-content__list-item"> <div class="content-tile-2 content-tile content-tile__related" > <div id="content-tile-564430492" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over"></a> <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="related-content__list-item"> <div class="content-tile-3 content-tile content-tile__related" > <div id="content-tile-564430493" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over" >Improve OEE With Plug-In PLC Weight Modules</a > <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="related-content__list-item"> <div class="content-tile-3 content-tile content-tile__related" > <div id="content-tile-564430493" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over" >Improve OEE With Plug-In PLC Weight Modules</a > <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="generic-container__backgrounds"> <div class="generic-container__gradient gradient no-gradient"></div> <div class="generic-container__responsive-images"></div> <div class="generic-container__bg-color generic-container__bg-white" ></div> </div> </div> </div> <style> @media only screen and (min-width: 48.0625em) { .related-content__container--pdp-recommendations .related-content__list-item { width: 24%; margin-top: 0; }} </style>`;
  const footer = document.getElementsByClassName("footer")[0];
  if (footer) {
    footer.insertAdjacentHTML("beforebegin", RECOMMENDATION_HTML);
    main();
  }
}

function addRelatedRecommendationsTo404Page() {
  const RECOMMENDATION_HTML = `<div class="generic-container push-top-full push-bottom-full aem-GridColumn aem-GridColumn--default--12" > <div class="generic-container__inner"> <div class="column-control"> <div class="column-control__container grid collapse-cols-mobile"> <div class="row"> <div class="col-mobile"> <div class="related-content"> <div id="related-content-pdp-recommendations" class="related-content__container related-content__container--pdp-recommendations" aria-roledescription="related-content" > <div class="h2">Others Also Viewed</div> <div class="loader" style="display: none"> <div class="loader-dots"> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> <div class="loader-dot"></div> </div> <div class="loader-text">Loading</div> </div> <div class="related-content__list"> <div class="related-content__list-item"> <div class="content-tile-1 content-tile content-tile__related" > <div id="content-tile-564430491" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over"></a> <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="related-content__list-item"> <div class="content-tile-2 content-tile content-tile__related" > <div id="content-tile-564430492" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over"></a> <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="related-content__list-item"> <div class="content-tile-3 content-tile content-tile__related" > <div id="content-tile-564430493" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over" >Improve OEE With Plug-In PLC Weight Modules</a > <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="related-content__list-item"> <div class="content-tile-3 content-tile content-tile__related" > <div id="content-tile-564430493" class="content-tile__container content-tile__related__container vertical layout-card" aria-roledescription="content-tile" data-type="dynamic" data-personalization-type="related" data-content-type="product" data-require-image="true" data-exclude-pdf="true" > <div class="teaser"> <div class="teaser__container content-tile__container is-link vertical layout-card" > <a href="" class="teaser__link-over" >Improve OEE With Plug-In PLC Weight Modules</a > <div class="teaser__wrapper"> <div class="teaser__image content-tile__image aspect-ratio--16x9" > <picture style="aspect-ratio: 0/0"> <source srcset="" media="(min-width: 768px)" /> <img class="main-image" width="0" src="" srcset="" alt="" data-trackable="true" /> </picture> </div> <div class="teaser__content"> <div class="teaser__text-content"> <div class="teaser__subtitle"></div> <div class="teaser__title"></div> <div class="teaser__text"></div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> </div> <div class="generic-container__backgrounds"> <div class="generic-container__gradient gradient no-gradient"></div> <div class="generic-container__responsive-images"></div> <div class="generic-container__bg-color generic-container__bg-white" ></div> </div> </div> </div> <style> @media only screen and (min-width: 48.0625em) { .related-content__container--pdp-recommendations .related-content__list-item { width: 24%; margin-top: 0; }} </style>`;
  const footer = document.getElementsByClassName("footer")[0];
  if (footer) {
    footer.insertAdjacentHTML("beforebegin", RECOMMENDATION_HTML);
    main();
  }
}

// Debug recommendation
// Simulates getting a user2Item recommendation.
// - Get next recommendation
// - Print the recommendation to console
// - logPageVisit
async function debugRec() {
  const recommendation = await getUser2Item({});
  if (recommendation?.page) {
    await logPageVisit(recommendation.page);
  }
  return recommendation;
}

function automaticConfigPersonalizationTiles() {
  const searchTexts = [
    "recommended for you", // English
    "für sie empfohlen", // German
    "recomendado para usted", // Spanish
    "recommandé pour vous", // French
    "consigliato a te", // Italian (informal)
    "consigliato per voi", // Italian (formal)
    "recomendado para você", // Portuguese
    "おすすめ", // Japanese
    "内容推荐", // Simplified Chinese
    "為您推薦", // Traditional Chinese
    "추천", // Korean
  ].map((text) => text.toLowerCase()); // Normalize search texts to lower case for case insensitivity

  // Select h2, h3, h4, and elements with classes containing "h2", "h3", "h4"
  const nodes = document.querySelectorAll("h2, h3, h4, .h2, .h3, .h4");

  let counter = 0; // Initialize a counter to keep track of content-tile__container processing

  for (const node of nodes) {
    const nodeText = node.textContent.toLowerCase().trim(); // Normalize node text to lower case and trim
    // Check if node text matches any of the search texts
    if (searchTexts.some((searchText) => nodeText === searchText)) {
      // Start searching up the DOM from the found node
      let container = node.parentElement; // Start with the parent element
      while (container) {
        const contentTiles = container.querySelectorAll(".content-tile");
        if (contentTiles.length > 0) {
          contentTiles.forEach((tile) => {
            const contentTileContainer = tile.querySelector(
              ".content-tile__container"
            );
            if (
              contentTileContainer &&
              !contentTileContainer.hasAttribute("data-personalization-type")
            ) {
              // Set attributes
              contentTileContainer.setAttribute("data-require-image", "true");
              contentTileContainer.setAttribute("data-content-type", "general");
              const personalizationType =
                counter < 2 ? "personalized" : "related";
              contentTileContainer.setAttribute(
                "data-personalization-type",
                personalizationType
              );
              counter++; // Increment the counter after setting attributes
            }
          });
          break; // Exit the loop if content-tile elements are found
        } else {
          container = container.parentElement; // Move to the next level up in the DOM if no content-tile found
        }
      }

      if (!container) {
        console.log("Reached the root without finding any content-tile.");
      }
      break; // Stop the loop after finding the first match
    }
  }
}

if (document.readyState === "loading") {
  // DOMContentLoaded not yet fired, so set up the event listener
  document.addEventListener("DOMContentLoaded", logPageVisit);
} else {
  // DOMContentLoaded already fired, so run the setup function immediately
  logPageVisit();
}

if (window.location.href.includes("products/details")) {
  addRelatedRecommendationsToProductPage();
} else if (is404Page()) {
  // Disabled for phase I
  // addRelatedRecommendationsTo404Page();
}
function is404Page() {
  // Find an h1 = Sorry, we can't provide that page.
  return !!document
    .querySelector("h1")
    ?.textContent.includes("Sorry, we can't provide that page.");
}

if (DISABLE_PERSONALIZATION) {
  console.log("Personalization disabled");
} else if (window.piraContentTilesLoaded) {
  main();
} else {
  window.addEventListener("content-tiles-loaded", function () {
    main();
  });
}

// Get config from tile DOM
function getTileConfig(tile) {
  const dataset = tile.dataset;
  return {
    type: dataset?.personalizationType,
    contentType: dataset?.contentType,
    requireImage: dataset?.requireImage === "true",
    excludePdf: dataset?.excludePdf === "true",
    gatedId: dataset?.personalizationGatedId,
  };
}

///////////////////////////////////////////////
// Rendering
///////////////////////////////////////////////

// Get all tiles, including personalized and non-personalized.
function getAllTilesOnPage() {
  // Somehow class "content-tile__container" is in two divs in a single tile.
  // This is a workaround only to get the outer div.
  // The outer div has an id that contains "content-tile".
  // e.g. content-tile-638001632
  return Array.from(
    document.getElementsByClassName("content-tile__container")
  ).filter((tile) => tile.id?.includes("content-tile"));
}

// Get personalized tiles of type.
// If type is not provided, get all personalized tiles.
function getPersonalizedTilesOnPage(type) {
  return getAllTilesOnPage().filter((tile) =>
    type
      ? tile.dataset?.personalizationType === type
      : tile.dataset?.personalizationType
  );
}

function updateTile(tile, recommendation) {
  updateTileTitle(tile, recommendation);
  updateSubtitle(tile, recommendation);
  updateTileDescription(tile, recommendation.description);
  updateTileImage(tile, recommendation);
  updateLink(tile, recommendation);
  updateStyle(tile, recommendation);
}

function updateTileTitle(tileElement, recommendation) {
  const titleEl = tileElement.querySelector(contentTileSelectors.title);
  if (titleEl) {
    const title = recommendation.title || recommendation.page.split("/").pop();
    titleEl.textContent = title;
  }
}

function updateTileDescription(tileElement, description) {
  const descriptionEl = tileElement.querySelector(contentTileSelectors.text);
  if (descriptionEl) {
    description = truncateDescription(description);
    descriptionEl.textContent = description;
  }
}

// Truncate the description if it is longer than 200 characters.
// Shorten it to the last space before 200 characters.
// Add "..." at the end.
function truncateDescription(description) {
  if (description.length > DESCRIPTION_LENGTH_LIMIT) {
    const truncated = description.substring(0, DESCRIPTION_LENGTH_LIMIT);
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    return truncated.substring(0, lastSpaceIndex) + "...";
  }
  return description;
}

// No need to call it with await. Images can be loaded asynchronously.
// This is a temporary solution anyway.
// The recommendation will have direct image source.
async function updateTileImage(tileElement, recommendation) {
  let imageUrl = recommendation.imageUrl;
  // If imageUrl ends with .img.html
  try {
    if (imageUrl?.endsWith(".img.html")) {
      imageUrl = await fetchImageUrlFromServlet(imageUrl);
    }
  } catch (e) {
    imageUrl = null;
  }

  if (
    imageUrl &&
    imageUrl.includes(
      "/content/dam/rockwell-automation/images/literature-pdf-thumbnail"
    )
  ) {
    // might link cb constant here?
    // imageUrl = imageUrl + "?pirapz";
  }

  if (!imageUrl) {
    imageUrl = getDefaultImage(recommendation);
  }
  const imgEl = tileElement.querySelector(contentTileSelectors.img);
  if (imgEl) {
    imgEl.src = imageUrl;
    imgEl.removeAttribute("srcset");
    // Treat image as decorative. No alt.
    imgEl.removeAttribute("alt");

    // Add an load error handler. If image fails to load, use default image.
    imgEl.onerror = function () {
      imgEl.src = getDefaultImage(recommendation);
      // Remove this onerror handler just in case the default image also fails.
      imgEl.onerror = null;
    };
  }

  // Remove source element from imgWrapper if it exists
  const imgSource = tileElement.querySelector(contentTileSelectors.imgSource);
  if (imgSource) {
    imgSource.parentElement.removeChild(imgSource);
  }
}

function getDefaultImage(recommendation) {
  return recommendation.contentType?.toLowerCase() === "product"
    ? PRODUCT_DEFAULT_IMG
    : DEFAULT_IMG;
}

async function fetchImageUrlFromServlet(corePath) {
  const url = corePathToUrl(corePath);
  const response = await fetch(url);
  const text = await response.text();
  const tempImageElement = document.createElement("div");
  tempImageElement.innerHTML = text;
  const src =
    tempImageElement
      .querySelector(".image__servlet-image")
      ?.getAttribute("src") || "";
  return src;
}

function updateLink(tileElement, recommendation) {
  let link = corePathToUrl(recommendation.page);
  if (link.includes("/products/details")) {
    // Upper case the string between details. and .html
    // e.g. /en-us/products/details.vpl-b0753f-pj14aa.html => /en-us/products/details.VPL-B0753F-PJ14AA.html
    link = link.replace(
      /(details\.)(.*)(\.html)/,
      function (match, p1, p2, p3) {
        return p1 + p2.toUpperCase() + p3;
      }
    );
  }
  const linkEl = tileElement.querySelector(contentTileSelectors.link);
  const ctaLinkEl = tileElement.querySelector(contentTileSelectors.ctaLink);
  const gatedContentId = tileElement.dataset.personalizationGatedId;

  // if (gatedContentId && !eid && typeof gcdc === "function") {
  if (gatedContentId && typeof gcdc === "function") {
    const actualUrl = linkEl.getAttribute("href");
    const gatedContentUrl = "#" + gatedContentId;
    linkEl?.setAttribute("href", gatedContentUrl);
    ctaLinkEl?.setAttribute("href", gatedContentUrl);
    gcdc("loadGates");
    window.addEventListener("gcdcGateSubmit", function (event) {
      event.preventDefault();
      if ("gate-" + event.detail.id === gatedContentId) {
        window.location.href = actualUrl;
      }
    });
  } else {
    linkEl?.setAttribute("href", link);
    ctaLinkEl?.setAttribute("href", link);
  }
}

function updateSubtitle(tileElement, recommendation) {
  let subtitle = "";
  if (
    recommendation.contentType?.toLowerCase() === "literature" &&
    recommendation.page?.toLowerCase().endsWith(".pdf")
  ) {
    // Use regex to get the first segment after /idc/groups/literature/documents
    // https://literature.rockwellautomation.com/idc/groups/literature/documents/sp/gmst-sp024_-en-p.pdf => SP
    const match = recommendation.page.match(
      /\/idc\/groups\/literature\/documents\/([a-zA-Z]+)/
    );
    const key = match ? match[1].toUpperCase() : "";
    subtitle = PDF_SUBTITLE_MAP[key] || "PDF";
  } else {
    // Go through the SUBTITLE_MAPPINGS and check if the recommendation page has the key in path.
    // e.g.   { path: "/products/details/", label: "Product" },
    // If so, set the subtitle to the value.
    for (const mapping of SUBTITLE_MAPPINGS) {
      if (recommendation.page.includes(mapping.path)) {
        subtitle = mapping.label;
        break;
      }
    }
  }

  let subtitleEl = tileElement.querySelector(contentTileSelectors.subtitle);
  if (!subtitleEl) {
    const contentDiv = tileElement.querySelector(".teaser__text-content");
    if (contentDiv) {
      // Create a div with teaser__subtitle and add as the first child of contentDiv.
      subtitleEl = document.createElement("div");
      subtitleEl.classList.add("teaser__subtitle");
      contentDiv.insertBefore(subtitleEl, contentDiv.firstChild);
    }
  }

  if (subtitleEl) {
    subtitleEl.textContent = subtitle;
  }
}

function updateStyle(tileElement, recommendation) {
  const type = recommendation.contentType.toLowerCase();
  if (
    type === "product" ||
    type === "literature" ||
    type === "hardware" ||
    recommendation.page?.includes("/products/hardware")
  ) {
    tileElement.classList.add("content-tile--product");
    const tileImgElem = tileElement.querySelector(contentTileSelectors.img);
    if (tileImgElem) {
      tileImgElem.style.maxHeight = "100%";
      tileImgElem.style.width = "100%";
      tileImgElem.style.height = "auto";
      tileImgElem.style.objectFit = "contain";
    }
  } else {
    tileElement.classList.remove("content-tile--product");

    const imgEl = tileElement.querySelector(contentTileSelectors.img);
    // For some reason, in original CSS width is set to auto,
    // which makes the image not fill the container sometimes.
    if (imgEl) {
      imgEl.style.width = "100%";
    }
  }
}