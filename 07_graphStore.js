import "dotenv/config";
import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
);

async function runQuery(query, params = {}) {
  const session = driver.session();
  try {
    return await session.run(query, params);
  } finally {
    await session.close();
  }
}

/**
 * Main Entry Point: Processes the chunks array from buildChunks
 */
export async function syncChunksToGraph(chunks) {
  for (const chunk of chunks) {
    const { file, symbol, type, parentId, language, id } = chunk.metadata;

    // 1. FORCE create the Module node first (this is your hi.py/hello.ts file)
    await createModuleNode(file, language);

    if (type === "function") {
      await createFunctionNode(symbol, file, id);

      // Determine if parent is a Class or the Module
      // If it's a top-level function, the parent is the Module (file)
      const isTopLevel = !parentId || parentId === file;
      const parentLabel = isTopLevel ? "Module" : "Class";
      const targetParentId = isTopLevel ? file : parentId;

      // If it's in a class, we need to make sure that class exists too
      if (parentLabel === "Class") {
        const className = parentId.split("#")[1];
        await createClassNode(className, file, parentId);
      }

      await linkToParent(id, targetParentId, parentLabel);
    } else if (type === "class") {
      await createClassNode(symbol, file, id);
      // Link Class -> Module
      await linkToParent(id, file, "Module");
    }
  }
}

/**
 * FIXED: Uses MERGE on the relationship only after ensuring nodes exist
 */
async function linkToParent(childId, parentId, parentType) {
  await runQuery(
    `
     MATCH (child {id: $childId})
     MATCH (parent:${parentType} {id: $parentId})
     MERGE (child)-[:DEFINED_IN]->(parent)
     `,
    { childId, parentId },
  );
}
/* ===============================
    Node Creation
================================ */

async function createModuleNode(path, language) {
  await runQuery(
    `MERGE (m:Module {id: $path})
     SET m.path = $path, m.language = $language`,
    { path, language },
  );
}

async function createFunctionNode(name, file, uid) {
  await runQuery(
    `MERGE (f:Function {id: $uid})
     SET f.name = $name, f.file = $file`,
    { uid, name, file },
  );
}

async function createClassNode(name, file, uid) {
  await runQuery(
    `MERGE (c:Class {id: $uid})
     SET c.name = $name, c.file = $file`,
    { uid, name, file },
  );
}

/* ===============================
    Relationships (The Schema Core)
================================ */

// Handles: (Function)-[:DEFINED_IN]->(Class|Module)
// AND (Class)-[:DEFINED_IN]->(Module)
async function linkToParent(childId, parentId, parentType) {
  await runQuery(
    `MATCH (child {id: $childId})
     MATCH (parent:${parentType} {id: $parentId})
     MERGE (child)-[:DEFINED_IN]->(parent)`,
    { childId, parentId },
  );
}

// module [:imports] => module
export async function linkModuleImports(fromPath, toPath) {
  await runQuery(
    `MATCH (a:Module {id: $fromPath})
     MATCH (b:Module {id: $toPath})
     MERGE (a)-[:IMPORTS]->(b)`,
    { fromPath, toPath },
  );
}

// function [:calls] => function
export async function linkFunctionCalls(fromId, toId) {
  await runQuery(
    `MATCH (a:Function {id: $fromId})
     MATCH (b:Function {id: $toId})
     MERGE (a)-[:CALLS]->(b)`,
    { fromId, toId },
  );
}
/**
 * Graph Expansion: Finds the lineage and neighbors of a symbol.
 */
export async function expandSymbol(name, filePath) {
  const uid = `${filePath}#${name}`;

  const query = `
    MATCH (n {id: $uid})
    MATCH (n)-[:DEFINED_IN|CALLS*1..2]-(neighbor)
    RETURN neighbor.id AS id,
           head(labels(neighbor)) AS type,
           neighbor.name AS name
    LIMIT 10
  `;

  const result = await runQuery(query, { uid });

  // In the Neo4j JS Driver, you must call .get() on the record
  return result.records.map(record => ({
    id: record.get("id"),
    type: record.get("type"),
    name: record.get("name") || record.get("id"), // Fallback for Modules which use 'id'
  }));
}
