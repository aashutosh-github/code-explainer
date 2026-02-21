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

    // 1. Ensure the Module (File) exists for every chunk
    await createModuleNode(file, language);

    // 2. Handle Functions
    if (type === "function") {
      await createFunctionNode(symbol, file, id);

      // Determine if defined in a Class or the Module
      const parentType =
        parentId && parentId.includes("#") ? "Class" : "Module";
      const actualParentId = parentId || file;

      await linkToParent(id, actualParentId, parentType);
    }

    // 3. Handle Classes (Explicitly linking Class -> Module)
    else if (type === "class") {
      await createClassNode(symbol, file, id);

      // Based on your schema: class [:defined-in] => module
      await linkToParent(id, file, "Module");
    }
  }
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
