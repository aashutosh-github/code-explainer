# Code-explainer

This project is meant to serve as a simple AI tool that explains your codebase to you.

The data flow is as follows:

## Data Ingestion

- The root directory is accepted as an input.
- The program scans the entire directory recursively.
- An abstract syntax tree is formed from your code.
- The functions and classes are extracted from your code.
- These are then banded together as "chunks" and saved inside of a vector DB and the relationships between functions and classes are stored as nodes in a graph DB.
  - The vector/graph DB will be the one used/hosted/purchased by the user, effectively eliminating the concerns about privacy.
  - To use your own vector/graph DB, simply put the free API that you have generated in their corresponding positions in the .env file.

## Query Phase

- The user can give a query
- The vector DB fetches the top 10 most similar chunks (pieces of code).
- The graph DB fetches the relationships of these 10 chunks.
- The detailed and final prompt is built with the entire context of the code and its relationships along with the user's query.
- The final answer is returned.
