#!/usr/bin/env node
// agents/youtube-live-extractor/digest.mjs
// Live stream digest for GhostClaw OS

import { monitorLiveStream, extractKeyPoints, storeKnowledge } from './extract-knowledge.js';

export function getYoutubeLiveExtractorStatus() {
  return {
    title: 'YouTube Live Knowledge Extractor',
    status: 'ready',
    url: 'https://www.youtube.com/live/FeX7eMenpYI',
    topic: 'LLM Deployment & Hardware Planning',
    extractionMode: 'dry-run-local-only',
    knowledgeStorage: '/Users/sirinx/Documents/Obsidian Vault/SIRINX/Live Knowledge/'
  };
}

export async function runLiveDigest() {
  const monitor = await monitorLiveStream();
  const extraction = await extractKeyPoints();
  const stored = await storeKnowledge(extraction);
  
  return {
    digest: {
      stream: monitor,
      knowledge: extraction,
      storage: stored
    },
    timestamp: new Date().toISOString()
  };
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  runLiveDigest().then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}