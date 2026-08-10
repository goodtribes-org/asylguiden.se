# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

## Seeding and data migrations

**Seed data and backfills live in `bootstrap()` in `src/index.ts`, not in `database/migrations/`.**

Strapi runs `database/migrations/` *before* `bootstrap()`. A migration that depends on
seeded rows therefore runs before those rows exist, finds nothing, no-ops — and is then
recorded as already run, so it never applies. `bootstrap()` runs after the schema is
synced and the database is ready, which removes the ordering question entirely.

Two rules for anything added there:

- **Idempotent.** It runs on every start. Match on a natural key (`country.code`) and
  skip what already exists; never blindly insert or overwrite values edited in admin.
- **Never throw.** A rejected promise in `bootstrap()` stops the server from starting.
  Catch, log via `strapi.log.error`, and continue — a missing seed row can be added by
  hand, a backend that will not boot cannot.

`database/migrations/` is still the right place for schema-level changes that Strapi's
own schema sync does not cover (renaming a column, backfilling a value that has no
dependency on seeded content).

---

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
