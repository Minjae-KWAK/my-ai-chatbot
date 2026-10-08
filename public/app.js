const STORAGE_KEY = "orbit-chat-history";
const MAX_STORED_MESSAGES = 20;

const messagesElement = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const sendButton = document.querySelector("#sendButton");
const clearButton = document.querySelector("#clearButton");
const suggestions = document.querySelector("#suggestions");
const template = document.querySelector("#messageTemplate");

let conversation = loadConversation();
let isWaiting = false;

function loadConversation() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored)
      ? stored.filter(
          (item) =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function saveConversation() {
  conversation = conversation.slice(-MAX_STORED_MESSAGES);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
}

function createWelcome() {
  const welcome = document.createElement("div");
  welcome.className = "welcome";
  welcome.innerHTML = `
    <div class="welcome-orb" aria-hidden="true"></div>
    <h1>무엇을 도와드릴까요?</h1>
    <p>아이디어를 발전시키거나, 궁금한 것을 묻거나,<br />복잡한 내용을 함께 정리해 보세요.</p>
  `;
  return welcome;
}

function createMessage(message, { pending = false } = {}) {
  const node = template.content.firstElementChild.cloneNode(true);
  const isUser = message.role === "user";
  const avatar = node.querySelector(".avatar");
  const label = node.querySelector(".message-label");
  const content = node.querySelector(".message-content");

  node.classList.add(message.role);
  avatar.textContent = isUser ? "나" : "AI";
  label.textContent = isUser ? "나" : "Orbit";

  if (pending) {
    node.dataset.pending = "true";
    content.innerHTML = '<div class="typing" aria-label="답변 작성 중"><span></span><span></span><span></span></div>';
  } else {
    content.textContent = message.content;
  }

  return node;
}

function renderConversation() {
  messagesElement.replaceChildren();

  if (conversation.length === 0) {
    messagesElement.append(createWelcome());
    suggestions.hidden = false;
    return;
  }

  suggestions.hidden = true;
  conversation.forEach((message) => messagesElement.append(createMessage(message)));
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesElement.scrollTop = messagesElement.scrollHeight;
  });
}

function setWaiting(waiting) {
  isWaiting = waiting;
  input.disabled = waiting;
  sendButton.disabled = waiting;
  clearButton.disabled = waiting;
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

async function sendMessage(text) {
  const content = text.trim();
  if (!content || isWaiting) return;

  conversation.push({ role: "user", content });
  saveConversation();
  renderConversation();
  input.value = "";
  resizeInput();
  setWaiting(true);

  const pendingMessage = createMessage({ role: "assistant", content: "" }, { pending: true });
  messagesElement.append(pendingMessage);
  scrollToBottom();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "요청을 처리하지 못했습니다.");
    }

    conversation.push({ role: "assistant", content: data.reply });
    saveConversation();
    renderConversation();
  } catch (error) {
    pendingMessage.remove();
    const errorMessage = createMessage({
      role: "assistant",
      content: `오류가 발생했습니다: ${error.message}`,
    });
    errorMessage.classList.add("error");
    messagesElement.append(errorMessage);
    scrollToBottom();
  } finally {
    setWaiting(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-prompt]");
  if (button) sendMessage(button.dataset.prompt);
});

clearButton.addEventListener("click", () => {
  conversation = [];
  sessionStorage.removeItem(STORAGE_KEY);
  renderConversation();
  input.focus();
});

renderConversation();
input.focus();
