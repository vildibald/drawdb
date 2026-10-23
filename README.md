<div align="center">
    <img width="64" alt="drawDB logo" src="./src/assets/icon-dark.png">
    <h1>drawDB</h1>
</div>

<h3 align="center">Free, simple, and intuitive database schema editor and SQL generator.</h3>

<div align="center" style="margin-bottom:12px;">
    <a href="https://drawdb.vildibald.eu" style="display: flex; align-items: center;">
        <img src="https://img.shields.io/badge/Start%20building-grey" alt="drawDB"/>
    </a>
    <a href="https://discord.gg/BrjZgNrmR6" style="display: flex; align-items: center;">
        <img src="https://img.shields.io/discord/1196658537208758412.svg?label=Join%20the%20Discord&logo=discord" alt="Discord"/>
    </a>
    <a href="https://x.com/drawDB_" style="display: flex; align-items: center;">
        <img src="https://img.shields.io/badge/Follow%20us%20on%20X-blue?logo=X" alt="Follow us on X"/>
    </a>
</div>

<h3 align="center"><img width="700" style="border-radius:5px;" alt="drawDB screenshot demo" src="drawdb.png"></h3>

DrawDB is a robust and user-friendly database entity relationship diagram (ERD) editor right in your browser. Build diagrams with a few clicks, export and import SQL scripts, generate migrations, customize your editor, and more without creating an account. See the full set of features on [here](https://drawdb.app/).

This repository is a fork of [drawdb-io/drawdb](https://github.com/drawdb-io/drawdb) with automatic relationship notation and improved connector layout.

- **Live app:** [drawdb.vildibald.eu](https://drawdb.vildibald.eu)
- **Docker images:** [vildibald/drawdb on Docker Hub](https://hub.docker.com/r/vildibald/drawdb)

## What this fork adds

- **Crow’s foot notation by default**, with numeric notation available under **View → Relationship notation**.
- **Automatic cardinality** based on FK nullability and uniqueness. Supports composite FKs, primary keys, unique columns, unique indexes, and unique constraints.
- **Identifying and non-identifying relationships:** solid lines when all referencing FK columns belong to the child’s primary key; dashed lines otherwise. UNIQUE and NOT NULL alone do not make a relationship identifying.
- **Separated connectors** for relationships sharing a column, including offsets for their bends and cardinality markers.
- **Dynamic column heights:** up to three connections per side fit in a normal row. Each additional connection adds 10 pixels of height. Left and right sides are counted independently, and the busier side determines the height. Rows resize automatically as connections change.

## Getting Started

### Local Development

```bash
git clone https://github.com/vildibald/drawdb
cd drawdb
npm install
npm run dev
```

### Build

```bash
git clone https://github.com/vildibald/drawdb
cd drawdb
npm install
npm run build
```

### Run a Published Docker Image

Choose a tag from [Docker Hub](https://hub.docker.com/r/vildibald/drawdb/tags) and replace `<tag>` below:

```bash
docker run -d --name drawdb --restart unless-stopped \
  -p 3000:80 vildibald/drawdb:<tag>
```

Open `http://localhost:3000`. Tags use `YYYYMMDDHHMMSS-xxxxxxxx`, combining the local build timestamp with the first eight characters of the Git commit SHA.

### Build a Docker Image Locally

```bash
docker build -t drawdb .
docker run -p 3000:80 drawdb
```

If you want to enable sharing, set up the [server](https://github.com/drawdb-io/drawdb-server) and environment variables according to `.env.sample`. This is optional unless you need to share files.

With the Docker image, pass the server URL when starting the container. No rebuild is needed:

```bash
docker run -p 3000:80 -e VITE_BACKEND_URL=https://your-drawdb-server.example.com vildibald/drawdb:<tag>
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Support

- Join discussions: [Discord](https://discord.gg/BrjZgNrmR6)
