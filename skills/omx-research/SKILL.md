---
name: omx-research
description: "Deep research using multiple sources. Use when the user needs comprehensive research, analysis, or comparison. Triggers on 'research', 'compare', 'analyze the options', 'what are the best', or any request requiring multi-source information gathering."
---

# Research Mode

Multi-source research: gather → analyze → synthesize → report.

## Workflow

### Phase 1: Define
1. Clarify what we're researching and why
2. Identify what sources to use:
   - **Perplexity MCP** — for web search and current information
   - **Exa MCP** — for deep web search with specific queries
   - **Tavily MCP** — for structured web research
   - **Claude Code** — for codebase analysis and code-specific research

### Phase 2: Gather
1. Run searches across available MCP tools in parallel where possible
2. For codebase questions, delegate to Claude Code: `claude_code(prompt: "Analyze...")`
3. Save intermediate findings to notepad: `omx_note_write(section: "working", content: "Finding: ...")`

### Phase 3: Synthesize
1. Cross-reference findings from different sources
2. Identify consensus vs. conflicting information
3. Draw conclusions with supporting evidence

### Phase 4: Report
Present findings as:

```markdown
## Research: <topic>

### Key Findings
1. <finding with source>
2. <finding with source>

### Analysis
<synthesis and interpretation>

### Recommendations
<actionable recommendations>

### Sources
- <source 1>
- <source 2>
```

## Rules

- **Cite sources.** Every finding should reference where it came from.
- **Use multiple sources.** Don't rely on a single search — cross-reference.
- **Be objective.** Present findings without bias. Note disagreements between sources.
- **Save progress.** Use `omx_note_write` to save findings as you go.
- **Distinguish facts from opinions.** Be clear about what's established vs. speculative.
