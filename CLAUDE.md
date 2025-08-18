# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookForge is a professional AI-powered non-fiction book generator built as a client-side web application. It allows users to create authoritative, research-backed non-fiction books using various AI providers (OpenRouter/OpenAI). The application is a single-page application (SPA) with no backend dependencies.

## File Structure

```
bookforge/
├── index.html          # Main application interface with complete UI
├── styles.css          # Professional styling with theme support
├── script.js           # Complete application logic (~2000+ lines)
├── favicon.ico         # Application icon and PWA assets
├── sitemap.xml         # SEO optimization
├── robots.txt          # Search engine directives
└── README.md           # Project documentation
```

## Core Architecture

### Application State Management
- **Global State**: `bookData` object contains current project state (script.js:19-35)
- **AI Settings**: `aiSettings` object manages API configuration (script.js:44-51)
- **Local Storage**: Projects persisted in browser localStorage with auto-save
- **Theme Management**: CSS variables system for professional/dark themes

### AI Integration Layer
- **Multi-Provider Support**: OpenRouter and OpenAI API integration
- **Model Selection**: Claude Sonnet 4, GPT-4, and other models
- **Prompt Engineering**: Category-specific prompt templates (script.js:100+)
- **Cost Estimation**: Token-based cost calculation before generation
- **Error Handling**: Retry logic with exponential backoff

### Content Generation Pipeline
1. **Setup Phase**: Book parameters, category, audience configuration
2. **Research Phase**: AI-generated research framework with authority positioning
3. **Chapter Planning**: Detailed chapter structure with learning outcomes
4. **Content Generation**: Individual chapter writing with feedback loops
5. **Export Phase**: Multiple format support (TXT, HTML, Markdown)

### Category-Specific Requirements
The application includes specialized requirements for 6 categories (script.js:57-94):
- Business & Entrepreneurship
- Self-Help & Personal Development  
- Health & Wellness
- Technology & Programming
- Science & Education
- Finance & Investment

Each category has specific authority elements, disclaimers, and content requirements.

## Development Commands

Since this is a static web application with no build process:

- **Local Development**: Open `index.html` directly in browser or use local server
- **Testing**: Manual testing through browser (no automated test suite)
- **Linting**: No specific linting configuration found
- **Deployment**: Direct file upload to static hosting

## Key Components

### State Management Functions
- `saveProject()` - Saves current project to localStorage
- `loadProject()` - Loads project from localStorage
- `autoSave()` - Automatic saving with debounce (script.js:38)

### AI Generation Pipeline
- `generateContent()` - Main content generation orchestrator
- `callAI()` - API communication layer with error handling
- `estimateCost()` - Token and cost calculation
- `applyFeedback()` - Content improvement iteration

### UI Management
- Step-based navigation system (setup → research → chapters → content)
- Progress tracking and status indicators
- Responsive design for desktop/tablet/mobile
- Theme switching between professional and dark modes

## Working with the Codebase

### Key Implementation Patterns
- **Event-Driven**: Extensive use of event listeners for UI interactions
- **Promise-Based**: Async/await for AI API calls with proper error handling
- **Modular Functions**: Well-separated concerns despite single-file architecture
- **Configuration-Driven**: Category requirements and prompts as data structures

### Critical Integration Points
- **API Key Management**: Stored in localStorage, never transmitted to BookForge servers
- **Content Security**: All data remains client-side, no server communication except AI APIs
- **Error Recovery**: Graceful degradation with user-friendly error messages
- **Performance**: Lazy loading and efficient DOM manipulation

### Code Style Conventions
- ES6+ JavaScript with modern async patterns
- Extensive commenting with section dividers
- Consistent naming: camelCase for variables, UPPER_CASE for constants
- Professional error handling with user feedback
- Mobile-first responsive design approach

## Important Notes

- **No Backend**: Entirely client-side application, all data stored locally
- **AI Provider Agnostic**: Designed to work with multiple AI providers
- **Professional Focus**: Specialized for non-fiction content with authority building
- **Privacy Focused**: No data collection, everything stays in user's browser
- **SEO Optimized**: Comprehensive meta tags and structured data for discoverability