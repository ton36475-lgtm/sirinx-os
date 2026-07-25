//! Fail-closed, local filesystem persistence for the Hermes outbox.
//!
//! The adapter deliberately exposes initialization as a separate mutation.
//! Constructing a store, checking its status, and loading a snapshot never
//! create directories or files. A fixed lock and temporary snapshot name make
//! crash evidence visible: callers must investigate stale evidence instead of
//! having the adapter silently delete or overwrite it.

use std::fs::{self, File, Metadata, OpenOptions};
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::{Arc, OnceLock};

use serde::{Deserialize, Serialize};

use crate::{hash_bytes, EvidenceHash, Outbox, OutboxError, OutboxTransaction};

/// Current on-disk schema for a file-backed outbox snapshot.
pub const FILE_OUTBOX_STORE_SCHEMA_VERSION: &str = "hermes.file-outbox-store.v1";

/// Maximum admitted snapshot size (8 MiB).
pub const FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES: usize = 8 * 1024 * 1024;

const SNAPSHOT_FILE_NAME: &str = "outbox.snapshot.json";
const LOCK_FILE_NAME: &str = "outbox.snapshot.lock";
const TEMP_FILE_NAME: &str = "outbox.snapshot.tmp";
const SNAPSHOT_DIGEST_DOMAIN: &[u8] = b"hermes.file-outbox-snapshot.v1";
const LOCK_MARKER: &[u8] = b"hermes.file-outbox-store.lock.v1\n";

/// Fixed filesystem artifact identities used by the store.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileOutboxEvidenceKind {
    /// The durable JSON snapshot.
    Snapshot,
    /// The exclusive mutation lock.
    Lock,
    /// The atomic-write staging file.
    TemporarySnapshot,
}

impl std::fmt::Display for FileOutboxEvidenceKind {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            Self::Snapshot => "snapshot",
            Self::Lock => "lock",
            Self::TemporarySnapshot => "temporary snapshot",
        };
        formatter.write_str(value)
    }
}

/// Read-only summary of a file-backed outbox.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FileOutboxStoreStatus {
    /// The root or durable snapshot does not exist.
    Missing,
    /// A verified snapshot is available.
    Ready {
        /// Monotonically increasing compare-and-swap generation.
        generation: u64,
        /// Digest bound to the schema, generation, and complete outbox.
        digest: EvidenceHash,
    },
}

/// Verified snapshot returned by load and mutation operations.
#[derive(Debug, Clone, PartialEq)]
pub struct FileOutboxSnapshot {
    generation: u64,
    digest: EvidenceHash,
    outbox: Outbox,
}

impl FileOutboxSnapshot {
    /// Returns the snapshot generation.
    #[must_use]
    pub const fn generation(&self) -> u64 {
        self.generation
    }

    /// Returns the digest of the complete snapshot state.
    #[must_use]
    pub const fn digest(&self) -> &EvidenceHash {
        &self.digest
    }

    /// Returns the verified outbox.
    #[must_use]
    pub const fn outbox(&self) -> &Outbox {
        &self.outbox
    }

    /// Consumes the snapshot and returns its verified outbox.
    #[must_use]
    pub fn into_outbox(self) -> Outbox {
        self.outbox
    }
}

/// Dependency-free, local filesystem outbox persistence.
#[derive(Debug, Clone)]
pub struct FileOutboxStore {
    root: PathBuf,
    root_identity: Arc<OnceLock<FileIdentity>>,
}

impl FileOutboxStore {
    /// Constructs a store handle without creating any filesystem artifact.
    ///
    /// The root must be absolute and may not contain lexical parent traversal.
    /// Its parent must already exist. A final-component symlink is rejected;
    /// symlinked ancestors are resolved once so later evidence paths are bound
    /// to a canonical directory rather than an ambiguous lexical alias.
    pub fn new(root: impl AsRef<Path>) -> Result<Self, FileOutboxStoreError> {
        let root = canonical_store_root(root.as_ref())?;
        let root_metadata = inspect_root(&root)?;
        let root_identity = Arc::new(OnceLock::new());
        if let Some(metadata) = &root_metadata {
            root_identity
                .set(file_identity(metadata))
                .map_err(|_| FileOutboxStoreError::RootIdentityChanged)?;
        }
        let store = Self {
            root,
            root_identity,
        };
        if root_metadata.is_some() {
            let snapshot =
                inspect_evidence(&store.snapshot_path(), FileOutboxEvidenceKind::Snapshot)?;
            let lock = inspect_evidence(&store.lock_path(), FileOutboxEvidenceKind::Lock)?;
            if lock.is_some() {
                drop(store.open_validated_lock_file()?);
            } else if snapshot.is_some() {
                return Err(FileOutboxStoreError::MissingPersistentLock);
            }
            ensure_evidence_absent(
                &store.temporary_snapshot_path(),
                FileOutboxEvidenceKind::TemporarySnapshot,
            )?;
            store.verify_or_bind_root_identity()?;
        }
        Ok(store)
    }

    /// Returns the exact store root.
    #[must_use]
    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Checks verified store state without creating directories or files.
    pub fn status(&self) -> Result<FileOutboxStoreStatus, FileOutboxStoreError> {
        match self.load()? {
            Some(snapshot) => Ok(FileOutboxStoreStatus::Ready {
                generation: snapshot.generation,
                digest: snapshot.digest,
            }),
            None => Ok(FileOutboxStoreStatus::Missing),
        }
    }

    /// Loads and verifies a snapshot without creating directories or files.
    ///
    /// The persistent advisory lock is acquired without changing file content.
    /// A held lock or temporary snapshot blocks the read.
    pub fn load(&self) -> Result<Option<FileOutboxSnapshot>, FileOutboxStoreError> {
        if !self.verify_or_bind_root_identity()? {
            return Ok(None);
        }
        ensure_evidence_absent(
            &self.temporary_snapshot_path(),
            FileOutboxEvidenceKind::TemporarySnapshot,
        )?;
        let snapshot_exists =
            inspect_evidence(&self.snapshot_path(), FileOutboxEvidenceKind::Snapshot)?.is_some();
        let lock_exists =
            inspect_evidence(&self.lock_path(), FileOutboxEvidenceKind::Lock)?.is_some();
        if !lock_exists {
            return if snapshot_exists {
                Err(FileOutboxStoreError::MissingPersistentLock)
            } else {
                Ok(None)
            };
        }
        let _lock = self.acquire_lock()?;
        ensure_evidence_absent(
            &self.temporary_snapshot_path(),
            FileOutboxEvidenceKind::TemporarySnapshot,
        )?;
        let snapshot = self.load_snapshot_under_lock()?;
        self.verify_or_bind_root_identity()?;
        Ok(snapshot)
    }

