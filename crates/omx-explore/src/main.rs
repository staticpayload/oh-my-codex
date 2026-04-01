use std::env;
use std::path::PathBuf;
use std::process::Command;

use omx_explore::{build_index, collect_files, load_file, probe_tmux, resolve_path};

fn print_json_lines(items: &[String]) {
    print!("[");
    for (index, item) in items.iter().enumerate() {
        if index > 0 {
            print!(",");
        }
        print!("{:?}", item);
    }
    println!("]");
}

fn print_index(root: PathBuf) {
    let index = build_index(&root);
    print!("{{\"root\":{:?},\"fileCount\":{},\"extensions\":[", index.root, index.file_count);
    for (position, entry) in index.extensions.iter().enumerate() {
        if position > 0 {
            print!(",");
        }
        print!(
            "{{\"extension\":{:?},\"count\":{}}}",
            entry.extension,
            entry.count
        );
    }
    println!("]}}");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(String::as_str).unwrap_or("help");

    match command {
        "files" => {
            let root = PathBuf::from(args.get(2).cloned().unwrap_or_else(|| ".".to_string()));
            let files = collect_files(&root);
            print_json_lines(&files);
        }
        "index" => {
            let root = PathBuf::from(args.get(2).cloned().unwrap_or_else(|| ".".to_string()));
            print_index(root);
        }
        "anchors" => {
            let cwd = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            let path = resolve_path(&cwd, args.get(2).map(String::as_str).unwrap_or("."));
            let anchors = load_file(&path);
            print!("[");
            for (index, anchor) in anchors.iter().enumerate() {
                if index > 0 {
                    print!(",");
                }
                print!(
                    "{{\"file\":{:?},\"line\":{},\"symbol\":{:?},\"kind\":{:?}}}",
                    path.display().to_string(),
                    anchor.line,
                    anchor.symbol,
                    anchor.kind
                );
            }
            println!("]");
        }
        "git-diff" => {
            let root = PathBuf::from(args.get(2).cloned().unwrap_or_else(|| ".".to_string()));
            let base = args.get(3).cloned().unwrap_or_else(|| "origin/main".to_string());
            let output = Command::new("git")
                .args(["diff", "--stat", &base])
                .current_dir(root)
                .output()
                .unwrap_or_else(|_| panic!("failed to run git diff"));
            print!("{}", String::from_utf8_lossy(&output.stdout));
        }
        "tmux-probe" => {
            let probe = probe_tmux();
            println!(
                "{{\"available\":{},\"version\":{}}}",
                probe.available,
                probe
                    .version
                    .map(|value| format!("{:?}", value))
                    .unwrap_or_else(|| "null".to_string())
            );
        }
        _ => {
            eprintln!("usage: omx-explore <files|index|anchors|git-diff|tmux-probe> [args]");
            std::process::exit(1);
        }
    }
}
