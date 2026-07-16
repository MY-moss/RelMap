# E2E Tests

## Running
```bash
npm run test:e2e
```

## Structure
- `basic.spec.ts` - Navigation and page rendering
- `contacts.spec.ts` - Contact CRUD operations
- `search.spec.ts` - Global search functionality

## Notes
- These tests run against the Vite dev server (no Electron IPC)
- Uses a separate `vite.config.e2e.ts` that excludes the Electron plugin for web-only testing
- For full Electron testing, use the test mode that starts the Electron app
- IPC-dependent features will not work in web mode
