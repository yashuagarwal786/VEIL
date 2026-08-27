# VEIL Deployment Checklist

Checked items were actually verified in the current environment. Unchecked items remain blocked or require public infrastructure.

- [x] Repository inspected
- [ ] Git status clean
- [x] Backend tests pass
- [x] Frontend build passes
- [ ] PostgreSQL works
- [ ] Neo4j works
- [x] Migrations render successfully
- [x] Demo seed export works
- [ ] Demo database seed works
- [ ] Graph synchronization works against Neo4j
- [x] NLP works through automated tests
- [x] Entity resolution works through automated tests
- [x] ML analytics work through automated tests
- [x] Alerts work through automated tests
- [ ] Network Explorer verified with live graph data
- [x] Timeline API works through integration tests
- [x] Map API works through integration tests
- [x] Evidence works through integration tests
- [x] Search works through integration tests
- [x] Production environment contract configured
- [ ] GitHub updated
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] PostgreSQL deployed
- [ ] Neo4j deployed
- [ ] Production smoke test passed

## Current Blockers

- Docker Desktop is stopped, so local PostgreSQL and Neo4j cannot be started for live migration, seed, graph, or browser end-to-end checks.
- No Vercel, backend-hosting, managed PostgreSQL, or Neo4j account credentials are available in this workspace.
- No in-app browser connection is available for screenshot-based UI verification.
