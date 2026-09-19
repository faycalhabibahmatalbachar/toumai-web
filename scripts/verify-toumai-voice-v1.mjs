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
const waveform = fs.readFileSync("components/Waveform.tsx", "utf8");
const chatPage = fs.readFileSync("app/chat/page.tsx", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(api.includes('voice: "zenaba"'), "TTS API must force Zenaba");
expect(api.includes('language: "fr"'), "TTS API must force French in V1");
expect(api.includes("/voice/synthesize/stream?format=ndjson"), "chat must have streamed TTS");
expect(api.includes("AbortSignal"), "TTS API must support cancellation");
expect(api.includes("/voice/synthesize/live"), "Pocket live API must use the authenticated raw WAV endpoint");
expect(api.includes("audio/wav"), "Pocket live API must require WAV streaming");
expect(api.includes("getReader()"), "Pocket live API must consume response.body incrementally");
expect(api.includes('mime.includes("mp4")'), "STT upload must preserve Safari/MP4 recorder containers");
expect(api.includes("audio.${ext}"), "STT upload filename must match the recorded container");

expect(player.includes("let audio: HTMLAudioElement | null = null"), "one global audio element must be owned centrally");
expect(player.includes("let aborter: AbortController | null = null"), "synthesis must be cancellable");
expect(player.includes("stopToumaiVoice"), "global stop control missing");
expect(player.includes("snapshot.owner === owner"), "second click must toggle the same owner");
expect(player.includes("completion?.generation"), "playback completion must be generation-scoped");
expect(player.includes("segmentCompletion?.generation"), "segment stop must be generation-scoped");
expect(player.includes("playToumaiVoice"), "shared player entrypoint missing");
expect(player.includes("streamSpeech"), "shared player must use streamed TTS");
expect(player.includes("playToumaiVoiceLive"), "shared player must expose native Pocket live playback");
expect(player.includes("parseStreamingWavHeader"), "Pocket live playback must validate WAV before PCM playback");
expect(player.includes("AudioBufferSourceNode"), "Pocket live playback must schedule PCM through Web Audio");
expect(player.includes("MIN_PCM_BYTES = 8192"), "Pocket playback must start before a whole phrase WAV is buffered");
expect(player.includes("source.playbackRate.value"), "live Pocket playback must preserve speed preference");
expect(player.includes("stopLiveSources"), "global Stop must terminate live PCM sources");
expect(player.includes("primeToumaiVoiceAudio"), "voice mode must be autoplay-safe");
expect(player.includes("setToumaiVoiceConversationActive"), "global player must track live conversation ownership");

expect(hook.includes("playToumaiVoice"), "chat read-aloud must use shared Zenaba player");
expect(hook.includes("stopToumaiVoice(owner)"), "chat unmount must stop its audio");

expect(bridge.includes("playToumaiVoice"), "reminders must use the same Zenaba player");
expect(!bridge.includes("speechSynthesis"), "reminders must not use browser speechSynthesis");
expect(bridge.includes('outcome === "ended"'), "voice diagnostic may only confirm after actual playback end");
expect(bridge.includes('locale.startsWith("fr")'), "non-French reminders must fail closed in V1");
expect(bridge.includes("waitForToumaiVoiceConversationIdle"), "reminders must wait while live conversation is active");
expect(bridge.includes("reminderSpeechQueue"), "simultaneous reminders must be queued, not overlap");

expect(voiceSettings.includes("Zenaba"), "settings must display Zenaba");
expect(voiceSettings.includes("Voix officielle de Toumaï · Français"), "settings must explain the official French voice");
expect(!voiceSettings.includes("listVoices"), "settings must not expose a multi-voice catalog");
expect(!voiceSettings.includes("Choisir"), "settings must not expose a voice selector");

expect(notifications.includes("Zenaba lit les rappels"), "notification settings must name the active voice");
expect(!notifications.includes("speechSynthesis"), "notification settings must not depend on browser TTS");
expect(!security.includes("speechSynthesis"), "diagnostics must test real audio, not browser TTS");
expect(security.includes("toumai:notification-voice-complete"), "diagnostics must wait for real completion");

expect(!chat.includes('disabled={speech.state === "loading"}'), "Stop must remain available while synthesis is loading");

expect(voiceMode.includes("playToumaiVoiceLive"), "web voice mode must use native Pocket streaming through the shared Zenaba player");
expect(voiceMode.includes("stopToumaiVoice"), "web voice mode must use the shared stop control");
expect(!voiceMode.includes("synthesizeSpeech"), "web voice mode must not own a second TTS pipeline");
expect(voiceMode.includes("drainSpeechSegments"), "voice mode must split LLM text into logical TTS segments");
expect(voiceMode.includes("MAX_TTS_SEGMENT_WORDS = 26"), "voice mode must cap oversized Pocket TTS segments");
expect(voiceMode.includes("speechBuffer += chunk"), "voice mode must buffer live LLM chunks for speech");
expect(voiceMode.includes("drain(false)"), "voice mode must speak before the full LLM response finishes");
expect(voiceMode.includes("drain(true)"), "voice mode must flush the final text fragment");
expect(voiceMode.includes("onCancel?.()"), "voice interruption must cancel the live LLM stream");
expect(voiceMode.includes("turnRef.current"), "stale voice-turn callbacks must be invalidated");
expect(voiceMode.includes("m.index ?? 0"), "voice segmentation must split only on explicit boundaries");
expect(voiceMode.includes("SUSTAINED_SPEECH_MS = 180"), "short utterances such as oui/non must be accepted");
expect(voiceMode.includes("MIN_TOTAL_SPEECH_MS = 220"), "short voice turns must not require 400ms of speech");
expect(voiceMode.includes("captureEpochRef"), "stale microphone and STT sessions must be invalidated");
expect(voiceMode.includes("recordingMimeRef"), "voice mode must preserve the real MediaRecorder container");
expect(voiceMode.includes('"audio/mp4"'), "voice mode must support Safari MediaRecorder output");
expect(voiceMode.includes("setCaptureStream(stream)"), "voice mode must expose its capture stream to the waveform");
expect(waveform.includes("providedStream"), "waveform must be able to reuse the conversation microphone");
expect(waveform.includes("if (ownsStream)"), "waveform must never stop a microphone stream it does not own");
expect(voiceMode.includes("stopToumaiVoice();"), "opening live voice mode must preempt an existing reminder/read-aloud");
expect(!voiceMode.includes("discardRecordingRef"), "legacy global recorder discard flag must stay removed");
expect(voiceMode.includes("listenEpoch !== captureEpochRef.current"), "late recorder/STT callbacks must be ignored");
expect(voiceMode.includes("recordingChunks"), "each MediaRecorder session must own its own chunk buffer");
expect(voiceMode.includes("stopBargeListening();"), "mute/stop paths must close the barge-in microphone");
expect(voiceMode.includes("!speechStarted && reply.trim()"), "voice mode must speak providers that do not emit chunk callbacks");
expect(chatPage.includes("onCancel={stopGenerating}"), "voice mode interruption must abort the chat stream");
expect(chatPage.includes("primeToumaiVoiceAudio()"), "opening voice mode must prime Web Audio during the user gesture");
expect(chatPage.includes("rethrowOnError = false"), "chat stream must support voice-mode error propagation");
expect(chatPage.includes("if (rethrowOnError) throw err"), "voice-mode chat failures must not be swallowed");
expect(voiceMode.includes("onCancel?.();"), "TTS failures and interruptions must cancel remaining chat generation");
expect(!fs.existsSync("components/LiveAvatarOverlay.tsx"), "unused alternate avatar TTS pipeline must stay removed");

console.log("toumai-voice-v1-web: PASS");
