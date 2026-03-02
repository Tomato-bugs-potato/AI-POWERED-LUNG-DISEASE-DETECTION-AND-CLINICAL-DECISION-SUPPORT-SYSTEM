import base64
import os
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.types import TypeDecorator, Text
from app.config import settings

def get_aes_key() -> bytes:
    """Safely decode the base64 AES key from config"""
    try:
        if not settings.FIELD_ENCRYPTION_KEY:
            raise ValueError("FIELD_ENCRYPTION_KEY is empty")
        
        # Add padding if needed
        b64_str = settings.FIELD_ENCRYPTION_KEY
        b64_str += "=" * ((4 - len(b64_str) % 4) % 4)
        
        key = base64.b64decode(b64_str)
        if len(key) != 32:
            raise ValueError(f"FIELD_ENCRYPTION_KEY must be exactly 32 bytes when decoded, got {len(key)}")
        return key
    except Exception as e:
        # Fallback for dev mode if key is improperly configured
        if settings.DEBUG:
            return b'0' * 32
        raise e

def encrypt_field(plaintext: str) -> str:
    """Encrypt a string using AES-256-GCM"""
    if not plaintext:
        return plaintext
        
    aesgcm = AESGCM(get_aes_key())
    nonce = os.urandom(12)
    # The ciphertext returned by AESGCM includes the 16-byte authentication tag at the end
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    
    # Store as: base64(nonce + ciphertext_with_tag)
    payload = nonce + ciphertext
    return base64.b64encode(payload).decode('ascii')

def decrypt_field(encrypted_b64: str) -> str:
    """Decrypt a string using AES-256-GCM"""
    if not encrypted_b64:
        return encrypted_b64
        
    try:
        payload = base64.b64decode(encrypted_b64.encode('ascii'))
        nonce = payload[:12]
        ciphertext = payload[12:]
        
        aesgcm = AESGCM(get_aes_key())
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception as e:
        # Detailed error logged by caller, return placeholder or raise
        raise ValueError("Decryption failed") from e


class EncryptedText(TypeDecorator):
    """
    SQLAlchemy TypeDecorator to automatically encrypt/decrypt 
    text fields during database read/write.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        if value is not None:
            return encrypt_field(value)
        return value

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is not None:
            return decrypt_field(value)
        return value
