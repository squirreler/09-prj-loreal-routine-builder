# Project 9: L'Oréal Routine Builder

## Live deployment

GitHub Pages: https://squirreler.github.io/09-prj-loreal-routine-builder/

GitHub Pages publishes the `main` branch. Commit and push website changes to update this link.

### Cloudflare deployment

https://loreal-routine-builder-project-09.dbbemailme.workers.dev

To publish your latest changes to this same URL, run `bunx wrangler deploy` from this project's folder. If needed, run `bunx wrangler login` first. Only the website files allowed by `.assetsignore` are uploaded.

Implemented: product selection and removal, accessible descriptions, saved selections, routine generation, follow-up conversation history, and the Product Search LevelUp. The Web Search LevelUp is pending a search integration after the inference server is ready.

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder. 

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Inference configuration

The browser calls this project's Cloudflare Worker at `/api/chat`. The Worker uses the existing `OPENAI_API_KEY` secret as a bearer credential for the custom inference server; it is not an OpenAI-issued key. Set `INFERENCE_URL` to the full Chat Completions endpoint and `INFERENCE_MODEL` to the server's model name using Cloudflare Worker settings. No inference endpoint is assumed while the server is being changed.

Keep local `.env` files untracked. The existing `.assetsignore` allowlist excludes all credentials and Worker source from static uploads. Never put a credential in frontend JavaScript.

Live inference and response relevance still need verification when the server is ready. The reflection rubric is present in `PROJECT-INFO.md`, but the actual reflection questions were not included.
