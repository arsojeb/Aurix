# Chattorola Spice — React + Vite

A responsive React storefront prototype for Chattorola Spice.

## Requirements
- Node.js 18+ (recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL Vite prints in the terminal.

## Production build
```bash
npm run build
npm run preview
```
The production website is generated in `dist/`.

## Features
- Responsive branded storefront using the supplied Chattorola Spice logo
- Search and category filtering for sample spice products
- Shopping cart, quantity editing, subtotal and discount calculation
- Ten editable demo redeem codes (percentage or fixed taka)
- WhatsApp click-to-chat checkout with customer and order details
- Browser-local product, code and WhatsApp settings
- Optional payment screenshot picker (the customer must attach it manually in WhatsApp)

## Important before launch
This is a front-end starter, not a production e-commerce backend:
- Replace sample products, prices, weights and descriptions with actual product information.
- Set the store WhatsApp number under **Store settings**.
- Settings are stored in the current browser via localStorage. They do not sync across customers or devices.
- Redeem codes are validated in client-side code and are not secure against tampering. For a real public store, move product data, redeem-code validation and order records to a backend/database, and add a protected admin login.
- Configure actual delivery fees, payment instructions, privacy policy and return policy before accepting real orders.
- Google Fonts are loaded from Google Fonts; use local fonts if you need a fully offline site.

## Deploy
Import this folder into a GitHub repository and deploy it to Vercel or Netlify. Build command: `npm run build`; output directory: `dist`.
