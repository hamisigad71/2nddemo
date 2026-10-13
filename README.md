# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## PayHero payments

PayHero requests are sent through the server-side `/api/pay` and `/api/pay/status` routes. Configure these server environment variables in Vercel:

- `PAYHERO_API_KEY`: the complete Basic Auth token from PayHero.
- `PAYHERO_CHANNEL_ID`: the active M-Pesa payment channel ID (not the PayHero account ID).
- `PAYHERO_CALLBACK_URL`: a public HTTPS URL ending in `/api/pay/callback`. If omitted, Vercel's deployment URL is used.

For local serverless development, use `vercel dev` rather than Vite's `npm run dev`, since Vite alone does not run the `/api` functions. Set `PAYHERO_CALLBACK_URL` to a public HTTPS tunnel when testing callbacks locally. Keep these values server-side; never expose the PayHero API key through a `VITE_` variable.
