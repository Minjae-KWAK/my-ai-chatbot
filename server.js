import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT =
  "당신은 친절하고 정확한 AI 어시스턴트입니다. 사용자의 언어로 자연스럽게 답변하세요. " +
  "모르는 내용은 추측하지 말고 솔직하게 알리며, 답변은 이해하기 쉽게 구성하세요.";

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;

  return messages
    .filter(
      (message) =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 8000),
    }));
}

app.post("/api/chat", async (req, res) => {
  const messages = sanitizeMessages(req.body?.messages);

  if (!messages?.length || messages.at(-1).role !== "user") {
    return res.status(400).json({ error: "올바른 대화 내용을 입력해 주세요." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다.",
    });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("OpenAI API가 빈 응답을 반환했습니다.");
    }

    return res.json({ reply });
  } catch (error) {
    const status = error?.status || 500;
    const code = error?.code || error?.error?.code;

    console.error("OpenAI API error:", {
      status,
      code,
      type: error?.type,
      message: error?.message,
    });

    const errorMessages = {
      credit_balance_exhausted:
        "OpenAI API 크레딧이 소진되었습니다. API 결제 설정에서 크레딧을 충전해 주세요.",
      organization_spend_limit_exceeded:
        "OpenAI 조직의 월간 지출 한도에 도달했습니다. API 결제 설정에서 한도를 확인해 주세요.",
      project_spend_limit_exceeded:
        "OpenAI 프로젝트의 월간 지출 한도에 도달했습니다. 프로젝트 한도를 확인해 주세요.",
      organization_usage_limit_exceeded:
        "OpenAI 조직의 API 사용 한도에 도달했습니다. Usage Limits 설정을 확인해 주세요.",
      slow_down:
        "요청 속도가 너무 빠릅니다. 잠시 기다린 뒤 다시 시도해 주세요.",
    };

    let message = errorMessages[code];

    if (!message && status === 429) {
      message =
        error?.type === "insufficient_quota"
          ? "OpenAI API 사용 한도 또는 크레딧을 확인해 주세요. ChatGPT 구독과 API 결제는 별도입니다."
          : "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (!message && status === 401) {
      message = "OpenAI API 키가 올바르지 않거나 만료되었습니다. .env 파일을 확인해 주세요.";
    }

    if (!message && status === 403) {
      message = "이 API 키에는 해당 요청을 실행할 권한이 없습니다.";
    }

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: message || "AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      code: code || "unknown_error",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: "gpt-4o-mini" });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "요청한 API 경로를 찾을 수 없습니다." });
});

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Express error:", error?.message || error);
  const status = error?.status === 400 ? 400 : 500;
  const message =
    status === 400
      ? "요청 형식이 올바르지 않습니다."
      : "서버에서 요청을 처리하지 못했습니다.";

  return res.status(status).json({ error: message });
});

// Vercel imports this application as a serverless function.
export default app;

// Keep the regular port listener for local `npm start` / `npm run dev` usage.
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`AI chatbot is running at http://localhost:${port}`);
  });
}
