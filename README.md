<a href="https://api.faithfulpack.net/docs" target="_blank">
  <img
    src="https://database.faithfulpack.net/images/branding/logos/transparent/hd/main_logo.png?w=256"
    alt="Faithful Logo"
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
- NodeJS v20+ https://nodejs.org
- pnpm (`corepack enable` + `corepack prepare pnpm@latest --activate`)

## Running

```bash
pnpm install
```
```bash
pnpm run dev
```

## Database Reference

This project is heavily developed around the self-hosted `firestorm-db` database. Check out its documentation at https://therolffr.github.io/firestorm-db/ for more information about available operations and making requests.
