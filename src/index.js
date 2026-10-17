#!/usr/bin/env node
// webdata-tools-mcp: MCP server (stdio) that exposes ready-made Apify Actors as typed tools.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.js';

await buildServer().connect(new StdioServerTransport());
