/* Load the catalog once and keep selected product IDs between visits. */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedList = document.getElementById("selectedProductsList");
const generateButton = document.getElementById("generateRoutine");
const clearButton = document.getElementById("clearProducts");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const workerURL = "https://loreal-routine-builder-project-09.dbbemailme.workers.dev/api/chat";
let products = [];
let selected = [];
let messages = [];
let busy = false;
let routineReady = false;

/* Build elements with textContent so product and chat text remain plain text. */
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function updateControls() {
  generateButton.disabled = busy || selected.length === 0;
  clearButton.disabled = busy || selected.length === 0;
  sendButton.disabled = busy || !routineReady;
  userInput.disabled = busy || !routineReady;
}

function displayProducts() {
  const query = productSearch.value.trim().toLowerCase();
  const matches = products.filter(product =>
    (!categoryFilter.value || product.category === categoryFilter.value) &&
    `${product.name} ${product.brand} ${product.description}`.toLowerCase().includes(query)
  );
  productsContainer.replaceChildren();
  if (!matches.length) productsContainer.append(element("p", "No matching products.", "placeholder-message"));
  for (const product of matches) {
    const card = element("button", "", "product-card");
    card.type = "button";
    card.classList.toggle("selected", selected.includes(product.id));
    card.setAttribute("aria-pressed", String(selected.includes(product.id)));
    card.disabled = busy;
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";
    const info = element("span", "", "product-info");
    info.append(element("strong", product.name), element("span", product.brand), element("span", product.description, "description"));
    card.append(image, info);
    card.addEventListener("click", () => toggleProduct(product.id));
    productsContainer.append(card);
  }
}

/* Save IDs only; product details always come from the supplied catalog. */
function saveSelection() {
  try { localStorage.setItem("loreal-selected-products", JSON.stringify(selected)); }
  catch { appendMessage("Notice", "Selections could not be saved in this browser."); }
  renderSelection();
  displayProducts();
}

function toggleProduct(id) {
  if (busy) return;
  selected = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id];
  saveSelection();
}

function renderSelection() {
  selectedList.replaceChildren();
  if (!selected.length) selectedList.textContent = "No products selected.";
  for (const product of products.filter(item => selected.includes(item.id))) {
    const remove = element("button", `${product.name} ×`, "selected-item");
    remove.type = "button";
    remove.disabled = busy;
    remove.setAttribute("aria-label", `Remove ${product.name}`);
    remove.addEventListener("click", () => toggleProduct(product.id));
    selectedList.append(remove);
  }
  updateControls();
}

/* Display links returned by a future search integration without trusting HTML. */
function appendMessage(label, text, annotations = []) {
  const row = element("p", "", "msg");
  row.append(element("strong", `${label}: `));
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g;
  let position = 0;
  for (const match of text.matchAll(linkPattern)) {
    row.append(document.createTextNode(text.slice(position, match.index)));
    const link = element("a", match[1] || match[3]);
    link.href = match[2] || match[3];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    row.append(link);
    position = match.index + match[0].length;
  }
  row.append(document.createTextNode(text.slice(position)));
  for (const annotation of annotations) {
    const citation = annotation.url_citation;
    if (!citation || !/^https?:\/\//i.test(citation.url)) continue;
    const link = element("a", citation.title || citation.url);
    link.href = citation.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    row.append(document.createTextNode("\nSource: "), link);
  }
  chatWindow.append(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return row;
}

/* Commit history only after a successful reply, so a failed request can be retried. */
async function askAdvisor(nextMessages, question, newRoutine = false) {
  if (busy) return;
  busy = true;
  updateControls();
  displayProducts();
  renderSelection();
  if (newRoutine) chatWindow.replaceChildren();
  appendMessage("You", question);
  const status = appendMessage("Advisor", "Thinking…");
  try {
    const response = await fetch(workerURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Please try again later.");
    const reply = data.choices?.[0]?.message;
    if (!reply?.content) throw new Error("No reply received. Please try again.");
    messages = [...nextMessages, { role: "assistant", content: reply.content }];
    routineReady = true;
    status.remove();
    appendMessage("Advisor", reply.content, reply.annotations);
    userInput.value = "";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
    updateControls();
    displayProducts();
    renderSelection();
  }
}

generateButton.addEventListener("click", () => {
  const chosenProducts = products.filter(product => selected.includes(product.id));
  if (!chosenProducts.length || busy) return;
  // A new routine starts a fresh conversation with only the selected product JSON.
  const content = `Build a personalized routine using only these selected products. Explain their order and when to use each. If products do not belong in the same routine, separate them or explain why. Ask about preferences when needed. Selected products: ${JSON.stringify(chosenProducts)}`;
  routineReady = false;
  messages = [];
  askAdvisor([{ role: "user", content }], `Generate a routine with: ${chosenProducts.map(product => product.name).join(", ")}`, true);
});

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  const question = userInput.value.trim();
  if (!question || !routineReady || busy) return;
  askAdvisor([...messages, { role: "user", content: question }], question);
});
categoryFilter.addEventListener("change", displayProducts);
productSearch.addEventListener("input", displayProducts);
clearButton.addEventListener("click", () => { selected = []; saveSelection(); });

async function loadProducts() {
  updateControls();
  chatWindow.textContent = "Select products, then generate a routine to start chatting.";
  try {
    const response = await fetch("products.json");
    if (!response.ok) throw new Error("Could not load products. Please reload to try again.");
    products = (await response.json()).products;
    try {
      const saved = JSON.parse(localStorage.getItem("loreal-selected-products") || "[]");
      if (Array.isArray(saved)) selected = products.filter(product => saved.includes(product.id)).map(product => product.id);
    } catch { selected = []; }
    displayProducts();
    renderSelection();
  } catch (error) {
    productsContainer.textContent = error.message;
  }
}
loadProducts();
