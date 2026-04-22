# Paperclip Office

Top-down office UI for Paperclip built with Phaser and React overlays.

## Run locally

1. Start the main Paperclip app:

   ```bash
   pnpm dev
   ```

2. In a second terminal, start the office app:

   ```bash
   pnpm dev:office
   ```

3. Open the tracker at `http://localhost:3100`, choose a company, and visit `/office`.

The tracker shortcut appends `?companyId=<selectedCompanyId>` automatically so the office loads the right company snapshot.

## Local cross-origin setup

If the office app runs on a different origin from the tracker during local development, set:

- `office/.env.local`

  ```bash
  VITE_TRACKER_ORIGIN=http://localhost:3100
  ```

- `ui/.env.local`

  ```bash
  VITE_OFFICE_URL=http://localhost:3200
  ```

## Demo checklist

- Move the boss avatar with arrow keys.
- Press `E` near an agent to open the native office dialog.
- Review queued approvals and mentions one after another in the action inbox.
- Send chat feedback to an issue thread.
- Pause or resume an agent.
- Fire an agent.
- Create and approve a hire from the office header.
- Use `View in Tracker` to jump back to the company dashboard.
