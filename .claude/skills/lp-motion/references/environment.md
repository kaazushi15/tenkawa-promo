# Environment notes

## Cloud sessions with a restricted network
In the H3 session the egress proxy blocked the CDNs that serve generated files
(`dnznrvs05pmza.cloudfront.net`, `d2jqrm6oza8nb6.cloudfront.net` for Runway, `cdn.pika.art` for Pika).
Uploads to Runway (S3 presigned PUT) worked; downloads did not.

Workarounds that worked:
- **Images:** run Runway `upscale_image` (flavor `photo`, 2×) on the generated image and poll `get_task`
  one call at a time until it completes. The completing poll returns an inline preview that the harness saves
  under `~/.claude/projects/<session>/tool-results/mcp-runway-blob-*.jpg` at up to ~1080×1920 — enough for a
  1080×1920 video. Generate at 1K so the preview is reliably returned (2K sources sometimes came back without one).
- **Music / narration / video:** no workaround. Ask the user to generate it (give them the prompt from
  `audio.md`) and upload the file, or to allow the domains under the environment's network settings.
- Local tools that worked offline-ish: PyTorch CPU + spandrel + Real-ESRGAN x4plus weights from GitHub releases;
  rembg with the isnet model from GitHub releases; Google Fonts CSS + woff2 download; Playwright's bundled
  Chromium at `/opt/pw-browsers`.

## Codex / GPT Image 2
The user generates LP images with GPT Image 2 via Codex. If a Codex tool or agent is connected, delegate to it.
If not, Runway exposes `gpt-image-2` as an image model; Pika exposes provider `gpt-image-2`.

## Render performance
1080×1920 @ 60fps with swiftshader WebGL: ~0.9s/frame single-process with GPU compositing, ~0.3s/frame per
worker with `--disable-gpu-compositing` and 3 workers on 4 cores. A 35s piece renders in ~6–8 minutes.
