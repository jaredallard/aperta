# ENDPOINT /v1/modpack

Get metadata about a modpack, and submit new metadata.

## PUT /v1/modpack/:name?apikey=api-key

Type: `application/json`

RequiresAuthentication: `true`

Authentication: param, or in body as `api-key`

Notes: API Keys are given by request, until `v2` of the API.

```json
{
    "versions": {
        "modpack": "1.0.0",
        "mc": "1.7.10",
        "forge": "1.7.10-10.13.4.1558-1.7.10"
    },
    "pgp": {
      "fingerprint": "08f2c568bc62c07b4f333636dbe0757f25126975"  
    },
    "desc": "A modpack for techsavy and magic users alike!",
    "authors": [
        {
            "name": "Jared Allard",
            "email": "jaredallard@outlook.com"
        }    
    ],
    "image": "https://mc.jaredallard.me/rdelro/rdelro.png",
    "files": [
        {
            "type": "config",
            "uri": "https://mc.jaredallard.me/config.zip",
            "signature": "https://mc.jaredallard.me/config.zip.sig"
        },
        {
            "type": "mods",
            "uri": "https://mc.jaredallard.me/mods.zip",
            "signature": "https://mc.jaredallard.me/mods.zip.sig"
        }
    ]
}
```

## GET /v1/modpack

Type: `application/json`

```json
{
  "success": true,
  "result": {
    "count": 1,
    "results": [
      {
        "path": {
          "kind": "item",
          "collection": "modpacks",
          "key": "rdelro",
          "ref": "1225b9f88009d874",
          "reftime": 1449705105485
        },
        "value": {
          "name": "rdelro",
          "versions": {
            "modpack": "1.0.0",
            "mc": "1.7.10",
            "forge": "1.7.10-10.13.4.1558-1.7.10"
          },
          "pgp": {
            "fingerprint": "08f2c568bc62c07b4f333636dbe0757f25126975"
          },
          "authors": [
            {
              "name": "Jared Allard",
              "email": "jaredallard@outlook.com"
            }
          ],
          "files": [
            {
              "type": "config",
              "uri": "https://mc.jaredallard.me/config.zip",
              "signature": "https://mc.jaredallard.me/config.zip.sig"
            },
            {
              "type": "mods",
              "uri": "https://mc.jaredallard.me/mods.zip",
              "signature": "https://mc.jaredallard.me/mods.zip.sig"
            }
          ],
          "image": "https://mc.jaredallard.me/rdelro/rdelro.png",
          "desc": "A modpack for techsavy and magic users alike!"
        },
        "reftime": 1449705105485
      }
    ]
  }
}
```

## GET /v1/modpack/:name

Type: `application/json`

```json
{
    "versions": {
        "modpack": "1.0.0",
        "mc": "1.7.10",
        "forge": "1.7.10-10.13.4.1558-1.7.10"
    },
    "pgp": {
      "fingerprint": "08f2c568bc62c07b4f333636dbe0757f25126975"  
    },
    "desc": "A modpack for techsavy and magic users alike!",
    "authors": [
        {
            "name": "Jared Allard",
            "email": "jaredallard@outlook.com"
        }    
    ],
    "image": "http://mc.jaredallard.me/rdelro/rdelro.png",
    "files": [
        {
            "type": "config",
            "uri": "https://mc.jaredallard.me/config.zip",
            "signature": "https://mc.jaredallard.me/config.zip.sig"
        },
        {
            "type": "mods",
            "uri": "https://mc.jaredallard.me/mods.zip",
            "signature": "https://mc.jaredallard.me/mods.zip.sig"
        }
    ]
}
```

## DELETE /v1/modpack/:name

Type: `application/json`

RequiresAuthentication: `true`

Authentication: body

```json
{
  "api-key": "your-api-key"
}
```
