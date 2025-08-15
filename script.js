/**
 * BookForge AI - Professional Non-Fiction Book Generation Platform
 * Production-ready JavaScript implementation
 * 
 * @author Andreas Dietrich
 * @version 1.0.1
 * @description Complete AI-powered non-fiction book generation platform with advanced model selection,
 *              feedback loops, project management, and professional export capabilities.
 */

// ==================================================
// GLOBAL CONFIGURATION & STATE
// ==================================================

/**
 * Application configuration constants
 */
const CONFIG = {
    MAX_SAVED_PROJECTS: 10,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    READING_SPEED_WPM: 250,
    VERSION: '1.0.1'
};

/**
 * Global application state
 */
let bookData = {
    id: 'current',
    title: '',
    description: '',
    category: '',
    targetAudience: '',
    topic: '',
    approach: '',
    numChapters: 15,
    targetWordCount: 2000,
    outline: '',
    researchPlan: '',
    chapters: [],
    currentStep: 'setup',
    createdAt: new Date().toISOString(),
    lastSaved: new Date().toISOString()
};

/**
 * AI settings and configuration
 */
let aiSettings = {
    apiProvider: 'openrouter',
    openrouterApiKey: '',
    openaiApiKey: '',
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.7,
    maxTokens: 50000,
    advancedModelsEnabled: false,
    advancedModels: {},
    customPrompts: {
        outline: '',
        research: '',
        writing: '',
        analysis: '',
        improvement: '',
        manualImprovement: '',
        randomIdea: '',
        bookTitle: ''
    }
};

/**
 * Runtime state variables
 */
let projects = {};
let autoSaveTimer;
let oneClickCancelled = false;
let currentExpandedChapter = null;
let currentTheme = 'light';
let selectedDonationAmount = 5;
let isGenerating = false;

// ==================================================
// INITIALIZATION
// ==================================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('BookForge AI - Initializing application...');
    
    try {
        // Load saved data
        loadSettings();
        loadProjects();
        loadCurrentProject();
        
        // Setup UI
        initializeUI();
        setupEventListeners();
        setupKeyboardShortcuts();
        
        // Start auto-save
        startAutoSave();
        
        console.log('BookForge AI - Application initialized successfully');
    } catch (error) {
        console.error('BookForge AI - Initialization error:', error);
        showErrorMessage('Failed to initialize application. Please refresh the page.');
    }
});

/**
 * Initialize UI elements and state
 */
function initializeUI() {
    // Set initial theme
    const savedTheme = localStorage.getItem('bookforge_theme') || 'light';
    setTheme(savedTheme);
    
    // Initialize prompts
    initializeCustomPrompts();
    
    // Update model selectors
    updateModelSelect();
    
    // Update UI elements
    updateWordCount();
    updateChapterEstimate();
    updateCategoryRequirements();
    updateAudienceRequirements();
    updateNavProgress();
    
    // Initialize first step
    showStep('setup');
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const saved = localStorage.getItem('bookforge_settings');
    if (saved) {
        try {
            const savedSettings = JSON.parse(saved);
            aiSettings = { ...aiSettings, ...savedSettings };
            
            // Update UI elements
            if (document.getElementById('openrouter-api-key')) {
                document.getElementById('openrouter-api-key').value = aiSettings.openrouterApiKey || '';
            }
            if (document.getElementById('openai-api-key')) {
                document.getElementById('openai-api-key').value = aiSettings.openaiApiKey || '';
            }
            if (document.getElementById('temperature')) {
                document.getElementById('temperature').value = aiSettings.temperature;
                updateTempValue();
            }
            if (document.getElementById('max-tokens')) {
                document.getElementById('max-tokens').value = aiSettings.maxTokens;
            }
            
            // Set API provider
            switchApiProvider(aiSettings.apiProvider);
            
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
}

/**
 * Load projects from localStorage
 */
function loadProjects() {
    const saved = localStorage.getItem('bookforge_projects');
    if (saved) {
        try {
            projects = JSON.parse(saved);
            updateProjectSelector();
        } catch (error) {
            console.warn('Failed to load projects:', error);
            projects = {};
        }
    }
}

/**
 * Load current project data
 */
function loadCurrentProject() {
    const saved = localStorage.getItem('bookforge_current_project');
    if (saved) {
        try {
            const savedProject = JSON.parse(saved);
            bookData = { ...bookData, ...savedProject };
            
            // Update form fields
            updateFormFromBookData();
            
        } catch (error) {
            console.warn('Failed to load current project:', error);
        }
    }
}

/**
 * Update form fields from book data
 */
function updateFormFromBookData() {
    const fields = {
        'category': bookData.category,
        'target-audience': bookData.targetAudience,
        'topic': bookData.topic,
        'approach': bookData.approach,
        'num-chapters': bookData.numChapters,
        'target-word-count': bookData.targetWordCount,
        'outline-content': bookData.outline,
        'research-content': bookData.researchPlan
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
            element.value = value;
        }
    });
    
    // Update chapters array
    if (bookData.chapters && bookData.chapters.length > 0) {
        // Chapters will be loaded when writing interface is initialized
    }
    
    // Update step navigation
    if (bookData.currentStep) {
        setTimeout(() => showStep(bookData.currentStep), 100);
    }
    
    // Update UI elements
    updateWordCount();
    updateChapterEstimate();
    updateCategoryRequirements();
    saveOutlineContent();
    saveResearchContent();
}

// ==================================================
// CUSTOM ALERT SYSTEM
// ==================================================

let alertCallback = null;

/**
 * Show custom alert dialog
 * @param {string} message - Alert message
 * @param {string} title - Alert title
 * @returns {Promise<boolean>}
 */
function customAlert(message, title = 'Notification') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        if (!modal || !titleElement || !messageElement || !okBtn || !cancelBtn) {
            console.warn('Alert modal elements not found, using fallback');
            alert(message);
            resolve(true);
            return;
        }
        
        titleElement.textContent = title;
        messageElement.innerHTML = message.replace(/\n/g, '<br>');
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        
        alertCallback = resolve;
        modal.classList.add('active');
        okBtn.focus();
    });
}

/**
 * Show custom confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>}
 */
function customConfirm(message, title = 'Confirmation') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        if (!modal || !titleElement || !messageElement || !okBtn || !cancelBtn) {
            console.warn('Confirm modal elements not found, using fallback');
            resolve(confirm(message));
            return;
        }
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
        okBtn.textContent = 'Yes';
        cancelBtn.textContent = 'No';
        
        alertCallback = resolve;
        modal.classList.add('active');
        cancelBtn.focus();
    });
}

/**
 * Close custom alert/confirm dialog
 * @param {boolean} result - Dialog result
 */
function closeCustomAlert(result = true) {
    const modal = document.getElementById('custom-alert-modal');
    const okBtn = document.getElementById('alert-ok-btn');
    
    if (modal) modal.classList.remove('active');
    if (okBtn) okBtn.textContent = 'OK';
    
    if (alertCallback) {
        alertCallback(result);
        alertCallback = null;
    }
}

