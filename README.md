## AltChecker

### Commands
`!altcheck <steamID/eosID/IP/playerName>` usable on discord and in-game. will start a manual check of a specific player. the player name can only be used for online players

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
