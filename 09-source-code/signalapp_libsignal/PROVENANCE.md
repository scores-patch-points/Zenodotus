---
source: github.com/signalapp/libsignal
commit: b056faa6dd02961cff24064c54c089c52e1a0753
branch: main
license: AGPL-3.0
tier: audited
fetched_at: 2026-08-16T16:47:53.529Z
---

# signalapp/libsignal — provenance and security record

The protocol library behind Signal's (and formerly WhatsApp's) end-to-end encryption.

## Security review record

The Signal protocol has published, peer-reviewed formal security analyses: Cohn-Gordon et al. (IEEE EuroS&P 2017) and ProVerif models from the INRIA Prosecco group.

- A Formal Security Analysis of the Signal Messaging Protocol (eprint 2016/1013) — https://eprint.iacr.org/2016/1013

## Files collected at commit b056faa6dd02961cff24064c54c089c52e1a0753

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| LICENSE | 5515 | 0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0 |
| README.md | 1639 | b750fb041f95e6733209a3b5bf233ce446e0ceb3771826712e7967707a6803d4 |
| rust/protocol/src/session.rs | 644 | d8dba05207b36dc49e6898d6e38a27d44ce31a8a1d32a64df80bb7e1b3697cbb |
| rust/protocol/src/lib.rs (folded below) | 279 | a3de683393c5d65cc8add1315e820a0879b28b33f909e35ac659f425ef8d77b1 |

## Folded: rust/protocol/src/lib.rs

Collected verbatim; under the 600-word floor as a standalone document (279 words).

//
// Copyright 2020-2021 Signal Messenger, LLC.
// SPDX-License-Identifier: AGPL-3.0-only
//

//! Rust implementation of the **[Signal Protocol]** for asynchronous
//! forward-secret public-key cryptography.
//!
//! In particular, this library implements operations conforming to the following specifications:
//! - the **[X3DH]** key agreement protocol,
//! - the **[Double Ratchet]** *(Axolotl)* messaging protocol,
//!
//! [Signal Protocol]: https://signal.org/
//! [X3DH]: https://signal.org/docs/specifications/x3dh/
//! [Double Ratchet]: https://signal.org/docs/specifications/doubleratchet/

#![warn(clippy::unwrap_used)]
#![deny(unsafe_code)]

// TODO(https://github.com/signalapp/libsignal/issues/285): it should be an aspiration to
// eventually warn and then error for public members without docstrings. Also see
// https://doc.rust-lang.org/rustdoc/what-to-include.html for background.
// #![warn(missing_docs)]

mod consts;
mod crypto;
mod double_ratchet;
pub mod error;
mod fingerprint;
mod group_cipher;
mod handshake;
mod identity_key;
pub mod incremental_mac;
pub mod kem;
pub mod pqxdh;
mod proto;
mod protocol;
mod ratchet;
mod sealed_sender;
mod sender_keys;
mod session;
#[cfg(test)]
mod session_cipher_legacy;
mod session_management;
mod state;
mod storage;
mod timestamp;
mod triple_ratchet;

use error::Result;
pub use error::{SessionNotFound, SignalProtocolError};
pub use fingerprint::{
    DisplayableFingerprint, Error as FingerprintError, Fingerprint, ScannableFingerprint,
};
pub use group_cipher::{
    create_sender_key_distribution_message, group_decrypt, group_encrypt,
    process_sender_key_distribution_message,
};
pub use identity_key::{IdentityKey, IdentityKeyPair};
pub use libsignal_core::curve::{KeyPair, PrivateKey, PublicKey};
pub use libsignal_core::{
    Aci, DeviceId, Pni, ProtocolAddress, ServiceId, ServiceIdFixedWidthBinaryBytes, ServiceIdKind,
};
pub use protocol::{
    CiphertextMessage, CiphertextMessageType, DecryptionErrorMessage, KyberPayload,
    PlaintextContent, PreKeySignalMessage, SenderKeyDistributionMessage, SenderKeyMessage,
    SignalMessage, extract_decryption_error_message_from_serialized_content,
};
pub use ratchet::{
    AliceSignalProtocolParameters, BobSignalProtocolParameters, initialize_alice_session_record,
    initialize_bob_session_record,
};
pub use sealed_sender::{
    ContentHint, SealedSenderDecryptionResult, SealedSenderV2SentMessage,
    SealedSenderV2SentMessageRecipient, SenderCertificate, ServerCertificate,
    UnidentifiedSenderMessageContent, sealed_sender_decrypt, sealed_sender_decrypt_to_usmc,
    sealed_sender_encrypt, sealed_sender_encrypt_from_usmc, sealed_sender_multi_recipient_encrypt,
};
pub use sender_keys::SenderKeyRecord;
pub use session::{process_prekey, process_prekey_bundle};
pub use session_management::{
    message_decrypt, message_decrypt_prekey, message_decrypt_signal, message_encrypt,
};
pub use state::{
    GenericSignedPreKey, KyberPreKeyId, KyberPreKeyRecord, PreKeyBundle, PreKeyBundleContent,
    PreKeyId, PreKeyRecord, SessionRecord, SessionUsabilityRequirements, SignedPreKeyId,
    SignedPreKeyRecord,
};
pub use storage::{
    Direction, IdentityChange, IdentityKeyStore, InMemIdentityKeyStore, InMemKyberPreKeyStore,
    InMemPreKeyStore, InMemSenderKeyStore, InMemSessionStore, InMemSignalProtocolStore,
    InMemSignedPreKeyStore, KyberPreKeyStore, PreKeyStore, ProtocolStore, SenderKeyStore,
    SessionStore, SignedPreKeyStore,
};
pub use timestamp::Timestamp;
