<img src="public/hd-homey.webp" alt="HD Homey" width="50%" height="auto" />

# HD Homey

![Docker](https://github.com/shaunburdick/hd-homey/actions/workflows/docker.yml/badge.svg)
![Tests](https://github.com/shaunburdick/hd-homey/actions/workflows/test.yml/badge.svg)

A Proxy App for [HD Homerun](https://www.silicondust.com/hdhomerun/) devices. Making it easier to connect and share live tv over the internet!

- [HD Homey](#hd-homey)
  - [Features](#features)
  - [Install](#install)
    - [Docker](#docker)
    - [Docker Compose](#docker-compose)
    - [Source](#source)
  - [Configuration](#configuration)
  - [Usage](#usage)
    - [Watch](#watch)
    - [Lineup](#lineup)

## Features

-   Serve the lineup.json file, altering it to work over the internet via HD Homey's proxy
-   Show a list of channels with a link to the stream
-   Proxy the video stream from the HD Homey to the user
-   More features (or bugs) when I get to them...

## Install

HD Homey is deployable via docker or source, with the only need being the URL/IP address of your HDHR box.

### Docker

To install using the latest docker image, replacing `{TUNER_IP}` with the ip address of your tuner:

```bash
docker run -d \
    --name=hd_homey \
    -v ./data/db:/data/db \
    -p 3000:3000 \
    -e HD_HOMEY_TUNER_PATH={TUNER_IP} \
ghcr.io/shaunburdick/hd-homey:latest
```

This will store the HD Homey database locally in `./data/db`

See [Configuration](#configuration) for any additional environment variables you would like to set

### Docker Compose

To install using docker compose:

1. Copy the contents of [compose.yml](compose.yml) to a compose.yml file in your local path
2. Update the compose.yml file, adding [Environment variables](#configuration) as needed for configuration
3. Deploy the application: `docker compose up -d`

This will store the HD Homey database in a docker volume

### Source

To install using the source:

1. Install [Node v20+](https://nodejs.org/en/download/package-manager)
2. Download the source code:
    1. Git: `git clone https://github.com/shaunburdick/hd-homey.git`
    2. Zip: [Download ZIP](https://github.com/shaunburdick/hd-homey/archive/refs/heads/main.zip)
3. Install dependencies: `npm ci`
4. Copy and fill out your environment file: `cp .env-example .env`
5. Run the dev server: `npm run dev`

## Configuration

The following values are available for configuration as [environment variables](https://en.wikipedia.org/wiki/Environment_variable):

-   **HD_HOMEY_TUNER_PATH**: The URL path to your turn, example: `http://192.168.1.50`
-   **HD_HOMEY_PROXY_HOST**: The URL to use when rewriting values proxied from your tuner. Example `https://tuner.myawesomesite.com`
    <br>This can be empty and the app will attempt to infer the URL by inspecting the request,
    but if you are having trouble (or proxy this app in docker) then you can provide a hint.
-   **HD_HOMEY_DB_PATH**: The path to the local database for configuration values (not used yet), example: `./data/db`

## Usage

Then open your favorite browser to http://localhost:3000 (assuming you used to configs above)

### Watch

Watch provides a list of channels available. Clicking on the channel will give you instructions on how to watch the stream.

### Lineup

Lineup provides a transformed JSON line. This could be used by other viewing apps like Channels or Jellyfin to generate channels for viewing. (Maybe, I haven't tested this yet)

