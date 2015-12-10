# ENDPOINT /v1/pubkey

Interact with public keys registered, and not registered.

## PUT /v1/pubkey/new

#### body

Type: `application/json`

RequiresAuthentication: `true`

```json
{
  "api-key": "your-api-key",
  "public_key": {
    "data": "base64 encoded public_key ASCII-armored"
  }
}
```

## GET /v1/pubkey/:fingerprint

Type: `application/json`

Notes: Server pubkey is provided in the git tree, and is bundled with releases.

```json
{
  "fingerprint": "08f2c568bc62c07b4f333636dbe0757f25126975",
  "signature": "cleartext signature of the base64 encoded public key, signature is base64 encoded as well."
}
```
