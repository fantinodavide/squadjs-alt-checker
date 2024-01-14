# AltChecker

## Requirements
- SquadJS (4.0.0+)
- SquadJS DBLog Plugin

## Installation
- Place the .js plugin file in the SquadJS plugins directory: `squad-server/plugins`
- Insert in your SquadJS configuration file the plugin configuration, as shown in [Example Configuration](#example-configuration)

### Commands
`!altcheck <steamID/eosID/IP/playerName>` usable on discord and in-game. will start a manual check of a specific player. the player name can only be used for online players. If a player doesn't have alts but can be found in the DB, you'll receive an embed containing all the details

### Example configuration
```json
{
    "plugin": "AltChecker",
    "enabled": true,
    "discordClient": "discord",
    "commandPrefix": "!altcheck",
    "channelID": "",
    "kickIfAltDetected": false,
    "onlyKickOnlineAlt": true,
    "kickReason": "ALT detected. Protection kick"
}
```