    /// Explicitly creates an empty generation-zero snapshot.
    ///
    /// Only the final root directory is created; its parent must already exist
    /// as a real directory. Existing lock, temp, snapshot, or symlink evidence
    /// is never removed or overwritten.
    pub fn initialize(&self) -> Result<FileOutboxSnapshot, FileOutboxStoreError> {
        self.ensure_root_for_initialize()?;
        ensure_evidence_absent(
            &self.temporary_snapshot_path(),
            FileOutboxEvidenceKind::TemporarySnapshot,
        )?;
        let snapshot_exists =
            inspect_evidence(&self.snapshot_path(), FileOutboxEvidenceKind::Snapshot)?.is_some();
        let lock_exists =
            inspect_evidence(&self.lock_path(), FileOutboxEvidenceKind::Lock)?.is_some();
        if snapshot_exists && !lock_exists {
            return Err(FileOutboxStoreError::MissingPersistentLock);
        }
        if !lock_exists {
            self.create_persistent_lock_if_missing()?;
        }
        let _lock = self.acquire_lock()?;
        ensure_evidence_absent(
            &self.temporary_snapshot_path(),
            FileOutboxEvidenceKind::TemporarySnapshot,
        )?;
        if inspect_evidence(&self.snapshot_path(), FileOutboxEvidenceKind::Snapshot)?.is_some() {
            return Err(FileOutboxStoreError::AlreadyInitialized);
        }

        let outbox = Outbox::new();
        outbox
            .verify_integrity()
            .map_err(FileOutboxStoreError::OutboxIntegrity)?;
        let envelope = SnapshotEnvelope::new(0, outbox)?;
        let committed = self.commit_envelope(&envelope)?;
        Ok(committed)
    }

    /// Applies one compare-and-swap mutation under an exclusive file lock.
    ///
    /// The mutation runs against a clone. A rejected mutation cannot modify the
    /// currently durable snapshot. The closure may only return domain-level
    /// [`OutboxError`] values; filesystem failures remain adapter errors.
    pub fn mutate<T, F>(
        &self,
        expected_generation: u64,
        expected_digest: &EvidenceHash,
        mutation: F,
    ) -> Result<(FileOutboxSnapshot, T), FileOutboxStoreError>
    where
        F: FnOnce(&mut OutboxTransaction<'_>) -> Result<T, OutboxError>,
    {
        if !self.verify_or_bind_root_identity()? {
            return Err(FileOutboxStoreError::NotInitialized);
        }
        ensure_evidence_absent(
            &self.temporary_snapshot_path(),
            FileOutboxEvidenceKind::TemporarySnapshot,
        )?;
        let _lock = self.acquire_lock()?;
        ensure_evidence_absent(
            &self.temporary_snapshot_path(),
            FileOutboxEvidenceKind::TemporarySnapshot,
        )?;

        let current = self
            .load_snapshot_under_lock()?
            .ok_or(FileOutboxStoreError::NotInitialized)?;
        if current.generation != expected_generation {
            return Err(FileOutboxStoreError::GenerationMismatch {
                expected: expected_generation,
                actual: current.generation,
            });
        }
        if &current.digest != expected_digest {
            return Err(FileOutboxStoreError::SnapshotDigestCasMismatch {
                expected: expected_digest.clone(),
                actual: current.digest,
            });
        }

        let mut candidate = current.outbox.clone();
        let mut transaction = OutboxTransaction::new(&mut candidate);
        let output = mutation(&mut transaction).map_err(FileOutboxStoreError::MutationRejected)?;
        candidate
            .verify_integrity()
            .map_err(FileOutboxStoreError::OutboxIntegrity)?;
        let generation = current
            .generation
            .checked_add(1)
            .ok_or(FileOutboxStoreError::GenerationOverflow)?;
        let envelope = SnapshotEnvelope::new(generation, candidate)?;
        let committed = self.commit_envelope(&envelope)?;
        Ok((committed, output))
    }

    fn snapshot_path(&self) -> PathBuf {
        self.root.join(SNAPSHOT_FILE_NAME)
    }

    fn lock_path(&self) -> PathBuf {
        self.root.join(LOCK_FILE_NAME)
    }

    fn temporary_snapshot_path(&self) -> PathBuf {
        self.root.join(TEMP_FILE_NAME)
    }

    fn ensure_root_for_initialize(&self) -> Result<(), FileOutboxStoreError> {
        if self.verify_or_bind_root_identity()? {
            return Ok(());
        }
        let parent = self
            .root
            .parent()
            .ok_or(FileOutboxStoreError::InvalidRootPath)?;
        let parent_metadata =
            fs::symlink_metadata(parent).map_err(|source| FileOutboxStoreError::Io {
                operation: "inspect store parent",
                source,
            })?;
        if parent_metadata.file_type().is_symlink() {
            return Err(FileOutboxStoreError::SymlinkedStoreParent);
        }
        if !parent_metadata.is_dir() {
            return Err(FileOutboxStoreError::StoreParentNotDirectory);
        }
        let mut directory_builder = fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt as _;
            directory_builder.mode(0o700);
        }
        match directory_builder.create(&self.root) {
            Ok(()) => {
                sync_directory(parent, "sync store parent after root creation")?;
                if self.verify_or_bind_root_identity()? {
                    Ok(())
                } else {
                    Err(FileOutboxStoreError::RootIdentityChanged)
                }
            }
            Err(source) if source.kind() == io::ErrorKind::AlreadyExists => {
                if self.verify_or_bind_root_identity()? {
                    Ok(())
                } else {
                    Err(FileOutboxStoreError::NotInitialized)
                }
            }
            Err(source) => Err(FileOutboxStoreError::Io {
                operation: "create store root",
                source,
            }),
        }
    }

    fn verify_or_bind_root_identity(&self) -> Result<bool, FileOutboxStoreError> {
        let Some(before) = inspect_root(&self.root)? else {
            return if self.root_identity.get().is_some() {
                Err(FileOutboxStoreError::RootIdentityChanged)
            } else {
                Ok(false)
            };
        };
        let observed = file_identity(&before);
        if let Some(expected) = self.root_identity.get() {
            if expected != &observed {
                return Err(FileOutboxStoreError::RootIdentityChanged);
            }
        } else if self.root_identity.set(observed.clone()).is_err()
            && self.root_identity.get() != Some(&observed)
        {
            return Err(FileOutboxStoreError::RootIdentityChanged);
        }
        let Some(after) = inspect_root(&self.root)? else {
            return Err(FileOutboxStoreError::RootIdentityChanged);
        };
        if file_identity(&after) != observed {
            return Err(FileOutboxStoreError::RootIdentityChanged);
        }
        Ok(true)
    }

    fn create_persistent_lock_if_missing(&self) -> Result<(), FileOutboxStoreError> {
        let path = self.lock_path();
        if inspect_evidence(&path, FileOutboxEvidenceKind::Lock)?.is_some() {
            drop(self.open_validated_lock_file()?);
            return Ok(());
        }
        let mut file = match create_private_read_write_file(&path) {
            Ok(file) => file,
            Err(source) if source.kind() == io::ErrorKind::AlreadyExists => {
                drop(self.open_validated_lock_file()?);
                return Ok(());
            }
            Err(source) => {
                return Err(FileOutboxStoreError::Io {
                    operation: "create persistent outbox lock",
                    source,
                });
            }
        };
        file.write_all(LOCK_MARKER)
            .map_err(|source| FileOutboxStoreError::Io {
                operation: "write persistent outbox lock",
                source,
            })?;
        file.sync_all().map_err(|source| FileOutboxStoreError::Io {
            operation: "sync persistent outbox lock",
            source,
        })?;
        drop(file);
        sync_directory(&self.root, "sync store root after lock creation")?;
        self.verify_or_bind_root_identity()?;
        drop(self.open_validated_lock_file()?);
        Ok(())
    }

