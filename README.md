<a href="https://api.faithfulpack.net/docs" target="_blank">
  <img
    src="https://database.faithfulpack.net/images/branding/logos/transparent/hd/main_logo.png?w=256"
    alt="Faithful Logo"
    height="256"
    align="right"
  >
</a>
<div align="center">
  <h1>Faithful API</h1>
  <h3>Public RESTful API for Faithful's texture database, add-on submission, and more.</h3>

  ![RepoSize](https://img.shields.io/github/repo-size/Faithful-Resource-Pack/API)
  ![Issues](https://img.shields.io/github/issues/Faithful-Resource-Pack/API)
  ![PullRequests](https://img.shields.io/github/issues-pr/Faithful-Resource-Pack/API)

  ![Status](https://status.faithfulpack.net/api/badge/1/status)
  ![Uptime](https://status.faithfulpack.net/api/badge/1/uptime/24?label=24h%20&labelSuffix=Uptime)
</div>

---

## Requirements

- Node.js v22+ (https://nodejs.org)
- pnpm (`corepack enable` + `corepack prepare pnpm@latest --activate`)

## Running

1. Rename the [`.env.example`](.env.example) file to `.env` and open it using any text editor.
2. Paste a live Firestorm database URL after `FIRESTORM_URL=` in the newly-created `.env` file:
  - There is a readonly test database available at https://database.faithfulpack.net/firestorm-test for public usage, which is updated every few months. You can ignore `FIRESTORM_TOKEN` if you only need read access, since it is only checked against privileged operations.
  - You can also host your own local Firestorm instance by following the instructions on its [GitHub](https://github.com/TheRolfFR/firestorm-db) repository, if you do need to test write access.
3. If you're authenticating with the Faithful Studio, follow its project README for further instructions.

From there, install the project dependencies by running:

```bash
pnpm install
```

To start the API, run:

```bash
pnpm dev
```

## Building

```bash
pnpm build
```

You can preview the production build with `pnpm start`.

## Database Reference

The Faithful API is based on the `firestorm-db` self-hosted database. Check out its [documentation](https://therolffr.github.io/firestorm-db/) for more information about creating collections, available database operations, and working with files.
