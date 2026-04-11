# Medical Coding Assistant

A chat-based ICD-10 code lookup tool built with Next.js and OpenAI. Ask it about diagnoses, symptoms, or paste a code directly — it classifies your intent, searches the code dataset semantically, and returns the best match.

## Features

- Natural language ICD-10 code lookup ("What's the code for lower back pain?")
- Code description lookup ("What does M54.5 mean?")
- Exact code match shortcut — type a code directly for an instant answer
- Clarification prompts for vague queries
- Graceful rejection of unrelated questions
- Chat history persisted across page refreshes via localStorage
- Clear chat button
- Responsive, full-height chat UI

## How It Works

```
User message
     │
     ▼
Exact code match? ──yes──▶ Return description immediately
     │ no
     ▼
classifyIntent (GPT-4o-mini)
     │
     ├── unrelated ──────▶ Politely redirect
     ├── clarification ──▶ Ask for more clinical detail
     └── lookup_code ────▶ Semantic search via embeddings
                               │
                               ▼
                         Score ≥ 0.88? ──yes──▶ Return single best match
                               │ no
                               ▼
                         Return top 3 matches for user to choose
```

**Stack:**
- **Framework:** Next.js 14 (App Router)
- **AI:** OpenAI `gpt-4o-mini` for intent classification, `text-embedding-3-small` for semantic search
- **Language:** TypeScript
- **Styling:** Plain CSS

**Key files:**
| File | Purpose |
|---|---|
| `lib/gemini.ts` | OpenAI API calls — intent classification and embeddings |
| `lib/vectorStore.ts` | Cosine similarity search over embedded code records |
| `lib/codes.ts` | ICD-10 code dataset (19 codes) |
| `app/api/chat/route.ts` | API route — orchestrates the lookup pipeline |
| `app/page.tsx` | Chat UI |

## Getting Started

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys) with billing enabled

### Installation

```bash
git clone https://github.com/your-username/medical-coding.git
cd medical-coding
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
OPENAI_API_KEY=sk-...
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

## Sample Prompts

**Look up a code by condition:**
- "What is the ICD code for lower back pain?"
- "Code for type 2 diabetes with no complications"
- "What code do I use for a UTI?"
- "ICD code for pink eye"
- "Code for athlete's foot"
- "What's the code for acid reflux?"

**Look up a description by code:**
- "What does K21.9 mean?"
- "Describe code I10"
- "Explain code F32.9"

**Direct code entry (fastest):**
- `M54.5`, `E11.9`, `Z00.00`

**Tests clarification flow:**
- "My patient has an infection"
- "The patient has pain"

**Tests rejection:**
- "What's the capital of France?"

## Dataset

The current dataset contains 19 ICD-10 codes:

| Code | Description |
|---|---|
| A09 | Unspecified bacterial or viral infection of the stomach and intestines causing inflammation |
| E11.9 | Type 2 diabetes with no current systemic complications |
| F32.9 | First known episode of major depression, severity unspecified |
| H10.9 | Inflammation of the conjunctiva (pink eye) without a specified cause |
| I10 | High blood pressure with no known secondary medical cause |
| J01.90 | Acute inflammation of the sinus cavities, specific sinus not documented |
| K21.9 | Chronic acid reflux without visible damage to the esophageal lining |
| L70.0 | Common acne characterized by pimples and cysts |
| M54.5 | Pain in the lumbar region of the spine |
| N39.0 | Bacterial infection somewhere in the urinary system, exact location unspecified |
| R05 | Patient presenting with a cough as a primary symptom |
| R51 | Patient seeking medical attention for a headache |
| T07 | Multiple physical injuries whose specific details are unspecified |
| Z00.00 | Routine preventative health check-up for an adult, no abnormal findings |
| Z71.3 | Patient received professional advice and monitoring regarding diet and nutrition |
| Z79.82 | Patient takes aspirin on a regular ongoing basis for cardiovascular health |
| B35.3 | Fungal infection of the feet (athlete's foot) |
| C34.90 | Cancerous tumor in the lungs or bronchi, exact location unspecified |
| E03.9 | Underactive thyroid gland not producing enough hormones, cause unspecified |

To add more codes, edit `lib/codes.ts`.