    fn open_validated_lock_file(&self) -> Result<File, FileOutboxStoreError> {
        let path = self.lock_path();
        let before = inspect_evidence(&path, FileOutboxEvidenceKind::Lock)?
            .ok_or(FileOutboxStoreError::MissingPersistentLock)?;
        validate_lock_permissions(&before)?;
        let mut file = OpenOptions::new()
            .read(true)
            .write(true)
            .open(&path)
            .map_err(|source| FileOutboxStoreError::Io {
                operation: "open persistent outbox lock",
                source,
            })?;
        let opened = file.metadata().map_err(|source| FileOutboxStoreError::Io {
            operation: "inspect opened persistent outbox lock",
            source,
        })?;
        if !opened.is_file() || !same_file(&before, &opened) {
            return Err(FileOutboxStoreError::EvidenceChanged {
                kind: FileOutboxEvidenceKind::Lock,
            });
        }
        let mut marker = Vec::with_capacity(LOCK_MARKER.len() + 1);
        (&mut file)
            .take((LOCK_MARKER.len() + 1) as u64)
            .read_to_end(&mut marker)
            .map_err(|source| FileOutboxStoreError::Io {
                operation: "read persistent outbox lock",
                source,
            })?;
        if marker != LOCK_MARKER {
            return Err(FileOutboxStoreError::MalformedPersistentLock);
        }
        let after = inspect_evidence(&path, FileOutboxEvidenceKind::Lock)?.ok_or(
            FileOutboxStoreError::EvidenceChanged {
                kind: FileOutboxEvidenceKind::Lock,
            },
        )?;
        if !same_file(&before, &after) {
            return Err(FileOutboxStoreError::EvidenceChanged {
                kind: FileOutboxEvidenceKind::Lock,
            });
        }
        self.verify_or_bind_root_identity()?;
        Ok(file)
    }

    fn acquire_lock(&self) -> Result<LockGuard, FileOutboxStoreError> {
        let file = self.open_validated_lock_file()?;
        match File::try_lock(&file) {
            Ok(()) => {}
            Err(std::fs::TryLockError::WouldBlock) => {
                return Err(FileOutboxStoreError::StoreBusy);
            }
            Err(std::fs::TryLockError::Error(source)) => {
                return Err(FileOutboxStoreError::Io {
                    operation: "acquire persistent outbox lock",
                    source,
                });
            }
        }
        let current = inspect_evidence(&self.lock_path(), FileOutboxEvidenceKind::Lock)?.ok_or(
            FileOutboxStoreError::EvidenceChanged {
                kind: FileOutboxEvidenceKind::Lock,
            },
        )?;
        let opened = file.metadata().map_err(|source| FileOutboxStoreError::Io {
            operation: "inspect locked persistent outbox lock",
            source,
        })?;
        if !same_file(&current, &opened) {
            return Err(FileOutboxStoreError::EvidenceChanged {
                kind: FileOutboxEvidenceKind::Lock,
            });
        }
        Ok(LockGuard { file })
    }

    fn load_snapshot_under_lock(&self) -> Result<Option<FileOutboxSnapshot>, FileOutboxStoreError> {
        let path = self.snapshot_path();
        let Some(bytes) = read_bounded_snapshot(&path)? else {
            return Ok(None);
        };
        let envelope: SnapshotEnvelope =
            serde_json::from_slice(&bytes).map_err(FileOutboxStoreError::MalformedSnapshot)?;
        envelope.verify()?;
        Ok(Some(envelope.into_verified_snapshot()))
    }

    fn commit_envelope(
        &self,
        envelope: &SnapshotEnvelope,
    ) -> Result<FileOutboxSnapshot, FileOutboxStoreError> {
        self.atomic_write(envelope)?;
        let readback = self
            .load_snapshot_under_lock()
            .map_err(|source| FileOutboxStoreError::CommitReadbackFailed {
                generation: envelope.generation,
                digest: envelope.digest.clone(),
                source: Box::new(source),
            })?
            .ok_or_else(|| FileOutboxStoreError::CommitReadbackMismatch {
                generation: envelope.generation,
                digest: envelope.digest.clone(),
            })?;
        if readback.generation != envelope.generation
            || readback.digest != envelope.digest
            || readback.outbox != envelope.outbox
        {
            return Err(FileOutboxStoreError::CommitReadbackMismatch {
                generation: envelope.generation,
                digest: envelope.digest.clone(),
            });
        }
        Ok(readback)
    }

