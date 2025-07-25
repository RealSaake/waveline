# 🤝 Contributing to Spotify Visualizer

Thanks for your interest in contributing! This project thrives on community contributions.

## 🚀 Quick Start

1. **Fork & Clone**
   ```bash
   git clone https://github.com/yourusername/spotify-visualizer
   cd spotify-visualizer
   npm install
   ```

2. **Setup Environment** (see [SETUP.md](SETUP.md))

3. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🎨 What You Can Contribute

### 🌟 New Visualization Modes
- Add new visual effects in `src/components/MainVisualizer.tsx`
- Create audio-reactive patterns and animations
- Experiment with different frequency mappings

### 🎵 Audio Analysis Improvements
- Enhance frequency analysis in `src/hooks/useSpotifyPlayer.ts`
- Add beat detection algorithms
- Improve audio data processing

### 🤖 AI Enhancements
- Improve track analysis in `src/app/api/track-info/route.ts`
- Add new visual DNA generation patterns
- Enhance mood and genre detection

### 🐛 Bug Fixes & Performance
- Fix browser compatibility issues
- Optimize rendering performance
- Improve error handling

### 📚 Documentation
- Improve setup instructions
- Add code comments
- Create tutorials and examples

## 🛠 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing naming conventions
- Add comments for complex logic
- Keep components focused and reusable

### Testing
```bash
npm run dev    # Test locally
npm run build  # Test production build
npm run lint   # Check code style
```

### Commit Messages
```
feat: add new plasma visualization mode
fix: resolve audio context suspension issue
docs: update setup instructions
perf: optimize frequency data processing
```

## 📝 Pull Request Process

1. **Test Your Changes**
   - Ensure the app builds and runs
   - Test with different browsers
   - Verify Spotify integration works

2. **Update Documentation**
   - Update README if needed
   - Add comments to new code
   - Update SETUP.md for new requirements

3. **Submit PR**
   - Clear title and description
   - Reference any related issues
   - Include screenshots/videos for visual changes

## 🎵 Visualization Ideas

Looking for inspiration? Try implementing:

- **Waveform Visualizer** - Classic oscilloscope-style display
- **3D Particle System** - WebGL-based 3D effects
- **Mandala Generator** - Geometric patterns based on audio
- **Audio Landscape** - Terrain generation from frequency data
- **Color Harmony** - Music theory-based color palettes
- **Beat Circles** - Concentric circles pulsing with rhythm

## 🐛 Reporting Issues

Found a bug? Please include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots/videos (if helpful)

## 💡 Feature Requests

Have an idea? Open an issue with:
- Clear description of the feature
- Use cases and benefits
- Mockups or examples (if applicable)
- Technical considerations

## 🏆 Recognition

Contributors will be:
- Listed in the README
- Credited in release notes
- Invited to join the core team (for significant contributions)

## 📞 Get Help

- 💬 [GitHub Discussions](https://github.com/yourusername/spotify-visualizer/discussions)
- 🐛 [Issues](https://github.com/yourusername/spotify-visualizer/issues)
- 📧 Email: your-email@example.com

---

**Let's make music visualization amazing together! 🎵✨**