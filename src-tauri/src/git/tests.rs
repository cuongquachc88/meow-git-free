use std::path::PathBuf;
use tempfile::TempDir;
use git2::{Repository, Signature};

fn make_test_repo() -> (TempDir, PathBuf) {
    let dir = TempDir::new().unwrap();
    let path = dir.path().to_path_buf();
    let repo = Repository::init(&path).unwrap();

    // Configure identity for commits
    let mut config = repo.config().unwrap();
    config.set_str("user.name", "Test User").unwrap();
    config.set_str("user.email", "test@test.com").unwrap();

    // Initial commit
    let sig = Signature::now("Test User", "test@test.com").unwrap();
    let tree_id = {
        let mut index = repo.index().unwrap();
        index.write_tree().unwrap()
    };
    let tree = repo.find_tree(tree_id).unwrap();
    repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[]).unwrap();

    (dir, path)
}

fn make_test_file(repo_path: &PathBuf, name: &str, content: &str) {
    std::fs::write(repo_path.join(name), content).unwrap();
}

#[cfg(test)]
mod repo_tests {
    use super::*;
    use crate::git::repo;

    #[test]
    fn test_open_repo() {
        let (dir, path) = make_test_repo();
        let info = repo::open_repo(path.to_str().unwrap()).unwrap();
        assert_eq!(info.is_bare, false);
        assert!(info.head_branch.is_some());
    }

    #[test]
    fn test_init_repo() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_str().unwrap().to_string();
        let info = repo::init_repo(&path, false).unwrap();
        assert_eq!(info.is_bare, false);
        assert_eq!(info.path, path);
    }
}

#[cfg(test)]
mod branch_tests {
    use super::*;
    use crate::git::branches;

    #[test]
    fn test_list_branches() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();
        let branches = branches::list_branches(p).unwrap();
        assert!(!branches.is_empty());
        assert!(branches.iter().any(|b| b.is_head));
    }

    #[test]
    fn test_create_and_delete_branch() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();

        let b = branches::create_branch(p, "test-branch", None).unwrap();
        assert_eq!(b.name, "test-branch");

        let list = branches::list_branches(p).unwrap();
        assert!(list.iter().any(|b| b.name == "test-branch"));

        branches::delete_branch(p, "test-branch").unwrap();
        let list2 = branches::list_branches(p).unwrap();
        assert!(!list2.iter().any(|b| b.name == "test-branch"));
    }

    #[test]
    fn test_checkout_branch() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();
        branches::create_branch(p, "feature/test", None).unwrap();
        branches::checkout_branch(p, "feature/test").unwrap();
        let list = branches::list_branches(p).unwrap();
        let head = list.iter().find(|b| b.is_head).unwrap();
        assert_eq!(head.name, "feature/test");
    }
}

#[cfg(test)]
mod staging_tests {
    use super::*;
    use crate::git::staging;

    #[test]
    fn test_status_empty_on_clean_repo() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();
        let status = staging::get_status(p).unwrap();
        assert!(status.is_empty());
    }

    #[test]
    fn test_stage_and_commit() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();

        make_test_file(&path, "hello.txt", "hello world");

        let status = staging::get_status(p).unwrap();
        assert!(status.iter().any(|f| f.path == "hello.txt"));

        staging::stage_file(p, "hello.txt").unwrap();
        let status2 = staging::get_status(p).unwrap();
        let f = status2.iter().find(|f| f.path == "hello.txt").unwrap();
        assert!(f.is_staged);

        // Need git config set in env for commit signature
        let repo = Repository::open(p).unwrap();
        let mut config = repo.config().unwrap();
        config.set_str("user.name", "Test").unwrap();
        config.set_str("user.email", "t@t.com").unwrap();
        drop(repo);

        let oid = staging::create_commit(p, "Add hello.txt").unwrap();
        assert!(!oid.is_empty());
    }

    #[test]
    fn test_stash_save_and_list() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();

        let repo = Repository::open(p).unwrap();
        let mut config = repo.config().unwrap();
        config.set_str("user.name", "Test").unwrap();
        config.set_str("user.email", "t@t.com").unwrap();
        drop(repo);

        make_test_file(&path, "stash-me.txt", "stash content");
        staging::stage_file(p, "stash-me.txt").unwrap();
        staging::save_stash(p, Some("test stash")).unwrap();

        let stashes = staging::list_stashes(p).unwrap();
        assert!(!stashes.is_empty());

        staging::pop_stash(p, 0).unwrap();
        let stashes2 = staging::list_stashes(p).unwrap();
        assert!(stashes2.is_empty());
    }
}

#[cfg(test)]
mod commits_tests {
    use super::*;
    use crate::git::commits;

    #[test]
    fn test_get_log() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();
        let log = commits::get_log(p, None).unwrap();
        assert!(!log.is_empty());
        assert_eq!(log[0].summary, "Initial commit");
    }

    #[test]
    fn test_get_commit() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();
        let log = commits::get_log(p, Some(1)).unwrap();
        let id = &log[0].id;
        let commit = commits::get_commit(p, id).unwrap();
        assert_eq!(commit.id, *id);
    }
}

#[cfg(test)]
mod tags_tests {
    use super::*;
    use crate::git::tags;

    #[test]
    fn test_create_and_delete_tag() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();

        tags::create_tag(p, "v1.0.0", None, None).unwrap();
        let list = tags::list_tags(p).unwrap();
        assert!(list.iter().any(|t| t.name == "v1.0.0"));

        tags::delete_tag(p, "v1.0.0").unwrap();
        let list2 = tags::list_tags(p).unwrap();
        assert!(!list2.iter().any(|t| t.name == "v1.0.0"));
    }

    #[test]
    fn test_annotated_tag() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();

        let repo = Repository::open(p).unwrap();
        let mut config = repo.config().unwrap();
        config.set_str("user.name", "Test").unwrap();
        config.set_str("user.email", "t@t.com").unwrap();
        drop(repo);

        tags::create_tag(p, "v1.0.0-ann", None, Some("Release 1.0.0")).unwrap();
        let list = tags::list_tags(p).unwrap();
        let tag = list.iter().find(|t| t.name == "v1.0.0-ann").unwrap();
        assert_eq!(tag.message.as_deref(), Some("Release 1.0.0"));
    }
}

#[cfg(test)]
mod remotes_tests {
    use super::*;
    use crate::git::remotes;

    #[test]
    fn test_add_and_remove_remote() {
        let (dir, path) = make_test_repo();
        let p = path.to_str().unwrap();

        remotes::add_remote(p, "upstream", "https://github.com/test/test.git").unwrap();
        let list = remotes::list_remotes(p).unwrap();
        assert!(list.iter().any(|r| r.name == "upstream"));

        remotes::remove_remote(p, "upstream").unwrap();
        let list2 = remotes::list_remotes(p).unwrap();
        assert!(!list2.iter().any(|r| r.name == "upstream"));
    }
}
