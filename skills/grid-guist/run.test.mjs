import { describe, it, expect } from 'vitest';
import { runGridGuist, runFullAudit } from './run.js';
import { analyzeComponent } from './analyzer.js';
import { reviewComponent } from './reviewer.js';
import { auditComponent } from './auditor.js';

describe('GridGuist Engine', () => {
  describe('runGridGuist', () => {
    it('returns status complete for redesign mode', async () => {
      const result = await runGridGuist({ mode: 'redesign', target: 'dashboard' });
      expect(result.status).toBe('complete');
      expect(result.engine).toBe('gridguist-v1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('returns status complete for review mode', async () => {
      const result = await runGridGuist({ mode: 'review', target: 'dev-dashboard' });
      expect(result.status).toBe('complete');
      expect(result.mode).toBe('review');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('returns status complete for audit mode', async () => {
      const result = await runGridGuist({ mode: 'audit', target: 'dev-dashboard' });
      expect(result.status).toBe('complete');
      expect(result.mode).toBe('audit');
      expect(result.a11yScore).toBeGreaterThanOrEqual(0);
      expect(result.perfScore).toBeGreaterThanOrEqual(0);
    });

    it('returns error for unknown mode', async () => {
      const result = await runGridGuist({ mode: 'unknown' });
      expect(result.status).toBe('error');
    });

    it('defaults to redesign mode', async () => {
      const result = await runGridGuist({ target: 'test' });
      expect(result.mode).toBe('redesign');
    });
  });

  describe('analyzeComponent', () => {
    it('returns Swiss Design metrics with CSS grid content', async () => {
      const css = `
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .flex { display: flex; justify-content: center; }
        body { font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.5; }
        .card { padding: 16px; margin: 8px; color: #333; background-color: #fff; }
      `;
      const result = await analyzeComponent({ target: 'test', content: css });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.metrics.gridUsage).toBeGreaterThanOrEqual(1);
      expect(result.metrics.typographyRules).toBeGreaterThanOrEqual(3);
    });

    it('returns low score for empty content', async () => {
      const result = await analyzeComponent({ target: 'test', content: '' });
      expect(result.score).toBeLessThanOrEqual(3);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('returns high score for complete Swiss Design', async () => {
      const css = `
        .container { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
        .header { grid-column: 1 / -1; }
        .sidebar { grid-column: 1 / 4; }
        .content { grid-column: 4 / -1; }
        body { font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.6;
               font-weight: 400; letter-spacing: 0.01em; }
        h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; }
        h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 600; }
        .card { padding: 24px; margin: 16px; }
        .section { padding-top: 48px; padding-bottom: 48px; margin-bottom: 24px; }
        :root { --primary: #2563eb; --bg: #ffffff; --text: #1a1a1a; --gray: #6b7280; }
        .center { display: flex; align-items: center; justify-content: center; }
        .grid { display: grid; place-items: center; place-content: center; }
        .footer { text-align: center; }
      `;
      const result = await analyzeComponent({ target: 'test', content: css });
      expect(result.score).toBeGreaterThanOrEqual(7);
      expect(result.grade).toBe('A');
    });
  });

  describe('reviewComponent', () => {
    it('detects deep nesting', async () => {
      const css = `
        .a .b .c .d .e { color: red; }
        .x .y .z .w .v { color: blue; }
      `;
      const result = await reviewComponent({ target: 'test', content: css });
      expect(result.metrics.maxSelectorDepth).toBeGreaterThanOrEqual(4);
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
    });

    it('detects !important abuse', async () => {
      const css = `
        .a { color: red !important; }
        .b { color: blue !important; }
        .c { color: green !important; }
        .d { color: yellow !important; }
        .e { color: black !important; }
      `;
      const result = await reviewComponent({ target: 'test', content: css });
      expect(result.metrics.importantDeclarations).toBeGreaterThanOrEqual(5);
    });

    it('passes clean CSS', async () => {
      const css = `
        .container { display: grid; gap: 16px; }
        .item { padding: 8px; }
        .header { font-size: 1.5rem; }
      `;
      const result = await reviewComponent({ target: 'test', content: css });
      expect(result.passed).toBe(true);
    });
  });

  describe('auditComponent', () => {
    it('detects missing alt text', async () => {
      const html = `
        <html><body>
          <img src="photo.jpg">
          <img src="icon.png">
        </body></html>
      `;
      const result = await auditComponent({ target: 'test', content: html });
      expect(result.metrics.imagesMissingAlt).toBeGreaterThanOrEqual(2);
      expect(result.a11yIssues.length).toBeGreaterThanOrEqual(1);
    });

    it('checks viewport meta', async () => {
      const html = '<html><body><p>No viewport</p></body></html>';
      const result = await auditComponent({ target: 'test', content: html });
      expect(result.metrics.viewport).toBe(false);
      expect(result.a11yIssues).toContain('Missing viewport meta tag');
    });

    it('passes accessible HTML', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta name="viewport" content="width=device-width">
        <meta name="description" content="Test">
        </head>
        <body>
          <header><h1>Title</h1></header>
          <main>
            <section>
              <article><img src="photo.webp" alt="Photo" loading="lazy"></article>
            </section>
          </main>
          <footer></footer>
        </body></html>
      `;
      const result = await auditComponent({ target: 'test', content: html });
      expect(result.metrics.viewport).toBe(true);
      expect(result.metrics.semanticHtml).toBeGreaterThanOrEqual(4);
    });
  });

  describe('runFullAudit', () => {
    it('returns all three modules', async () => {
      const css = `
        .grid { display: grid; gap: 16px; }
        body { font-family: sans-serif; font-size: 16px; line-height: 1.5; }
        .card { padding: 16px; color: #333; background: #fff; }
      `;
      const html = `
        <html><head><meta name="viewport" content="width=device-width"></head>
        <body><h1>Test</h1><img src="a.webp" alt="A"></body></html>
      `;
      const content = css + '\n' + html;
      const result = await runFullAudit({ target: 'test', content });
      expect(result.status).toBe('complete');
      expect(result.mode).toBe('full-audit');
      expect(result.modules.design).toBeDefined();
      expect(result.modules.codeReview).toBeDefined();
      expect(result.modules.perfAudit).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.length).toBe(3);
    });
  });
});
