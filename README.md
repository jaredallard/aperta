# Aperta

The Open Source, Security Driven, and extendable Minecraft Launcher.

![image](https://sc-cdn.scaleengine.net/i/e8d0fea02f6084314b7924fb951db363.png)

## What is Aperta?

A Minecraft launcher that supports vanilla, aswell as Forge!
As for the name, Aperta means "open" in Latin.

## What does it support?

Well, if you can run [NW.js](https://github.com/nwjs/nw.js) on your platform, you can run it!

## How do you publish mods?

I have a central server that distributes nothing but metadata to clients, mods are hosted
by whomever posts them

## What's planned?

Lots!

* P2P (plausable denyability)
* /v2 API supporting users being able to publish mods (/v1 only allows me currently (no auth system))
* Fully Material UI (it's all Material right now but not the best UI ever!)
* FTB & ATL mod compatability.

## How do I use this? :(

We currently have no pre-builts. This is because I just got this working, and the build
process is spotty right now, so no single files or fanciness.

Just download [NW.js](https://nwjs.io) for your platform, place it somewhere then run:

```bash
nwjs /path/to/aperta/not-src-dir
```

## What's it built with?

Lots of cool open source frameworks;

* jQuery (really speeds up dev time)
* MDL (Google's Material Design kit)
* Handlebars (Templating!)
* Page.js (a single page framework I wrote that's under 100 lines!)
* mmd.js (Minecraft Modded Daemon library, library for the mmd database)


## Wow! Cool! How can I help?

You can view currently [open issues](https://github.com/jaredallard/aperta) and hop
on one, or you can go through and optimize a lot of this code.

The project was in a proof of concept stage and has about a days worth of time in it so far.
