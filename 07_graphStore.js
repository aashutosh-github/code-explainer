import neo4j from "neo4j-driver";

/* ===============================
   Client
================================ */

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
);

/* ===============================
   Helpers
================================ */

async function runQuery(query, params = {}) {
  const session = driver.session();
  try {
    return await session.run(query, params);
  } finally {
    await session.close();
  }
}

/* ===============================
   Create Nodes
================================ */

export async function createFileNode(path) {
  await runQuery(
    `
    MERGE (f:File {path: $path})
    `,
    { path },
  );
}

export async function createFunctionNode(name, file) {
  await runQuery(
    `
    MERGE (fn:Function {name: $name, file: $file})
    `,
    { name, file },
  );
}

export async function createClassNode(name, file) {
  await runQuery(
    `
    MERGE (c:Class {name: $name, file: $file})
    `,
    { name, file },
  );
}

/* ===============================
   Create Relationships
================================ */

export async function linkFileDefinesSymbol(file, symbol) {
  await runQuery(
    `
    MATCH (f:File {path:$file})
    MATCH (s {name:$symbol})
    MERGE (f)-[:DEFINES]->(s)
    `,
    { file, symbol },
  );
}

export async function linkFunctionCallsFunction(from, to) {
  await runQuery(
    `
    MATCH (a:Function {name:$from})
    MATCH (b:Function {name:$to})
    MERGE (a)-[:CALLS]->(b)
    `,
    { from, to },
  );
}

export async function linkFileImportsFile(fromFile, toFile) {
  await runQuery(
    `
    MATCH (a:File {path:$fromFile})
    MATCH (b:File {path:$toFile})
    MERGE (a)-[:IMPORTS]->(b)
    `,
    { fromFile, toFile },
  );
}

/* ===============================
   Graph Expansion
================================ */

export async function expandSymbol(symbol) {
  const result = await runQuery(
    `
    MATCH (n {name:$symbol})-[:CALLS|DEFINES|IMPORTS]->(m)
    RETURN m.name AS name, labels(m)[0] AS type
    `,
    { symbol },
  );

  return result.records.map(r => ({
    symbol: r.get("name"),
    type: r.get("type"),
  }));
}
