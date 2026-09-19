import fs from "node:fs";

const api = fs.readFileSync("lib/voice-api.ts", "utf8");
const player = fs.readFileSync("lib/toumai-voice-player.ts", "utf8");
const hook = fs.readFileSync("hooks/useSpeakText.ts", "utf8");
const bridge = fs.readFileSync("components/notifications/RealtimeNotificationsBridge.tsx", "utf8");
const voiceSettings = fs.readFileSync("components/settings/VoiceSection.tsx", "utf8");
const notifications = fs.readFileSync("components/settings/NotificationsSection.tsx", "utf8");
const security = fs.readFileSync("components/settings/SecuritySection.tsx", "utf8");
const chat = fs.readFileSync("components/ChatMessage.tsx", "utf8");
const voiceMode = fs.readFileSync("components/VoiceModeOverlay.tsx", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(api.includes('voice: "zenaba"'), "TTS API must force Zenaba");
expect(api.includes('language: "fr"'), "TTS API must force French in V1");
expect(api.includes("/voice/synthesize/stream?format=ndjson"), "chat must have streamed TTS");
expect(api.includes("AbortSignal"), "TTS API must support cancellation");

expect(player.includes("let audio: HTMLAudioElement | null = null"), "one global audio element must be owned centrally");
expect(player.includes("let aborter: AbortController | null = null"), "synthesis must be cancellable");
expect(player.includes("stopToumaiVoice"), "global stop control missing");
expect(player.includes("snapshot.owner === owner"), "second click must toggle the same owner");
expect(player.includes("completion?.generation"), "playback completion must be generation-scoped");
expect(player.includes("segmentCompletion?.generation"), "segment stop must be generation-scoped");
expect(player.includes("playToumaiVoice"), "shared player entrypoint missing");
expect(player.includes("streamSpeech"), "shared player must use streamed TTS");

expect(hook.includes("playToumaiVoice"), "chat read-aloud must use shared Zenaba player");
expect(hook.includes("stopToumaiVoice(owner)"), "chat unmount must stop its audio");

expect(bridge.includes("playToumaiVoice"), "reminders must use the same Zenaba player");
expect(!bridge.includes("speechSynthesis"), "reminders must not use browser speechSynthesis");
expect(bridge.includes('outcome === "ended"'), "voice diagnostic may only confirm after actual playback end");
expect(bridge.includes('locale.startsWith("fr")'), "non-French reminders must fail closed in V1");

expect(voiceSettings.includes("Zenaba"), "settings must display Zenaba");
expect(voiceSettings.includes("Voix officielle de Toumaï · Français"), "settings must explain the official French voice");
expect(!voiceSettings.includes("listVoices"), "settings must not expose a multi-voice catalog");
expect(!voiceSettings.includes("Choisir"), "settings must not expose a voice selector");

expect(notifications.includes("Zenaba lit les rappels"), "notification settings must name the active voice");
expect(!notifications.includes("speechSynthesis"), "notification settings must not depend on browser TTS");
expect(!security.includes("speechSynthesis"), "diagnostics must test real audio, not browser TTS");
expect(security.includes("toumai:notification-voice-complete"), "diagnostics must wait for real completion");

expect(!chat.includes('disabled={speech.state === "loading"}'), "Stop must remain available while synthesis is loading");

expect(voiceMode.includes("playToumaiVoice"), "web voice mode must use the shared Zenaba player");
expect(voiceMode.includes("stopToumaiVoice"), "web voice mode must use the shared stop control");
expect(!voiceMode.includes("synthesizeSpeech"), "web voice mode must not own a second TTS pipeline");
expect(!fs.existsSync("components/LiveAvatarOverlay.tsx"), "unused alternate avatar TTS pipeline must stay removed");

console.log("toumai-voice-v1-web: PASS");
