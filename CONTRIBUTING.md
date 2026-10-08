# Contributing to Counsel AI

Thank you for your interest in contributing to **Counsel AI**! We welcome bug reports, feature suggestions, documentation enhancements, and pull requests.

## 🚀 Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/your-username/counsel-ai.git
   cd counsel-ai
   ```

2. **Backend Setup**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r apps/api/requirements.txt
   pytest apps/api/tests/ -v
   ```

3. **Frontend Setup**:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

## 🧪 Testing Guidelines

- Run backend tests: `pytest apps/api/tests/ -v`
- Run frontend type check: `cd apps/web && npx tsc --noEmit`
- Run Playwright tests: `npx playwright test`

## ⚖️ Legal Context Guidelines

- Keep in mind that Counsel AI is designed specifically for Kenyan SMEs and commercial context.
- All prompt changes must maintain the non-lawyer disclaimer: *"You are not a lawyer."*
- Responses should cite exact document pages using `[p. N]`.
