use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc;
use std::time::Duration;

pub struct RepoWatcher {
    _watcher: RecommendedWatcher,
}

impl RepoWatcher {
    pub fn new<F>(path: &str, mut callback: F) -> Result<Self>
    where
        F: FnMut(Vec<String>) + Send + 'static,
    {
        let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default().with_poll_interval(Duration::from_millis(500)),
        )?;

        watcher.watch(std::path::Path::new(path), RecursiveMode::Recursive)?;

        std::thread::spawn(move || {
            for event in rx {
                if let Ok(ev) = event {
                    let paths: Vec<String> = ev
                        .paths
                        .iter()
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();
                    if !paths.is_empty() {
                        callback(paths);
                    }
                }
            }
        });

        Ok(Self { _watcher: watcher })
    }
}
