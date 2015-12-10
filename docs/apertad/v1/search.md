# ENDPOINT /v1/search

Search for mods.

## GET /v1/search/:term

Type: `application/json`

Notes: Supports the full set of [Apache Lucene](https://lucene.apache.org/core/2_9_4/queryparsersyntax.html) syntax,
       however it is currently limited to just the 'name:' field.

`GET /v1/search/rd*`

```json
{
  "count": 1,
  "total_count": 1,
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
      "kind": "item",
      "reftime": 1449705105485
    }
  ]
}
```
