use std::{
    fs::{self, File},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

const TEMP_FILE_EXTENSION: &str = "tmp";

static TEMP_FILE_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Write `contents` to `path` atomically: the data is written and flushed to a
/// temporary file in the same directory, then renamed over the target. Readers
/// see either the previous content or the new one, never a truncated file.
/// The temporary file does not end with `.json`, so guide scans ignore it.
/// See issue #205.
pub fn write_atomic<P: AsRef<Path>, C: AsRef<[u8]>>(path: P, contents: C) -> io::Result<()> {
    let path = path.as_ref();
    let temp_path = temp_path_for(path)?;

    if let Err(err) = write_and_sync(&temp_path, contents.as_ref()) {
        let _ = fs::remove_file(&temp_path);
        return Err(err);
    }

    if let Err(err) = fs::rename(&temp_path, path) {
        let _ = fs::remove_file(&temp_path);
        return Err(err);
    }

    sync_parent_dir(path);

    Ok(())
}

fn temp_path_for(path: &Path) -> io::Result<PathBuf> {
    let file_name = path.file_name().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("cannot write atomically to {path:?}: missing file name"),
        )
    })?;

    let mut temp_name = std::ffi::OsString::from(".");
    temp_name.push(file_name);
    temp_name.push(format!(
        ".{}-{}.{TEMP_FILE_EXTENSION}",
        std::process::id(),
        TEMP_FILE_COUNTER.fetch_add(1, Ordering::Relaxed)
    ));

    Ok(path.with_file_name(temp_name))
}

fn write_and_sync(path: &Path, contents: &[u8]) -> io::Result<()> {
    let mut file = File::create(path)?;
    file.write_all(contents)?;
    file.sync_all()
}

#[cfg(unix)]
fn sync_parent_dir(path: &Path) {
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        if let Ok(dir) = File::open(parent) {
            let _ = dir.sync_all();
        }
    }
}

#[cfg(not(unix))]
fn sync_parent_dir(_path: &Path) {}

#[cfg(test)]
mod tests {
    use super::*;

    fn entries(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    #[test]
    fn creates_file_without_leftover() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("42.json");

        write_atomic(&target, "{\"id\":42}").unwrap();

        assert_eq!(fs::read_to_string(&target).unwrap(), "{\"id\":42}");
        assert_eq!(entries(dir.path()), vec!["42.json".to_string()]);
    }

    #[test]
    fn replaces_existing_file() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("conf.json");
        fs::write(&target, "a much longer previous content").unwrap();

        write_atomic(&target, "new").unwrap();

        assert_eq!(fs::read_to_string(&target).unwrap(), "new");
        assert_eq!(entries(dir.path()), vec!["conf.json".to_string()]);
    }

    #[test]
    fn temp_file_is_not_a_json_file() {
        let temp = temp_path_for(Path::new("guides/2022.json")).unwrap();

        assert_eq!(temp.parent().unwrap(), Path::new("guides"));
        assert_eq!(temp.extension().unwrap(), TEMP_FILE_EXTENSION);
        assert!(temp
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with(".2022.json."));
    }

    #[test]
    fn fails_and_cleans_up_when_directory_is_missing() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("missing").join("42.json");

        assert!(write_atomic(&target, "x").is_err());
        assert!(entries(dir.path()).is_empty());
    }

    #[test]
    fn fails_and_cleans_up_when_target_is_a_directory() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("42.json");
        fs::create_dir(&target).unwrap();
        fs::write(target.join("keep"), "x").unwrap();

        assert!(write_atomic(&target, "x").is_err());
        assert_eq!(entries(dir.path()), vec!["42.json".to_string()]);
    }

    #[test]
    fn rejects_path_without_file_name() {
        let err = write_atomic(Path::new(".."), "x").unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn concurrent_writes_never_expose_partial_content() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("7.json");
        let big_a = "a".repeat(256 * 1024);
        let big_b = "b".repeat(256 * 1024);
        write_atomic(&target, &big_a).unwrap();

        std::thread::scope(|s| {
            for i in 0..4 {
                let target = &target;
                let content = if i % 2 == 0 { &big_a } else { &big_b };
                s.spawn(move || {
                    for _ in 0..50 {
                        write_atomic(target, content).unwrap();
                    }
                });
            }
            s.spawn(|| {
                for _ in 0..500 {
                    let read = fs::read_to_string(&target).unwrap();
                    assert!(
                        read == big_a || read == big_b,
                        "partial read: {}",
                        read.len()
                    );
                }
            });
        });

        assert_eq!(entries(dir.path()), vec!["7.json".to_string()]);
    }
}
