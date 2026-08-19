/**
 * POST /api/estimate
 *
 * Estimates calories and protein for a described meal using Claude Haiku.
 * The API key lives here on the server — it is never sent to the browser.
 *
 * Body: { description: string, known?: { name, calories, protein, servings } }
 * Response: { calories, protein, confidence, items? }
 */

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, known } = req.body ?? {};

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }

  const trimmed = description.trim().slice(0, 500);

  const systemPrompt = known
    ? 'You are a nutrition calculator. The user provides ground-truth per-serving macros for a product and the number of servings consumed. Multiply and return totals — do NOT re-estimate. Use the record_nutrition tool.'
    : 'You are a nutrition estimator. Given a meal description, estimate total calories (kcal) and grams of protein for a typical home or restaurant portion. Sum all items. Confidence: high = standard item with well-known macros, med = reasonable estimate, low = highly variable or ambiguous meal. Use the record_nutrition tool only.';

  const userContent = known
    ? `Product: ${known.name || trimmed}\nPer serving: ${known.calories} kcal, ${known.protein} g protein\nServings: ${known.servings}\nReturn scaled totals.`
    : `Meal: ${trimmed}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9500);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        tools: [
          {
            name: 'record_nutrition',
            description: 'Record the estimated or calculated nutrition for the meal',
            input_schema: {
              type: 'object',
              properties: {
                calories:   { type: 'integer', description: 'Total calories in kcal' },
                protein:    { type: 'integer', description: 'Total protein in grams' },
                confidence: { type: 'string',  enum: ['low', 'med', 'high'] },
                items: {
                  type: 'array',
                  description: 'Optional per-item breakdown',
                  items: {
                    type: 'object',
                    properties: {
                      name:     { type: 'string'  },
                      calories: { type: 'integer' },
                      protein:  { type: 'integer' },
                    },
                    required: ['name', 'calories', 'protein'],
                  },
                },
              },
              required: ['calories', 'protein', 'confidence'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'record_nutrition' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText.slice(0, 200));
      return res.status(500).json({ error: 'Estimation service error' });
    }

    const msg = await response.json();
    const toolUse = msg.content?.find((b) => b.type === 'tool_use');
    if (!toolUse?.input) {
      console.error('No tool_use block in response:', JSON.stringify(msg).slice(0, 200));
      return res.status(500).json({ error: 'No result from model' });
    }

    return res.status(200).json(toolUse.input);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Estimation timed out' });
    }
    console.error('estimate handler error:', err.message);
    return res.status(500).json({ error: 'Estimation failed' });
  }
}
