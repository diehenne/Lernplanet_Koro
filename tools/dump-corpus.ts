import { mkdirSync, writeFileSync } from 'node:fs';
import { collectCorpus } from '../src/ui/speechCorpus';

mkdirSync('tools/.cache', { recursive: true });
const corpus = Object.fromEntries(collectCorpus());
writeFileSync('tools/.cache/corpus.json', JSON.stringify(corpus, null, 1));
console.log(`${Object.keys(corpus).length} Audio-Bausteine`);
