#!/usr/bin/env python3
"""Prints a new Ed25519 key pair for signing index.json (tools/build-index.py).

The private key goes into the repository secret INDEX_SIGNING_KEY and nowhere else; the public
key goes into PecoFence (crates/core/src/plugins.rs), which then trusts only indexes it signed.
Usage: python3 tools/make-key.py   (needs the package "cryptography")
"""
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

key = Ed25519PrivateKey.generate()
private = key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
public = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
print(f"INDEX_SIGNING_KEY (secret, keep private): {private.hex()}")
print(f"public key, hex: {public.hex()}")
print("public key for PecoFence: [" + ", ".join(f"0x{b:02x}" for b in public) + "]")
