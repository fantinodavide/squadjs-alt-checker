## AltChecker

### Commands
`!altcheck <steamID/eosID/IP>` usable on discord and in-game. will start a manual check of a specific player

### Example configuration
```json
{
    "plugin": "AltChecker",
    "enabled": true,
    "discordClient": "discord",
    "commandPrefix": "!altcheck",
    "channelID": "",
    "kickIfAltDetected": true,
    "kickReason": "ALT detected. Protection kick"
}
```
