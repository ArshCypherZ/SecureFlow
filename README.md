## SecureFlow

SecureFlow is a vulnerability tracking mini-project with:

- username-based authentication
- manager and developer roles
- project onboarding from GitHub repositories
- OSV-backed dependency scanning
- ticket workflow management from discovery to resolution

## Install

```bash
npm install
npm install --prefix server
```

## Run locally

```bash
npm run dev
```

This starts both apps:

- frontend: `http://localhost:3000`
- API: `http://localhost:4000`

## Run with PostgreSQL

From the project root:

```bash
docker compose up -d
```

```bash
npm run dev
```

Register an account from the login screen:

- `manager`: can add repositories, run scans, create tickets, assign developers, and update settings
- `developer`: can view the workspace and update only the tickets assigned to them

## Build and test

```bash
npm run build
npm run build --prefix server
npm test --prefix server
```

## Supported scan manifests

The built-in scanner currently resolves dependencies from:

- `package-lock.json`
- `requirements.txt`
- `Pipfile.lock`
- `poetry.lock`
- `Cargo.lock`
- `go.mod`
  
