const fs = require('fs');

async function test() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) { console.log("NO KEY"); return; }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Genera un pixel negro." }] }]
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
