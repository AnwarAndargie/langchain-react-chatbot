# Frontend — LangChain React Chatbot

## Project description

React + TypeScript + Vite UI for a LangChain-powered chatbot. It connects to a FastAPI backend that runs an AI agent (with tools such as Google Trends and Tavily). The frontend is scaffolded with folders for **api**, **components**, **pages**, **state**, **types**, and **utils**. Work involves building the chat interface, auth flows (login/signup), and API integration on top of this structure.

---

## Requirements

### Pages

- **Login** — Email/password sign-in; link to sign up.
- **Sign up** — Email/password registration; link to login.
- **Chat** — Main app: sidebar with conversation list, message thread, and input. Shown when authenticated; unauthenticated users are redirected to login.
- **404** — Simple “page not found” with a link back to login or chat.

Entry points are **login** and **sign up** only (no landing page). After auth, users go straight to the chat view.

### Componentized design

- **Atoms:** Button, Input, Label, Icon, Badge, Spinner, Avatar.
- **Molecules:** FormField (label + input + error), MessageBubble (avatar + text + meta), ChatInput (input + send), NavLink, Card.
- **Organisms:** Sidebar (nav + conversation list), MessageList (scrollable MessageBubbles), ChatLayout (sidebar + MessageList + ChatInput), AuthForm (reusable for login/signup).
- **Layout:** App shell (header/sidebar + main), Auth layout (centered card), and a single router outlet so pages compose inside the shell or auth layout.
- **State:** API and auth live in `api/` and `state/`; components receive data and callbacks via props (optional small context for auth/theme).

### UI direction

- **Simple and clean:** Plenty of whitespace, clear hierarchy, minimal decoration. One primary action per screen where possible.
- **Neutral theme:** Grayscale base (e.g. white/off-white backgrounds, soft grays for text and borders) with one muted accent for primary actions and links (e.g. slate or blue-gray). Optional light/dark toggle using the same neutral palette.
- **Consistency:** Shared spacing scale (e.g. 4/8/16/24px), typography scale (one or two families), and the same atom/molecule set across login, signup, and chat.

---

## Atomic tasks (commit-sized)

Each task is one commit. Order respects dependencies.

| # | Task | Suggested commit message |
|---|------|--------------------------|
| 1 | **Design system** — Design tokens (neutral theme), global styles/reset, React Router. All atoms (Button, Input, Label, Icon, Badge, Spinner, Avatar) and molecules (FormField, Card, NavLink, MessageBubble, ChatInput). | `feat(ui): add design system, atoms, molecules, and router` |
| 2 | **Layouts and organisms** — Auth layout, AuthForm, App shell, Sidebar, MessageList, ChatLayout. | `feat(ui): add layouts and organisms` |
| 3 | **Pages and routing** — Login, Sign up, Chat, 404 pages. Wire routes and add protected route (redirect to login when unauthenticated). | `feat(pages): add login, signup, chat, 404 and routing` |
| 4 | **Auth** — API client base, auth API (login, register, logout), auth state/context. Connect Login and Sign up to API and redirect to chat on success. | `feat(auth): add API, state, and wire login/signup` |
| 5 | **Chat API and state** — Chat API (send message, get history), chat state. Conversation list in Sidebar (fetch, new chat, switch). | `feat(chat): add chat API, state, and sidebar conversation list` |
| 6 | **Chat page wiring** — Connect Chat page to chat API (load history, send messages). Optional: loading/error states. | `feat(chat): connect Chat page to API` |
