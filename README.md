# Shadh — 3D Personal Profile

A responsive, scroll-driven personal profile inspired by the structure of the reference site at https://about.senbuzy.com/. This is a new implementation with original procedural 3D geometry and customized copy; it does **not** reuse the reference creator's character model, personal copy, or branded assets.

## Run it on your computer

1. Extract the ZIP.
2. Open a terminal in this folder.
3. Start a local web server:

   **Windows:**
   ```powershell
   py -m http.server 8000
   ```

   If `py` is unavailable, try `python -m http.server 8000`.
4. Open http://localhost:8000 in Chrome, Edge, or Brave.

The page uses the Three.js ES module from jsDelivr and Google Fonts, so the first load needs an internet connection. There is no build step, database, API key, or framework setup.

## Personalize the content

- **Name, About copy, education, journey and sections:** edit `index.html`.
- **Colors, spacing and responsive layout:** edit `styles.css` near the top (`:root`).
- **3D avatar, lighting and scroll motion:** edit `app.js` in `buildAvatar()`, `initScene()` and `animate()`.
- **Project popup text:** edit the `projectInfo` object in `app.js`.
- **Social links / email:** no contact details are invented or included. Add your own links in `index.html` once you are ready to publish them.

## Publish it for free

Upload the extracted folder to a static website host such as GitHub Pages, Cloudflare Pages, or Netlify. Keep the three files (`index.html`, `styles.css`, `app.js`) together in the published root. For local testing, use the server steps above rather than opening `index.html` directly; browsers restrict ES module imports from `file://` URLs.

## Notes

- The three-dimensional figure is a stylized original placeholder made from Three.js primitives, not a scan or likeness of a real person. Replace/refine it in `buildAvatar()` if you want a different look.
- Project cards are explicitly presented as concepts and explorations, not completed products.
- On devices without WebGL or when the 3D CDN cannot load, the written page remains available, but the animated 3D background may not render.