// ==================================================
// ERROR HANDLING
// ==================================================

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showErrorMessage(message) {
    customAlert(message, 'Error');
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccessMessage(message) {
    customAlert(message, 'Success');
}

// ==================================================
// API MODELS CONFIGURATION
// ==================================================

/**
 * Available AI models by provider
 */
const apiModels = {
    openrouter: {
        creative: [
            { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 ⭐', cost: { input: 3.00, output: 15.00 }},
            { value: 'anthropic/claude-opus-4.1', label: 'Claude Opus 4.1 ⭐⭐', cost: { input: 15.00, output: 75.00 }},
            { value: 'openai/gpt-4o', label: 'GPT-4o ⭐', cost: { input: 5.00, output: 15.00 }},
            { value: 'openai/gpt-5', label: 'GPT-5 ⭐⭐', cost: { input: 1.25, output: 10.00 }},
            { value: 'anthropic/claude-3.7-sonnet:thinking', label: 'Claude Sonnet 3.7 (Thinking) ⭐', cost: { input: 3.00, output: 15.00 }},
            { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro ⭐', cost: { input: 1.25, output: 10.00 }}
        ],
        budget: [
            { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini 💰', cost: { input: 0.25, output: 2.00 }},
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini 💰', cost: { input: 0.15, output: 0.60 }},
            { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano 💰💰', cost: { input: 0.05, output: 0.40 }},
            { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash 💰', cost: { input: 0.30, output: 2.50 }},
            { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek Chat V3 💰💰', cost: { input: 0.18, output: 0.72 }}
        ]
    },
    openai: {
        creative: [
            { value: 'gpt-5', label: 'GPT-5 ⭐⭐', cost: { input: 1.25, output: 10 }},
            { value: 'gpt-4o', label: 'GPT-4o ⭐', cost: { input: 5, output: 15 }},
        ],
        budget: [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini 💰', cost: { input: 0.15, output: 0.6 }},
            { value: 'gpt-5-mini', label: 'GPT-5 Mini 💰', cost: { input: 0.25, output: 2 }}
        ]
    }
};

// ==================================================
// CATEGORY REQUIREMENTS
// ==================================================

/**
 * Category-specific requirements and guidelines
 */
const categoryRequirements = {
    business: {
        requirements: "Actionable strategies, real-world case studies, ROI-focused content, professional tone",
        approach: "Problem-solving framework, step-by-step implementation, measurable outcomes"
    },
    'self-help': {
        requirements: "Personal transformation focus, practical exercises, motivational tone, relatable examples",
        approach: "Goal-oriented structure, actionable steps, habit formation, mindset shifts"
    },
    health: {
        requirements: "Evidence-based information, safety considerations, expert credibility, balanced approach",
        approach: "Health goals framework, lifestyle integration, sustainable practices, expert validation"
    },
    technology: {
        requirements: "Technical accuracy, code examples, current best practices, hands-on learning",
        approach: "Progressive skill building, practical projects, troubleshooting guides, industry relevance"
    },
    history: {
        requirements: "Historical accuracy, multiple perspectives, contextual analysis, engaging narrative",
        approach: "Chronological or thematic structure, primary sources, cause-and-effect analysis"
    },
    science: {
        requirements: "Scientific rigor, peer-reviewed sources, clear explanations, educational value",
        approach: "Concept building, practical applications, critical thinking, evidence-based conclusions"
    },
    finance: {
        requirements: "Financial accuracy, risk considerations, practical strategies, compliance awareness",
        approach: "Goal-based planning, risk management, actionable advice, real-world examples"
    },
    travel: {
        requirements: "Practical information, cultural sensitivity, personal experiences, useful tips",
        approach: "Destination-focused or thematic, practical guides, cultural insights, personal stories"
    },
    cooking: {
        requirements: "Clear instructions, ingredient accessibility, skill progression, food safety",
        approach: "Technique building, recipe organization, cultural context, dietary considerations"
    },
    arts: {
        requirements: "Creative techniques, skill development, artistic inspiration, practical projects",
        approach: "Skill progression, project-based learning, creative exercises, artistic principles"
    },
    politics: {
        requirements: "Balanced perspectives, factual accuracy, analytical depth, respectful discourse",
        approach: "Issue-based analysis, historical context, multiple viewpoints, critical thinking"
    },
    religion: {
        requirements: "Respectful treatment, spiritual depth, practical application, inclusive approach",
        approach: "Faith development, spiritual practices, community building, personal growth"
    }
};

// ==================================================
// DEFAULT PROMPTS
// ==================================================

/**
 * Default AI generation prompts for non-fiction
 */
const defaultPrompts = {
    outline: `You are an expert non-fiction author and knowledge architect creating a comprehensive book outline. Generate a professional structure that delivers valuable, actionable knowledge to readers.

BOOK DETAILS:
- Category: {category}
- Target Audience: {targetAudience}
- Main Topic: {topic}
- Writing Approach: {approach}
- Number of Chapters: {numChapters}

CATEGORY-SPECIFIC GUIDELINES:
{categoryRequirements}

CREATE A COMPREHENSIVE BOOK OUTLINE INCLUDING:

1. **BOOK FOUNDATION**:
   - Clear value proposition: What specific problem does this book solve?
   - Target reader profile: Who will benefit most from this knowledge?
   - Learning objectives: What will readers know/be able to do after reading?
   - Unique angle: What makes this book different from others in the category?

2. **LOGICAL STRUCTURE**:
   - Introduction: Hook, problem identification, solution preview, book roadmap
   - Core Content Chapters (1-{numChapters}): Progressive knowledge building
   - Conclusion: Key takeaways, action steps, next steps for readers
   - Potential appendices: Resources, tools, references

3. **CHAPTER FRAMEWORK**:
   - Chapter progression: How knowledge builds from basic to advanced
   - Key concepts for each chapter
   - Learning outcomes per chapter
   - Connection between chapters for cohesive learning experience

4. **KNOWLEDGE DELIVERY**:
   - Teaching methodology appropriate for {targetAudience}
   - Balance of theory and practical application
   - Examples, case studies, and real-world applications
   - Actionable takeaways and implementation strategies

5. **AUTHORITY BUILDING**:
   - Expert credibility establishment
   - Research and evidence integration
   - Professional tone and expertise demonstration
   - Trustworthy and reliable information delivery

Ensure this outline creates a book that establishes expertise, delivers genuine value, and enables readers to achieve meaningful results in {category}.`,

    research: `You are a research expert and content strategist creating a comprehensive research and content development plan. Based on the book outline, develop detailed research frameworks and content plans for each chapter.

BOOK OUTLINE:
{outline}

BOOK DETAILS:
- Category: {category}
- Target Audience: {targetAudience}
- Main Topic: {topic}
- Writing Approach: {approach}

CREATE DETAILED RESEARCH & CONTENT PLAN:

1. **RESEARCH FOUNDATION**:
   - Key research areas and topics for the entire book
   - Primary and secondary source types needed
   - Expert perspectives and authoritative voices to reference
   - Data, statistics, and evidence required for credibility

2. **CHAPTER-BY-CHAPTER CONTENT PLANS**:
   For each chapter (1-{numChapters}), provide:
   
   **Chapter Structure**:
   - Opening hook: Engaging start that connects to reader's needs
   - Core concepts: 3-5 main points to cover
   - Supporting evidence: Research, data, examples needed
   - Practical elements: Exercises, tools, action steps
   - Chapter conclusion: Key takeaways and transition to next chapter

   **Content Requirements**:
   - Expert quotes or perspectives to include
   - Case studies, examples, or stories that illustrate points
   - Data, statistics, or research findings to support claims
   - Practical tools, frameworks, or methodologies to teach
   - Common mistakes or misconceptions to address

3. **AUTHORITY & CREDIBILITY ELEMENTS**:
   - Research methodologies and source verification
   - Expert interviews or perspectives to seek
   - Professional experience integration
   - Fact-checking and accuracy requirements

4. **READER ENGAGEMENT STRATEGIES**:
   - Interactive elements: Worksheets, assessments, exercises
   - Real-world applications and implementation guides
   - Troubleshooting common challenges
   - Success metrics and progress tracking

5. **SUPPORTING MATERIALS**:
   - Potential diagrams, charts, or visual aids
   - Resource lists and further reading recommendations
   - Tools, templates, or checklists to include
   - Glossary terms and definitions needed

Ensure this research plan enables the creation of authoritative, practical, and valuable content that establishes expertise and delivers measurable results for {targetAudience} in {category}.`,

    writing: `You are an expert non-fiction author writing Chapter {chapterNum} of a professional {category} book. Create authoritative, engaging content that delivers real value to {targetAudience} readers.

COMPLETE BOOK CONTEXT:
{contextInfo}

CHAPTER {chapterNum} RESEARCH PLAN:
{chapterResearch}

PREVIOUS CHAPTER SUMMARY (for continuity):
{previousChapterSummary}

CHAPTER STRUCTURE REQUIREMENTS:
- **Opening**: Engaging hook that connects to reader's specific needs and challenges
- **Core Content**: 3-4 main concepts with practical explanations and examples
- **Evidence & Authority**: Research, data, expert insights, and credible sources
- **Practical Application**: Tools, frameworks, exercises, or action steps
- **Real-World Examples**: Case studies, stories, or scenarios that illustrate concepts
- **Chapter Conclusion**: Key takeaways, action items, and smooth transition

CONTENT REQUIREMENTS FOR {category}:
- **Authority**: Demonstrate expertise through informed insights and professional knowledge
- **Practical Value**: Provide actionable information readers can immediately implement
- **Clarity**: Explain complex concepts in terms appropriate for {targetAudience}
- **Evidence**: Support claims with research, data, or credible sources
- **Engagement**: Use examples, stories, and relatable scenarios
- **Structure**: Clear progression from concept to application

CATEGORY-SPECIFIC ELEMENTS:
{categorySpecificElements}

WRITING STANDARDS:
- Target length: {targetWordCount} words
- Professional tone appropriate for {targetAudience}
- Maintain consistency with previous chapters
- Follow research plan precisely
- Include practical tools and actionable advice
- Build credibility and trust with readers

CONTENT ORGANIZATION:
- 25% - Concept explanation and theory
- 35% - Practical application and how-to guidance  
- 25% - Examples, case studies, and real-world scenarios
- 15% - Action steps, exercises, and implementation tools

Write Chapter {chapterNum} with professional, authoritative content that advances the reader's knowledge and provides practical value they can immediately apply.`,

    randomIdea: `You are a non-fiction publishing expert and market analyst. Generate a compelling, commercially viable book idea that would become a bestseller and establish the author as an authority.

REQUIREMENTS:
- Category: {category}
- Target Audience: {targetAudience}

Create a unique non-fiction book concept that includes:

1. **TOPIC** (2-3 sentences): A compelling, marketable topic that addresses a real need or problem in {category}. Focus on something that would genuinely help {targetAudience} achieve specific results or solve pressing challenges. Think about current trends, emerging needs, and underserved niches.

2. **APPROACH** (1-2 sentences): Specify the writing style and methodology that would best serve this topic and appeal to the target audience. Consider how to make complex information accessible, engaging, and actionable.

3. **CHAPTER COUNT**: Recommend the optimal number of chapters for this topic and audience (business: 10-15, self-help: 12-20, technical: 8-15, others: 10-18).

MARKET POSITIONING:
- Address a genuine problem or opportunity
- Offer unique insights or methodologies
- Be appropriate for current market trends
- Provide clear value proposition for readers
- Establish author credibility and expertise

Think about what {targetAudience} professionals or enthusiasts are struggling with right now, what knowledge gaps exist, and what practical solutions would genuinely help them succeed.

FORMAT YOUR RESPONSE EXACTLY AS:
TOPIC: [Your 2-3 sentence topic description here]
APPROACH: [Your 1-2 sentence approach description here]  
CHAPTERS: [Number only]

Generate something that would truly help readers achieve meaningful results!`,

    bookTitle: `You are a bestselling non-fiction book marketing expert and title creation specialist. Create an irresistible, authoritative book title and compelling description that will make professionals immediately want to purchase and read this book.

BOOK DETAILS:
- Category: {category}
- Target Audience: {targetAudience}
- Main Topic: {topic}
- Writing Approach: {approach}

COMPLETE BOOK OUTLINE:
{outline}

DETAILED RESEARCH PLAN:
{researchPlan}

CREATE:

1. **BOOK TITLE**: A powerful, authoritative title that:
   - Immediately communicates the value and outcome for readers
   - Uses proven non-fiction bestseller title formulas for {category}
   - Appeals specifically to {targetAudience} professionals
   - Creates urgency and desire to learn/implement
   - Establishes credibility and expertise
   - Is memorable, professional, and marketable

2. **BOOK DESCRIPTION** (150-200 words): A compelling description that:
   - Opens with a problem statement that resonates with {targetAudience}
   - Presents the solution and methodology clearly
   - Highlights specific benefits and outcomes readers will achieve
   - Establishes author credibility and expertise
   - Creates urgency and fear of missing out
   - Ends with a clear value proposition and call to action
   - Uses professional language appropriate for {category}

BESTSELLER FORMULAS: Consider what makes {category} titles successful in today's market. Think of titles that would trend in professional circles, generate referrals, and establish the author as a thought leader.

MARKET POSITIONING: This book should position itself as the definitive guide, the most practical resource, or the breakthrough methodology for its specific niche within {category}.

FORMAT YOUR RESPONSE EXACTLY AS:
TITLE: [Your powerful title here]

DESCRIPTION: [Your compelling 150-200 word description here]

Make this book impossible for {targetAudience} to ignore - something they'd recommend to colleagues!`,

    analysis: `You are a professional editor and non-fiction content expert with 20+ years of experience analyzing {contentType} for {category} books targeting {targetAudience}. Provide detailed, actionable feedback while maintaining established parameters.

CONTENT TO ANALYZE:
{content}

ESTABLISHED PARAMETERS TO MAINTAIN:
- Category: {category}
- Target Audience: {targetAudience}
- Main Topic: {topic}
- Writing Approach: {approach}
- Target Chapter Word Count: {targetWordCount}
- Number of Chapters: {numChapters}

ANALYZE WITH FOCUS ON:

1. **AUTHORITY & CREDIBILITY**:
   - Does content demonstrate genuine expertise in {category}?
   - Are claims supported by evidence, research, or credible sources?
   - Is the professional tone appropriate for {targetAudience}?
   - Does it establish trust and author credibility?

2. **PRACTICAL VALUE & ACTIONABILITY**:
   - Can readers immediately implement the advice provided?
   - Are concepts explained clearly for {targetAudience} skill level?
   - Does it solve real problems this audience faces?
   - Are takeaways specific and measurable?

3. **CONTENT STRUCTURE & CLARITY**:
   - Is information organized logically and progressively?
   - Are complex concepts broken down appropriately?
   - Does content flow smoothly and maintain engagement?
   - Are examples and case studies relevant and helpful?

4. **MARKET POSITIONING & COMPETITIVENESS**:
   - Does content differentiate from other {category} books?
   - Is it comprehensive enough to be considered authoritative?
   - Would {targetAudience} professionals recommend this to colleagues?
   - Does it establish thought leadership potential?

5. **TECHNICAL EXECUTION**:
   - Writing quality and professional presentation
   - Appropriate depth for target audience
   - Consistency in voice and expertise level
   - Evidence integration and source credibility

6. **PRIORITY IMPROVEMENTS**:
   - List 3-5 specific, actionable improvements
   - Rank by importance to professional credibility
   - Provide concrete solutions for each issue
   - Ensure suggestions maintain established parameters

CRITICAL: All feedback must respect and enhance the core topic, approach, target audience, and technical specifications. Focus on strengthening authority, practical value, and professional impact within these constraints.`,

    improvement: `You are an expert non-fiction author and professional editor. Improve the {contentType} based on the analysis while strictly maintaining all established book parameters and professional standards.

ORIGINAL CONTENT:
{originalContent}

FEEDBACK TO ADDRESS:
{feedbackContent}

MANDATORY PARAMETERS TO MAINTAIN:
- Category: {category} - Follow all professional standards and expectations
- Target Audience: {targetAudience} - Keep content appropriate for this skill/professional level
- Main Topic: {topic} - Preserve the core subject matter and focus
- Writing Approach: {approach} - Maintain the specified methodology and style
- Target Word Count: {targetWordCount} words per chapter (if applicable)
- Number of Chapters: {numChapters} (maintain overall structure)

IMPROVEMENT REQUIREMENTS:
1. Address ALL critical issues identified in the feedback
2. Enhance authority and credibility while preserving established parameters
3. Strengthen practical value and actionability for {targetAudience}
4. Improve professional appeal and market positioning
5. Enhance {category} expertise demonstration
6. Increase reader engagement and knowledge retention
7. Keep the improved version within target length specifications

SPECIFIC GUIDELINES:
- If improving chapters, maintain target word count of {targetWordCount}
- Enhance evidence, examples, and practical applications
- Strengthen professional tone and expertise demonstration
- Improve actionability and implementation guidance
- Add credibility through better source integration
- Enhance clarity for {targetAudience} professional level

Create a significantly improved version that addresses the feedback comprehensively while maintaining the professional authority and practical value. The result should feel like a polished, expert-level upgrade suitable for {category} thought leadership.

Write the complete improved {contentType} with all enhancements seamlessly integrated.`,

    manualImprovement: `You are an expert non-fiction author and professional editor. Improve the {contentType} based on the specific feedback provided while maintaining all established book parameters unless explicitly overridden by the manual instructions.

ORIGINAL CONTENT:
{originalContent}

MANUAL FEEDBACK AND INSTRUCTIONS:
{manualFeedback}

ESTABLISHED PARAMETERS (maintain unless overridden by manual feedback):
- Category: {category}
- Target Audience: {targetAudience}  
- Main Topic: {topic}
- Writing Approach: {approach}
- Target Word Count: {targetWordCount} words per chapter (if applicable)
- Number of Chapters: {numChapters}

IMPROVEMENT APPROACH:
1. Prioritize the specific requests in the manual feedback above all else
2. If manual feedback conflicts with established parameters, follow the manual feedback
3. If manual feedback doesn't specify changes to parameters, maintain them
4. Address all points raised in the manual feedback thoroughly
5. Maintain professional authority and practical value
6. Ensure the result serves the target audience effectively

EXECUTION GUIDELINES:
- Follow manual instructions precisely, even if they deviate from original parameters
- If word count changes are requested, adjust accordingly
- If approach changes are requested, implement them while maintaining quality
- If content changes are requested, ensure logical consistency
- Maintain professional writing quality throughout
- Preserve credibility and practical value unless specifically asked to change

Create an improved version that perfectly addresses the manual feedback while maintaining the highest standards of non-fiction authority and practical value.

Write the complete improved {contentType} with all requested changes implemented seamlessly.`
};

// ==================================================
// THEME MANAGEMENT
// ==================================================

const themes = ['light', 'dark', 'fun'];

/**
 * Change theme based on dropdown selection
 */
function changeTheme() {
    const selectedTheme = document.getElementById('theme-select').value;
    setTheme(selectedTheme);
}

/**
 * Set application theme
 * @param {string} theme - Theme name
 */
function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('bookforge_theme', theme);
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = theme;
    }
}

/**
 * Toggle through themes programmatically
 */
function toggleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
}

// ==================================================
// NAVIGATION SYSTEM
// ==================================================

/**
 * Show specific step and handle initialization
 * @param {string} stepName - Step identifier
 */
function showStep(stepName) {
    try {
        // Hide all steps
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => step.classList.remove('active'));
        
        // Remove active class from all nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Show selected step
        const targetStep = document.getElementById(stepName);
        if (targetStep) {
            targetStep.classList.add('active');
        } else {
            console.warn(`Step element not found: ${stepName}`);
            return;
        }
        
        // Add active class to clicked nav item
        const activeNavItem = document.querySelector(`[data-step="${stepName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // Special handling for writing step
        if (stepName === 'writing') {
            ensureWritingInterfaceInitialized();
        }
        
        // Special handling for export step
        if (stepName === 'export') {
            updateBookStats();
        }
        
        bookData.currentStep = stepName;
        updateNavProgress();
        autoSave();
        
    } catch (error) {
        console.error('Error in showStep:', error);
    }
}

/**
 * Ensure writing interface is properly initialized
 */
function ensureWritingInterfaceInitialized() {
    const container = document.getElementById('chapters-container');
    if (!container) return;
    
    const placeholder = container.querySelector('.writing-placeholder');
    
    if (placeholder || container.children.length === 0 || container.innerHTML.includes('Setting up')) {
        setTimeout(() => setupWritingInterface(), 100);
    }
}

/**
 * Update navigation progress indicator
 */
function updateNavProgress() {
    const steps = ['setup', 'outline', 'research', 'writing', 'export'];
    const currentIndex = steps.indexOf(bookData.currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    
    const progressLine = document.getElementById('nav-progress-line');
    if (progressLine) {
        progressLine.style.width = `${progress}%`;
    }
    
    // Mark completed steps
    steps.forEach((step, index) => {
        const navItem = document.querySelector(`[data-step="${step}"]`);
        if (navItem) {
            if (index < currentIndex) {
                navItem.classList.add('completed');
            } else {
                navItem.classList.remove('completed');
            }
        }
    });
}

// ==================================================
// COLLAPSIBLE SECTIONS
// ==================================================

/**
 * Toggle collapsible section visibility
 * @param {HTMLElement} header - Section header element
 */
function toggleCollapsibleSection(header) {
    const section = header.closest('.collapsible-section');
    const content = section.querySelector('.collapsible-content');
    const icon = header.querySelector('.toggle-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.textContent = '▲';
        section.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        section.classList.remove('expanded');
    }
}

// ==================================================
// EVENT LISTENERS SETUP
// ==================================================

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    const categorySelect = document.getElementById('category');
    const audienceSelect = document.getElementById('target-audience');
    
    // Random idea button visibility
    function checkRandomButtonVisibility() {
        const randomBtn = document.getElementById('random-idea-btn');
        if (randomBtn && categorySelect && audienceSelect) {
            if (categorySelect.value && audienceSelect.value) {
                randomBtn.style.display = 'inline-flex';
            } else {
                randomBtn.style.display = 'none';
            }
        }
    }
    
    if (categorySelect) categorySelect.addEventListener('change', checkRandomButtonVisibility);
    if (audienceSelect) audienceSelect.addEventListener('change', checkRandomButtonVisibility);

    // Word count updates
    const topic = document.getElementById('topic');
    const approach = document.getElementById('approach');
    if (topic) topic.addEventListener('input', updateWordCount);
    if (approach) approach.addEventListener('input', updateWordCount);
    
    // Feedback mode change listeners
    ['outline', 'research', 'writing'].forEach(step => {
        const select = document.getElementById(`${step}-feedback-mode`);
        if (select) {
            select.addEventListener('change', () => toggleManualFeedback(step));
        }
    });

    // Project selector change listener
    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
        projectSelect.addEventListener('change', function() {
            updateDeleteButtonVisibility();
        });
    }

    // Custom donation amount handling
    const customAmountInput = document.getElementById('custom-donation-amount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            if (this.value) {
                document.querySelectorAll('.donation-amount').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                const donateBtn = document.getElementById('donate-btn');
                if (donateBtn) {
                    donateBtn.innerHTML = `<span class="label">Donate $${this.value}</span>`;
                }
                selectedDonationAmount = parseFloat(this.value);
            }
        });
    }

    // Expand textarea word count tracking
    const expandTextarea = document.getElementById('expand-textarea');
    if (expandTextarea) {
        expandTextarea.addEventListener('input', updateExpandedWordCount);
    }
    
    // Modal close on background click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'custom-alert-modal') {
                closeCustomAlert(false);
            } else if (e.target.id === 'expand-modal') {
                closeExpandModal();
            } else if (e.target.id === 'one-click-modal') {
                closeOneClickModal();
            } else if (e.target.id === 'project-management-modal') {
                closeProjectManagementModal();
            } else if (e.target.id === 'feedback-modal') {
                closeFeedbackModal();
            } else if (e.target.id === 'donation-modal') {
                closeDonationModal();
            }
        }
    });
}

// ==================================================
// KEYBOARD SHORTCUTS
// ==================================================

/**
 * Set up keyboard shortcuts for power users
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    autoSave();
                    showAutoSaveIndicator();
                    break;
                case 'g':
                    e.preventDefault();
                    if (bookData.currentStep === 'outline') generateOutline();
                    else if (bookData.currentStep === 'research') generateResearchPlan();
                    break;
                case 'd':
                    e.preventDefault();
                    toggleTheme();
                    break;
            }
        }
        if (e.key === 'Escape') {
            // Close any open modals
            closeExpandModal();
            closeOneClickModal();
            closeFeedbackModal();
            closeDonationModal();
            closeCustomAlert(false);
            closeProjectManagementModal();
        }
    });
}

// ==================================================
// AUTO-SAVE FUNCTIONALITY
// ==================================================

/**
 * Start auto-save timer
 */
function startAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
    
    autoSaveTimer = setInterval(() => {
        autoSave();
        showAutoSaveIndicator();
    }, CONFIG.AUTO_SAVE_INTERVAL);
}

/**
 * Auto-save current project data
 */
function autoSave() {
    try {
        collectBookData();
        bookData.lastSaved = new Date().toISOString();
        localStorage.setItem('bookforge_current_project', JSON.stringify(bookData));
    } catch (error) {
        console.warn('Auto-save failed:', error);
    }
}

/**
 * Show auto-save indicator
 */
function showAutoSaveIndicator() {
    const indicator = document.getElementById('auto-save-indicator');
    if (indicator) {
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
}

// ==================================================
// WORD COUNT UTILITIES
// ==================================================

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Update word counts for form fields
 */
function updateWordCount() {
    const fields = [
        { id: 'topic', countId: 'topic-word-count' },
        { id: 'approach', countId: 'approach-word-count' },
        { id: 'outline-content', countId: 'outline-word-count' },
        { id: 'research-content', countId: 'research-word-count' }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        const countElement = document.getElementById(field.countId);
        
        if (element && countElement) {
            const count = countWords(element.value);
            countElement.textContent = `${count} words`;
        }
    });
}

/**
 * Update chapter estimate
 */
function updateChapterEstimate() {
    const numChapters = parseInt(document.getElementById('num-chapters')?.value) || 15;
    const targetWordCount = parseInt(document.getElementById('target-word-count')?.value) || 2000;
    const totalWords = numChapters * targetWordCount;
    
    const estimateElement = document.getElementById('chapter-estimate');
    if (estimateElement) {
        estimateElement.textContent = `Estimated book length: ~${totalWords.toLocaleString()} words`;
    }
}

// ==================================================
// CATEGORY AND AUDIENCE REQUIREMENTS
// ==================================================

/**
 * Update category requirements display
 */
function updateCategoryRequirements() {
    const categorySelect = document.getElementById('category');
    const requirementsDiv = document.getElementById('category-requirements');
    const contentDiv = document.getElementById('category-requirements-content');
    
    if (!categorySelect || !requirementsDiv || !contentDiv) return;
    
    const category = categorySelect.value;
    
    if (category && categoryRequirements[category]) {
        const req = categoryRequirements[category];
        contentDiv.innerHTML = `
            <p><strong>Requirements:</strong> ${req.requirements}</p>
            <p><strong>Approach:</strong> ${req.approach}</p>
        `;
        requirementsDiv.style.display = 'block';
    } else {
        requirementsDiv.style.display = 'none';
    }
}

/**
 * Update audience requirements (placeholder for future functionality)
 */
function updateAudienceRequirements() {
    // Placeholder function for audience-specific requirements
    // Could be extended to show audience-specific guidelines
}

// ==================================================
// FEEDBACK SYSTEM
// ==================================================

/**
 * Toggle manual feedback input visibility
 * @param {string} step - Step identifier
 */
function toggleManualFeedback(step) {
    const mode = document.getElementById(`${step}-feedback-mode`)?.value;
    const manualSection = document.getElementById(`${step}-manual-feedback`);
    
    if (manualSection) {
        manualSection.style.display = mode === 'manual' ? 'block' : 'none';
    }
}

/**
 * Run feedback loop for content improvement
 * @param {string} contentType - Type of content to improve
 */
async function runFeedbackLoop(contentType) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo(`Running ${contentType} feedback analysis...`);
    
    try {
        const feedbackLoops = parseInt(document.getElementById(`${contentType}-feedback-loops`)?.value) || 0;
        if (feedbackLoops === 0) {
            await customAlert('Please select number of feedback loops first.', 'No Feedback Loops');
            return;
        }

        const feedbackMode = document.getElementById(`${contentType}-feedback-mode`)?.value || 'ai';
        let content = getContentForFeedback(contentType);

        if (!content) {
            await customAlert(`No ${contentType} content to analyze. Please generate content first.`, 'No Content');
            return;
        }

        // Get manual feedback if in manual mode
        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            manualFeedback = document.getElementById(`${contentType}-manual-input`)?.value || '';
            if (!manualFeedback.trim()) {
                await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                return;
            }
        }

        // Run feedback loops
        const feedbackModel = getSelectedModel('feedback');
        
        for (let i = 0; i < feedbackLoops; i++) {
            showGenerationInfo(`Running ${feedbackMode} feedback loop ${i + 1} of ${feedbackLoops}...`);
            
            let improvedContent;
            
            if (feedbackMode === 'manual') {
                improvedContent = await runManualFeedback(contentType, content, manualFeedback, feedbackModel);
            } else {
                improvedContent = await runAIFeedback(contentType, content, feedbackModel);
            }
            
            content = improvedContent;
            updateContentAfterFeedback(contentType, improvedContent);
            autoSave();
        }
        
        await customAlert(`Successfully completed ${feedbackLoops} ${feedbackMode} feedback loops for ${contentType}.`, 'Feedback Complete');
        
    } catch (error) {
        await customAlert(`Error in feedback loop: ${error.message}`, 'Feedback Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Get content for feedback analysis
 * @param {string} contentType - Type of content
 * @returns {string} Content text
 */
function getContentForFeedback(contentType) {
    switch(contentType) {
        case 'outline':
            return bookData.outline;
        case 'research':
            return bookData.researchPlan;
        case 'writing':
            return bookData.chapters.filter(c => c).join('\n\n---\n\n');
        default:
            return '';
    }
}

/**
 * Update content after feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} improvedContent - Improved content text
 */
function updateContentAfterFeedback(contentType, improvedContent) {
    switch(contentType) {
        case 'outline':
            bookData.outline = improvedContent;
            const outlineContent = document.getElementById('outline-content');
            if (outlineContent) {
                outlineContent.value = improvedContent;
                saveOutlineContent();
            }
            break;
        case 'research':
            bookData.researchPlan = improvedContent;
            const researchContent = document.getElementById('research-content');
            if (researchContent) {
                researchContent.value = improvedContent;
                saveResearchContent();
            }
            break;
        case 'writing':
            // For writing feedback, this would need more complex handling
            // This is simplified for the current implementation
            break;
    }
}

// ==================================================
// AI API FUNCTIONS
// ==================================================

/**
 * Make API call to AI service
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt
 * @param {string} model - Model to use
 * @returns {Promise<string>} AI response
 */
async function callAI(prompt, systemPrompt = "", model = null) {
    const settings = getAISettings(model);
    
    if (!settings.apiKey) {
        throw new Error('Please enter your API key in the Settings tab.');
    }

    const messages = [
        {
            role: "user",
            content: prompt
        }
    ];

    if (systemPrompt) {
        messages.unshift({
            role: "system",
            content: systemPrompt
        });
    }

    let apiUrl, headers, body;
    
    if (settings.apiProvider === 'openrouter') {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://bookforge.ai',
            'X-Title': 'BookForge AI',
        };
        body = {
            model: settings.model,
            messages: messages,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens
        };
    } else {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
        };
        
        const isGPT5 = settings.model.includes('gpt-5');
        body = {
            model: settings.model,
            messages: messages,
            temperature: settings.temperature
        };
        
        if (isGPT5) {
            body.max_completion_tokens = settings.maxTokens;
        } else {
            body.max_tokens = settings.maxTokens;
        }
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }
        
        return data.choices[0].message.content;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error: Please check your internet connection.');
        }
        throw new Error(`API call failed: ${error.message}`);
    }
}

/**
 * Get AI settings for API call
 * @param {string} model - Optional specific model
 * @returns {Object} AI settings
 */
function getAISettings(model = null) {
    const provider = aiSettings.apiProvider;
    let apiKey = '';
    
    if (provider === 'openrouter') {
        apiKey = document.getElementById('openrouter-api-key')?.value || aiSettings.openrouterApiKey || '';
    } else {
        apiKey = document.getElementById('openai-api-key')?.value || aiSettings.openaiApiKey || '';
    }

    const selectedModel = model || document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    
    return {
        apiProvider: provider,
        apiKey: apiKey,
        model: selectedModel,
        temperature: parseFloat(document.getElementById('temperature')?.value || aiSettings.temperature),
        maxTokens: parseInt(document.getElementById('max-tokens')?.value || aiSettings.maxTokens)
    };
}

/**
 * Format prompt template with replacements
 * @param {string} template - Prompt template
 * @param {Object} replacements - Replacement values
 * @returns {string} Formatted prompt
 */
function formatPrompt(template, replacements) {
    let formatted = template;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, value || '');
    }
    return formatted;
}

// ==================================================
// ADVANCED MODEL SELECTION
// ==================================================

/**
 * Get selected model for specific step
 * @param {string} step - Generation step
 * @returns {string} Model identifier
 */
function getSelectedModel(step) {
    if (!step) {
        return document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    }
    
    const checkbox = document.getElementById('enable-advanced-models');
    const advancedModelsEnabled = checkbox ? checkbox.checked : false;
    
    if (advancedModelsEnabled && aiSettings && aiSettings.advancedModels && aiSettings.advancedModels[step]) {
        return aiSettings.advancedModels[step];
    }
    
    return document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
}

/**
 * Save advanced model settings
 */
function saveAdvancedModelSettings() {
    const advancedModels = {};
    
    ['outline', 'research', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select && select.value) {
            advancedModels[step] = select.value;
        }
    });
    
    aiSettings.advancedModels = advancedModels;
    aiSettings.advancedModelsEnabled = document.getElementById('enable-advanced-models')?.checked || false;
    
    saveSettings();
}

/**
 * Reset advanced model settings to defaults
 */
function resetAdvancedModelSettings() {
    ['outline', 'research', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            select.value = '';
        }
    });
    
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = false;
    }
    
    aiSettings.advancedModels = {};
    aiSettings.advancedModelsEnabled = false;
    saveSettings();
    
    updateAdvancedModelsVisualState();
}

/**
 * Update visual state of advanced models section
 */
function updateAdvancedModelsVisualState() {
    const checkbox = document.getElementById('enable-advanced-models');
    const selects = document.querySelectorAll('[id^="advanced-model-"]');
    
    if (checkbox) {
        const isEnabled = checkbox.checked;
        selects.forEach(select => {
            select.disabled = !isEnabled;
            select.style.opacity = isEnabled ? '1' : '0.5';
        });
    }
}

/**
 * Update model select dropdowns
 */
function updateModelSelect() {
    updateMainModelSelect();
    updateAdvancedModelSelects();
}

/**
 * Update main model selection dropdown
 */
function updateMainModelSelect() {
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];

    if (!models) return;

    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            if (aiSettings.model === model.value) {
                option.selected = true;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    if (models.creative && models.creative.length) {
        createOptions(models.creative, 'Creative Models');
    }

    if (models.budget && models.budget.length) {
        createOptions(models.budget, 'Budget Models');
    }

    updateModelInfo();
}

/**
 * Update advanced model selection dropdowns
 */
function updateAdvancedModelSelects() {
    ['outline', 'research', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        updateAdvancedModelSelect(`advanced-model-${step}`);
    });
    
    // Load saved advanced model settings
    loadSavedAdvancedModels();
    updateAdvancedModelsVisualState();
}

/**
 * Update individual advanced model select
 * @param {string} selectId - Select element ID
 */
function updateAdvancedModelSelect(selectId) {
    const modelSelect = document.getElementById(selectId);
    if (!modelSelect) return;
    
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];
    if (!models) return;

    modelSelect.innerHTML = '';

    // Add empty option first
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Use Default Model';
    emptyOption.style.fontStyle = 'italic';
    modelSelect.appendChild(emptyOption);

    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    if (models.creative && models.creative.length) {
        createOptions(models.creative, 'Creative');
    }

    if (models.budget && models.budget.length) {
        createOptions(models.budget, 'Budget');
    }
}

/**
 * Load saved advanced model settings
 */
function loadSavedAdvancedModels() {
    if (!aiSettings.advancedModels) return;
    
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = aiSettings.advancedModelsEnabled || false;
    }
    
    Object.entries(aiSettings.advancedModels).forEach(([step, model]) => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            const isAvailable = Array.from(select.options).some(option => option.value === model);
            if (isAvailable) {
                select.value = model;
            } else {
                delete aiSettings.advancedModels[step];
            }
        }
    });
}

/**
 * Update model info display
 */
function updateModelInfo() {
    const modelSelect = document.getElementById('model-select');
    const infoElement = document.getElementById('model-cost-info');
    
    if (!modelSelect || !infoElement) return;
    
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    if (selectedOption && selectedOption.title) {
        infoElement.textContent = selectedOption.title;
    } else {
        infoElement.textContent = 'Best quality models marked with stars | Budget models marked with dollar signs';
    }
}

/**
 * Switch API provider
 * @param {string} provider - Provider name
 */
function switchApiProvider(provider) {
    aiSettings.apiProvider = provider;
    
    // Update toggle buttons
    const openrouterBtn = document.getElementById('openrouter-btn');
    const openaiBtn = document.getElementById('openai-btn');
    
    if (openrouterBtn && openaiBtn) {
        openrouterBtn.classList.toggle('active', provider === 'openrouter');
        openaiBtn.classList.toggle('active', provider === 'openai');
    }
    
    // Show/hide appropriate API key fields
    const openrouterGroup = document.getElementById('openrouter-key-group');
    const openaiGroup = document.getElementById('openai-key-group');
    
    if (openrouterGroup && openaiGroup) {
        if (provider === 'openrouter') {
            openrouterGroup.style.display = 'block';
            openaiGroup.style.display = 'none';
        } else {
            openrouterGroup.style.display = 'none';
            openaiGroup.style.display = 'block';
        }
    }
    
    updateModelSelect();
    saveSettings();
}

/**
 * Update temperature value display
 */
function updateTempValue() {
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    
    if (tempSlider && tempValue) {
        tempValue.textContent = tempSlider.value;
    }
}

// ==================================================
// CUSTOM PROMPTS MANAGEMENT
// ==================================================

/**
 * Initialize custom prompts with defaults
 */
function initializeCustomPrompts() {
    Object.entries(defaultPrompts).forEach(([promptType, defaultPrompt]) => {
        // Set default prompts if not already customized
        if (!aiSettings.customPrompts[promptType]) {
            aiSettings.customPrompts[promptType] = defaultPrompt;
        }
        
        // Update UI elements
        const promptTextarea = document.getElementById(`settings-${promptType.toLowerCase()}-prompt`);
        if (promptTextarea) {
            promptTextarea.value = aiSettings.customPrompts[promptType] || defaultPrompt;
        }
        
        // Also set step-specific prompts
        const stepTextarea = document.getElementById(`${promptType}-prompt`);
        if (stepTextarea) {
            stepTextarea.value = aiSettings.customPrompts[promptType] || defaultPrompt;
        }
    });
}

/**
 * Save custom prompt
 * @param {string} promptType - Type of prompt
 */
function saveCustomPrompt(promptType) {
    const promptTextarea = document.getElementById(`settings-${promptType.toLowerCase()}-prompt`);
    if (promptTextarea) {
        aiSettings.customPrompts[promptType] = promptTextarea.value;
        
        // Also update step-specific prompt
        const stepTextarea = document.getElementById(`${promptType}-prompt`);
        if (stepTextarea) {
            stepTextarea.value = promptTextarea.value;
        }
        
        saveSettings();
    }
}

/**
 * Reset custom prompt to default
 * @param {string} promptType - Type of prompt
 */
function resetCustomPrompt(promptType) {
    const defaultPrompt = defaultPrompts[promptType];
    if (defaultPrompt) {
        aiSettings.customPrompts[promptType] = defaultPrompt;
        
        // Update both settings and step-specific textareas
        const settingsTextarea = document.getElementById(`settings-${promptType.toLowerCase()}-prompt`);
        if (settingsTextarea) {
            settingsTextarea.value = defaultPrompt;
        }
        
        const stepTextarea = document.getElementById(`${promptType}-prompt`);
        if (stepTextarea) {
            stepTextarea.value = defaultPrompt;
        }
        
        saveSettings();
    }
}

/**
 * Reset all custom prompts to defaults
 */
function resetAllCustomPrompts() {
    Object.entries(defaultPrompts).forEach(([promptType, defaultPrompt]) => {
        resetCustomPrompt(promptType);
    });
    
    showSuccessMessage('All prompts have been reset to defaults.');
}

// ==================================================
// SETTINGS MANAGEMENT
// ==================================================

/**
 * Save settings to localStorage
 */
function saveSettings() {
    try {
        // Update settings from form fields
        const openrouterKey = document.getElementById('openrouter-api-key')?.value || '';
        const openaiKey = document.getElementById('openai-api-key')?.value || '';
        const temperature = parseFloat(document.getElementById('temperature')?.value || 0.7);
        const maxTokens = parseInt(document.getElementById('max-tokens')?.value || 50000);
        const model = document.getElementById('model-select')?.value || 'anthropic/claude-sonnet-4';
        
        aiSettings.openrouterApiKey = openrouterKey;
        aiSettings.openaiApiKey = openaiKey;
        aiSettings.temperature = temperature;
        aiSettings.maxTokens = maxTokens;
        aiSettings.model = model;
        
        localStorage.setItem('bookforge_settings', JSON.stringify(aiSettings));
    } catch (error) {
        console.warn('Failed to save settings:', error);
    }
}

/**
 * Test API connection
 */
async function testApiConnection() {
    const testBtn = event.target;
    const originalText = testBtn.innerHTML;
    const statusDiv = document.getElementById('api-status');
    
    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="label">Testing...</span>';
    
    if (statusDiv) {
        statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Testing API connection...</div>';
    }
    
    try {
        const response = await callAI('Hello! Please respond with "API connection successful."', 'You are a helpful assistant.');
        
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="success">✅ API connection successful!</div>';
        }
        
        setTimeout(() => {
            if (statusDiv) statusDiv.innerHTML = '';
        }, 5000);
        
    } catch (error) {
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="error">❌ API connection failed: ${error.message}</div>`;
        }
        
        setTimeout(() => {
            if (statusDiv) statusDiv.innerHTML = '';
        }, 10000);
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = originalText;
    }
}

/**
 * Export settings to file
 */
function exportSettings() {
    try {
        const dataStr = JSON.stringify(aiSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'bookforge-settings.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccessMessage('Settings exported successfully!');
    } catch (error) {
        showErrorMessage('Failed to export settings: ' + error.message);
    }
}

/**
 * Import settings from file
 */
function importSettings() {
    const input = document.getElementById('settings-import-file');
    if (input) {
        input.click();
    }
}

/**
 * Handle settings import file selection
 * @param {Event} event - File input change event
 */
function handleSettingsImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedSettings = JSON.parse(e.target.result);
            
            // Validate and merge settings
            aiSettings = { ...aiSettings, ...importedSettings };
            
            // Update UI
            loadSettings();
            updateModelSelect();
            initializeCustomPrompts();
            
            showSuccessMessage('Settings imported successfully!');
        } catch (error) {
            showErrorMessage('Failed to import settings: Invalid file format');
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// ==================================================
// RANDOM IDEA GENERATION
// ==================================================

/**
 * Generate random book idea based on category and audience
 */
async function generateRandomIdea() {
    const randomBtn = document.getElementById('random-idea-btn');

    if (isGenerating) {
        showGenerationInfo("Please wait until the current generation is finished...");
        return;
    }

    const category = document.getElementById('category')?.value;
    const audience = document.getElementById('target-audience')?.value;

    if (!category || !audience) {
        await customAlert('Please select category and target audience first!', 'Missing Information');
        return;
    }

    isGenerating = true;
    showGenerationInfo("AI is crafting your unique book idea...");
    if (randomBtn) randomBtn.disabled = true;

    try {
        const selectedModel = getSelectedModel('randomIdea');
        
        const prompt = formatPrompt(aiSettings.customPrompts.randomIdea || defaultPrompts.randomIdea, {
            category: category.replace('-', ' '),
            targetAudience: audience.replace('-', ' ')
        });

        const aiResponse = await callAI(prompt, "You are a non-fiction publishing expert and market analyst specializing in generating original, bestselling book concepts.", selectedModel);
        
        // Parse the AI response
        const lines = aiResponse.split('\n');
        let topic = '';
        let approach = '';
        let chapters = '15';

        for (const line of lines) {
            if (line.startsWith('TOPIC:')) {
                topic = line.replace('TOPIC:', '').trim();
            } else if (line.startsWith('APPROACH:')) {
                approach = line.replace('APPROACH:', '').trim();
            } else if (line.startsWith('CHAPTERS:')) {
                chapters = line.replace('CHAPTERS:', '').trim().match(/\d+/)?.[0] || '15';
            }
        }

        // Fallback parsing if structured format not found
        if (!topic || !approach) {
            const paragraphs = aiResponse.split('\n\n');
            if (paragraphs.length >= 2) {
                topic = topic || paragraphs[0];
                approach = approach || paragraphs[1];
            } else {
                topic = aiResponse;
                approach = "Clear, practical methodology with actionable insights appropriate for the target audience";
            }
        }

        // Update form fields
        const topicField = document.getElementById('topic');
        const approachField = document.getElementById('approach');
        const chaptersField = document.getElementById('num-chapters');
        
        if (topicField) topicField.value = topic;
        if (approachField) approachField.value = approach;
        if (chaptersField) chaptersField.value = chapters;
        
        updateWordCount();
        updateChapterEstimate();
        autoSave();

        await customAlert('Unique book idea generated by AI! Review and modify as needed, then click "Start Creating Book" when ready.', 'Idea Generated');

    } catch (error) {
        await customAlert(`Error generating random idea: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
        if (randomBtn) randomBtn.disabled = false;
    }
}

// ==================================================
// BOOK GENERATION FUNCTIONS
// ==================================================

/**
 * Collect book data from form fields
 */
function collectBookData() {
    const categoryEl = document.getElementById('category');
    const audienceEl = document.getElementById('target-audience');
    const topicEl = document.getElementById('topic');
    const approachEl = document.getElementById('approach');
    const chaptersEl = document.getElementById('num-chapters');
    const wordCountEl = document.getElementById('target-word-count');
    
    if (categoryEl) bookData.category = categoryEl.value;
    if (audienceEl) bookData.targetAudience = audienceEl.value;
    if (topicEl) bookData.topic = topicEl.value;
    if (approachEl) bookData.approach = approachEl.value;
    if (chaptersEl) bookData.numChapters = parseInt(chaptersEl.value) || 15;
    if (wordCountEl) bookData.targetWordCount = parseInt(wordCountEl.value) || 2000;
    
    const currentStep = document.querySelector('.step.active')?.id;
    if (currentStep) {
        bookData.currentStep = currentStep;
    }
    
    bookData.lastSaved = new Date().toISOString();
}

/**
 * Generate book outline
 */
async function generateOutline() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo("Generating comprehensive book outline and structure...");

    try {
        collectBookData();

        if (!bookData.category || !bookData.targetAudience || !bookData.topic) {
            await customAlert('Please fill in category, target audience, and topic before generating outline.', 'Missing Information');
            return;
        }

        const categoryReq = categoryRequirements[bookData.category] || { requirements: '', approach: '' };
        const categoryRequirementsText = `${categoryReq.requirements}\nRecommended Approach: ${categoryReq.approach}`;

        const selectedModel = getSelectedModel('outline');
        const promptTemplate = document.getElementById('outline-prompt')?.value || aiSettings.customPrompts.outline || defaultPrompts.outline;

        const prompt = formatPrompt(promptTemplate, {
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            topic: bookData.topic,
            approach: bookData.approach,
            numChapters: bookData.numChapters,
            categoryRequirements: categoryRequirementsText
        });

        const outline = await callAI(prompt, "You are an expert non-fiction author and knowledge architect creating commercially successful book structures.", selectedModel);
        
        bookData.outline = outline;
        
        const outlineTextarea = document.getElementById('outline-content');
        if (outlineTextarea) {
            outlineTextarea.value = outline;
            saveOutlineContent();
        }
        
        const outlineNavItem = document.querySelector('[data-step="outline"]');
        if (outlineNavItem) {
            outlineNavItem.classList.add('completed');
        }

        await customAlert('Book outline generated successfully! Review and edit as needed, then proceed to Research & Planning.', 'Outline Generated');

    } catch (error) {
        await customAlert(`Error generating book outline: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Regenerate book outline
 */
async function regenerateOutline() {
    const confirmed = await customConfirm('Are you sure you want to regenerate the book outline? This will overwrite the current content.', 'Regenerate Outline');
    if (!confirmed) return;
    
    // Clear current content
    const outlineTextarea = document.getElementById('outline-content');
    if (outlineTextarea) {
        outlineTextarea.value = '';
        saveOutlineContent();
    }
    
    await generateOutline();
}

/**
 * Proceed to research step
 */
function proceedToResearch() {
    collectBookData();
    showStep('research');
}

/**
 * Generate research plan
 */
async function generateResearchPlan() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo("Creating detailed research plan and content structure...");

    try {
        if (!bookData.outline) {
            await customAlert('Please generate a book outline first before creating research plan.', 'Missing Outline');
            return;
        }

        const selectedModel = getSelectedModel('research');
        const promptTemplate = document.getElementById('research-prompt')?.value || aiSettings.customPrompts.research || defaultPrompts.research;
        
        const prompt = formatPrompt(promptTemplate, {
            outline: bookData.outline,
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            topic: bookData.topic,
            approach: bookData.approach,
            numChapters: bookData.numChapters
        });

        const researchPlan = await callAI(prompt, "You are a research expert and content strategist creating comprehensive research frameworks for non-fiction books.", selectedModel);
        
        // Generate book title and description
        showGenerationInfo("Generating compelling book title and description...");
        
        const titleModel = getSelectedModel('bookTitle');
        
        const titleDescPrompt = formatPrompt(aiSettings.customPrompts.bookTitle || defaultPrompts.bookTitle, {
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            topic: bookData.topic,
            approach: bookData.approach,
            outline: bookData.outline,
            researchPlan: researchPlan
        });

        const titleDescResponse = await callAI(titleDescPrompt, "You are a bestselling non-fiction book marketing expert and title creation specialist.", titleModel);
        
        // Parse title and description from response
        const lines = titleDescResponse.split('\n');
        let title = '';
        let description = '';
        let collectingDescription = false;

        for (const line of lines) {
            if (line.startsWith('TITLE:')) {
                title = line.replace('TITLE:', '').trim();
            } else if (line.startsWith('DESCRIPTION:')) {
                description = line.replace('DESCRIPTION:', '').trim();
                collectingDescription = true;
            } else if (collectingDescription && line.trim()) {
                description += ' ' + line.trim();
            }
        }

        bookData.title = title || extractFirstSentence(bookData.topic);
        bookData.description = description || bookData.topic;

        const titleDescSection = `BOOK TITLE: "${bookData.title}"\n\nBOOK DESCRIPTION:\n${bookData.description}\n\n${'='.repeat(50)}\n\n`;
        const finalContent = titleDescSection + researchPlan;
        
        bookData.researchPlan = finalContent;
        
        const researchTextarea = document.getElementById('research-content');
        if (researchTextarea) {
            researchTextarea.value = finalContent;
            saveResearchContent();
        }
        
        const researchNavItem = document.querySelector('[data-step="research"]');
        if (researchNavItem) {
            researchNavItem.classList.add('completed');
        }

        await customAlert('Research plan and book title generated successfully! Review and edit as needed, then proceed to Writing.', 'Research Plan Generated');

    } catch (error) {
        await customAlert(`Error generating research plan: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Regenerate research plan
 */
async function regenerateResearchPlan() {
    const confirmed = await customConfirm('Are you sure you want to regenerate the research plan? This will overwrite the current content.', 'Regenerate Research Plan');
    if (!confirmed) return;
    
    // Clear current content
    const researchTextarea = document.getElementById('research-content');
    if (researchTextarea) {
        researchTextarea.value = '';
        saveResearchContent();
    }
    
    await generateResearchPlan();
}

/**
 * Extract first sentence from text
 * @param {string} text - Input text
 * @returns {string} First sentence
 */
function extractFirstSentence(text) {
    if (!text) return '';
    const sentences = text.split(/[.!?]+/);
    return sentences[0]?.trim() || text.substring(0, 50);
}

/**
 * Proceed to writing step
 */
function proceedToWriting() {
    collectBookData();
    showStep('writing');
}

// ==================================================
// CONTENT HANDLERS
// ==================================================

/**
 * Save outline content and update UI
 */
function saveOutlineContent() {
    const textarea = document.getElementById('outline-content');
    if (!textarea) return;
    
    bookData.outline = textarea.value;
    
    const wordCount = countWords(textarea.value);
    const wordCountEl = document.getElementById('outline-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    const nextBtn = document.getElementById('outline-next');
    if (nextBtn) {
        nextBtn.style.display = textarea.value.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

/**
 * Save research content and update UI
 */
function saveResearchContent() {
    const textarea = document.getElementById('research-content');
    if (!textarea) return;
    
    bookData.researchPlan = textarea.value;
    
    const wordCount = countWords(textarea.value);
    const wordCountEl = document.getElementById('research-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    const nextBtn = document.getElementById('research-next');
    if (nextBtn) {
        nextBtn.style.display = textarea.value.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

/**
 * Clear outline content with confirmation
 */
async function clearOutlineContent() {
    const confirmed = await customConfirm('Are you sure you want to clear the book outline content?', 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById('outline-content');
        if (textarea) {
            textarea.value = '';
            saveOutlineContent();
        }
    }
}

/**
 * Clear research content with confirmation
 */
async function clearResearchContent() {
    const confirmed = await customConfirm('Are you sure you want to clear the research plan content?', 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById('research-content');
        if (textarea) {
            textarea.value = '';
            saveResearchContent();
        }
    }
}

// ==================================================
// WRITING INTERFACE
// ==================================================

/**
 * Set up the writing interface with chapter management
 */
function setupWritingInterface() {
    const container = document.getElementById('chapters-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Ensure chapters array is properly sized
    if (!bookData.chapters) bookData.chapters = [];
    while (bookData.chapters.length < bookData.numChapters) {
        bookData.chapters.push('');
    }

    // Add chapter controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chapter-controls';
    controlsDiv.innerHTML = `
        <h4>Chapter Generation Options</h4>
        <div class="controls-row">
            <button class="btn btn-ghost btn-sm" onclick="selectAllChapters()">
                <span class="label">Select All</span>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deselectAllChapters()">
                <span class="label">Deselect All</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="generateSelectedChapters()" id="generate-selected-btn" disabled>
                <span class="label">Generate Selected</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="generateAllChapters()">
                <span class="label">Generate All Chapters</span>
            </button>
        </div>
        <p class="writing-hint">💡 Tip: Type directly in chapter fields or use AI generation. Select multiple chapters for batch processing.</p>
    `;
    container.appendChild(controlsDiv);

    // Create chapter items
    for (let i = 1; i <= bookData.numChapters; i++) {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-item';
        chapterDiv.innerHTML = `
            <div class="chapter-header">
                <div class="chapter-info">
                    <input type="checkbox" id="chapter-${i}-checkbox" onchange="updateGenerateSelectedButton()">
                    <h4>Chapter ${i}</h4>
                    <div class="chapter-word-count" id="chapter-${i}-word-count">0 words</div>
                </div>
                <div class="chapter-actions">
                    <button class="btn btn-primary btn-sm" onclick="generateSingleChapter(${i})" id="chapter-${i}-generate-btn">
                        <span class="label">🎯 Generate</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="regenerateChapter(${i})" id="chapter-${i}-regenerate-btn">
                        <span class="label">🔄 Regenerate</span>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="saveChapterContent(${i})">
                        <span class="label">💾 Save</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="expandChapter(${i})" id="chapter-${i}-expand-btn">
                        <span class="label">🔍 Expand</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="runChapterFeedback(${i})">
                        <span class="label">✨ Improve</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="clearChapterContent(${i})">
                        <span class="label">🗑️ Clear</span>
                    </button>
                </div>
            </div>
            
            <div class="chapter-content-field">
                <div class="form-group">
                    <div class="textarea-container">
                        <textarea 
                            id="chapter-${i}-content" 
                            class="chapter-textarea" 
                            placeholder="Type your chapter content here or use AI generation above..." 
                            rows="15"
                            oninput="updateChapterContent(${i})"></textarea>
                    </div>
                </div>
            </div>

            <div class="chapter-status" id="chapter-${i}-status">Ready to write</div>
        `;
        container.appendChild(chapterDiv);
    }

    // Load existing chapter content
    for (let i = 1; i <= bookData.numChapters; i++) {
        if (bookData.chapters[i - 1]) {
            const textarea = document.getElementById(`chapter-${i}-content`);
            if (textarea) {
                textarea.value = bookData.chapters[i - 1];
                updateChapterContent(i);
            }
        }
    }

    updateOverallProgress();
}

/**
 * Update chapter content and word count
 * @param {number} chapterNum - Chapter number
 */
function updateChapterContent(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) return;
    
    const content = textarea.value;
    
    // Ensure chapters array is large enough
    while (bookData.chapters.length < chapterNum) {
        bookData.chapters.push('');
    }
    
    bookData.chapters[chapterNum - 1] = content;
    
    const wordCount = countWords(content);
    const wordCountEl = document.getElementById(`chapter-${chapterNum}-word-count`);
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    updateOverallProgress();
    autoSave();
}

/**
 * Save chapter content with visual feedback
 * @param {number} chapterNum - Chapter number
 */
function saveChapterContent(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) return;
    
    // Ensure chapters array is large enough
    while (bookData.chapters.length < chapterNum) {
        bookData.chapters.push('');
    }
    
    bookData.chapters[chapterNum - 1] = textarea.value;
    
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="label">✅ Saved!</span>';
    button.style.background = 'var(--color-success)';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
    }, 2000);
    
    updateChapterContent(chapterNum);
}

/**
 * Clear chapter content with confirmation
 * @param {number} chapterNum - Chapter number
 */
async function clearChapterContent(chapterNum) {
    const confirmed = await customConfirm(`Are you sure you want to clear Chapter ${chapterNum} content?`, 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById(`chapter-${chapterNum}-content`);
        if (textarea) {
            textarea.value = '';
            updateChapterContent(chapterNum);
        }
    }
}

/**
 * Generate single chapter
 * @param {number} chapterNum - Chapter number
 */
async function generateSingleChapter(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    if (!bookData.researchPlan) {
        await customAlert('Please generate a research plan first before writing chapters.', 'Missing Research Plan');
        return;
    }
    
    isGenerating = true;
    showGenerationInfo(`Writing Chapter ${chapterNum}...`);
    
    const statusEl = document.getElementById(`chapter-${chapterNum}-status`);
    const generateBtn = document.getElementById(`chapter-${chapterNum}-generate-btn`);
    
    if (statusEl) statusEl.innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
    if (generateBtn) generateBtn.disabled = true;

    try {
        const chapterContent = await writeChapter(chapterNum);
        
        const textarea = document.getElementById(`chapter-${chapterNum}-content`);
        if (textarea) {
            textarea.value = chapterContent;
            updateChapterContent(chapterNum);
        }
        
        if (statusEl) statusEl.innerHTML = '✅ Generated successfully';
        
    } catch (error) {
        if (statusEl) statusEl.innerHTML = `⚠ Error: ${error.message}`;
        await customAlert(`Error generating Chapter ${chapterNum}: ${error.message}`, 'Generation Error');
    } finally {
        if (generateBtn) generateBtn.disabled = false;
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Write chapter content using AI
 * @param {number} chapterNum - Chapter number
 * @returns {Promise<string>} Generated chapter content
 */
async function writeChapter(chapterNum) {
    try {
        let previousChapterSummary = '';
        if (chapterNum > 1 && bookData.chapters[chapterNum - 2]) {
            const prevChapter = bookData.chapters[chapterNum - 2];
            const words = prevChapter.split(' ');
            previousChapterSummary = words.slice(-100).join(' ');
        }

        const categoryReq = categoryRequirements[bookData.category] || { requirements: '', approach: '' };
        const categorySpecificElements = `Category Requirements: ${categoryReq.requirements}\nApproach Guidelines: ${categoryReq.approach}`;

        const contextInfo = `
BOOK SETUP:
- Category: ${bookData.category}
- Target Audience: ${bookData.targetAudience}
- Main Topic: ${bookData.topic}
- Writing Approach: ${bookData.approach}

COMPLETE BOOK OUTLINE:
${bookData.outline}

DETAILED RESEARCH PLAN:
${bookData.researchPlan}
        `;

        const chapterResearch = extractChapterResearch(bookData.researchPlan, chapterNum);
        const selectedModel = getSelectedModel('writing');
        const promptTemplate = document.getElementById('writing-prompt')?.value || aiSettings.customPrompts.writing || defaultPrompts.writing;

        const prompt = formatPrompt(promptTemplate, {
            chapterNum: chapterNum,
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            approach: bookData.approach,
            targetWordCount: bookData.targetWordCount,
            contextInfo: contextInfo,
            chapterResearch: chapterResearch,
            previousChapterSummary: previousChapterSummary,
            categorySpecificElements: categorySpecificElements
        });

        const chapterContent = await callAI(prompt, `You are an expert non-fiction author writing professional ${bookData.category} content for ${bookData.targetAudience} readers.`, selectedModel);
        
        return chapterContent;

    } catch (error) {
        throw new Error(`Failed to write chapter ${chapterNum}: ${error.message}`);
    }
}

/**
 * Extract chapter research from full research plan
 * @param {string} fullResearch - Complete research plan
 * @param {number} chapterNum - Chapter number to extract
 * @returns {string} Chapter-specific research
 */
function extractChapterResearch(fullResearch, chapterNum) {
    if (!fullResearch) return `Chapter ${chapterNum} research plan not found.`;
    
    const lines = fullResearch.split('\n');
    const chapterLines = [];
    let capturing = false;
    
    for (const line of lines) {
        if (line.toLowerCase().includes(`chapter ${chapterNum}`)) {
            capturing = true;
            chapterLines.push(line);
        } else if (capturing && line.toLowerCase().match(/chapter \d+/)) {
            break;
        } else if (capturing) {
            chapterLines.push(line);
        }
    }
    
    return chapterLines.length > 0 ? chapterLines.join('\n') : `Chapter ${chapterNum} research plan not found in full research.`;
}

/**
 * Update overall writing progress
 */
function updateOverallProgress() {
    if (!bookData.chapters) {
        bookData.chapters = Array(bookData.numChapters).fill('');
    }
    
    const completedChapters = bookData.chapters.filter(chapter => chapter && chapter.trim().length > 0).length;
    const progress = (completedChapters / bookData.numChapters) * 100;
    
    const progressEl = document.getElementById('writing-progress');
    if (progressEl) {
        progressEl.style.width = progress + '%';
    }
    
    const statusEl = document.getElementById('writing-status');
    if (statusEl) {
        statusEl.textContent = `${completedChapters} of ${bookData.numChapters} chapters completed (${Math.round(progress)}%)`;
    }
    
    if (completedChapters === bookData.numChapters) {
        const nextBtn = document.getElementById('writing-next');
        if (nextBtn) {
            nextBtn.style.display = 'inline-flex';
        }
        
        const writingNavItem = document.querySelector('[data-step="writing"]');
        if (writingNavItem) {
            writingNavItem.classList.add('completed');
        }
    }
}

/**
 * Regenerate chapter with confirmation
 * @param {number} chapterNum - Chapter number
 */
async function regenerateChapter(chapterNum) {
    const confirmed = await customConfirm(`Are you sure you want to regenerate Chapter ${chapterNum}? This will overwrite the current content.`, 'Regenerate Chapter');
    if (!confirmed) return;
    
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (textarea) {
        textarea.value = '';
        updateChapterContent(chapterNum);
    }
    
    await generateSingleChapter(chapterNum);
}

/**
 * Select all chapters for batch generation
 */
function selectAllChapters() {
    for (let i = 1; i <= bookData.numChapters; i++) {
        const checkbox = document.getElementById(`chapter-${i}-checkbox`);
        if (checkbox) checkbox.checked = true;
    }
    updateGenerateSelectedButton();
}

/**
 * Deselect all chapters
 */
function deselectAllChapters() {
    for (let i = 1; i <= bookData.numChapters; i++) {
        const checkbox = document.getElementById(`chapter-${i}-checkbox`);
        if (checkbox) checkbox.checked = false;
    }
    updateGenerateSelectedButton();
}

/**
 * Update generate selected button state
 */
function updateGenerateSelectedButton() {
    const selectedCount = getSelectedChapters().length;
    const btn = document.getElementById('generate-selected-btn');
    if (btn) {
        if (selectedCount > 0) {
            btn.innerHTML = `<span class="label">Generate Selected (${selectedCount})</span>`;
            btn.disabled = false;
        } else {
            btn.innerHTML = '<span class="label">Generate Selected</span>';
            btn.disabled = true;
        }
    }
}

/**
 * Get selected chapters for batch processing
 * @returns {number[]} Array of selected chapter numbers
 */
function getSelectedChapters() {
    const selected = [];
    for (let i = 1; i <= bookData.numChapters; i++) {
        const checkbox = document.getElementById(`chapter-${i}-checkbox`);
        if (checkbox?.checked) {
            selected.push(i);
        }
    }
    return selected;
}

/**
 * Generate selected chapters in batch
 */
async function generateSelectedChapters() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const selectedChapters = getSelectedChapters();
    if (selectedChapters.length === 0) {
        await customAlert('Please select at least one chapter to generate.', 'No Chapters Selected');
        return;
    }

    if (!bookData.researchPlan) {
        await customAlert('Please generate a research plan first before writing chapters.', 'Missing Research Plan');
        return;
    }

    isGenerating = true;
    showGenerationInfo("Generating selected chapters...");

    try {
        for (let i = 0; i < selectedChapters.length; i++) {
            const chapterNum = selectedChapters[i];
            showGenerationInfo(`Writing Chapter ${chapterNum} (${i + 1} of ${selectedChapters.length})...`);
            
            const statusEl = document.getElementById(`chapter-${chapterNum}-status`);
            const generateBtn = document.getElementById(`chapter-${chapterNum}-generate-btn`);
            
            if (statusEl) statusEl.innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
            if (generateBtn) generateBtn.disabled = true;
            
            try {
                const chapterContent = await writeChapter(chapterNum);
                
                const textarea = document.getElementById(`chapter-${chapterNum}-content`);
                if (textarea) {
                    textarea.value = chapterContent;
                    updateChapterContent(chapterNum);
                }
                
                if (statusEl) statusEl.innerHTML = '✅ Generated successfully';
                
                const checkbox = document.getElementById(`chapter-${chapterNum}-checkbox`);
                if (checkbox) checkbox.checked = false;
                
            } catch (error) {
                if (statusEl) statusEl.innerHTML = `⚠ Error: ${error.message}`;
                break;
            } finally {
                if (generateBtn) generateBtn.disabled = false;
            }
        }
        
        updateGenerateSelectedButton();
        await customAlert('Selected chapters generated successfully!', 'Batch Generation Complete');
        
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Generate all chapters
 */
async function generateAllChapters() {
    selectAllChapters();
    await generateSelectedChapters();
}

/**
 * Run feedback for individual chapter
 * @param {number} chapterNum - Chapter number
 */
async function runChapterFeedback(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    const chapter = textarea ? textarea.value : '';
    
    if (!chapter.trim()) {
        await customAlert('No chapter content to improve. Please write or generate the chapter first.', 'No Content');
        return;
    }
    
    isGenerating = true;
    showGenerationInfo(`Analyzing Chapter ${chapterNum}...`);
    
    try {
        const feedbackLoops = parseInt(document.getElementById('writing-feedback-loops')?.value) || 1;
        const feedbackMode = document.getElementById('writing-feedback-mode')?.value || 'ai';
        
        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            manualFeedback = document.getElementById('writing-manual-input')?.value || '';
            if (!manualFeedback.trim()) {
                await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                return;
            }
        }
        
        const statusEl = document.getElementById(`chapter-${chapterNum}-status`);
        if (statusEl) statusEl.innerHTML = '<div class="loading"><div class="spinner"></div>Running feedback analysis...</div>';
        
        let improvedChapter = chapter;
        const feedbackModel = getSelectedModel('feedback');
        
        for (let i = 0; i < feedbackLoops; i++) {
            showGenerationInfo(`Running feedback loop ${i + 1} of ${feedbackLoops} for Chapter ${chapterNum}...`);
            
            if (feedbackMode === 'manual') {
                improvedChapter = await runManualFeedback('chapter', improvedChapter, manualFeedback, feedbackModel);
            } else {
                improvedChapter = await runAIFeedback('chapter', improvedChapter, feedbackModel);
            }
        }
        
        if (textarea) {
            textarea.value = improvedChapter;
            updateChapterContent(chapterNum);
        }
        
        if (statusEl) statusEl.innerHTML = `✨ Improved with ${feedbackLoops} ${feedbackMode} feedback loop(s)`;
        
        await customAlert(`Chapter ${chapterNum} improved successfully with ${feedbackLoops} feedback loops!`, 'Chapter Improved');
        
    } catch (error) {
        const statusEl = document.getElementById(`chapter-${chapterNum}-status`);
        if (statusEl) statusEl.innerHTML = `⚠ Feedback error: ${error.message}`;
        await customAlert(`Error in feedback loop: ${error.message}`, 'Feedback Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

// ==================================================
// FEEDBACK IMPLEMENTATIONS
// ==================================================

/**
 * Run manual feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} content - Content to improve
 * @param {string} manualFeedback - Manual feedback instructions
 * @param {string} feedbackModel - Model to use
 * @returns {Promise<string>} Improved content
 */
async function runManualFeedback(contentType, content, manualFeedback, feedbackModel) {
    const improvementPrompt = formatPrompt(aiSettings.customPrompts.manualImprovement || defaultPrompts.manualImprovement, {
        contentType: contentType,
        originalContent: content,
        manualFeedback: manualFeedback,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        approach: bookData.approach,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    return await callAI(improvementPrompt, "You are an expert non-fiction author and professional editor implementing specific feedback requests.", feedbackModel);
}

/**
 * Run AI feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} content - Content to improve
 * @param {string} feedbackModel - Model to use
 * @returns {Promise<string>} Improved content
 */
async function runAIFeedback(contentType, content, feedbackModel) {
    const analysisPrompt = formatPrompt(aiSettings.customPrompts.analysis || defaultPrompts.analysis, {
        contentType: contentType,
        content: content,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        approach: bookData.approach,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    const analysis = await callAI(analysisPrompt, "You are a professional editor and non-fiction content expert.", feedbackModel);
    
    const improvementPrompt = formatPrompt(aiSettings.customPrompts.improvement || defaultPrompts.improvement, {
        contentType: contentType,
        originalContent: content,
        feedbackContent: analysis,
        targetAudience: bookData.targetAudience,
        category: bookData.category,
        topic: bookData.topic,
        approach: bookData.approach,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    return await callAI(improvementPrompt, "You are an expert non-fiction author and professional editor.", feedbackModel);
}

// ==================================================
// EXPAND MODAL
// ==================================================

/**
 * Expand chapter in full-screen modal
 * @param {number} chapterNum - Chapter number
 */
function expandChapter(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) return;
    
    const content = textarea.value;
    
    currentExpandedChapter = chapterNum;
    
    const titleEl = document.getElementById('expand-chapter-title');
    const expandTextarea = document.getElementById('expand-textarea');
    
    if (titleEl) titleEl.textContent = `Chapter ${chapterNum} - Expanded View`;
    if (expandTextarea) expandTextarea.value = content;
    
    updateExpandedWordCount();
    
    const modal = document.getElementById('expand-modal');
    if (modal) {
        modal.classList.add('active');
        
        setTimeout(() => {
            if (expandTextarea) expandTextarea.focus();
        }, 100);
    }
}

/**
 * Update word count in expand modal
 */
function updateExpandedWordCount() {
    const textarea = document.getElementById('expand-textarea');
    if (!textarea) return;
    
    const content = textarea.value;
    const wordCount = countWords(content);
    const readingTime = Math.ceil(wordCount / CONFIG.READING_SPEED_WPM);
    
    const wordCountEl = document.getElementById('expand-word-count');
    const readingTimeEl = document.getElementById('expand-reading-time');
    
    if (wordCountEl) wordCountEl.textContent = `${wordCount} words`;
    if (readingTimeEl) readingTimeEl.textContent = `${readingTime} min read`;
}

/**
 * Save expanded chapter content
 */
function saveExpandedChapter() {
    if (currentExpandedChapter) {
        const expandTextarea = document.getElementById('expand-textarea');
        const chapterTextarea = document.getElementById(`chapter-${currentExpandedChapter}-content`);
        
        if (expandTextarea && chapterTextarea) {
            const content = expandTextarea.value;
            chapterTextarea.value = content;
            updateChapterContent(currentExpandedChapter);
            
            const saveBtn = event.target.closest('button');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span class="label">✅ Saved!</span>';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 2000);
        }
    }
}

/**
 * Toggle expanded read mode
 */
function toggleExpandedReadMode() {
    const editor = document.getElementById('expand-editor');
    const reader = document.getElementById('expand-reader');
    const label = document.getElementById('read-mode-label');
    
    if (!editor || !reader || !label) return;
    
    if (editor.style.display === 'none') {
        editor.style.display = 'block';
        reader.style.display = 'none';
        label.textContent = 'Read Mode';
    } else {
        const textarea = document.getElementById('expand-textarea');
        const readerContent = document.getElementById('expand-reader-content');
        
        if (textarea && readerContent) {
            const content = textarea.value;
            readerContent.innerHTML = content.replace(/\n/g, '<br>');
        }
        
        editor.style.display = 'none';
        reader.style.display = 'block';
        label.textContent = 'Edit Mode';
    }
}

/**
 * Close expand modal
 */
function closeExpandModal() {
    const modal = document.getElementById('expand-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentExpandedChapter = null;
}

// ==================================================
// ONE-CLICK GENERATION
// ==================================================

/**
 * Start one-click generation configuration
 */
async function startOneClickGeneration() {
    collectBookData();
    
    if (!bookData.category || !bookData.targetAudience || !bookData.topic) {
        await customAlert('Please fill in all required fields before starting one-click generation.', 'Missing Information');
        return;
    }
    
    const modal = document.getElementById('one-click-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Close one-click modal
 */
function closeOneClickModal() {
    const modal = document.getElementById('one-click-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Start one-click generation process
 */
async function startOneClickProcess() {
    const outlineLoops = parseInt(document.getElementById('one-click-outline-loops')?.value) || 0;
    const researchLoops = parseInt(document.getElementById('one-click-research-loops')?.value) || 0;
    const writingLoops = parseInt(document.getElementById('one-click-writing-loops')?.value) || 0;
    
    closeOneClickModal();
    showLoadingOverlay('Starting one-click generation...');
    
    oneClickCancelled = false;
    
    try {
        // Step 1: Generate Outline
        updateLoadingText('Generating book outline...');
        showStep('outline');
        await generateOutline();
        
        if (oneClickCancelled) return;
        
        if (outlineLoops > 0) {
            updateLoadingText(`Improving book outline (${outlineLoops} feedback loops)...`);
            const outlineFeedbackLoops = document.getElementById('outline-feedback-loops');
            const outlineFeedbackMode = document.getElementById('outline-feedback-mode');
            if (outlineFeedbackLoops) outlineFeedbackLoops.value = outlineLoops;
            if (outlineFeedbackMode) outlineFeedbackMode.value = 'ai';
            await runFeedbackLoop('outline');
        }
        
        if (oneClickCancelled) return;
        
        // Step 2: Generate Research Plan
        updateLoadingText('Creating detailed research plan...');
        showStep('research');
        await generateResearchPlan();
        
        if (oneClickCancelled) return;
        
        if (researchLoops > 0) {
            updateLoadingText(`Improving research plan (${researchLoops} feedback loops)...`);
            const researchFeedbackLoops = document.getElementById('research-feedback-loops');
            const researchFeedbackMode = document.getElementById('research-feedback-mode');
            if (researchFeedbackLoops) researchFeedbackLoops.value = researchLoops;
            if (researchFeedbackMode) researchFeedbackMode.value = 'ai';
            await runFeedbackLoop('research');
        }
        
        if (oneClickCancelled) return;
        
        // Step 3: Setup Writing Interface and Generate Chapters
        updateLoadingText('Setting up writing interface...');
        showStep('writing');
        
        updateLoadingText('Writing all chapters...');
        const writingFeedbackLoops = document.getElementById('writing-feedback-loops');
        const writingFeedbackMode = document.getElementById('writing-feedback-mode');
        if (writingFeedbackLoops) writingFeedbackLoops.value = writingLoops;
        if (writingFeedbackMode) writingFeedbackMode.value = 'ai';
        
        for (let i = 1; i <= bookData.numChapters; i++) {
            if (oneClickCancelled) return;
            
            updateLoadingText(`Writing Chapter ${i} of ${bookData.numChapters}...`);
            await generateSingleChapter(i);
            
            if (writingLoops > 0) {
                updateLoadingText(`Improving Chapter ${i} with feedback...`);
                await runChapterFeedback(i);
            }
            
            updateOverallProgress();
        }
        
        if (oneClickCancelled) return;
        
        // Step 4: Complete
        updateLoadingText('Finalizing book...');
        showStep('export');
        updateBookStats();
        
        hideLoadingOverlay();
        
        const completedChapters = bookData.chapters.filter(c => c).length;
        const totalWords = bookData.chapters.filter(c => c).reduce((total, chapter) => total + countWords(chapter), 0);
        
        await customAlert(`One-click generation completed! 

Your book "${bookData.title || 'Untitled'}" is ready for export!

Final Stats:
• ${completedChapters} chapters completed
• ${totalWords.toLocaleString()} total words
• Ready for publishing!`, 'Generation Complete');
        
    } catch (error) {
        hideLoadingOverlay();
        await customAlert(`One-click generation failed: ${error.message}`, 'Generation Failed');
    }
}

/**
 * Cancel one-click generation
 */
function cancelOneClickGeneration() {
    oneClickCancelled = true;
    hideLoadingOverlay();
}

/**
 * Show loading overlay
 * @param {string} text - Loading text
 */
function showLoadingOverlay(text) {
    const loadingText = document.getElementById('loading-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (loadingText) loadingText.textContent = text;
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
}

/**
 * Update loading text
 * @param {string} text - New loading text
 */
function updateLoadingText(text) {
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

/**
 * Proceed to export step
 */
function proceedToExport() {
    showStep('export');
    updateBookStats();
}

// ==================================================
// GENERATION INFO DISPLAY
// ==================================================

/**
 * Show generation info overlay
 * @param {string} message - Generation message
 */
function showGenerationInfo(message = "AI Generation in Progress") {
    const indicator = document.getElementById('generation-indicator');
    const title = document.getElementById('generation-title');
    const description = document.getElementById('generation-description');
    
    if (title) title.textContent = "AI Generation in Progress";
    if (description) description.textContent = message;
    if (indicator) indicator.style.display = 'block';
    
    document.body.classList.add('ai-generating');
}

/**
 * Hide generation info overlay
 */
function hideGenerationInfo() {
    const indicator = document.getElementById('generation-indicator');
    if (indicator) indicator.style.display = 'none';
    
    document.body.classList.remove('ai-generating');
}

// ==================================================
// EXPORT FUNCTIONS
// ==================================================

/**
 * Update book statistics for export
 */
function updateBookStats() {
    if (!bookData.chapters || bookData.chapters.length === 0) {
        // Set default values
        const elements = {
            'total-words': '0',
            'total-chapters': '0',
            'avg-words': '0',
            'reading-time': '0'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        return;
    }

    let totalWords = 0;
    let completedChapters = 0;
    
    bookData.chapters.forEach(chapter => {
        if (chapter && chapter.trim().length > 0) {
            totalWords += countWords(chapter);
            completedChapters++;
        }
    });

    const avgWords = completedChapters > 0 ? Math.round(totalWords / completedChapters) : 0;
    const readingTime = Math.round(totalWords / CONFIG.READING_SPEED_WPM);

    const elements = {
        'total-words': totalWords.toLocaleString(),
        'total-chapters': completedChapters,
        'avg-words': avgWords.toLocaleString(),
        'reading-time': readingTime
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

/**
 * Download book in specified format
 * @param {string} format - Export format (txt, html, md)
 */
async function downloadBook(format) {
    if (!bookData.chapters || bookData.chapters.length === 0) {
        await customAlert('No chapters to download. Please complete the writing process first.', 'No Content');
        return;
    }

    const completedChapters = bookData.chapters.filter(c => c && c.trim().length > 0);
    if (completedChapters.length === 0) {
        await customAlert('No completed chapters to download. Please write some chapters first.', 'No Content');
        return;
    }

    let content = '';
    const title = bookData.title || bookData.topic.substring(0, 50) + (bookData.topic.length > 50 ? '...' : '');
    
    switch(format) {
        case 'txt':
            content = generateTxtContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.txt`, 'text/plain');
            break;
        case 'html':
            content = generateHtmlContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.html`, 'text/html');
            break;
        case 'md':
            content = generateMarkdownContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.md`, 'text/markdown');
            break;
    }
}

/**
 * Generate text content for export
 * @param {string} title - Book title
 * @returns {string} Formatted text content
 */
function generateTxtContent(title) {
    let content = `${title}\n`;
    content += `Category: ${bookData.category}\n`;
    content += `Target Audience: ${bookData.targetAudience}\n\n`;
    
    if (bookData.description) {
        content += `BOOK DESCRIPTION:\n${bookData.description}\n\n`;
    }
    
    content += `${'='.repeat(80)}\n\n`;
    
    // Add chapters
    bookData.chapters.forEach((chapter, index) => {
        if (chapter && chapter.trim().length > 0) {
            content += `CHAPTER ${index + 1}\n\n`;
            content += chapter;
            content += '\n\n' + '='.repeat(80) + '\n\n';
        }
    });
    
    return content;
}

/**
 * Generate HTML content for export
 * @param {string} title - Book title
 * @returns {string} Formatted HTML content
 */
function generateHtmlContent(title) {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 40px; }
        .meta { background: #f8f9fa; padding: 20px; border-left: 4px solid #3498db; margin-bottom: 30px; }
        .chapter { margin-bottom: 50px; }
        .chapter-title { color: #2c3e50; font-size: 1.5em; margin-bottom: 20px; }
        p { margin-bottom: 15px; }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    
    <div class="meta">
        <p><strong>Category:</strong> ${escapeHtml(bookData.category)}</p>
        <p><strong>Target Audience:</strong> ${escapeHtml(bookData.targetAudience)}</p>`;
    
    if (bookData.description) {
        content += `
        <p><strong>Description:</strong> ${escapeHtml(bookData.description)}</p>`;
    }
    
    content += `
    </div>`;
    
    // Add chapters
    bookData.chapters.forEach((chapter, index) => {
        if (chapter && chapter.trim().length > 0) {
            content += `
    <div class="chapter">
        <h2 class="chapter-title">Chapter ${index + 1}</h2>
        ${formatTextToHtml(chapter)}
    </div>`;
        }
    });
    
    content += `
</body>
</html>`;
    
    return content;
}

/**
 * Generate Markdown content for export
 * @param {string} title - Book title
 * @returns {string} Formatted Markdown content
 */
function generateMarkdownContent(title) {
    let content = `# ${title}\n\n`;
    content += `**Category:** ${bookData.category}\n`;
    content += `**Target Audience:** ${bookData.targetAudience}\n\n`;
    
    if (bookData.description) {
        content += `## Book Description\n\n${bookData.description}\n\n`;
    }
    
    content += `---\n\n`;
    
    // Add chapters
    bookData.chapters.forEach((chapter, index) => {
        if (chapter && chapter.trim().length > 0) {
            content += `## Chapter ${index + 1}\n\n`;
            content += chapter;
            content += '\n\n---\n\n';
        }
    });
    
    return content;
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format plain text to HTML paragraphs
 * @param {string} text - Plain text
 * @returns {string} HTML formatted text
 */
function formatTextToHtml(text) {
    return text.split('\n\n').map(paragraph => {
        if (paragraph.trim()) {
            return `<p>${escapeHtml(paragraph.trim())}</p>`;
        }
        return '';
    }).filter(p => p).join('\n        ');
}

/**
 * Sanitize filename for download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Download file with content
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * Copy book content to clipboard
 */
async function copyToClipboard() {
    if (!bookData.chapters || bookData.chapters.length === 0) {
        await customAlert('No content to copy. Please complete the writing process first.', 'No Content');
        return;
    }

    const completedChapters = bookData.chapters.filter(c => c && c.trim().length > 0);
    if (completedChapters.length === 0) {
        await customAlert('No completed chapters to copy. Please write some chapters first.', 'No Content');
        return;
    }

    const title = bookData.title || bookData.topic.substring(0, 50) + (bookData.topic.length > 50 ? '...' : '');
    const content = generateTxtContent(title);
    
    try {
        await navigator.clipboard.writeText(content);
        await customAlert('Book content copied to clipboard successfully!', 'Copied');
    } catch (error) {
        await customAlert('Failed to copy to clipboard. Please try downloading instead.', 'Copy Failed');
    }
}

// ==================================================
// PROJECT MANAGEMENT
// ==================================================

/**
 * Create new project
 */
async function newProject() {
    const confirmed = await customConfirm('Create a new project? Current unsaved changes will be lost.', 'New Project');
    if (!confirmed) return;
    
    // Reset book data
    bookData = {
        id: 'current',
        title: '',
        description: '',
        category: '',
        targetAudience: '',
        topic: '',
        approach: '',
        numChapters: 15,
        targetWordCount: 2000,
        outline: '',
        researchPlan: '',
        chapters: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Clear form fields
    const fields = ['category', 'target-audience', 'topic', 'approach', 'num-chapters', 'target-word-count', 'outline-content', 'research-content'];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = id === 'num-chapters' ? '15' : id === 'target-word-count' ? '2000' : '';
        }
    });
    
    // Update UI
    updateWordCount();
    updateChapterEstimate();
    updateCategoryRequirements();
    saveOutlineContent();
    saveResearchContent();
    showStep('setup');
    
    // Clear localStorage
    localStorage.removeItem('bookforge_current_project');
    
    await customAlert('New project created successfully!', 'New Project');
}

/**
 * Save current project
 */
async function saveProject() {
    collectBookData();
    
    if (!bookData.topic.trim()) {
        await customAlert('Please enter a topic before saving the project.', 'Missing Topic');
        return;
    }
    
    const projectName = prompt('Enter a name for this project:', bookData.title || bookData.topic.substring(0, 30));
    if (!projectName) return;
    
    if (Object.keys(projects).length >= CONFIG.MAX_SAVED_PROJECTS) {
        await customAlert(`Maximum of ${CONFIG.MAX_SAVED_PROJECTS} projects allowed. Please delete some projects first.`, 'Project Limit');
        return;
    }
    
    const projectId = generateProjectId();
    const projectData = {
        ...bookData,
        id: projectId,
        name: projectName,
        lastSaved: new Date().toISOString()
    };
    
    projects[projectId] = projectData;
    localStorage.setItem('bookforge_projects', JSON.stringify(projects));
    
    updateProjectSelector();
    
    await customAlert(`Project "${projectName}" saved successfully!`, 'Project Saved');
}

/**
 * Generate unique project ID
 * @returns {string} Project ID
 */
function generateProjectId() {
    return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Update project selector dropdown
 */
function updateProjectSelector() {
    const selector = document.getElementById('project-select');
    if (!selector) return;
    
    selector.innerHTML = '<option value="current">Current Project</option>';
    
    Object.entries(projects).forEach(([id, project]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = project.name || 'Untitled Project';
        selector.appendChild(option);
    });
}

/**
 * Handle project selector action
 * @param {string} value - Selected value
 */
async function handleProjectAction(value) {
    if (value === 'current') return;
    
    const confirmed = await customConfirm('Load this project? Current unsaved changes will be lost.', 'Load Project');
    if (!confirmed) {
        const selector = document.getElementById('project-select');
        if (selector) selector.value = 'current';
        return;
    }
    
    if (projects[value]) {
        bookData = { ...projects[value] };
        updateFormFromBookData();
        await customAlert(`Project "${bookData.name}" loaded successfully!`, 'Project Loaded');
    }
    
    updateDeleteButtonVisibility();
}

/**
 * Update delete button visibility
 */
function updateDeleteButtonVisibility() {
    const selector = document.getElementById('project-select');
    const deleteBtn = document.getElementById('delete-project-btn');
    
    if (selector && deleteBtn) {
        deleteBtn.style.display = selector.value !== 'current' ? 'inline-flex' : 'none';
    }
}

/**
 * Delete current project
 */
async function deleteCurrentProject() {
    const selector = document.getElementById('project-select');
    if (!selector || selector.value === 'current') return;
    
    const projectId = selector.value;
    const project = projects[projectId];
    if (!project) return;
    
    const confirmed = await customConfirm(`Delete project "${project.name}"? This cannot be undone.`, 'Delete Project');
    if (!confirmed) return;
    
    delete projects[projectId];
    localStorage.setItem('bookforge_projects', JSON.stringify(projects));
    
    updateProjectSelector();
    selector.value = 'current';
    updateDeleteButtonVisibility();
    
    await customAlert(`Project "${project.name}" deleted successfully!`, 'Project Deleted');
}

/**
 * Manage projects modal
 */
function manageProjects() {
    const modal = document.getElementById('project-management-modal');
    if (modal) {
        updateProjectManagementModal();
        modal.classList.add('active');
    }
}

/**
 * Update project management modal content
 */
function updateProjectManagementModal() {
    const projectCount = Object.keys(projects).length;
    const maxProjects = CONFIG.MAX_SAVED_PROJECTS;
    
    const countEl = document.getElementById('project-count');
    const progressEl = document.getElementById('project-count-progress');
    const listEl = document.getElementById('project-list');
    
    if (countEl) countEl.textContent = projectCount;
    if (progressEl) progressEl.style.width = `${(projectCount / maxProjects) * 100}%`;
    
    if (listEl) {
        if (projectCount === 0) {
            listEl.innerHTML = '<div class="no-projects">No saved projects</div>';
        } else {
            listEl.innerHTML = '';
            Object.entries(projects).forEach(([id, project]) => {
                const item = document.createElement('div');
                item.className = 'project-item';
                item.innerHTML = `
                    <div class="project-info">
                        <h4>${escapeHtml(project.name || 'Untitled Project')}</h4>
                        <p>Category: ${escapeHtml(project.category)} | Chapters: ${project.chapters ? project.chapters.filter(c => c).length : 0}/${project.numChapters}</p>
                        <p>Last saved: ${new Date(project.lastSaved).toLocaleDateString()}</p>
                    </div>
                    <div class="project-actions">
                        <button class="btn btn-primary btn-sm" onclick="loadProject('${id}')">Load</button>
                        <button class="btn btn-ghost btn-sm" onclick="exportProject('${id}')">Export</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProject('${id}')">Delete</button>
                    </div>
                `;
                listEl.appendChild(item);
            });
        }
    }
}

/**
 * Close project management modal
 */
function closeProjectManagementModal() {
    const modal = document.getElementById('project-management-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Load specific project
 * @param {string} projectId - Project ID
 */
async function loadProject(projectId) {
    if (!projects[projectId]) return;
    
    bookData = { ...projects[projectId] };
    updateFormFromBookData();
    
    closeProjectManagementModal();
    
    const selector = document.getElementById('project-select');
    if (selector) selector.value = projectId;
    updateDeleteButtonVisibility();
    
    await customAlert(`Project "${bookData.name}" loaded successfully!`, 'Project Loaded');
}

/**
 * Export specific project
 * @param {string} projectId - Project ID
 */
function exportProject(projectId) {
    if (!projects[projectId]) return;
    
    const project = projects[projectId];
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${sanitizeFilename(project.name || 'project')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Delete specific project
 * @param {string} projectId - Project ID
 */
async function deleteProject(projectId) {
    if (!projects[projectId]) return;
    
    const project = projects[projectId];
    const confirmed = await customConfirm(`Delete project "${project.name}"? This cannot be undone.`, 'Delete Project');
    if (!confirmed) return;
    
    delete projects[projectId];
    localStorage.setItem('bookforge_projects', JSON.stringify(projects));
    
    updateProjectManagementModal();
    updateProjectSelector();
    
    // If this was the currently selected project, reset selector
    const selector = document.getElementById('project-select');
    if (selector && selector.value === projectId) {
        selector.value = 'current';
        updateDeleteButtonVisibility();
    }
}

/**
 * Export all projects
 */
function exportAllProjects() {
    if (Object.keys(projects).length === 0) {
        showErrorMessage('No projects to export.');
        return;
    }
    
    const dataStr = JSON.stringify(projects, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'bookforge-all-projects.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessMessage('All projects exported successfully!');
}

/**
 * Import projects from file
 */
function importProjects() {
    const input = document.getElementById('projects-import-file');
    if (input) {
        input.click();
    }
}

/**
 * Handle projects import
 * @param {Event} event - File input event
 */
function handleProjectsImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Handle both single project and multiple projects
            let importedProjects = {};
            if (importedData.id && importedData.name) {
                // Single project
                const newId = generateProjectId();
                importedProjects[newId] = { ...importedData, id: newId };
            } else {
                // Multiple projects
                Object.values(importedData).forEach(project => {
                    const newId = generateProjectId();
                    importedProjects[newId] = { ...project, id: newId };
                });
            }
            
            // Merge with existing projects
            const mergedCount = Object.keys(importedProjects).length;
            projects = { ...projects, ...importedProjects };
            
            // Limit check
            if (Object.keys(projects).length > CONFIG.MAX_SAVED_PROJECTS) {
                projects = Object.fromEntries(
                    Object.entries(projects).slice(-CONFIG.MAX_SAVED_PROJECTS)
                );
            }
            
            localStorage.setItem('bookforge_projects', JSON.stringify(projects));
            updateProjectSelector();
            updateProjectManagementModal();
            
            await customAlert(`Successfully imported ${mergedCount} project(s)!`, 'Import Successful');
            
        } catch (error) {
            showErrorMessage('Failed to import projects: Invalid file format');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

/**
 * Clear all projects
 */
async function clearAllProjects() {
    if (Object.keys(projects).length === 0) {
        await customAlert('No projects to clear.', 'No Projects');
        return;
    }
    
    const confirmed = await customConfirm('Delete all saved projects? This cannot be undone.', 'Clear All Projects');
    if (!confirmed) return;
    
    projects = {};
    localStorage.setItem('bookforge_projects', JSON.stringify(projects));
    
    updateProjectSelector();
    updateProjectManagementModal();
    
    const selector = document.getElementById('project-select');
    if (selector) selector.value = 'current';
    updateDeleteButtonVisibility();
    
    await customAlert('All projects cleared successfully!', 'Projects Cleared');
}

/**
 * Import single project from file
 * @param {Event} event - File input event
 */
function importProject(event) {
    // This function is called from the hidden file input in the UI
    // It's the same as handleProjectsImport but for single project import
    handleProjectsImport(event);
}

// ==================================================
// COST ESTIMATION
// ==================================================

/**
 * Estimate API costs for book generation
 */
async function estimateCosts() {
    try {
        collectBookData();
        
        if (!bookData.category || !bookData.targetAudience || !bookData.topic) {
            await customAlert('Please fill in category, target audience, and topic to estimate costs.', 'Missing Information');
            return;
        }
        
        // Estimate token usage
        const outlineTokens = 2000; // Estimated tokens for outline generation
        const researchTokens = 4000; // Estimated tokens for research plan
        const chapterTokens = bookData.targetWordCount * 1.5; // Rough word-to-token ratio
        const totalChapterTokens = chapterTokens * bookData.numChapters;
        
        const totalInputTokens = outlineTokens + researchTokens + totalChapterTokens;
        const totalOutputTokens = totalInputTokens * 0.3; // Estimated output vs input ratio
        
        // Get current model pricing
        const provider = aiSettings.apiProvider;
        const model = document.getElementById('model-select')?.value || aiSettings.model;
        
        let modelCost = null;
        if (apiModels[provider]) {
            const allModels = [...(apiModels[provider].creative || []), ...(apiModels[provider].budget || [])];
            modelCost = allModels.find(m => m.value === model)?.cost;
        }
        
        if (!modelCost) {
            await customAlert('Cost information not available for selected model.', 'Cost Estimation');
            return;
        }
        
        const inputCost = (totalInputTokens / 1000000) * modelCost.input;
        const outputCost = (totalOutputTokens / 1000000) * modelCost.output;
        const totalCost = inputCost + outputCost;
        
        const message = `Estimated Cost for Your Book:

📊 Token Usage:
• Input tokens: ${totalInputTokens.toLocaleString()}
• Output tokens: ${totalOutputTokens.toLocaleString()}

💰 Cost Breakdown:
• Input cost: ${inputCost.toFixed(2)}
• Output cost: ${outputCost.toFixed(2)}
• Total estimated cost: ${totalCost.toFixed(2)}

📝 Book Details:
• ${bookData.numChapters} chapters
• ~${bookData.targetWordCount} words per chapter
• Model: ${model}

Note: This is an estimate. Actual costs may vary based on content complexity and feedback loops.`;
        
        await customAlert(message, 'Cost Estimation');
        
    } catch (error) {
        await customAlert('Error calculating cost estimate: ' + error.message, 'Estimation Error');
    }
}

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

/**
 * Reset everything and start over
 */
async function resetEverything() {
    const confirmed = await customConfirm('Reset everything and start over? All current work will be lost.', 'Reset Everything');
    if (!confirmed) return;
    
    // Clear localStorage
    localStorage.removeItem('bookforge_current_project');
    
    // Reset to initial state
    await newProject();
}

// ==================================================
// FEEDBACK AND DONATION MODALS
// ==================================================

/**
 * Show feedback form
 */
function showFeedbackForm() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Close feedback modal
 */
function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.remove('active');
        
        // Clear form
        const typeEl = document.getElementById('feedback-type');
        const messageEl = document.getElementById('feedback-message');
        const emailEl = document.getElementById('feedback-email');
        
        if (typeEl) typeEl.value = 'bug';
        if (messageEl) messageEl.value = '';
        if (emailEl) emailEl.value = '';
    }
}

/**
 * Submit feedback
 */
async function submitFeedback() {
    const type = document.getElementById('feedback-type')?.value;
    const message = document.getElementById('feedback-message')?.value;
    const email = document.getElementById('feedback-email')?.value;
    
    if (!message.trim()) {
        await customAlert('Please enter your feedback message.', 'Missing Message');
        return;
    }
    
    // Since this is a demo, just show success message
    closeFeedbackModal();
    await customAlert('Thank you for your feedback! We appreciate your input and will use it to improve BookForge AI.', 'Feedback Sent');
}

/**
 * Show donation modal
 */
function showDonationModal() {
    const modal = document.getElementById('donation-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Close donation modal
 */
function closeDonationModal() {
    const modal = document.getElementById('donation-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Set donation amount
 * @param {number} amount - Donation amount
 */
function setDonationAmount(amount) {
    selectedDonationAmount = amount;
    
    // Update button states
    document.querySelectorAll('.donation-amount').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    
    // Clear custom amount
    const customInput = document.getElementById('custom-donation-amount');
    if (customInput) customInput.value = '';
    
    // Update donate button
    const donateBtn = document.getElementById('donate-btn');
    if (donateBtn) {
        donateBtn.innerHTML = `<span class="label">Donate ${amount}</span>`;
    }
}

/**
 * Proceed to donation (placeholder)
 */
async function proceedToDonate() {
    closeDonationModal();
    await customAlert(`Thank you for your generous support of ${selectedDonationAmount}! Your contribution helps keep BookForge AI free and continuously improving.

This is a demo version, so no actual payment processing is implemented. In the full version, this would redirect to a secure payment processor.`, 'Thank You');
}