# Weighted Character Lift & Toss

A self-contained 2D animation study demonstrating anticipation, physical strain, explosive release, and balance recovery.

## Run the animation

From this folder, start a local server:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser.

## Animation beats

- **Anticipation:** the character compresses and leans into the lift.
- **Exertion:** the body extends while the heavy object rises overhead.
- **Release:** the object launches upward and outward.
- **Recovery:** the character regains balance while the object continues its arc.

## Export proof

- Use **Record proof** to record the canvas animation as a `.webm` video.
- Use **Save frame** to export the current pose as a `.png` image.

The animation is authored at 24 fps over 8 seconds. Converting the WebM recording to MP4 or GIF requires a video encoder such as `ffmpeg`.