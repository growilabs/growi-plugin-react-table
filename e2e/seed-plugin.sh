#!/usr/bin/env bash
#
# Registers the plugin with GROWI.
#
# GROWI's own install() downloads a GitHub archive and then writes exactly this
# document. The files are already in place via the bind mount in docker-compose.yaml,
# so the document is all that is left. `isEnabled: true` is what makes
# retrieveAllPluginResourceEntries() emit the <script> and <link> tags.
#
# Idempotent: re-running it after a code change is unnecessary but harmless.
# No GROWI restart is needed — the entries are read per request.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-$(dirname "$0")/docker-compose.yaml}"

docker compose -f "$COMPOSE_FILE" exec -T mongo mongosh growi --quiet --eval '
  const result = db.growiplugins.updateOne(
    { installedPath: "growilabs/growi-plugin-react-table" },
    {
      $set: {
        isEnabled: true,
        organizationName: "growilabs",
        origin: { url: "https://github.com/growilabs/growi-plugin-react-table" },
        meta: {
          name: "growi-plugin-react-table",
          types: ["script"],
          desc: "Adds TanStack Table features to tables on a page.",
          author: "ryu@weseek.co.jp",
        },
      },
    },
    { upsert: true },
  );
  print("growiplugins upserted: " + JSON.stringify(result));
'
