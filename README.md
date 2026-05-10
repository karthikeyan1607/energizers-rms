# Energizers Resource Management System

Frontend-only RMS for browser-based workforce planning. The app runs entirely in React and stores data locally in the browser, so it can be hosted on GitHub Pages without any backend server.

## Stack

- React + Vite
- Tailwind CSS
- Zustand
- LocalStorage
- Papa Parse
- ExcelJS

## Run Locally

```bash
npm install
npm run dev
```

On Windows PowerShell with script execution disabled:

```powershell
npm.cmd install
npm.cmd run dev
```

App URL:

- `http://localhost:5173`

## Business Workflow

1. Upload Resource Master CSV
2. Upload Program Master CSV
3. Upload Azure Boards CSV
4. Review the read-only preview
5. Click `Accept & Move to Allocation`
6. Edit allocations in the grid
7. Export Excel from the browser

## Rules Kept

- No mock or default master data
- Region comes only from the Resource Master import
- Story points convert with `allocation = story_points * 0.1`
- Hours convert with `hours = allocation * monthly_hours`
- Duplicate `resource + program` allocations merge automatically
- Remaining capacity uses `1.0 - summed resource allocation`
- Program summary groups by program and tenrox

## Sample CSV Files

- `samples/resources-master.csv`
- `samples/programs-master.csv`
- `samples/azure-boards-import.csv`

## GitHub Pages Deployment

Install dependencies first:

```bash
npm install
```

Build and deploy:

```bash
npm run deploy
```

Before deploying:

- Set `homepage` in `package.json` to your GitHub Pages URL
- Set `GITHUB_PAGES_REPO` if your repo name is not `RMS`

Example:

```bash
GITHUB_PAGES_REPO=my-repo npm run build
```
