use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Anchor {
    pub line: usize,
    pub symbol: String,
    pub kind: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExtensionCount {
    pub extension: String,
    pub count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RepositoryIndex {
    pub root: String,
    pub file_count: usize,
    pub extensions: Vec<ExtensionCount>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TmuxProbe {
    pub available: bool,
    pub version: Option<String>,
}

pub fn collect_files(root: &Path) -> Vec<String> {
    let mut files = Vec::new();
    visit(root, root, &mut files);
    files.sort();
    files
}

fn visit(root: &Path, current: &Path, files: &mut Vec<String>) {
    let entries = match fs::read_dir(current) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let hidden = name.to_string_lossy();

        if hidden == ".git"
            || hidden == "node_modules"
            || hidden == "dist"
            || hidden == "target"
            || hidden == ".omx"
        {
            continue;
        }

        if path.is_dir() {
            visit(root, &path, files);
        } else if let Ok(relative) = path.strip_prefix(root) {
            files.push(relative.display().to_string());
        }
    }
}

pub fn build_index(root: &Path) -> RepositoryIndex {
    let files = collect_files(root);
    let mut counts: BTreeMap<String, usize> = BTreeMap::new();

    for file in &files {
        let extension = Path::new(file)
            .extension()
            .map(|value| format!(".{}", value.to_string_lossy()))
            .unwrap_or_else(|| "<none>".to_string());
        *counts.entry(extension).or_insert(0) += 1;
    }

    let mut extensions: Vec<ExtensionCount> = counts
        .into_iter()
        .map(|(extension, count)| ExtensionCount { extension, count })
        .collect();
    extensions.sort_by(|a, b| b.count.cmp(&a.count).then(a.extension.cmp(&b.extension)));

    RepositoryIndex {
        root: root.display().to_string(),
        file_count: files.len(),
        extensions,
    }
}

pub fn extract_anchors(contents: &str) -> Vec<Anchor> {
    let mut anchors = Vec::new();

    for (index, line) in contents.lines().enumerate() {
        let trimmed = line.trim_start();
        let candidates = [
            ("function", "function "),
            ("function", "export function "),
            ("class", "class "),
            ("class", "export class "),
            ("type", "type "),
            ("enum", "enum "),
            ("const", "const "),
            ("function", "fn "),
            ("type", "struct "),
            ("enum", "enum "),
        ];

        for (kind, prefix) in candidates {
            if let Some(rest) = trimmed.strip_prefix(prefix) {
                let symbol = rest
                    .split(|ch: char| !(ch.is_alphanumeric() || ch == '_'))
                    .next()
                    .unwrap_or("")
                    .to_string();
                if !symbol.is_empty() {
                    anchors.push(Anchor {
                        line: index + 1,
                        symbol,
                        kind: kind.to_string(),
                    });
                    break;
                }
            }
        }
    }

    anchors
}

pub fn load_file(path: &Path) -> Vec<Anchor> {
    match fs::read_to_string(path) {
        Ok(contents) => extract_anchors(&contents),
        Err(_) => Vec::new(),
    }
}

pub fn resolve_path(root: &Path, input: &str) -> PathBuf {
    let candidate = PathBuf::from(input);
    if candidate.is_absolute() {
        candidate
    } else {
        root.join(candidate)
    }
}

pub fn probe_tmux() -> TmuxProbe {
    match Command::new("tmux").arg("-V").output() {
        Ok(output) if output.status.success() => TmuxProbe {
            available: true,
            version: Some(String::from_utf8_lossy(&output.stdout).trim().to_string()),
        },
        _ => TmuxProbe {
            available: false,
            version: None,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::{build_index, extract_anchors, probe_tmux};
    use std::fs::{create_dir_all, write};
    use std::path::PathBuf;

    #[test]
    fn extracts_symbols_for_ts_and_rust_like_syntax() {
        let source = r#"
export function runHud() {}
class TeamRuntime {}
const VERSION = "2.0.0";
fn collect_files() {}
"#;

        let anchors = extract_anchors(source);
        assert_eq!(anchors.len(), 4);
        assert_eq!(anchors[0].symbol, "runHud");
        assert_eq!(anchors[1].kind, "class");
        assert_eq!(anchors[2].symbol, "VERSION");
        assert_eq!(anchors[3].symbol, "collect_files");
    }

    #[test]
    fn builds_repo_index_with_extension_counts() {
        let root = PathBuf::from(format!(
            "{}/omx-explore-test-{}",
            std::env::temp_dir().display(),
            std::process::id()
        ));
        create_dir_all(root.join("src")).unwrap();
        write(root.join("src/lib.rs"), "pub fn run() {}").unwrap();
        write(root.join("package.json"), "{}").unwrap();

        let index = build_index(&root);
        assert!(index.file_count >= 2);
        assert!(index.extensions.iter().any(|entry| entry.extension == ".rs"));
    }

    #[test]
    fn tmux_probe_never_panics() {
        let probe = probe_tmux();
        assert_eq!(probe.available, probe.version.is_some());
    }
}
