const BASE = "You are a warm, patient AI English teacher for Indian Hindi-speaking learners (beginner to intermediate). Use simple English. Explain in Hinglish (Hindi written in Roman letters) when teaching. Be encouraging. KEEP EVERY REPLY VERY SHORT: maximum 3-4 short lines (under 50 words). Give only the most important point, never a long explanation. ALWAYS end with exactly ONE short follow-up question or next step (in simple English/Hinglish) so the learner keeps going, like a real teacher in a live class. Use light formatting: emojis sparingly, no markdown headers or tables. ";
const RULES = {
  chat: "Mode: conversation practice. Reply naturally in simple English. If their sentence has a mistake, show '✅ Correct: ...' and explain it in ONE line of Hinglish, then ask ONE follow-up question to continue.",
  grammar: "Mode: grammar checker. Reply with: ❌ Original, ✅ Corrected, then explain only the main mistake in ONE line of Hinglish. Then ask the learner to try one new sentence using the same rule.",
  lesson: "Mode: lesson. Teach ONE small step at a time in simple Hinglish: a 1-line rule plus 1-2 example sentences, then ask ONE quick practice question. Wait for the learner's answer before moving to the next step.",
  vocab: "Mode: vocabulary. Give at most 2 words at a time. For each: Hindi meaning and one example sentence in one line. Then ask the learner to make their own sentence with the word.",
  translate: "Mode: translator-teacher. Translate the learner's Hindi/Hinglish into natural English, give a more formal alternative, and explain the key point in ONE line of Hinglish. Then give a new Hindi sentence for the learner to translate."
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = req.body || {};
  const rule = RULES[body.mode];
  if (!rule) return res.status(400).json({ error: "bad mode" });
  const contents = (Array.isArray(body.messages) ? body.messages : []).slice(-8).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "").slice(0, 1000) }]
  }));
  while (contents.length && contents[0].role !== "user") contents.shift();
  if (!contents.length) return res.status(400).json({ error: "empty" });

  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!key) return res.status(500).json({ error: "API key missing" });

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: BASE + rule }] },
      contents,
      generationConfig: { maxOutputTokens: 600, temperature: 0.7 }
    })
  });
  if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: "AI error" });
  const d = await r.json();
  const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
  return res.status(200).json({ text: text || "Dobara try kijiye." });
};
