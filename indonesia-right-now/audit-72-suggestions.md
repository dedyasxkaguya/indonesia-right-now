# Backend Audit — 72 UX/Quality Suggestions

*Generated during backend AI chatbot planning. These suggestions apply across the existing FastAPI backend and the new AI chatbot endpoint.*

## A. Request handling & validation
1. Use Pydantic `extra="forbid"` on all inbound schemas to reject unexpected fields.
2. Validate string lengths on free-text fields (question, context) to cap token exposure.
3. Reject empty/whitespace-only `question` early with a clear validation error.
4. Reject requests where `context_data` is empty when `mode` is "IGS".
5. Provide distinct error codes for bad input vs upstream provider failure.
6. Use `max_length` on Pydantic `str` fields to bound payload size at the schema layer.
7. Normalize Unicode input (NFC) before sending it to the model to reduce variable tokenisation.
8. Reject control-character-heavy payloads that look like attempted prompt injection.
9. Cap `page_context` and `dataset_name` to a small enumerated set where possible.
10. Return `422` for malformed JSON, not a generic 500.

## B. Prompt safety & scope locking
11. Put strict "answer only from provided context" rules in the system prompt.
12. Add an explicit out-of-scope rejection phrase the frontend can detect.
13. Instruct the model to refuse arithmetic/general-knowledge questions when in data mode.
14. Instruct the model to refuse answering about unrelated domains (e.g. IRN news inside IGS).
15. Keep the system prompt in one maintainable constant, not inline in the route.
16. Add a short "context window" reminder in the prompt so the model knows the data boundary.
17. Never concatenate raw user question into instructions without quoting/escaping it.
18. Sanitize `context_data` for obvious instruction-like leading lines before sending to the model.
19. Prefer markdown/structured context over raw JSON for more stable grounding.
20. Tell the model to say "tidak ada data yang terlihat" when the visible context is empty.

## C. Model configuration & determinism
21. Use the same configured `AI_EXTRACTOR_MODEL` for chatbot answers, not a hardcoded model name.
22. Set `temperature=0` for factual chat grounded in provided data.
23. Cap `max_tokens` to a sensible answer length to avoid runaway output.
24. Do not rely on the model to do arithmetic on numbers in the context; instruct it to read and quote.
25. Do not let the model invent numbers; instruct it to say data is unavailable when missing.
26. Keep the model call on a thread/executor so it does not block the event loop.
27. Pass the model name into the response metadata for observability.
28. Log the actual model used, not just the configured name, when responses succeed.

## D. Provider error handling & resilience
29. Handle Groq `429` with exponential backoff (2s, 4s, then fail).
30. Distinguish configuration errors (401/403) from transient errors (429/timeout).
31. On provider failure, return a generic user-facing message, never the raw exception.
32. Log the real provider error server-side for debugging, redacting sensitive bits.
33. Wrap provider calls so a single bad chunk/answer does not crash the whole request.
34. Set the Groq SDK `timeout` from a configured value, not a magic number.
35. Set the Groq SDK `max_retries=0` and implement your own retry policy for 429.
36. Return 503 when AI is disabled, not a cryptic provider error.
37. Return 504 when the whole chatbot operation exceeds the request timeout.
38. Add a top-level `try/except Exception` in the route only after specific errors are mapped.

## E. Observability & logging
39. Emit a structured log with `request_id`, `mode`, `page_context`, and durations.
40. Log the Groq retry attempts and final outcome for 429s.
41. Log the model name and prompt/output token counts when available.
42. Never log the full `context_data` or user question when it may contain sensitive data.
43. Add `response.meta.ai` with model, duration, and cached flag for chat responses.
44. Keep log lines valid JSON even when a field is unexpected.
45. Add a measurable `duration_ms` from request start, not from the model call only.

## F. Security & abuse resistance
46. Apply the existing API-key middleware to the chatbot route.
47. Apply production rate limiting to the chatbot route.
48. Sanitize user input to reduce prompt-injection risk from the question field.
49. Treat `context_data` as untrusted; do not let it override system instructions.
50. Cap question length to reduce injection surface and token cost.
51. Do not echo raw user input into logs at full length.
52. Escape or quote user content when building prompts from user-controlled strings.
53. Reject requests with suspiciously large context payloads before the model call.
54. Do not return internal error details or stack traces to the frontend.

## G. Performance & cost
55. Reuse the existing Groq client pattern already present in `app/services/ai.py`.
56. Avoid fetching or regenerating `context_data` inside the chatbot endpoint; receive it from the frontend.
57. Do not cache chat answers by default unless a clear TTL/policy exists.
58. Keep the prompt compact; avoid redundant restatements of the context.
59. Use a bounded answer length to control token cost per turn.
60. If the context is very large, the frontend should summarize before sending.

## H. Contract & documentation
61. Document the exact request schema and field constraints for the frontend.
62. Document the exact success and error response shapes.
63. Document how the frontend should prepare `context_data` (Markdown, row limits, no raw JSON).
64. Document the out-of-scope rejection message and when it appears.
65. Document that the backend enforces scope, not the model ad-hoc.
66. Keep the endpoint route consistent with existing naming conventions.
67. Document which configuration settings control the chatbot behavior.
68. Version the contract implicitly via the existing envelope, not a separate version field.

## I. Data integrity & formatting
69. Format numbers as they appear in the context; do not recompute or round them.
70. Do not add commas or currency symbols unless they are already in the context.
71. Keep answers in Indonesian for the IGS chatbot mode.
72. Keep answers short, professional, and without emojis per the product tone.
