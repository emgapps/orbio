# Changelog

## 0.2.0

- Added unavailable and error orb state visuals, including animated unavailable desaturation and an error shake transition.
- Added the lines-pattern background treatment to the example page orb area.
- Updated audio session documentation to clarify automatic analysis and manual signal override behavior.

## 0.1.1

- Added manual orb audio signals so consumers can drive the orb from WebRTC, custom Web Audio, streaming TTS, or other external audio pipelines.
- Added Google Cloud TTS audio session helpers and per-orb audio track support.
- Prepared the scoped `@emgapps/orb-core` and `@emgapps/orb-react` packages for public npm publishing with MIT license metadata.

## 0.1.0

- Initial Orbio release with a framework-agnostic core package and React `<Orb />` wrapper.
- Added WebGL orb rendering with a CSS fallback renderer.
- Added built-in themes, runtime settings, orb states, audio analysis, and drag support.
- Added the basic Vite example app and starter usage documentation.