    fn atomic_write(&self, envelope: &SnapshotEnvelope) -> Result<(), FileOutboxStoreError> {
        let bytes = serialize_snapshot_bounded(envelope)?;

        self.verify_or_bind_root_identity()?;
        let temporary_path = self.temporary_snapshot_path();
        let mut temporary = match create_private_file(&temporary_path) {
            Ok(file) => file,
            Err(source) if source.kind() == io::ErrorKind::AlreadyExists => {
                return evidence_present_error(
                    &temporary_path,
                    FileOutboxEvidenceKind::TemporarySnapshot,
                );
            }
            Err(source) => {
                return Err(FileOutboxStoreError::Io {
                    operation: "create temporary outbox snapshot",
                    source,
                });
            }
        };
        temporary
            .write_all(&bytes)
            .map_err(|source| FileOutboxStoreError::Io {
                operation: "write temporary outbox snapshot",
                source,
            })?;
        temporary
            .sync_all()
            .map_err(|source| FileOutboxStoreError::Io {
                operation: "sync temporary outbox snapshot",
                source,
            })?;
        drop(temporary);

        self.verify_or_bind_root_identity()?;
        fs::rename(&temporary_path, self.snapshot_path()).map_err(|source| {
            FileOutboxStoreError::Io {
                operation: "replace durable outbox snapshot",
                source,
            }
        })?;
        self.verify_or_bind_root_identity()?;
        let directory = File::open(&self.root).map_err(|source| {
            FileOutboxStoreError::CommitDurabilityUnknown {
                generation: envelope.generation,
                digest: envelope.digest.clone(),
                operation: "open store directory for sync",
                source,
            }
        })?;
        directory
            .sync_all()
            .map_err(|source| FileOutboxStoreError::CommitDurabilityUnknown {
                generation: envelope.generation,
                digest: envelope.digest.clone(),
                operation: "sync store directory",
                source,
            })
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SnapshotEnvelope {
    schema_version: String,
    generation: u64,
    outbox: Outbox,
    digest: EvidenceHash,
}

impl SnapshotEnvelope {
    fn new(generation: u64, outbox: Outbox) -> Result<Self, FileOutboxStoreError> {
        let digest = snapshot_digest(FILE_OUTBOX_STORE_SCHEMA_VERSION, generation, &outbox)?;
        Ok(Self {
            schema_version: FILE_OUTBOX_STORE_SCHEMA_VERSION.to_owned(),
            generation,
            outbox,
            digest,
        })
    }

    fn verify(&self) -> Result<(), FileOutboxStoreError> {
        if self.schema_version != FILE_OUTBOX_STORE_SCHEMA_VERSION {
            return Err(FileOutboxStoreError::UnsupportedSchema);
        }
        let computed = snapshot_digest(&self.schema_version, self.generation, &self.outbox)?;
        if computed != self.digest {
            return Err(FileOutboxStoreError::SnapshotDigestMismatch);
        }
        self.outbox
            .verify_integrity()
            .map_err(FileOutboxStoreError::OutboxIntegrity)
    }

    fn into_verified_snapshot(self) -> FileOutboxSnapshot {
        FileOutboxSnapshot {
            generation: self.generation,
            digest: self.digest,
            outbox: self.outbox,
        }
    }
}

#[derive(Serialize)]
#[serde(deny_unknown_fields)]
struct UnsignedSnapshot<'a> {
    schema_version: &'a str,
    generation: u64,
    outbox: &'a Outbox,
}

fn snapshot_digest(
    schema_version: &str,
    generation: u64,
    outbox: &Outbox,
) -> Result<EvidenceHash, FileOutboxStoreError> {
    let unsigned = UnsignedSnapshot {
        schema_version,
        generation,
        outbox,
    };
    // Struct fields have a fixed declaration order, Outbox indexes are
    // BTreeMaps, and serde_json::Map uses deterministic key ordering in this
    // dependency configuration. Stream directly into the bounded writer so
    // digest construction cannot allocate an unbounded Value clone.
    let deterministic = serialize_json_bounded(&unsigned)?;
    Ok(hash_bytes(SNAPSHOT_DIGEST_DOMAIN, &[&deterministic]))
}

fn serialize_snapshot_bounded(
    envelope: &SnapshotEnvelope,
) -> Result<Vec<u8>, FileOutboxStoreError> {
    serialize_json_bounded(envelope)
}

fn serialize_json_bounded<T: Serialize>(value: &T) -> Result<Vec<u8>, FileOutboxStoreError> {
    let mut writer = BoundedSnapshotWriter::new(FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES);
    if let Err(source) = serde_json::to_writer(&mut writer, value) {
        if let Some(actual) = writer.overflow_at {
            return Err(FileOutboxStoreError::SnapshotTooLarge {
                actual,
                maximum: FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES as u64,
            });
        }
        return Err(FileOutboxStoreError::Serialization(source));
    }
    Ok(writer.bytes)
}

struct BoundedSnapshotWriter {
    bytes: Vec<u8>,
    maximum: usize,
    overflow_at: Option<u64>,
}

impl BoundedSnapshotWriter {
    fn new(maximum: usize) -> Self {
        Self {
            bytes: Vec::with_capacity(maximum.min(64 * 1024)),
            maximum,
            overflow_at: None,
        }
    }
}

impl Write for BoundedSnapshotWriter {
    fn write(&mut self, buffer: &[u8]) -> io::Result<usize> {
        let attempted = self
            .bytes
            .len()
            .checked_add(buffer.len())
            .ok_or_else(|| io::Error::other("snapshot size overflow"))?;
        if attempted > self.maximum {
            self.overflow_at = Some(attempted as u64);
            return Err(io::Error::other("snapshot exceeds bounded serializer"));
        }
        self.bytes.extend_from_slice(buffer);
        Ok(buffer.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn validate_root_path(root: &Path) -> Result<(), FileOutboxStoreError> {
    if !root.is_absolute() {
        return Err(FileOutboxStoreError::InvalidRootPath);
    }
    let mut normal_components = 0_usize;
    for component in root.components() {
        match component {
            Component::ParentDir | Component::CurDir => {
                return Err(FileOutboxStoreError::InvalidRootPath);
            }
            Component::Normal(_) => normal_components += 1,
            Component::RootDir | Component::Prefix(_) => {}
        }
    }
    if normal_components == 0 {
        return Err(FileOutboxStoreError::InvalidRootPath);
    }
    Ok(())
}

fn canonical_store_root(root: &Path) -> Result<PathBuf, FileOutboxStoreError> {
    validate_root_path(root)?;
    match fs::symlink_metadata(root) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(FileOutboxStoreError::SymlinkedStoreRoot)
        }
        Ok(metadata) if !metadata.is_dir() => Err(FileOutboxStoreError::StoreRootNotDirectory),
        Ok(_) => fs::canonicalize(root).map_err(|source| FileOutboxStoreError::Io {
            operation: "canonicalize store root",
            source,
        }),
        Err(source) if source.kind() == io::ErrorKind::NotFound => {
            let parent = root.parent().ok_or(FileOutboxStoreError::InvalidRootPath)?;
            let file_name = root
                .file_name()
                .ok_or(FileOutboxStoreError::InvalidRootPath)?;
            let canonical_parent =
                fs::canonicalize(parent).map_err(|source| FileOutboxStoreError::Io {
                    operation: "canonicalize store parent",
                    source,
                })?;
            let parent_metadata = fs::symlink_metadata(&canonical_parent).map_err(|source| {
                FileOutboxStoreError::Io {
                    operation: "inspect canonical store parent",
                    source,
                }
            })?;
            if !parent_metadata.is_dir() {
                return Err(FileOutboxStoreError::StoreParentNotDirectory);
            }
            Ok(canonical_parent.join(file_name))
        }
        Err(source) => Err(FileOutboxStoreError::Io {
            operation: "inspect store root",
            source,
        }),
    }
}

fn inspect_root(root: &Path) -> Result<Option<Metadata>, FileOutboxStoreError> {
    match fs::symlink_metadata(root) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(FileOutboxStoreError::SymlinkedStoreRoot)
        }
        Ok(metadata) if !metadata.is_dir() => Err(FileOutboxStoreError::StoreRootNotDirectory),
        Ok(metadata) => Ok(Some(metadata)),
        Err(source) if source.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(source) => Err(FileOutboxStoreError::Io {
            operation: "inspect store root",
            source,
        }),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct FileIdentity {
    #[cfg(unix)]
    device: u64,
    #[cfg(unix)]
    inode: u64,
    #[cfg(not(unix))]
    created: Option<std::time::SystemTime>,
    #[cfg(not(unix))]
    modified: Option<std::time::SystemTime>,
}

fn file_identity(metadata: &Metadata) -> FileIdentity {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt as _;

        FileIdentity {
            device: metadata.dev(),
            inode: metadata.ino(),
        }
    }
    #[cfg(not(unix))]
    {
        FileIdentity {
            created: metadata.created().ok(),
            modified: metadata.modified().ok(),
        }
    }
}

fn inspect_evidence(
    path: &Path,
    kind: FileOutboxEvidenceKind,
) -> Result<Option<Metadata>, FileOutboxStoreError> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(FileOutboxStoreError::SymlinkedEvidence { kind })
        }
        Ok(metadata) if !metadata.is_file() => {
            Err(FileOutboxStoreError::EvidenceNotRegularFile { kind })
        }
        Ok(metadata) => Ok(Some(metadata)),
        Err(source) if source.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(source) => Err(FileOutboxStoreError::Io {
            operation: "inspect outbox evidence",
            source,
        }),
    }
}

fn create_private_file(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    options.open(path)
}

fn create_private_read_write_file(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.read(true).write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    options.open(path)
}

#[cfg(unix)]
fn validate_lock_permissions(metadata: &Metadata) -> Result<(), FileOutboxStoreError> {
    use std::os::unix::fs::PermissionsExt as _;

    if metadata.permissions().mode() & 0o777 != 0o600 {
        return Err(FileOutboxStoreError::UnsafePersistentLockPermissions);
    }
    Ok(())
}

#[cfg(not(unix))]
fn validate_lock_permissions(_metadata: &Metadata) -> Result<(), FileOutboxStoreError> {
    Ok(())
}

