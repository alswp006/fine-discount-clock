🇺🇸 [한국어](./README.ko.md)

# 과태료 감경시계 (Fine Discount Clock) — Never miss a 과태료 or 범칙금 discount deadline

Korean traffic and administrative fines (과태료, 범칙금) often come with an early-payment discount that expires before most people check their mail. This app lets you register each notice, see how many days remain before the discount deadline, and compare the discounted amount against the full amount and the surcharged amount if you miss the deadline. It is built for Korean drivers and anyone who receives 과태료 or 범칙금 notices and wants to decide before the window closes. All data stays on the device, and no account is required.

## Features

- 📋 **Register notices**: Log a 과태료 or 범칙금 notice with its name, original amount, optional discounted amount, received date, opinion-submission deadline, and payment deadline.
- ⏰ **D-day countdown**: Each open notice shows its key deadline as D-n, D-DAY, or D+n, with "마감 임박" (D-0 to D-3) and "기한 지남" badges.
- 💸 **Amount comparison**: The result screen compares the discounted payment, the full amount after the discount window, and the amount with the 3% late surcharge.
- 📉 **Surcharge schedule**: For 과태료, a month-by-month table of the 3% surcharge and the 1.2% monthly heavy surcharge, up to 60 months. For 범칙금, a two-stage payment timeline with the 20% increase after the first 10-day period.
- ✅ **Record your decision**: Mark a notice as paid early, paid late, objected, or still undecided. The home screen shows a savings summary from notices paid early.
- 🔗 **Share the app**: Share the app from the result screen through the Toss share sheet, with a deep link to the home screen.
- 🗑️ **Delete notices**: Remove a notice from its result screen.
- 💾 **Local-only storage with recovery**: Notices are stored in `localStorage`. Unreadable data is backed up (up to 3 copies) before the app starts fresh, and data written by a newer app version is detected and left untouched. The app holds up to 50 notices.
- 🌗 **Dark mode**: Colors use TDS components and `--adaptive*` CSS variables.

> The calculations follow 질서위반행위규제법 and 도로교통법 as encoded in `src/lib/fineRules.ts`. Check the amounts and deadlines against the notice you received.

## Tech Stack

- **Framework**: React 18 + TypeScript 5.8, built with Vite 6 (static client-side bundle only)
- **Routing**: React Router 7 (`BrowserRouter`)
- **UI**: `@toss/tds-mobile` and `@toss/tds-mobile-ait` (Toss Design System), `@emotion/react` and `@emotion/styled`, and CSS variables for theming
- **Platform SDK**: `@apps-in-toss/web-framework` for haptics, share, review requests, analytics, and rewarded and banner ads
- **Storage**: Browser `localStorage`. No backend, database, or external API
- **Authentication**: None. The app does not use Toss login or an anonymous user key
- **Testing**: Vitest with jsdom and Testing Library; Playwright for visual smoke tests (`e2e/`)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the unit tests
npx vitest run

# 3. Production bundle (also runs the post-build dev-leak check)
npx vite build

# 4. Toss bundle, then deploy (requires your Apps-in-Toss API key)
npx ait build
npx ait deploy --api-key <YOUR_API_KEY>
```

Copy `.env.example` to `.env` and fill in the values before building. Vite inlines `VITE_*` variables at build time, so rebuild after any change.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_TOSS_AD_SLOT_ID` | Rewarded full-screen ad slot ID from the Apps-in-Toss console. It gates the surcharge schedule and timeline on the result screen. If empty, the gate opens without an ad. | No |
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID from the Apps-in-Toss console. It is shown on the home and result screens. If empty, no banner is rendered. | No |
| `VITE_SHARE_OG_URL` | Preview image URL attached to shared links (KakaoTalk and SMS previews). If empty, the link is shared without a preview image. | No |

## Project Structure

```
src/
├── App.tsx        # Route table (/, /notice/new, /notice/:id, /notice/:id/edit)
├── main.tsx       # Entry point: TDS provider and router
├── pages/         # Home, NoticeCreate, NoticeEdit, NoticeResult, NotFound
├── components/    # Shared UI (ScreenScaffold, SummaryHero, Card, ...)
│   ├── form/      # Notice form fields and submit logic
│   ├── home/      # Home screen sections and notice cards
│   └── result/    # Result screen: scenarios, record sheet, share, delete
├── lib/           # Calculation engine, rules, storage, schema, SDK wrappers
├── styles/        # Global and ad CSS
└── __tests__/     # Packet tests and shared test helpers
e2e/               # Playwright visual smoke tests
scripts/           # Build and quality-gate scripts
```

## Deployment

1. Set the `VITE_*` values in `.env`. The app name in `apps-in-toss.config.ts` (`fine-discount-clock`) must match the app name registered in the Apps-in-Toss console exactly, including case. A mismatch causes deploy error 4031.
2. Run `npx ait build` to create the Toss bundle.
3. Upload the bundle with `npx ait deploy --api-key <YOUR_API_KEY>`, or upload it through the Apps-in-Toss developer console.
4. In the developer console, submit the app for review. Before submitting, confirm the following:
   - No test ad slot, ad group, or promotion code is hardcoded. All IDs come from `.env`.
   - No `console.error` output in production.
   - No external navigation, and no custom back or close buttons. The Toss navigation bar handles both.
5. After approval, the app is listed in Toss. Reviews and ratings appear on the app's listing page.

## License

MIT