fn sync_directory(path: &Path, operation: &'static str) -> Result<(), FileOutboxStoreError> {
    let directory =
        File::open(path).map_err(|source| FileOutboxStoreError::Io { operation, source })?;
    directory
        .sync_all()
        .map_err(|source| FileOutboxStoreError::Io { operation, source })
}

fn ensure_evidence_absent(
    path: &Path,
    kind: FileOutboxEvidenceKind,
) -> Result<(), FileOutboxStoreError> {
    if inspect_evidence(path, kind)?.is_some() {
        return Err(FileOutboxStoreError::UnresolvedEvidence { kind });
    }
    Ok(())
}

fn evidence_present_error<T>(
    path: &Path,
    kind: FileOutboxEvidenceKind,
) -> Result<T, FileOutboxStoreError> {
    match inspect_evidence(path, kind)? {
        Some(_) => Err(FileOutboxStoreError::UnresolvedEvidence { kind }),
        None => Err(FileOutboxStoreError::EvidenceChanged { kind }),
    }
}

fn read_bounded_snapshot(path: &Path) -> Result<Option<Vec<u8>>, FileOutboxStoreError> {
    let Some(before) = inspect_evidence(path, FileOutboxEvidenceKind::Snapshot)? else {
        return Ok(None);
    };
    if before.len() > FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES as u64 {
        return Err(FileOutboxStoreError::SnapshotTooLarge {
            actual: before.len(),
            maximum: FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES as u64,
        });
    }
    let file = File::open(path).map_err(|source| FileOutboxStoreError::Io {
        operation: "open outbox snapshot",
        source,
    })?;
    let opened = file.metadata().map_err(|source| FileOutboxStoreError::Io {
        operation: "inspect opened outbox snapshot",
        source,
    })?;
    if !opened.is_file() || !same_file(&before, &opened) {
        return Err(FileOutboxStoreError::EvidenceChanged {
            kind: FileOutboxEvidenceKind::Snapshot,
        });
    }

    let mut bytes = Vec::with_capacity(before.len() as usize);
    file.take((FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|source| FileOutboxStoreError::Io {
            operation: "read outbox snapshot",
            source,
        })?;
    if bytes.len() > FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES {
        return Err(FileOutboxStoreError::SnapshotTooLarge {
            actual: bytes.len() as u64,
            maximum: FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES as u64,
        });
    }
    let Some(after) = inspect_evidence(path, FileOutboxEvidenceKind::Snapshot)? else {
        return Err(FileOutboxStoreError::EvidenceChanged {
            kind: FileOutboxEvidenceKind::Snapshot,
        });
    };
    if !same_file(&before, &after) {
        return Err(FileOutboxStoreError::EvidenceChanged {
            kind: FileOutboxEvidenceKind::Snapshot,
        });
    }
    Ok(Some(bytes))
}

#[cfg(unix)]
fn same_file(left: &Metadata, right: &Metadata) -> bool {
    use std::os::unix::fs::MetadataExt as _;

    left.dev() == right.dev() && left.ino() == right.ino()
}

#[cfg(not(unix))]
fn same_file(left: &Metadata, right: &Metadata) -> bool {
    left.file_type() == right.file_type()
        && left.len() == right.len()
        && left.modified().ok() == right.modified().ok()
}

#[derive(Debug)]
struct LockGuard {
    file: File,
}

impl Drop for LockGuard {
    fn drop(&mut self) {
        let _ = File::unlock(&self.file);
    }
}

/// Filesystem, snapshot, integrity, or compare-and-swap failure.
#[derive(Debug, thiserror::Error)]
pub enum FileOutboxStoreError {
    /// Store roots must be bounded absolute paths without parent traversal.
    #[error("file outbox store root must be an absolute non-escaping path")]
    InvalidRootPath,
    /// A root symlink could redirect durable state outside the admitted path.
    #[error("file outbox store root must not be a symlink")]
    SymlinkedStoreRoot,
    /// The root may not replace an unrelated regular file or device.
    #[error("file outbox store root is not a directory")]
    StoreRootNotDirectory,
    /// A handle remains bound to the exact directory it first observed.
    #[error("file outbox store root identity changed")]
    RootIdentityChanged,
    /// Initialization never traverses a symlinked immediate parent.
    #[error("file outbox store parent must not be a symlink")]
    SymlinkedStoreParent,
    /// Initialization requires an existing, real parent directory.
    #[error("file outbox store parent is not a directory")]
    StoreParentNotDirectory,
    /// Only an explicit first initialization may create the snapshot.
    #[error("file outbox store is already initialized")]
    AlreadyInitialized,
    /// Mutations require an existing, verified snapshot.
    #[error("file outbox store is not initialized")]
    NotInitialized,
    /// A durable snapshot is never admitted without its persistent lock file.
    #[error("file outbox persistent lock is missing")]
    MissingPersistentLock,
    /// Lock contents use a fixed, closed marker rather than arbitrary bytes.
    #[error("file outbox persistent lock marker is malformed")]
    MalformedPersistentLock,
    /// The persistent lock must remain owner-only on Unix hosts.
    #[error("file outbox persistent lock permissions are not 0600")]
    UnsafePersistentLockPermissions,
    /// Another process currently owns the advisory lock.
    #[error("file outbox store is busy")]
    StoreBusy,
    /// Symlink evidence is never followed.
    #[error("file outbox {kind} evidence must not be a symlink")]
    SymlinkedEvidence {
        /// Rejected artifact.
        kind: FileOutboxEvidenceKind,
    },
    /// Fixed evidence paths may only hold regular files.
    #[error("file outbox {kind} evidence is not a regular file")]
    EvidenceNotRegularFile {
        /// Rejected artifact.
        kind: FileOutboxEvidenceKind,
    },
    /// Lock and temp artifacts are retained for investigation rather than
    /// silently deleted or overwritten.
    #[error("unresolved file outbox {kind} evidence is present")]
    UnresolvedEvidence {
        /// Blocking artifact.
        kind: FileOutboxEvidenceKind,
    },
    /// An evidence path changed identity while it was inspected.
    #[error("file outbox {kind} evidence changed during inspection")]
    EvidenceChanged {
        /// Changed artifact.
        kind: FileOutboxEvidenceKind,
    },
    /// Snapshot reads and writes are bounded before deserialization.
    #[error("file outbox snapshot is {actual} bytes; maximum is {maximum}")]
    SnapshotTooLarge {
        /// Observed bytes.
        actual: u64,
        /// Maximum admitted bytes.
        maximum: u64,
    },
    /// Unknown fields and malformed values are rejected by strict serde types.
    #[error("file outbox snapshot is malformed: {0}")]
    MalformedSnapshot(#[source] serde_json::Error),
    /// Only the current exact schema is admitted.
    #[error("file outbox snapshot schema is unsupported")]
    UnsupportedSchema,
    /// The snapshot content no longer matches its bound digest.
    #[error("file outbox snapshot digest mismatch")]
    SnapshotDigestMismatch,
    /// Rename completed but directory durability could not be proven.
    #[error(
        "file outbox commit durability is unknown after {operation} for generation {generation} ({digest})"
    )]
    CommitDurabilityUnknown {
        /// Generation that may have become visible.
        generation: u64,
        /// Digest of the generation that may have become visible.
        digest: EvidenceHash,
        /// Fixed finalization operation label.
        operation: &'static str,
        /// Operating-system failure after rename.
        #[source]
        source: io::Error,
    },
    /// A committed snapshot could not be independently loaded and verified.
    #[error(
        "file outbox commit read-back failed for generation {generation} ({digest}): {source}"
    )]
    CommitReadbackFailed {
        /// Generation written before read-back.
        generation: u64,
        /// Digest written before read-back.
        digest: EvidenceHash,
        /// Verification failure observed during read-back.
        #[source]
        source: Box<FileOutboxStoreError>,
    },
    /// Read-back returned a different verified generation, digest, or outbox.
    #[error("file outbox commit read-back mismatch for generation {generation} ({digest})")]
    CommitReadbackMismatch {
        /// Expected committed generation.
        generation: u64,
        /// Expected committed digest.
        digest: EvidenceHash,
    },
    /// The outbox has corrupt messages or a corrupt idempotency index.
    #[error("file outbox integrity verification failed: {0}")]
    OutboxIntegrity(#[source] OutboxError),
    /// The caller raced a newer committed generation.
    #[error("file outbox generation mismatch: expected {expected}, actual {actual}")]
    GenerationMismatch {
        /// Generation supplied by the caller.
        expected: u64,
        /// Current durable generation.
        actual: u64,
    },
    /// Generation alone is insufficient; callers must bind the exact snapshot.
    #[error("file outbox snapshot digest CAS mismatch")]
    SnapshotDigestCasMismatch {
        /// Digest supplied by the caller.
        expected: EvidenceHash,
        /// Current durable digest.
        actual: EvidenceHash,
    },
    /// No generation may wrap around to zero.
    #[error("file outbox generation overflow")]
    GenerationOverflow,
    /// The candidate domain mutation was rejected before persistence.
    #[error("file outbox mutation rejected: {0}")]
    MutationRejected(#[source] OutboxError),
    /// Canonical or wire serialization failed.
    #[error("failed to serialize file outbox snapshot: {0}")]
    Serialization(#[source] serde_json::Error),
    /// Filesystem operation failed without exposing file contents.
    #[error("file outbox I/O failed during {operation}: {source}")]
    Io {
        /// Fixed operation label.
        operation: &'static str,
        /// Operating-system failure.
        #[source]
        source: io::Error,
    },
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU64, Ordering};

    use serde_json::{json, Value};

    use super::*;
    use crate::{
        ActorId, IdempotencyKey, OutboxFailureClass, OutboxMessage, OutboxMessageId, OutboxStatus,
        TaskId,
    };

    static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(1);

    struct TestArea {
        path: PathBuf,
    }

    impl TestArea {
        fn new() -> Self {
            let suffix = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "hermes-core-file-outbox-{}-{suffix}",
                std::process::id()
            ));
            fs::create_dir(&path).expect("unique test directory should be created");
            Self { path }
        }

        fn store_root(&self) -> PathBuf {
            self.path.join("store")
        }
    }

    impl Drop for TestArea {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn message(id: &str, key: &str, payload: Value) -> OutboxMessage {
        OutboxMessage::new(
            OutboxMessageId::new(id).expect("message id should be valid"),
            TaskId::new("gc-file-outbox-test").expect("task id should be valid"),
            IdempotencyKey::new(key).expect("idempotency key should be valid"),
            "TASK_READY",
            payload,
            2,
            10,
        )
        .expect("message fixture should be valid")
    }

    #[test]
    fn read_only_status_should_not_create_a_missing_root() {
        let area = TestArea::new();
        let root = area.store_root();
        let store = FileOutboxStore::new(&root).expect("missing root is admissible");

        let status = store.status().expect("missing status should be readable");

        assert_eq!(status, FileOutboxStoreStatus::Missing);
        assert!(!root.exists(), "read-only status must not create the root");
    }

    #[test]
    fn initialize_mutate_and_load_should_round_trip_with_cas() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        let initial = store.initialize().expect("initialization should succeed");
        assert_eq!(initial.generation(), 0);

        let (updated, decision) = store
            .mutate(0, initial.digest(), |transaction| {
                transaction.enqueue(message(
                    "outbox-file-1",
                    "file-request-1",
                    json!({"safe": true}),
                ))
            })
            .expect("matching generation should commit");

        assert_eq!(updated.generation(), 1);
        assert!(matches!(decision, crate::EnqueueDecision::Enqueued));
        let loaded = store
            .load()
            .expect("load should succeed")
            .expect("snapshot should exist");
        assert_eq!(loaded, updated);
        assert!(loaded
            .outbox()
            .get(&OutboxMessageId::new("outbox-file-1").expect("valid id"))
            .is_some());
    }

    #[cfg(unix)]
    #[test]
    fn initialized_store_should_use_private_unix_permissions() {
        use std::os::unix::fs::PermissionsExt as _;

        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");

        let root_mode = fs::metadata(store.root())
            .expect("store root metadata should be readable")
            .permissions()
            .mode()
            & 0o777;
        let snapshot_mode = fs::metadata(store.snapshot_path())
            .expect("snapshot metadata should be readable")
            .permissions()
            .mode()
            & 0o777;
        let lock_mode = fs::metadata(store.lock_path())
            .expect("lock metadata should be readable")
            .permissions()
            .mode()
            & 0o777;

        assert_eq!(root_mode & 0o077, 0);
        assert_eq!(snapshot_mode & 0o077, 0);
        assert_eq!(lock_mode, 0o600);
    }

    #[test]
    fn stale_generation_from_another_handle_should_fail_closed() {
        let area = TestArea::new();
        let first = FileOutboxStore::new(area.store_root()).expect("first handle should be valid");
        let second = FileOutboxStore::new(first.root()).expect("second handle should be valid");
        let initial = first.initialize().expect("initialization should succeed");
        first
            .mutate(0, initial.digest(), |transaction| {
                transaction.enqueue(message("outbox-file-1", "file-request-1", json!({})))
            })
            .expect("first handle should advance generation");

        let error = second
            .mutate(0, initial.digest(), |_transaction| Ok(()))
            .expect_err("stale generation must not overwrite newer state");

        assert!(matches!(
            error,
            FileOutboxStoreError::GenerationMismatch {
                expected: 0,
                actual: 1
            }
        ));
    }

    #[test]
    fn matching_generation_with_wrong_digest_should_fail_closed() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        let initial = store.initialize().expect("initialization should succeed");
        let wrong_digest = EvidenceHash::genesis();

        let error = store
            .mutate(0, &wrong_digest, |_transaction| Ok(()))
            .expect_err("wrong snapshot digest must fail CAS");

        assert!(matches!(
            error,
            FileOutboxStoreError::SnapshotDigestCasMismatch { .. }
        ));
        let loaded = store
            .load()
            .expect("snapshot should remain readable")
            .expect("snapshot should remain present");
        assert_eq!(loaded, initial);
    }

    #[test]
    fn bounded_digest_and_serializer_should_reject_large_candidate_without_temp_file() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        let initial = store.initialize().expect("initialization should succeed");
        let oversized = "x".repeat(FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES + 128);

        let error = store
            .mutate(0, initial.digest(), |transaction| {
                transaction.enqueue(message(
                    "outbox-large-1",
                    "file-large-1",
                    json!({"data": oversized}),
                ))
            })
            .expect_err("bounded serializer must reject oversized candidate");

        assert!(matches!(
            error,
            FileOutboxStoreError::SnapshotTooLarge { .. }
        ));
        assert!(
            !store.temporary_snapshot_path().exists(),
            "serialization rejection must occur before temp creation"
        );
        let loaded = store
            .load()
            .expect("previous snapshot should remain readable")
            .expect("previous snapshot should remain present");
        assert_eq!(loaded, initial);
    }

    #[test]
    fn snapshot_digest_should_be_stable_across_payload_insertion_order() {
        let mut left_payload = serde_json::Map::new();
        left_payload.insert("z".to_owned(), json!(1));
        left_payload.insert("a".to_owned(), json!(2));
        let mut right_payload = serde_json::Map::new();
        right_payload.insert("a".to_owned(), json!(2));
        right_payload.insert("z".to_owned(), json!(1));

        let mut left = Outbox::new();
        left.enqueue(message(
            "outbox-order-1",
            "file-order-1",
            Value::Object(left_payload),
        ))
        .expect("left fixture should enqueue");
        let mut right = Outbox::new();
        right
            .enqueue(message(
                "outbox-order-1",
                "file-order-1",
                Value::Object(right_payload),
            ))
            .expect("right fixture should enqueue");

        let left_digest = snapshot_digest(FILE_OUTBOX_STORE_SCHEMA_VERSION, 1, &left)
            .expect("left digest should compute");
        let right_digest = snapshot_digest(FILE_OUTBOX_STORE_SCHEMA_VERSION, 1, &right)
            .expect("right digest should compute");

        assert_eq!(left_digest, right_digest);
    }

    #[test]
    fn terminal_effect_unknown_should_survive_reload_and_reject_claim() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        let initial = store.initialize().expect("initialization should succeed");
        let message_id = OutboxMessageId::new("outbox-terminal-1").expect("id should be valid");
        let worker = ActorId::new("worker-terminal-1").expect("worker should be valid");
        let (enqueued, _) = store
            .mutate(0, initial.digest(), |transaction| {
                transaction.enqueue(message(
                    "outbox-terminal-1",
                    "file-terminal-1",
                    json!({"safe": true}),
                ))
            })
            .expect("enqueue should persist");
        let (terminal, ()) = store
            .mutate(enqueued.generation(), enqueued.digest(), |transaction| {
                transaction.claim(&message_id, worker.clone(), 20, 10)?;
                transaction.record_failure(
                    &message_id,
                    &worker,
                    OutboxFailureClass::EffectUnknown,
                    "EFFECT_UNCONFIRMED",
                    21,
                )
            })
            .expect("effect-unknown transition should persist");

        let reloaded = store
            .load()
            .expect("terminal snapshot should load")
            .expect("terminal snapshot should exist");
        assert_eq!(reloaded, terminal);
        assert_eq!(
            reloaded
                .outbox()
                .get(&message_id)
                .expect("terminal message should remain")
                .status(),
            OutboxStatus::EffectUnknown
        );

        let error = store
            .mutate(reloaded.generation(), reloaded.digest(), |transaction| {
                transaction.claim(&message_id, worker, 40, 10)
            })
            .expect_err("terminal effect-unknown message must not be reclaimed");
        assert!(matches!(
            error,
            FileOutboxStoreError::MutationRejected(OutboxError::InvalidStatus {
                status: OutboxStatus::EffectUnknown
            })
        ));
        let after_rejection = store
            .load()
            .expect("snapshot should remain readable")
            .expect("snapshot should remain present");
        assert_eq!(after_rejection.generation(), reloaded.generation());
        assert_eq!(after_rejection.digest(), reloaded.digest());
        assert_eq!(after_rejection, reloaded);
    }

    #[test]
    fn tampered_snapshot_digest_should_be_rejected() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let snapshot_path = store.snapshot_path();
        let mut value: Value = serde_json::from_slice(
            &fs::read(&snapshot_path).expect("snapshot fixture should be readable"),
        )
        .expect("snapshot fixture should be JSON");
        value["digest"] = Value::String("0".repeat(64));
        fs::write(
            &snapshot_path,
            serde_json::to_vec(&value).expect("tampered fixture should serialize"),
        )
        .expect("tampered fixture should be written");

        let error = store.load().expect_err("digest tampering must fail");

        assert!(matches!(
            error,
            FileOutboxStoreError::SnapshotDigestMismatch
        ));
    }

    #[test]
    fn recomputed_digest_should_not_hide_corrupt_idempotency_index() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        let initial = store.initialize().expect("initialization should succeed");
        store
            .mutate(0, initial.digest(), |transaction| {
                transaction.enqueue(message(
                    "outbox-file-1",
                    "file-request-1",
                    json!({"safe": true}),
                ))
            })
            .expect("fixture enqueue should succeed");

        let snapshot_path = store.snapshot_path();
        let mut envelope: SnapshotEnvelope = serde_json::from_slice(
            &fs::read(&snapshot_path).expect("snapshot fixture should be readable"),
        )
        .expect("snapshot fixture should deserialize");
        let mut outbox_value =
            serde_json::to_value(&envelope.outbox).expect("outbox should serialize");
        outbox_value["idempotency_index"]["file-request-1"] =
            Value::String("outbox-missing".to_owned());
        envelope.outbox =
            serde_json::from_value(outbox_value).expect("corrupt index remains wire-valid");
        envelope.digest = snapshot_digest(
            &envelope.schema_version,
            envelope.generation,
            &envelope.outbox,
        )
        .expect("test digest should recompute");
        fs::write(
            &snapshot_path,
            serde_json::to_vec(&envelope).expect("corrupt fixture should serialize"),
        )
        .expect("corrupt fixture should be written");

        let error = store
            .load()
            .expect_err("index corruption must fail after digest verification");

        assert!(matches!(error, FileOutboxStoreError::OutboxIntegrity(_)));
    }

    #[test]
    fn unknown_snapshot_field_should_be_rejected() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let snapshot_path = store.snapshot_path();
        let mut value: Value = serde_json::from_slice(
            &fs::read(&snapshot_path).expect("snapshot fixture should be readable"),
        )
        .expect("snapshot fixture should be JSON");
        value["unexpected"] = Value::Bool(true);
        fs::write(
            &snapshot_path,
            serde_json::to_vec(&value).expect("unknown-field fixture should serialize"),
        )
        .expect("unknown-field fixture should be written");

        let error = store.load().expect_err("unknown fields must fail");

        assert!(matches!(error, FileOutboxStoreError::MalformedSnapshot(_)));
    }

    #[test]
    fn oversized_snapshot_should_be_rejected_before_deserialization() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(store.snapshot_path())
            .expect("oversized fixture should be opened");
        file.set_len(FILE_OUTBOX_STORE_MAX_SNAPSHOT_BYTES as u64 + 1)
            .expect("oversized fixture length should be set");

        let error = store.load().expect_err("oversized snapshot must fail");

        assert!(matches!(
            error,
            FileOutboxStoreError::SnapshotTooLarge { .. }
        ));
    }

    #[test]
    fn persistent_lock_should_remain_and_held_lock_should_block_reads() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let lock_path = store.lock_path();
        let held = store
            .open_validated_lock_file()
            .expect("persistent lock should open");
        File::try_lock(&held).expect("test should acquire advisory lock");

        let lock_error = store.load().expect_err("held lock must block load");
        assert!(matches!(lock_error, FileOutboxStoreError::StoreBusy));
        assert!(lock_path.exists(), "persistent lock must remain present");
        File::unlock(&held).expect("test advisory lock should release");
        store.load().expect("unlocked store should be readable");
        assert!(lock_path.exists(), "read must not unlink persistent lock");
    }

    #[test]
    fn missing_or_malformed_persistent_lock_should_fail_without_repair() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let lock_path = store.lock_path();
        fs::remove_file(&lock_path).expect("lock fixture should be removed");

        let missing = store
            .status()
            .expect_err("snapshot without persistent lock must fail");
        assert!(matches!(
            missing,
            FileOutboxStoreError::MissingPersistentLock
        ));
        assert!(!lock_path.exists(), "read-only status must not repair lock");

        let mut lock = create_private_read_write_file(&lock_path)
            .expect("malformed lock fixture should be created");
        lock.write_all(b"wrong\n")
            .expect("malformed marker should be written");
        lock.sync_all().expect("malformed marker should sync");
        drop(lock);
        let malformed = store
            .load()
            .expect_err("malformed persistent lock must fail");
        assert!(matches!(
            malformed,
            FileOutboxStoreError::MalformedPersistentLock
        ));
    }

    #[cfg(unix)]
    #[test]
    fn broad_persistent_lock_permissions_should_be_rejected() {
        use std::os::unix::fs::PermissionsExt as _;

        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        fs::set_permissions(store.lock_path(), fs::Permissions::from_mode(0o644))
            .expect("test should broaden lock permissions");

        let error = store
            .load()
            .expect_err("broad persistent lock permissions must fail");

        assert!(matches!(
            error,
            FileOutboxStoreError::UnsafePersistentLockPermissions
        ));
    }

    #[test]
    fn stale_temp_should_remain_and_block_reads() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");

        let temp_path = store.temporary_snapshot_path();
        fs::write(&temp_path, b"incomplete").expect("stale temporary fixture should be written");
        let temp_error = store.load().expect_err("stale temp must block load");
        assert!(matches!(
            temp_error,
            FileOutboxStoreError::UnresolvedEvidence {
                kind: FileOutboxEvidenceKind::TemporarySnapshot
            }
        ));
        assert!(temp_path.exists(), "stale temp must not be auto-deleted");
    }

    #[test]
    fn rejected_mutation_should_release_its_own_lock_without_writing() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        let initial = store.initialize().expect("initialization should succeed");

        let error = store
            .mutate(0, initial.digest(), |_transaction| {
                Err::<(), OutboxError>(OutboxError::InvalidEventType)
            })
            .expect_err("domain rejection should abort mutation");

        assert!(matches!(
            error,
            FileOutboxStoreError::MutationRejected(OutboxError::InvalidEventType)
        ));
        assert!(
            store.lock_path().exists(),
            "persistent lock must never be unlinked"
        );
        let loaded = store
            .load()
            .expect("snapshot should remain readable")
            .expect("snapshot should remain present");
        assert_eq!(loaded, initial);
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_root_and_snapshot_should_be_rejected() {
        use std::os::unix::fs::symlink;

        let area = TestArea::new();
        let target_root = area.path.join("target-root");
        fs::create_dir(&target_root).expect("target root should be created");
        let root_link = area.path.join("root-link");
        symlink(&target_root, &root_link).expect("root symlink fixture should be created");
        let root_error =
            FileOutboxStore::new(&root_link).expect_err("symlinked root must be rejected");
        assert!(matches!(
            root_error,
            FileOutboxStoreError::SymlinkedStoreRoot
        ));

        let real_root = area.store_root();
        fs::create_dir(&real_root).expect("real store root should be created");
        let external_snapshot = area.path.join("external-snapshot");
        fs::write(&external_snapshot, b"{}").expect("external snapshot should be written");
        symlink(&external_snapshot, real_root.join(SNAPSHOT_FILE_NAME))
            .expect("snapshot symlink fixture should be created");
        let snapshot_error =
            FileOutboxStore::new(real_root).expect_err("snapshot symlink must be rejected");
        assert!(matches!(
            snapshot_error,
            FileOutboxStoreError::SymlinkedEvidence {
                kind: FileOutboxEvidenceKind::Snapshot
            }
        ));
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_lock_and_temp_evidence_should_be_rejected() {
        use std::os::unix::fs::symlink;

        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let external = area.path.join("external-evidence");
        fs::write(&external, b"untrusted").expect("external fixture should be written");

        fs::remove_file(store.lock_path()).expect("persistent lock fixture should be removed");
        symlink(&external, store.lock_path()).expect("lock symlink should be created");
        let lock_error = store.load().expect_err("symlinked lock must fail");
        assert!(matches!(
            lock_error,
            FileOutboxStoreError::SymlinkedEvidence {
                kind: FileOutboxEvidenceKind::Lock
            }
        ));
        fs::remove_file(store.lock_path()).expect("test lock symlink should be removed");

        symlink(&external, store.temporary_snapshot_path())
            .expect("temporary symlink should be created");
        let temp_error = store.load().expect_err("symlinked temp must fail");
        assert!(matches!(
            temp_error,
            FileOutboxStoreError::SymlinkedEvidence {
                kind: FileOutboxEvidenceKind::TemporarySnapshot
            }
        ));
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_ancestor_should_be_resolved_to_a_canonical_root() {
        use std::os::unix::fs::symlink;

        let area = TestArea::new();
        let real_parent = area.path.join("real-parent");
        fs::create_dir(&real_parent).expect("real parent should be created");
        let linked_parent = area.path.join("linked-parent");
        symlink(&real_parent, &linked_parent).expect("parent symlink should be created");

        let store = FileOutboxStore::new(linked_parent.join("store"))
            .expect("ancestor alias should be canonicalized");
        let expected = fs::canonicalize(&real_parent)
            .expect("real parent should canonicalize")
            .join("store");

        assert_eq!(store.root(), expected);
        store
            .initialize()
            .expect("canonical store should initialize");
        assert!(expected.join(SNAPSHOT_FILE_NAME).is_file());
    }

    #[test]
    fn replaced_root_should_be_rejected_by_bound_handle() {
        let area = TestArea::new();
        let store = FileOutboxStore::new(area.store_root()).expect("store handle should be valid");
        store.initialize().expect("initialization should succeed");
        let replaced = area.path.join("replaced-store");
        fs::rename(store.root(), &replaced).expect("original store should be moved");
        fs::create_dir(store.root()).expect("replacement directory should be created");

        let error = store
            .status()
            .expect_err("bound handle must reject replacement root");
        assert!(matches!(error, FileOutboxStoreError::RootIdentityChanged));
    }

    #[test]
    fn relative_and_parent_traversing_roots_should_be_rejected() {
        let relative_error =
            FileOutboxStore::new("relative/store").expect_err("relative root must fail");
        assert!(matches!(
            relative_error,
            FileOutboxStoreError::InvalidRootPath
        ));

        let escaping = std::env::temp_dir()
            .join("bounded")
            .join("..")
            .join("escape");
        let escaping_error =
            FileOutboxStore::new(escaping).expect_err("lexical parent traversal must fail");
        assert!(matches!(
            escaping_error,
            FileOutboxStoreError::InvalidRootPath
        ));
    }
}
