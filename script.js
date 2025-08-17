// BookForge - Complete Professional JavaScript Implementation
// Version 1.1.0

// ============================================================================
// GLOBAL CONFIGURATION & STATE
// ============================================================================

const CONFIG = {
    VERSION: '1.1.0',
    AUTO_SAVE_DELAY: 2000,
    MAX_PROJECTS: 50,
    WORDS_PER_PAGE: 250,
    MIN_CHAPTER_WORDS: 100,
    API_TIMEOUT: 120000, // 2 minutes
    RETRY_ATTEMPTS: 3
};

// Global State Management
let bookData = {
    id: 'current',
    title: '',
    category: '',
    targetAudience: '',
    topic: '',
    approach: '',
    numChapters: 12,
    targetWordCount: 2000,
    research: '',
    chapterOutline: '',
    chapters: [],
    summary: '',
    currentStep: 'setup',
    createdAt: new Date().toISOString(),
    lastSaved: new Date().toISOString()
};

let isGenerating = false;
let autoSaveTimeout = null;
let projects = {};
let currentTheme = 'professional';
let generationAbortController = null;

// AI Settings with Enhanced Configuration
let aiSettings = {
    provider: 'claude', // Default to Claude via API
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 4000,
    customPrompts: {}
};

// ============================================================================
// CATEGORY-SPECIFIC REQUIREMENTS & CONFIGURATION
// ============================================================================

const categoryRequirements = {
    'business-entrepreneurship': {
        requirements: "Actionable strategies, case studies, ROI focus, market analysis, leadership principles, competitive advantage frameworks",
        approach: "Data-driven insights, practical frameworks, real-world examples, step-by-step implementation, measurable outcomes",
        disclaimers: "Business results may vary based on market conditions, execution, and external factors.",
        authorityElements: "Industry statistics, expert interviews, case studies, financial models, market research"
    },
    'self-help-personal-development': {
        requirements: "Evidence-based methods, actionable advice, personal transformation, goal achievement, psychological insights",
        approach: "Psychological insights, practical exercises, habit formation, motivational content, progressive development",
        disclaimers: "Individual results may vary. Consult professionals for serious psychological or medical concerns.",
        authorityElements: "Research studies, expert opinions, psychological frameworks, success metrics, behavioral science"
    },
    'health-wellness': {
        requirements: "Scientific backing, safety considerations, professional disclaimers, holistic approach, evidence-based recommendations",
        approach: "Research-based recommendations, practical lifestyle changes, preventive focus, professional guidance",
        disclaimers: "Not intended as medical advice. Consult healthcare professionals before making health decisions.",
        authorityElements: "Peer-reviewed studies, medical expert input, clinical research, safety guidelines, professional standards"
    },
    'technology-programming': {
        requirements: "Current best practices, code examples, technical accuracy, practical applications, industry standards",
        approach: "Hands-on tutorials, progressive learning, real-world projects, industry standards, practical implementation",
        disclaimers: "Technology evolves rapidly. Verify current best practices and compatibility.",
        authorityElements: "Technical documentation, code examples, industry benchmarks, expert insights, practical projects"
    },
    'science-education': {
        requirements: "Peer-reviewed sources, accurate information, clear explanations, educational value, scientific rigor",
        approach: "Systematic presentation, visual aids, practical applications, critical thinking, evidence-based learning",
        disclaimers: "Scientific understanding evolves. Information current as of publication date.",
        authorityElements: "Academic sources, research citations, expert reviews, empirical evidence, educational frameworks"
    },
    'finance-investment': {
        requirements: "Risk disclaimers, regulatory compliance, current market data, practical strategies, professional standards",
        approach: "Conservative advice, diversification principles, long-term perspective, risk management, professional guidance",
        disclaimers: "Investment involves risk. Past performance doesn't guarantee future results. Consult financial advisors.",
        authorityElements: "Market data, financial models, regulatory guidelines, expert analysis, risk assessments"
    }
};

// ============================================================================
// ENHANCED AI PROMPTS FOR NON-FICTION
// ============================================================================

const defaultPrompts = {
    research: `You are an expert researcher and non-fiction author creating a comprehensive research framework for a professional {category} book targeting {targetAudience}.

BOOK SPECIFICATION:
- Category: {category}
- Target Audience: {targetAudience}
- Topic: {topic}
- Approach: {approach}
- Chapters: {numChapters}

CATEGORY REQUIREMENTS:
{categoryRequirements}

CREATE A COMPREHENSIVE RESEARCH FRAMEWORK:

**1. RESEARCH METHODOLOGY**
- Primary source identification and evaluation criteria
- Secondary source research strategy with quality filters
- Expert interview targets and structured question frameworks
- Data collection protocols and verification methods
- Fact-checking procedures and source validation
- Ethical considerations and bias mitigation

**2. AUTHORITY POSITIONING STRATEGY**
- Credibility building through expertise demonstration
- Evidence hierarchy: peer-reviewed > expert opinion > case studies
- Professional positioning and thought leadership elements
- Industry recognition and validation strategies
- Competitive differentiation through unique insights

**3. CONTENT DEVELOPMENT FRAMEWORK**
- Evidence-based argument construction
- Case study selection and development criteria
- Statistical data integration and interpretation
- Expert quote integration and attribution
- Practical application frameworks and methodologies
- Reader engagement and value delivery strategies

**4. SOURCE DOCUMENTATION PLAN**
- Academic and peer-reviewed source requirements
- Industry report and authoritative publication standards
- Expert interview protocols and consent procedures
- Current market data and statistical requirements
- Historical context and trend analysis needs
- Reference formatting and citation standards

**5. PRACTICAL APPLICATION ARCHITECTURE**
- Actionable insight development frameworks
- Implementation methodology design
- Tool and template creation guidelines
- Success measurement and KPI definition
- Common pitfall identification and mitigation
- Follow-up and continuous improvement protocols

**6. PROFESSIONAL STANDARDS COMPLIANCE**
- Ethical guidelines and best practices
- Professional disclaimers and limitation statements
- Regulatory compliance considerations
- Industry standard adherence requirements
- Quality assurance and review processes
- Update and maintenance protocols

Ensure this framework positions you as THE definitive authority on {topic} while delivering maximum practical value to {targetAudience}.`,

    chapters: `You are an expert non-fiction author creating the definitive chapter structure for a {category} book. Transform the research framework into a comprehensive, value-driven chapter plan.

RESEARCH FOUNDATION:
{research}

BOOK PARAMETERS:
- Category: {category}
- Target Audience: {targetAudience} 
- Chapters: {numChapters}
- Words per Chapter: {targetWordCount}
- Topic Focus: {topic}
- Methodology: {approach}

REQUIREMENTS:
{categoryRequirements}

CREATE DETAILED CHAPTER ARCHITECTURE:

For each chapter (1-{numChapters}), provide:

**CHAPTER [NUMBER]: [COMPELLING TITLE]**

**Core Promise:** One sentence describing the specific value this chapter delivers

**Learning Outcomes:**
- What readers will know after this chapter
- Skills they'll be able to implement immediately  
- Mindset shifts or perspective changes
- Measurable competencies gained

**Authority Elements:**
- Key research/statistics to establish credibility
- Expert insights or quotes needed
- Case studies or examples to include
- Industry data or benchmarks required

**Content Architecture:**
- **Opening Hook** (150 words): Problem/opportunity that grabs attention
- **Foundation Building** (400 words): Essential concepts and background
- **Core Framework** (800 words): Main methodology/insights with evidence
- **Practical Application** (500 words): Step-by-step implementation
- **Real-World Integration** (300 words): Examples and case studies
- **Chapter Synthesis** (100 words): Key takeaways and transition

**Implementation Framework:**
- Specific tools, templates, or checklists to provide
- Action steps readers can take immediately
- Common obstacles and how to overcome them
- Success metrics or evaluation criteria
- Resources for deeper exploration

**Engagement Strategy:**
- Industry-specific examples for {targetAudience}
- Relatable scenarios and challenges
- Thought-provoking questions or exercises
- Professional development opportunities
- Network/community building elements

**Professional Standards:**
- Required disclaimers or limitations
- Ethical considerations to address
- Regulatory compliance notes
- Professional best practices to highlight
- Industry standard references

**Transition Strategy:**
- How this chapter builds on previous content
- Setup for subsequent chapters
- Cumulative value proposition
- Skill/knowledge progression path

TARGET: {targetWordCount} words per chapter (adjust for content complexity and value density)

Create a structure that positions this as the definitive professional resource in {category}, ensuring each chapter delivers immense practical value while building unassailable authority.`,

    writing: `You are the world's leading expert on {category}, writing Chapter {chapterNum} of the definitive professional guide. Create authoritative, research-backed content that establishes unquestionable expertise.

CRITICAL CONTEXT:
**Book Foundation:** {contextInfo}

**This Chapter's Blueprint:** {chapterOutline}

**Previous Chapter Connection:** {previousChapterEnding}

**Professional Standards for {category}:** {categoryRequirements}

CHAPTER {chapterNum} WRITING REQUIREMENTS:

**AUTHORITY DISTRIBUTION (Target: {targetWordCount} words):**
- Evidence & Research (35%): Citations, studies, data, expert insights
- Practical Application (40%): Implementation frameworks, tools, strategies  
- Professional Positioning (15%): Industry insights, thought leadership
- Engagement & Examples (10%): Case studies, relatable scenarios

**STRUCTURE REQUIREMENTS:**

**1. POWER OPENING (150-200 words)**
- Hook with industry-relevant problem/opportunity
- Statistical or research-based credibility establishment
- Clear value proposition for this chapter
- Bridge from previous chapter if applicable

**2. FOUNDATION ESTABLISHMENT (300-400 words)**
- Core concepts with authoritative backing
- Industry context and current landscape
- Historical perspective or trend analysis
- Why this knowledge is critical for {targetAudience}

**3. EXPERTISE DEMONSTRATION (600-800 words)**
- Detailed methodology/framework presentation
- Supporting research and evidence integration
- Expert insights and professional perspectives
- Competitive analysis or market positioning
- Advanced strategies and insider knowledge

**4. PRACTICAL IMPLEMENTATION (500-600 words)**
- Step-by-step implementation guide
- Tools, templates, and resource provision
- Common pitfalls and expert solutions
- Success metrics and evaluation criteria
- Professional best practices and standards

**5. REAL-WORLD APPLICATION (300-400 words)**
- Industry-specific case studies
- Professional success stories
- Implementation examples for {targetAudience}
- ROI demonstrations and value quantification
- Scalability and adaptation strategies

**6. PROFESSIONAL SYNTHESIS (100-150 words)**
- Key insights summary with action focus
- Professional development implications
- Strategic advantage creation
- Transition to next chapter's value
- Continuous improvement encouragement

**PROFESSIONAL REQUIREMENTS:**
- Appropriate disclaimers: {categorySpecificElements}
- Industry standard compliance and best practices
- Evidence-based claims with proper attribution
- Professional tone suitable for {targetAudience}
- Actionable insights with immediate implementation value
- Authority positioning through expertise demonstration

**CREDIBILITY ELEMENTS TO INCLUDE:**
- Current industry statistics and benchmarks
- Expert quotes or professional insights (attributed)
- Research study references and key findings
- Best practice frameworks and methodologies
- Professional standards and compliance considerations

Write Chapter {chapterNum} as if you're the recognized global authority on {topic}, delivering content that {targetAudience} will reference, share, and implement for years to come.`,

    randomIdea: `You are a seasoned publishing consultant and expert non-fiction author with deep market knowledge. Generate a commercially viable, authority-building book concept that addresses real professional needs.

TARGET SPECIFICATIONS:
- Category: {category}
- Audience: {targetAudience}

MARKET ANALYSIS REQUIREMENTS:
- Identify genuine gaps in current {category} literature
- Address specific pain points {targetAudience} faces daily
- Consider emerging trends and future-focused opportunities
- Ensure sufficient depth for professional-level treatment
- Validate commercial viability and market demand

GENERATE COMPREHENSIVE BOOK CONCEPT:

**1. TOPIC DEFINITION (2-3 sentences)**
Compelling, specific topic that:
- Addresses critical professional challenges or opportunities
- Differentiates from existing market offerings
- Provides clear ROI and value proposition for readers
- Demonstrates author expertise and market positioning
- Ensures sustainable competitive advantage

**2. METHODOLOGY & APPROACH (1-2 sentences)**
Specify the unique framework/methodology:
- Evidence-based vs. experiential vs. research-synthesis approach
- Practical implementation vs. strategic thinking vs. systematic process
- Individual development vs. organizational transformation vs. industry analysis
- Conservative best-practices vs. innovative breakthrough vs. hybrid approach

**3. OPTIMAL STRUCTURE**
Recommend ideal chapter count based on:
- Content complexity and depth requirements
- Target audience expertise level and time constraints
- Market standards for {category} publications
- Authority building and credibility establishment needs
- Practical implementation and reference utility

**COMMERCIAL VIABILITY FACTORS:**
- Professional development and career advancement value
- Organizational implementation and ROI potential
- Industry recognition and thought leadership opportunity
- Speaking engagement and consulting opportunity creation
- Long-term relevance and evergreen content balance

**AUTHORITY POSITIONING:**
- Unique expertise angle and competitive differentiation
- Industry recognition and validation opportunities
- Thought leadership platform and influence building
- Professional network expansion and partnership potential
- Media attention and industry recognition probability

FORMAT RESPONSE AS:
**TOPIC:** [Compelling professional topic with specific value proposition]
**APPROACH:** [Unique methodology and framework description]  
**CHAPTERS:** [Optimal number with brief justification]
**MARKET POSITION:** [Authority building and competitive advantage statement]`,

    bookTitle: `You are a top publishing industry consultant specializing in non-fiction bestsellers. Create a compelling title and authoritative description that positions this book as essential reading for professionals.

COMPREHENSIVE BOOK CONTEXT:
- Category: {category}
- Target Audience: {targetAudience}
- Core Topic: {topic}
- Methodology: {approach}
- Research Foundation: {research}
- Chapter Structure: {chapterOutline}

MARKET ANALYSIS:
- Current competitive landscape in {category}
- Professional needs and pain points of {targetAudience}
- Authority building and thought leadership requirements
- Commercial viability and market positioning
- Long-term reference value and practical utility

CREATE COMPELLING BOOK PACKAGE:

**1. PROFESSIONAL TITLE**
Develop a title that:
- Clearly communicates unique value proposition
- Appeals to {targetAudience} professional aspirations
- Uses proven non-fiction success formulas for {category}
- Differentiates from existing market competition
- Suggests authority and expertise positioning
- Indicates practical utility and implementation value
- Optimizes for professional recommendation and sharing

**TITLE FORMULA CONSIDERATIONS:**
- Problem/Solution: "The [Problem] Solution: [Benefit]"
- Authority: "The [Audience] Guide to [Outcome]" 
- Process: "The [Number] Steps to [Achievement]"
- Transformation: "From [Current State] to [Desired State]"
- Framework: "The [Name] Method for [Result]"

**2. AUTHORITATIVE BOOK DESCRIPTION (180-220 words)**
Craft description that:
- Opens with the critical problem/opportunity this book addresses
- Establishes author credibility and unique expertise angle
- Explains the distinctive methodology and approach
- Highlights specific benefits and practical outcomes
- Demonstrates ROI and professional development value
- Positions as essential resource for {targetAudience}
- Includes social proof and authority indicators
- Ends with compelling call-to-action for immediate value

**DESCRIPTION STRUCTURE:**
- Problem Hook (25 words): Critical challenge facing {targetAudience}
- Authority Establishment (30 words): Why this book/author is definitive source
- Unique Solution (40 words): Distinctive approach and methodology
- Practical Benefits (50 words): Specific outcomes and implementation value
- Professional Impact (35 words): Career/business advancement implications
- Value Proposition (20 words): Why this book is indispensable

**MARKET POSITIONING:**
- Position as THE definitive resource in {category}
- Emphasize practical implementation over theory
- Highlight competitive advantage and differentiation
- Suggest thought leadership and industry recognition
- Indicate reference value and long-term utility

FORMAT RESPONSE AS:
**TITLE:** [Professional, compelling title]

**DESCRIPTION:** [Authoritative 180-220 word description]

**MARKET POSITIONING:** [One sentence competitive advantage statement]`,

    analysis: `You are a senior publishing consultant and professional editor with 25+ years analyzing {category} content for {targetAudience}. Provide comprehensive, actionable analysis that enhances authority and practical value.

CONTENT ANALYSIS TARGET:
{content}

ESTABLISHED PROFESSIONAL PARAMETERS:
- Category: {category} (maintain professional standards)
- Target Audience: {targetAudience} (appropriate expertise level)
- Topic Focus: {topic} (preserve core subject authority)
- Methodology: {approach} (maintain stated framework)
- Technical Specs: {targetWordCount} words per chapter, {numChapters} total chapters

COMPREHENSIVE PROFESSIONAL ANALYSIS:

**1. AUTHORITY & CREDIBILITY ASSESSMENT**
- Does content establish unquestionable expertise in {category}?
- Are claims properly supported with evidence and attribution?
- Is the approach consistent with stated methodology?
- Does it position author as definitive thought leader?
- Are industry standards and best practices properly addressed?
- Is competitive differentiation and unique value clear?

**2. CONTENT QUALITY & PROFESSIONAL STANDARDS**
- Factual accuracy and current industry information
- Logical progression and coherent structure development
- Appropriate depth and complexity for {targetAudience}
- Compliance with {category} professional standards
- Evidence quality and source credibility assessment
- Professional tone and language appropriateness

**3. PRACTICAL VALUE & IMPLEMENTATION**
- Immediate actionability for {targetAudience} daily work
- Clear ROI and professional development value
- Tools, frameworks, and resources provision
- Implementation barriers and solution provision
- Success measurement and evaluation criteria
- Long-term reference utility and practical application

**4. MARKET POSITIONING & COMPETITIVE ADVANTAGE**
- Differentiation from existing {category} literature
- Unique insights and proprietary frameworks
- Industry recognition and thought leadership potential
- Professional recommendation and sharing likelihood
- Authority building and expertise demonstration
- Commercial viability and market appeal

**5. PROFESSIONAL COMPLIANCE & STANDARDS**
- Industry-specific disclaimer and limitation requirements
- Ethical considerations and professional responsibility
- Regulatory compliance and legal considerations
- Professional liability and risk management
- Quality assurance and accuracy verification
- Update requirements and maintenance protocols

**6. STRATEGIC IMPROVEMENT PRIORITIES**
Rank 5 specific improvements by professional impact:
1. [Highest Impact]: Specific enhancement for authority/credibility
2. [High Impact]: Practical value and implementation improvement
3. [Medium Impact]: Content quality and professional standards
4. [Medium Impact]: Market positioning and competitive advantage
5. [Lower Impact]: Polish and professional presentation

For each priority, provide:
- Specific problem identification
- Concrete solution with implementation steps
- Expected impact on professional credibility
- Resource requirements and implementation complexity
- Success metrics and evaluation criteria

**EXECUTIVE SUMMARY:**
One paragraph assessment focusing on professional viability, market positioning, and critical enhancement priorities for maximum authority building and practical value delivery.

CRITICAL: All recommendations must enhance professional credibility, practical implementation value, and competitive market position while maintaining established parameters and {category} standards.`,

    improvement: `You are the world's leading expert in {category} and professional editor. Transform this {contentType} into the definitive professional resource that establishes unquestionable authority while delivering maximum practical value.

IMPROVEMENT TARGET:
{originalContent}

PROFESSIONAL ANALYSIS INSIGHTS:
{feedbackContent}

MANDATORY PROFESSIONAL PARAMETERS:
- Category: {category} (maintain highest professional standards)
- Target Audience: {targetAudience} (appropriate expertise level)
- Core Topic: {topic} (preserve authority and focus)
- Methodology: {approach} (enhance stated framework)
- Technical Requirements: {targetWordCount} words per chapter, {numChapters} chapters
- Authority Position: Definitive expert resource in {category}

COMPREHENSIVE IMPROVEMENT STRATEGY:

**1. AUTHORITY ENHANCEMENT**
- Strengthen credibility through enhanced evidence integration
- Improve expert positioning and thought leadership elements
- Enhance competitive differentiation and unique value proposition
- Elevate professional standards and industry best practices
- Increase reference quality and source attribution
- Amplify expertise demonstration and knowledge depth

**2. PRACTICAL VALUE AMPLIFICATION**
- Enhance immediate implementation value for {targetAudience}
- Improve ROI demonstration and professional development impact
- Strengthen tool and framework provision
- Increase actionability and step-by-step guidance
- Enhance success measurement and evaluation criteria
- Improve long-term reference utility and practical application

**3. PROFESSIONAL POLISH & STANDARDS**
- Elevate writing quality and professional presentation
- Enhance logical flow and structural coherence
- Improve clarity for {targetAudience} expertise level
- Strengthen industry standard compliance and best practices
- Enhance professional tone and authoritative voice
- Improve evidence quality and factual accuracy

**4. MARKET POSITIONING OPTIMIZATION**
- Enhance competitive advantage and unique positioning
- Improve thought leadership and industry recognition elements
- Strengthen professional recommendation and sharing appeal
- Enhance commercial viability and market positioning
- Improve authority building and expertise demonstration
- Strengthen industry influence and recognition potential

**5. COMPLIANCE & RISK MANAGEMENT**
- Ensure appropriate professional disclaimers and limitations
- Address ethical considerations and professional responsibility
- Verify regulatory compliance and legal requirements
- Implement quality assurance and accuracy protocols
- Address professional liability and risk management
- Ensure update protocols and maintenance considerations

**TRANSFORMATION REQUIREMENTS:**
- Address ALL critical issues identified in analysis
- Maintain original structure while enhancing quality
- Preserve established parameters unless specifically overridden
- Enhance professional authority and market credibility
- Maximize practical implementation value
- Ensure industry-leading quality and professional standards

**QUALITY STANDARDS:**
- Content suitable for professional publication and industry recognition
- Authority level appropriate for thought leadership positioning
- Practical value worthy of executive and professional recommendation
- Quality standards exceeding current market competition
- Long-term reference utility and practical implementation value
- Professional credibility suitable for speaking and consulting opportunities

Create the enhanced {contentType} that positions the author as THE definitive authority while delivering unmatched practical value to {targetAudience}. This should read like content from the recognized global expert in {category}.`,

    manualImprovement: `You are the world's leading expert in {category} and professional editor. Implement the specific feedback provided while maintaining the highest professional standards and authority positioning.

ORIGINAL CONTENT:
{originalContent}

SPECIFIC FEEDBACK TO IMPLEMENT:
{manualFeedback}

PROFESSIONAL CONTEXT:
- Category: {category}
- Target Audience: {targetAudience}
- Topic Focus: {topic}
- Methodology: {approach}
- Technical Specs: {targetWordCount} words per chapter, {numChapters} chapters

IMPLEMENTATION STRATEGY:

**1. FEEDBACK PRIORITY ANALYSIS**
- Identify all specific requests in the manual feedback
- Prioritize changes by professional impact and user intent
- Resolve any conflicts between feedback and established parameters
- Determine scope of changes: content, structure, approach, or technical
- Assess implications for overall authority and credibility

**2. PROFESSIONAL IMPLEMENTATION APPROACH**
- Follow manual feedback instructions precisely as highest priority
- If feedback conflicts with established parameters, implement feedback direction
- If feedback doesn't specify parameter changes, maintain original specifications
- Ensure all changes enhance rather than diminish professional authority
- Maintain evidence-based approach and industry standards unless specifically changed

**3. QUALITY ASSURANCE REQUIREMENTS**
- Verify all requested changes are fully implemented
- Ensure logical consistency throughout enhanced content
- Maintain or improve professional writing standards
- Preserve or enhance authority and credibility positioning
- Verify appropriate expertise level for {targetAudience}
- Ensure practical value and implementation focus

**4. PROFESSIONAL STANDARDS MAINTENANCE**
- Preserve industry best practices and professional standards
- Maintain appropriate disclaimers and compliance requirements
- Ensure ethical considerations and professional responsibility
- Verify factual accuracy and evidence-based claims
- Maintain competitive positioning and market advantage
- Preserve long-term reference value and practical utility

**EXECUTION GUIDELINES:**
- Implement feedback requests as absolute highest priority
- Maintain professional writing quality and authoritative tone
- Preserve or enhance practical implementation value
- Ensure all changes support overall authority positioning
- Address specific requests while improving overall quality
- Create seamless integration of all requested changes

**SUCCESS CRITERIA:**
- All manual feedback elements fully implemented
- Professional authority and credibility maintained or enhanced
- Practical value and implementation focus preserved or improved
- Industry standards and best practices maintained
- Appropriate expertise level for {targetAudience} preserved
- Overall quality elevated while addressing specific feedback

Create the improved {contentType} that perfectly addresses all manual feedback while maintaining the highest standards of professional authority and practical value for {targetAudience}.`
};

// ============================================================================
// UTILITY FUNCTIONS & HELPERS
// ============================================================================

// Debouncing utility for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced word counting with better accuracy
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(word => word.length > 0).length;
}

// Advanced prompt formatting with variable substitution
function formatPrompt(template, variables) {
    if (!template || typeof template !== 'string') return '';
    
    let formatted = template;
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, value || '');
    });
    return formatted;
}

// Safe filename generation
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9\s-_]/gi, '')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .substring(0, 50);
}

// Enhanced auto-save with conflict resolution
const autoSave = debounce(() => {
    try {
        collectBookData();
        saveToLocalStorage();
        console.log('Auto-save completed');
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}, CONFIG.AUTO_SAVE_DELAY);

// ============================================================================
// DATA MANAGEMENT & PERSISTENCE
// ============================================================================

function collectBookData() {
    const elements = {
        category: document.getElementById('category'),
        targetAudience: document.getElementById('target-audience'),
        topic: document.getElementById('topic'),
        approach: document.getElementById('approach'),
        numChapters: document.getElementById('num-chapters'),
        targetWordCount: document.getElementById('target-word-count'),
        research: document.getElementById('research-content'),
        chapterOutline: document.getElementById('chapters-content')
    };

    // Safely collect data from DOM elements
    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            const value = element.type === 'number' ? parseInt(element.value) || bookData[key] : element.value;
            bookData[key] = value;
        }
    });

    // Special handling for research and chapterOutline
    if (elements.research) bookData.research = elements.research.value;
    if (elements.chapterOutline) bookData.chapterOutline = elements.chapterOutline.value;

    // Update timestamp
    bookData.lastSaved = new Date().toISOString();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('bookforge_current', JSON.stringify(bookData));
        localStorage.setItem('bookforge_settings', JSON.stringify(aiSettings));
        localStorage.setItem('bookforge_theme', currentTheme);
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showAlert('Failed to save data locally. Please check browser storage settings.');
    }
}

function loadFromLocalStorage() {
    try {
        // Load book data
        const savedBook = localStorage.getItem('bookforge_current');
        if (savedBook) {
            const loaded = JSON.parse(savedBook);
            Object.assign(bookData, loaded);
        }

        // Load AI settings
        const savedSettings = localStorage.getItem('bookforge_settings');
        if (savedSettings) {
            const loaded = JSON.parse(savedSettings);
            Object.assign(aiSettings, loaded);
        }

        // Load theme
        const savedTheme = localStorage.getItem('bookforge_theme');
        if (savedTheme && ['light', 'dark', 'professional'].includes(savedTheme)) {
            setTheme(savedTheme);
        }

        // Load projects
        const savedProjects = localStorage.getItem('bookforge_projects');
        if (savedProjects) {
            projects = JSON.parse(savedProjects);
        }

    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}

function populateFields() {
    const fieldMappings = {
        'category': 'category',
        'target-audience': 'targetAudience',
        'topic': 'topic',
        'approach': 'approach',
        'num-chapters': 'numChapters',
        'target-word-count': 'targetWordCount',
        'research-content': 'research',
        'chapters-content': 'chapterOutline'
    };

    Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
        const element = document.getElementById(elementId);
        if (element && bookData[dataKey] !== undefined) {
            element.value = bookData[dataKey];
        }
    });

    updateAllWordCounts();
    updateNavProgress();
}

// ============================================================================
// NAVIGATION & THEME MANAGEMENT
// ============================================================================

function showStep(stepName) {
    // Hide all steps and remove active states
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Show target step and activate navigation
    const step = document.getElementById(stepName);
    const navItem = document.getElementById(`nav-${stepName}`);
    
    if (step) step.classList.add('active');
    if (navItem) navItem.classList.add('active');
    
    // Update book data and save
    bookData.currentStep = stepName;
    autoSave();
    
    // Initialize step-specific functionality
    switch (stepName) {
        case 'writing':
            setupWritingInterface();
            break;
        case 'export':
            updateExportSummary();
            break;
    }
    
    updateNavProgress();
}

function updateNavProgress() {
    const steps = ['setup', 'research', 'chapters', 'writing', 'export'];
    const currentIndex = steps.indexOf(bookData.currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;
    
    const progressElement = document.getElementById('nav-progress');
    if (progressElement) {
        progressElement.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
}

function changeTheme() {
    const selectedTheme = document.getElementById('theme-select')?.value;
    if (selectedTheme) {
        setTheme(selectedTheme);
    }
}

function setTheme(theme) {
    if (!['light', 'dark', 'professional'].includes(theme)) {
        theme = 'professional';
    }
    
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('bookforge_theme', theme);
    
    const selector = document.getElementById('theme-select');
    if (selector) selector.value = theme;
}

// ============================================================================
// SETUP STEP FUNCTIONS
// ============================================================================

function updateSetupFields() {
    const requiredFields = ['category', 'target-audience', 'topic', 'approach'];
    const allFilled = requiredFields.every(fieldId => {
        const element = document.getElementById(fieldId);
        return element && element.value.trim();
    });
    
    const nextBtn = document.getElementById('setup-next');
    if (nextBtn) {
        nextBtn.style.display = allFilled ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

async function generateRandomIdea() {
    const category = document.getElementById('category')?.value;
    const audience = document.getElementById('target-audience')?.value;
    
    if (!category || !audience) {
        showAlert('Please select a category and target audience first.');
        return;
    }
    
    if (isGenerating) return;
    
    try {
        showLoading('Generating book idea...');
        
        const prompt = formatPrompt(defaultPrompts.randomIdea, {
            category: category,
            targetAudience: audience
        });
        
        const response = await callAI(prompt, 'Generate professional book concept');
        parseRandomIdea(response);
        
    } catch (error) {
        showAlert('Error generating idea: ' + error.message);
    } finally {
        hideLoading();
    }
}

function parseRandomIdea(response) {
    const lines = response.split('\n');
    let topic = '', approach = '', chapters = 12, marketPosition = '';
    
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('TOPIC:')) {
            topic = cleanLine.replace('TOPIC:', '').trim();
        } else if (cleanLine.startsWith('APPROACH:')) {
            approach = cleanLine.replace('APPROACH:', '').trim();
        } else if (cleanLine.startsWith('CHAPTERS:')) {
            const chapterMatch = cleanLine.match(/\d+/);
            if (chapterMatch) {
                chapters = parseInt(chapterMatch[0]) || 12;
            }
        } else if (cleanLine.startsWith('MARKET POSITION:')) {
            marketPosition = cleanLine.replace('MARKET POSITION:', '').trim();
        }
    });
    
    // Populate fields with generated content
    if (topic) document.getElementById('topic').value = topic;
    if (approach) document.getElementById('approach').value = approach;
    if (chapters) document.getElementById('num-chapters').value = chapters;
    
    updateSetupFields();
    
    if (marketPosition) {
        showAlert(`Idea generated! Market Position: ${marketPosition}`);
    } else {
        showAlert('Book idea generated successfully!');
    }
}

// ============================================================================
// RESEARCH STEP FUNCTIONS
// ============================================================================

async function generateResearch() {
    if (!validateSetup()) return;
    if (isGenerating) return;
    
    try {
        showLoading('Generating comprehensive research framework...');
        
        collectBookData();
        const categoryReqs = categoryRequirements[bookData.category] || {};
        const requirements = `${categoryReqs.requirements || ''} | ${categoryReqs.approach || ''} | ${categoryReqs.authorityElements || ''}`;
        
        const prompt = formatPrompt(defaultPrompts.research, {
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            topic: bookData.topic,
            approach: bookData.approach,
            numChapters: bookData.numChapters,
            categoryRequirements: requirements
        });
        
        const response = await callAI(prompt, 'Generate comprehensive research framework');
        
        const researchElement = document.getElementById('research-content');
        if (researchElement) {
            researchElement.value = response;
            updateResearchContent();
        }
        
    } catch (error) {
        showAlert('Error generating research: ' + error.message);
    } finally {
        hideLoading();
    }
}

function updateResearchContent() {
    const element = document.getElementById('research-content');
    if (!element) return;
    
    const content = element.value;
    bookData.research = content;
    
    const wordCount = countWords(content);
    const wordCountEl = document.getElementById('research-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount.toLocaleString()} words`;
    }
    
    const nextBtn = document.getElementById('research-next');
    if (nextBtn) {
        nextBtn.style.display = content.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

// ============================================================================
// CHAPTERS STEP FUNCTIONS  
// ============================================================================

async function generateChapterOutline() {
    if (!bookData.research.trim()) {
        showAlert('Please complete the research framework first.');
        return;
    }
    if (isGenerating) return;
    
    try {
        showLoading('Generating detailed chapter structure...');
        
        collectBookData();
        const categoryReqs = categoryRequirements[bookData.category] || {};
        const requirements = `${categoryReqs.requirements || ''} | ${categoryReqs.approach || ''}`;
        
        const prompt = formatPrompt(defaultPrompts.chapters, {
            research: bookData.research,
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            numChapters: bookData.numChapters,
            targetWordCount: bookData.targetWordCount,
            categoryRequirements: requirements
        });
        
        const response = await callAI(prompt, 'Generate detailed chapter structure');
        
        const chaptersElement = document.getElementById('chapters-content');
        if (chaptersElement) {
            chaptersElement.value = response;
            updateChaptersContent();
        }
        
    } catch (error) {
        showAlert('Error generating chapters: ' + error.message);
    } finally {
        hideLoading();
    }
}

function updateChaptersContent() {
    const element = document.getElementById('chapters-content');
    if (!element) return;
    
    const content = element.value;
    bookData.chapterOutline = content;
    
    const wordCount = countWords(content);
    const wordCountEl = document.getElementById('chapters-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount.toLocaleString()} words`;
    }
    
    const nextBtn = document.getElementById('chapters-next');
    if (nextBtn) {
        nextBtn.style.display = content.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

// ============================================================================
// WRITING STEP FUNCTIONS
// ============================================================================

function setupWritingInterface() {
    const container = document.getElementById('chapters-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Ensure chapters array is properly initialized
    if (!Array.isArray(bookData.chapters)) {
        bookData.chapters = [];
    }
    
    // Initialize chapters array to correct length
    while (bookData.chapters.length < bookData.numChapters) {
        bookData.chapters.push('');
    }
    
    // Create chapter interface elements
    for (let i = 1; i <= bookData.numChapters; i++) {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-item';
        chapterDiv.innerHTML = createChapterHTML(i);
        container.appendChild(chapterDiv);
    }
    
    // Populate existing content
    for (let i = 1; i <= bookData.numChapters; i++) {
        const content = bookData.chapters[i - 1] || '';
        const textarea = document.getElementById(`chapter-${i}-textarea`);
        if (textarea && content) {
            textarea.value = content;
            updateChapterContent(i);
        }
    }
    
    updateWritingStats();
    updateGenerateSelectedButton();
}

function createChapterHTML(chapterNum) {
    return `
        <div class="chapter-header">
            <div class="chapter-info">
                <input type="checkbox" id="chapter-${chapterNum}-checkbox" onchange="updateGenerateSelectedButton()" style="margin-right: var(--spacing-sm);">
                <h4 class="chapter-title">Chapter ${chapterNum}</h4>
                <div class="word-count-display" id="chapter-${chapterNum}-word-count">0 words</div>
            </div>
            <div class="chapter-actions">
                <button class="btn btn-primary btn-sm" onclick="generateSingleChapter(${chapterNum})">
                    <i class="fas fa-magic"></i>
                    Generate
                </button>
                <button class="btn btn-secondary btn-sm" onclick="showEditChapterModal(${chapterNum})">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
            </div>
            <button class="collapse-btn" onclick="toggleChapterCollapse(${chapterNum})" title="Collapse/Expand Chapter">
                <i class="fas fa-angle-down"></i>
            </button>
        </div>
        <div class="chapter-content" id="chapter-${chapterNum}-content">
            <div class="textarea-container">
                <textarea 
                    id="chapter-${chapterNum}-textarea" 
                    placeholder="Chapter content will appear here or write directly..." 
                    rows="15"
                    oninput="updateChapterContent(${chapterNum})"
                ></textarea>
                <div class="word-count" id="chapter-${chapterNum}-textarea-count">0 words</div>
            </div>
        </div>
    `;
}

function toggleChapterCollapse(chapterNum) {
    const content = document.getElementById(`chapter-${chapterNum}-content`);
    const btn = content?.parentElement?.querySelector('.collapse-btn i');
    
    if (!content || !btn) return;
    
    content.classList.toggle('collapsed');
    
    if (content.classList.contains('collapsed')) {
        btn.className = 'fas fa-angle-right';
    } else {
        btn.className = 'fas fa-angle-down';
    }
}

function toggleAllChapters() {
    const firstChapter = document.getElementById('chapter-1-content');
    if (!firstChapter) return;
    
    const shouldCollapse = !firstChapter.classList.contains('collapsed');
    
    for (let i = 1; i <= bookData.numChapters; i++) {
        const content = document.getElementById(`chapter-${i}-content`);
        const btn = content?.parentElement?.querySelector('.collapse-btn i');
        
        if (content && btn) {
            if (shouldCollapse) {
                content.classList.add('collapsed');
                btn.className = 'fas fa-angle-right';
            } else {
                content.classList.remove('collapsed');
                btn.className = 'fas fa-angle-down';
            }
        }
    }
}

function updateChapterContent(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-textarea`);
    if (!textarea) return;
    
    const content = textarea.value;
    
    // Ensure chapters array exists and is correct length
    if (!Array.isArray(bookData.chapters)) {
        bookData.chapters = [];
    }
    while (bookData.chapters.length < bookData.numChapters) {
        bookData.chapters.push('');
    }
    
    bookData.chapters[chapterNum - 1] = content;
    
    const wordCount = countWords(content);
    
    // Update word count displays
    const countEl = document.getElementById(`chapter-${chapterNum}-word-count`);
    const textareaCountEl = document.getElementById(`chapter-${chapterNum}-textarea-count`);
    
    if (countEl) countEl.textContent = `${wordCount.toLocaleString()} words`;
    if (textareaCountEl) textareaCountEl.textContent = `${wordCount.toLocaleString()} words`;
    
    updateWritingStats();
    autoSave();
}

function updateWritingStats() {
    if (!Array.isArray(bookData.chapters)) return;
    
    let completedChapters = 0;
    let totalWords = 0;
    
    bookData.chapters.forEach(chapter => {
        const wordCount = countWords(chapter || '');
        totalWords += wordCount;
        if (wordCount >= CONFIG.MIN_CHAPTER_WORDS) {
            completedChapters++;
        }
    });
    
    const estimatedPages = Math.round(totalWords / CONFIG.WORDS_PER_PAGE);
    const completion = Math.round((completedChapters / bookData.numChapters) * 100);
    
    // Update statistics display
    const stats = {
        'completed-chapters': completedChapters,
        'total-words': totalWords.toLocaleString(),
        'estimated-pages': estimatedPages,
        'completion-percentage': `${completion}%`
    };
    
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function updateGenerateSelectedButton() {
    const checkboxes = document.querySelectorAll('[id^="chapter-"][id$="-checkbox"]:checked');
    const btn = document.getElementById('generate-selected-btn');
    
    if (btn) {
        const count = checkboxes.length;
        btn.disabled = count === 0;
        btn.innerHTML = `<i class="fas fa-check-square"></i> Generate Selected (${count})`;
    }
}

async function generateAllChapters() {
    if (!bookData.chapterOutline.trim()) {
        showAlert('Please complete the chapter structure first.');
        return;
    }
    
    if (isGenerating) return;
    
    const confirmMsg = `This will generate all ${bookData.numChapters} chapters and may take several minutes. Continue?`;
    if (!confirm(confirmMsg)) return;
    
    const chapterNumbers = Array.from({length: bookData.numChapters}, (_, i) => i + 1);
    await generateChaptersSequentially(chapterNumbers);
}

async function generateSelectedChapters() {
    const checkboxes = document.querySelectorAll('[id^="chapter-"][id$="-checkbox"]:checked');
    if (checkboxes.length === 0) return;
    
    if (isGenerating) return;
    
    const chapterNumbers = Array.from(checkboxes).map(cb => {
        const match = cb.id.match(/chapter-(\d+)-checkbox/);
        return match ? parseInt(match[1]) : null;
    }).filter(num => num !== null);
    
    await generateChaptersSequentially(chapterNumbers);
}

async function generateChaptersSequentially(chapterNumbers) {
    if (!Array.isArray(chapterNumbers) || chapterNumbers.length === 0) return;
    
    try {
        showLoading(`Generating ${chapterNumbers.length} chapters...`);
        
        for (let i = 0; i < chapterNumbers.length; i++) {
            const chapterNum = chapterNumbers[i];
            
            updateLoading(`Generating Chapter ${chapterNum}... (${i + 1}/${chapterNumbers.length})`);
            
            await generateSingleChapterContent(chapterNum);
            
            // Brief pause between chapters to prevent rate limiting
            if (i < chapterNumbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        showAlert(`Successfully generated ${chapterNumbers.length} chapters!`);
        
    } catch (error) {
        showAlert(`Error during chapter generation: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function generateSingleChapter(chapterNum) {
    if (isGenerating) return;
    
    try {
        await generateSingleChapterContent(chapterNum);
        showAlert(`Chapter ${chapterNum} generated successfully!`);
    } catch (error) {
        showAlert(`Error generating Chapter ${chapterNum}: ${error.message}`);
    }
}

async function generateSingleChapterContent(chapterNum) {
    if (!bookData.chapterOutline.trim()) {
        throw new Error('Chapter structure must be completed first');
    }
    
    collectBookData();
    
    const previousChapterEnding = chapterNum > 1 && bookData.chapters[chapterNum - 2] 
        ? bookData.chapters[chapterNum - 2].slice(-500) 
        : '';
    
    const categoryReqs = categoryRequirements[bookData.category] || {};
    const contextInfo = `Research Framework: ${bookData.research.slice(0, 1000)}...\n\nChapter Structure: ${bookData.chapterOutline.slice(0, 1000)}...`;
    
    const prompt = formatPrompt(defaultPrompts.writing, {
        chapterNum: chapterNum,
        category: bookData.category,
        contextInfo: contextInfo,
        chapterOutline: extractChapterOutline(chapterNum),
        previousChapterEnding: previousChapterEnding,
        targetWordCount: bookData.targetWordCount,
        targetAudience: bookData.targetAudience,
        approach: bookData.approach,
        categoryRequirements: categoryReqs.requirements || '',
        categorySpecificElements: categoryReqs.disclaimers || ''
    });
    
    const response = await callAI(prompt, `Write Chapter ${chapterNum}`);
    
    const textarea = document.getElementById(`chapter-${chapterNum}-textarea`);
    if (textarea) {
        textarea.value = response;
        updateChapterContent(chapterNum);
    }
}

function extractChapterOutline(chapterNum) {
    const outline = bookData.chapterOutline;
    if (!outline) return `Chapter ${chapterNum} outline not available.`;
    
    // Try to extract specific chapter section
    const patterns = [
        new RegExp(`Chapter ${chapterNum}[\\s\\S]*?(?=Chapter ${chapterNum + 1}|$)`, 'i'),
        new RegExp(`${chapterNum}\\.[\\s\\S]*?(?=${chapterNum + 1}\\.|$)`, 'i'),
        new RegExp(`\\b${chapterNum}\\b[\\s\\S]*?(?=\\b${chapterNum + 1}\\b|$)`, 'i')
    ];
    
    for (const pattern of patterns) {
        const match = outline.match(pattern);
        if (match && match[0].trim().length > 50) {
            return match[0].trim();
        }
    }
    
    return `Chapter ${chapterNum} - Please refer to the full chapter structure for details.`;
}

async function generateBookTitle() {
    if (!bookData.research.trim() || !bookData.chapterOutline.trim()) {
        showAlert('Please complete research and chapter structure first.');
        return;
    }
    
    if (isGenerating) return;
    
    try {
        showLoading('Generating professional book title and summary...');
        
        collectBookData();
        
        const prompt = formatPrompt(defaultPrompts.bookTitle, {
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            topic: bookData.topic,
            approach: bookData.approach,
            research: bookData.research.slice(0, 2000),
            chapterOutline: bookData.chapterOutline.slice(0, 2000)
        });
        
        const response = await callAI(prompt, 'Generate professional book title and summary');
        parseBookTitle(response);
        
    } catch (error) {
        showAlert('Error generating title: ' + error.message);
    } finally {
        hideLoading();
    }
}

function parseBookTitle(response) {
    const lines = response.split('\n');
    let title = '';
    let summary = '';
    let marketPosition = '';
    let inSummary = false;
    
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('TITLE:')) {
            title = cleanLine.replace('TITLE:', '').trim();
            inSummary = false;
        } else if (cleanLine.startsWith('DESCRIPTION:') || cleanLine.startsWith('SUMMARY:')) {
            summary = cleanLine.replace(/^(DESCRIPTION|SUMMARY):/, '').trim();
            inSummary = true;
        } else if (cleanLine.startsWith('MARKET POSITION:')) {
            marketPosition = cleanLine.replace('MARKET POSITION:', '').trim();
            inSummary = false;
        } else if (inSummary && cleanLine) {
            summary += ' ' + cleanLine;
        }
    });
    
    if (title) {
        bookData.title = title;
        autoSave();
        
        let message = `Book title generated: "${title}"`;
        if (marketPosition) {
            message += `\n\nMarket Position: ${marketPosition}`;
        }
        showAlert(message);
    }
    
    if (summary) {
        bookData.summary = summary.trim();
        autoSave();
    }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

function updateExportSummary() {
    if (!Array.isArray(bookData.chapters)) {
        bookData.chapters = [];
    }
    
    const totalWords = bookData.chapters.reduce((sum, chapter) => {
        return sum + countWords(chapter || '');
    }, 0);
    
    const estimatedPages = Math.round(totalWords / CONFIG.WORDS_PER_PAGE);
    
    const updates = {
        'export-chapters': bookData.numChapters || 0,
        'export-words': totalWords.toLocaleString(),
        'export-pages': estimatedPages,
        'export-category': bookData.category || 'Not specified'
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

async function downloadBook(format) {
    const completedChapters = (bookData.chapters || []).filter(c => 
        countWords(c || '') >= CONFIG.MIN_CHAPTER_WORDS
    );
    
    if (completedChapters.length === 0) {
        showAlert('No completed chapters to export. Please write some content first.');
        return;
    }
    
    const title = bookData.title || bookData.topic || 'BookForge Export';
    let content = '';
    
    try {
        switch(format.toLowerCase()) {
            case 'txt':
                content = generateTxtContent(title);
                downloadFile(content, `${sanitizeFilename(title)}.txt`, 'text/plain');
                break;
            case 'html':
                content = generateHtmlContent(title);
                downloadFile(content, `${sanitizeFilename(title)}.html`, 'text/html');
                break;
            case 'md':
            case 'markdown':
                content = generateMarkdownContent(title);
                downloadFile(content, `${sanitizeFilename(title)}.md`, 'text/markdown');
                break;
            default:
                throw new Error('Unsupported export format');
        }
        
        showAlert(`Book exported successfully as ${format.toUpperCase()}!`);
        
    } catch (error) {
        showAlert(`Export failed: ${error.message}`);
    }
}

function generateTxtContent(title) {
    let content = `${title}\n${'='.repeat(Math.min(title.length, 60))}\n\n`;
    
    // Book metadata
    content += `Category: ${bookData.category || 'Not specified'}\n`;
    content += `Target Audience: ${bookData.targetAudience || 'Not specified'}\n`;
    content += `Approach: ${bookData.approach || 'Not specified'}\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    // Book summary if available
    if (bookData.summary) {
        content += `BOOK SUMMARY:\n${bookData.summary}\n\n`;
    }
    
    content += `${'='.repeat(60)}\n\n`;
    
    // Chapters
    (bookData.chapters || []).forEach((chapter, index) => {
        if (chapter && countWords(chapter) >= CONFIG.MIN_CHAPTER_WORDS) {
            content += `CHAPTER ${index + 1}\n\n`;
            content += chapter + '\n\n';
            content += `${'-'.repeat(40)}\n\n`;
        }
    });
    
    content += `\nGenerated by BookForge v${CONFIG.VERSION}\n`;
    content += `https://bookforge.ai\n`;
    
    return content;
}

function generateHtmlContent(title) {
    const safeTitle = title.replace(/[<>"&]/g, '');
    
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <meta name="generator" content="BookForge v${CONFIG.VERSION}">
    <style>
        body { 
            font-family: Georgia, serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            line-height: 1.8; 
            color: #333;
        }
        h1 { 
            color: #1E40AF; 
            border-bottom: 3px solid #1E40AF; 
            padding-bottom: 15px; 
            margin-bottom: 30px;
        }
        h2 { 
            color: #334155; 
            margin-top: 50px; 
            page-break-before: always; 
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 10px;
        }
        .book-info { 
            background: #F8FAFC; 
            padding: 30px; 
            border-radius: 12px; 
            margin-bottom: 40px; 
            border-left: 4px solid #1E40AF;
        }
        .book-summary { 
            background: #F1F5F9; 
            padding: 25px; 
            border-radius: 8px; 
            margin: 30px 0; 
            font-style: italic;
            border-left: 4px solid #1E40AF;
        }
        .chapter { 
            margin-bottom: 60px; 
            page-break-inside: avoid;
        }
        .chapter-content {
            text-align: justify;
            margin-top: 20px;
        }
        .footer { 
            text-align: center; 
            margin-top: 80px; 
            padding-top: 40px;
            border-top: 1px solid #E5E7EB;
            font-size: 0.9em; 
            color: #64748B; 
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .book-info, .chapter { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="book-info">
        <h1>${safeTitle}</h1>
        <p><strong>Category:</strong> ${bookData.category || 'Not specified'}</p>
        <p><strong>Target Audience:</strong> ${bookData.targetAudience || 'Not specified'}</p>
        <p><strong>Approach:</strong> ${bookData.approach || 'Not specified'}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        ${bookData.summary ? `<div class="book-summary">${bookData.summary.replace(/\n/g, '<br>')}</div>` : ''}
    </div>`;
    
    (bookData.chapters || []).forEach((chapter, index) => {
        if (chapter && countWords(chapter) >= CONFIG.MIN_CHAPTER_WORDS) {
            const chapterContent = chapter
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            
            content += `
    <div class="chapter">
        <h2>Chapter ${index + 1}</h2>
        <div class="chapter-content">
            <p>${chapterContent}</p>
        </div>
    </div>`;
        }
    });
    
    content += `
    <div class="footer">
        <p>Generated by <strong>BookForge v${CONFIG.VERSION}</strong></p>
        <p><a href="https://bookforge.ai">https://bookforge.ai</a></p>
    </div>
</body>
</html>`;
    
    return content;
}

function generateMarkdownContent(title) {
    let content = `# ${title}\n\n`;
    
    // Metadata
    content += `**Category:** ${bookData.category || 'Not specified'}  \n`;
    content += `**Target Audience:** ${bookData.targetAudience || 'Not specified'}  \n`;
    content += `**Approach:** ${bookData.approach || 'Not specified'}  \n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
    
    // Summary
    if (bookData.summary) {
        content += `## Book Summary\n\n${bookData.summary}\n\n`;
    }
    
    content += '---\n\n';
    
    // Chapters
    (bookData.chapters || []).forEach((chapter, index) => {
        if (chapter && countWords(chapter) >= CONFIG.MIN_CHAPTER_WORDS) {
            content += `## Chapter ${index + 1}\n\n`;
            content += chapter + '\n\n';
            content += '---\n\n';
        }
    });
    
    content += `*Generated by [BookForge v${CONFIG.VERSION}](https://bookforge.ai)*\n`;
    
    return content;
}

function downloadFile(content, filename, mimeType) {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
    } catch (error) {
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

async function copyToClipboard() {
    const completedChapters = (bookData.chapters || []).filter(c => 
        countWords(c || '') >= CONFIG.MIN_CHAPTER_WORDS
    );
    
    if (completedChapters.length === 0) {
        showAlert('No content to copy. Please complete some chapters first.');
        return;
    }
    
    try {
        const title = bookData.title || bookData.topic || 'BookForge Export';
        const content = generateTxtContent(title);
        
        await navigator.clipboard.writeText(content);
        showAlert('Book content copied to clipboard successfully!');
        
    } catch (error) {
        showAlert('Failed to copy to clipboard. Please try downloading instead.');
    }
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

async function newProject() {
    if (hasUnsavedChanges()) {
        if (!confirm('Starting a new project will lose unsaved changes. Continue?')) {
            return;
        }
    }
    
    // Reset book data to defaults
    bookData = {
        id: 'current',
        title: '',
        category: '',
        targetAudience: '',
        topic: '',
        approach: '',
        numChapters: 12,
        targetWordCount: 2000,
        research: '',
        chapterOutline: '',
        chapters: [],
        summary: '',
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Reset UI elements
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type !== 'checkbox' && el.id !== 'theme-select') {
            el.value = '';
        }
    });
    
    // Reset navigation and interface
    showStep('setup');
    updateAllWordCounts();
    saveToLocalStorage();
    
    showAlert('New project created successfully!');
}

async function saveProject() {
    collectBookData();
    
    // Validate minimum content requirements
    if (!bookData.topic.trim()) {
        showAlert('Please add a topic before saving the project.');
        return;
    }
    
    try {
        const savedProjects = localStorage.getItem('bookforge_projects');
        const projects = savedProjects ? JSON.parse(savedProjects) : {};
        
        // Check project limits
        if (Object.keys(projects).length >= CONFIG.MAX_PROJECTS && bookData.id === 'current') {
            showAlert(`Maximum of ${CONFIG.MAX_PROJECTS} projects allowed. Please delete some projects first.`);
            return;
        }
        
        // Generate project ID if needed
        const projectId = bookData.id === 'current' ? `project_${Date.now()}` : bookData.id;
        
        // Save project
        projects[projectId] = {
            ...bookData,
            id: projectId,
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('bookforge_projects', JSON.stringify(projects));
        
        // Update current project ID
        bookData.id = projectId;
        saveToLocalStorage();
        
        showAlert('Project saved successfully!');
        
    } catch (error) {
        showAlert('Failed to save project: ' + error.message);
    }
}

async function switchProject() {
    const selector = document.getElementById('project-select');
    if (!selector) return;
    
    const projectId = selector.value;
    
    if (projectId === 'current') return;
    
    try {
        const savedProjects = localStorage.getItem('bookforge_projects');
        const projects = savedProjects ? JSON.parse(savedProjects) : {};
        const project = projects[projectId];
        
        if (project) {
            // Load project data
            Object.assign(bookData, project);
            
            // Update UI
            populateFields();
            showStep(bookData.currentStep || 'setup');
            
            showAlert('Project loaded successfully!');
        } else {
            showAlert('Project not found.');
        }
        
    } catch (error) {
        showAlert('Failed to load project: ' + error.message);
    }
}

function hasUnsavedChanges() {
    return !!(
        bookData.topic?.trim() || 
        bookData.research?.trim() || 
        bookData.chapterOutline?.trim() || 
        (bookData.chapters && bookData.chapters.some(c => c?.trim()))
    );
}

// ============================================================================
// AI INTEGRATION & API CALLS
// ============================================================================

async function callAI(prompt, systemMessage = '', model = null) {
    if (!prompt) {
        throw new Error('Prompt is required');
    }
    
    // Create abort controller for this request
    generationAbortController = new AbortController();
    
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model || aiSettings.model || "claude-sonnet-4-20250514",
                max_tokens: aiSettings.maxTokens || 4000,
                messages: [
                    { role: "user", content: prompt }
                ]
            }),
            signal: generationAbortController.signal
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${response.statusText}\n${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response format from AI service');
        }
        
        return data.content[0].text;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Generation was cancelled');
        }
        throw error;
    } finally {
        generationAbortController = null;
    }
}

function validateSetup() {
    collectBookData();
    
    const requiredFields = ['category', 'targetAudience', 'topic', 'approach'];
    const missingFields = requiredFields.filter(field => !bookData[field]?.trim());
    
    if (missingFields.length > 0) {
        showAlert(`Please complete the following fields: ${missingFields.join(', ')}`);
        return false;
    }
    
    return true;
}

// ============================================================================
// MODAL FUNCTIONS & UI INTERACTIONS
// ============================================================================

function showSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // Populate current settings
    const providerSelect = document.getElementById('api-provider');
    const keyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-select');
    
    if (providerSelect) providerSelect.value = aiSettings.provider || 'claude';
    if (keyInput) keyInput.value = aiSettings.apiKey || '';
    if (modelSelect) {
        updateProviderFields();
        modelSelect.value = aiSettings.model || 'claude-sonnet-4-20250514';
    }
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function saveSettings() {
    const providerSelect = document.getElementById('api-provider');
    const keyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-select');
    
    if (providerSelect) aiSettings.provider = providerSelect.value;
    if (keyInput) aiSettings.apiKey = keyInput.value.trim();
    if (modelSelect) aiSettings.model = modelSelect.value;
    
    // Validate API key
    if (!aiSettings.apiKey) {
        showAlert('Please enter an API key.');
        return;
    }
    
    try {
        saveToLocalStorage();
        closeSettings();
        showAlert('Settings saved successfully!');
    } catch (error) {
        showAlert('Failed to save settings: ' + error.message);
    }
}

function showEditModal(contentType) {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    modal.dataset.contentType = contentType;
    
    // Reset form
    const editMode = document.getElementById('edit-mode');
    const feedbackGroup = document.getElementById('manual-feedback-group');
    const feedbackText = document.getElementById('manual-feedback');
    const feedbackLoops = document.getElementById('feedback-loops');
    
    if (editMode) editMode.value = 'ai';
    if (feedbackGroup) feedbackGroup.style.display = 'none';
    if (feedbackText) feedbackText.value = '';
    if (feedbackLoops) feedbackLoops.value = '1';
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('active');
        delete modal.dataset.contentType;
    }
}

async function runImprovement() {
    const modal = document.getElementById('edit-modal');
    const contentType = modal?.dataset?.contentType;
    
    if (!contentType) {
        showAlert('Content type not specified.');
        return;
    }
    
    const editMode = document.getElementById('edit-mode')?.value || 'ai';
    const feedbackLoops = parseInt(document.getElementById('feedback-loops')?.value) || 1;
    const manualFeedback = document.getElementById('manual-feedback')?.value || '';
    
    closeEditModal();
    
    if (editMode === 'manual' && !manualFeedback.trim()) {
        showAlert('Please provide feedback for manual improvement mode.');
        return;
    }
    
    // Run improvement based on content type
    try {
        if (contentType === 'research') {
            await runContentImprovement('research', editMode, feedbackLoops, manualFeedback);
        } else if (contentType === 'chapters') {
            await runContentImprovement('chapters', editMode, feedbackLoops, manualFeedback);
        }
    } catch (error) {
        showAlert('Improvement failed: ' + error.message);
    }
}

async function runContentImprovement(contentType, editMode, feedbackLoops, manualFeedback) {
    const elementMap = {
        'research': 'research-content',
        'chapters': 'chapters-content'
    };
    
    const elementId = elementMap[contentType];
    const element = document.getElementById(elementId);
    
    if (!element) {
        throw new Error(`Could not find ${contentType} content element`);
    }
    
    const originalContent = element.value;
    if (!originalContent.trim()) {
        throw new Error(`No ${contentType} content to improve. Please generate content first.`);
    }
    
    try {
        showLoading(`Improving ${contentType} with ${editMode} mode...`);
        
        let improvedContent = originalContent;
        
        for (let i = 0; i < feedbackLoops; i++) {
            updateLoading(`${contentType} improvement cycle ${i + 1}/${feedbackLoops}...`);
            
            if (editMode === 'manual') {
                improvedContent = await runManualImprovement(contentType, improvedContent, manualFeedback);
            } else {
                improvedContent = await runAIImprovement(contentType, improvedContent);
            }
        }
        
        // Update the content
        element.value = improvedContent;
        
        // Update corresponding data and UI
        if (contentType === 'research') {
            updateResearchContent();
        } else if (contentType === 'chapters') {
            updateChaptersContent();
        }
        
        showAlert(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} improved successfully with ${feedbackLoops} cycle(s).`);
        
    } finally {
        hideLoading();
    }
}

async function runManualImprovement(contentType, content, feedback) {
    collectBookData();
    
    const prompt = formatPrompt(defaultPrompts.manualImprovement, {
        contentType: contentType,
        originalContent: content,
        manualFeedback: feedback,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        approach: bookData.approach,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    return await callAI(prompt, 'Improve content based on specific feedback');
}

async function runAIImprovement(contentType, content) {
    collectBookData();
    
    // First get analysis
    const analysisPrompt = formatPrompt(defaultPrompts.analysis, {
        contentType: contentType,
        content: content,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        approach: bookData.approach,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    const analysis = await callAI(analysisPrompt, 'Analyze content for improvements');
    
    // Then apply improvements
    const improvementPrompt = formatPrompt(defaultPrompts.improvement, {
        contentType: contentType,
        originalContent: content,
        feedbackContent: analysis,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        approach: bookData.approach,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    return await callAI(improvementPrompt, 'Apply comprehensive improvements');
}

// ============================================================================
// UTILITY & HELPER FUNCTIONS
// ============================================================================

function showLoading(message) {
    isGenerating = true;
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    
    if (text) text.textContent = message || 'Processing...';
    if (overlay) overlay.classList.add('active');
}

function updateLoading(message) {
    const text = document.getElementById('loading-text');
    if (text) text.textContent = message;
}

function hideLoading() {
    isGenerating = false;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
    
    // Clean up abort controller
    if (generationAbortController) {
        generationAbortController = null;
    }
}

function showAlert(message) {
    // Enhanced alert with better UX
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-notification';
    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-message">${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('alert-styles')) {
        const styles = document.createElement('style');
        styles.id = 'alert-styles';
        styles.textContent = `
            .alert-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                max-width: 400px;
                animation: slideInRight 0.3s ease-out;
            }
            .alert-content {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
            }
            .alert-message {
                flex: 1;
                color: #374151;
                line-height: 1.5;
            }
            .alert-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #9CA3AF;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .alert-close:hover {
                color: #374151;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function showHelp() {
    const helpContent = `
BookForge v${CONFIG.VERSION} - Professional Non-Fiction Book Generator

QUICK START GUIDE:
1. Configure AI settings (API key required)
2. Set up book parameters (category, audience, topic, approach)
3. Generate research framework for authority and credibility
4. Create detailed chapter structure and outline
5. Write or generate individual chapters with AI assistance
6. Export in professional formats (TXT, HTML, Markdown)

KEY FEATURES:
• Research-backed content generation for professional authority
• Category-specific templates and requirements
• Evidence-based writing with proper citations and disclaimers
• Chapter-by-chapter interface with progress tracking
• AI-powered content analysis and improvement
• Professional project management and auto-save
• Multiple export formats for publishing and distribution

PROFESSIONAL TIPS:
• Complete each step thoroughly before proceeding
• Use the edit & improve feature to refine content quality
• Generate book ideas if you need market-viable concepts
• Focus on practical value and implementation for readers
• Maintain professional standards appropriate for your audience
• Export frequently and back up your work

CATEGORY-SPECIFIC GUIDANCE:
• Business: Focus on ROI, actionable strategies, and case studies
• Self-Help: Emphasize evidence-based methods and practical exercises
• Health: Include proper disclaimers and scientific backing
• Technology: Provide current best practices and code examples
• Science: Use peer-reviewed sources and clear explanations
• Finance: Include risk disclaimers and conservative advice

For detailed documentation and support, visit https://bookforge.ai
    `;
    
    showAlert(helpContent);
}

function cancelGeneration() {
    if (generationAbortController) {
        generationAbortController.abort();
    }
    
    isGenerating = false;
    hideLoading();
    showAlert('Generation cancelled successfully.');
}

function estimateCost(contentType) {
    const estimates = {
        research: { 
            tokens: 2500, 
            cost: 0.03,
            description: 'Comprehensive research framework generation'
        },
        chapters: { 
            tokens: 3500, 
            cost: 0.04,
            description: 'Detailed chapter structure and outline'
        },
        writing: { 
            tokens: 4000 * (bookData.numChapters || 12), 
            cost: 0.05 * (bookData.numChapters || 12),
            description: `All ${bookData.numChapters || 12} chapters content generation`
        },
        single: {
            tokens: 4000,
            cost: 0.05,
            description: 'Single chapter content generation'
        }
    };
    
    const estimate = estimates[contentType] || estimates.single;
    
    showAlert(`
Cost Estimate for ${estimate.description}:
• Estimated tokens: ~${estimate.tokens.toLocaleString()}
• Estimated cost: ~$${estimate.cost.toFixed(2)}
• Processing time: ${Math.ceil(estimate.tokens / 1000)} - ${Math.ceil(estimate.tokens / 500)} minutes

Note: Actual costs may vary based on content complexity and AI provider pricing.
    `);
}

function updateAllWordCounts() {
    // Update all word count displays
    updateResearchContent();
    updateChaptersContent();
    updateWritingStats();
}

function showProjectManager() {
    // Enhanced project management placeholder
    showAlert('Advanced project management features coming soon! Current features: New, Save, Switch projects.');
}

function updateProviderFields() {
    const provider = document.getElementById('api-provider')?.value;
    const modelSelect = document.getElementById('model-select');
    
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';
    
    if (provider === 'openrouter') {
        modelSelect.innerHTML = `
            <option value="openai/gpt-4o">GPT-4 Omni</option>
            <option value="openai/gpt-4o-mini">GPT-4 Omni Mini</option>
            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            <option value="meta-llama/llama-3.1-405b-instruct">Llama 3.1 405B</option>
        `;
    } else if (provider === 'openai') {
        modelSelect.innerHTML = `
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4o">GPT-4 Omni</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        `;
    } else {
        // Default Claude models
        modelSelect.innerHTML = `
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
        `;
    }
}

function showEditChapterModal(chapterNum) {
    // Placeholder for chapter-specific editing
    showAlert(`Chapter ${chapterNum} editing feature coming soon! Use the main edit function for now.`);
}

// ============================================================================
// INITIALIZATION & EVENT HANDLERS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log(`BookForge v${CONFIG.VERSION} - Initializing...`);
    
    try {
        // Load saved data and settings
        loadFromLocalStorage();
        
        // Set up edit mode toggle
        const editModeSelect = document.getElementById('edit-mode');
        if (editModeSelect) {
            editModeSelect.addEventListener('change', function() {
                const manualGroup = document.getElementById('manual-feedback-group');
                if (manualGroup) {
                    manualGroup.style.display = this.value === 'manual' ? 'block' : 'none';
                }
            });
        }
        
        // Set up auto-save for all form inputs
        document.addEventListener('input', function(e) {
            if (e.target.matches('input, select, textarea')) {
                autoSave();
            }
        });
        
        // Set up keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveProject();
            }
            
            // Escape to cancel generation
            if (e.key === 'Escape' && isGenerating) {
                e.preventDefault();
                cancelGeneration();
            }
        });
        
        // Initialize UI state
        updateAllWordCounts();
        updateNavProgress();
        showStep(bookData.currentStep || 'setup');
        
        // Set up provider change handler
        const providerSelect = document.getElementById('api-provider');
        if (providerSelect) {
            providerSelect.addEventListener('change', updateProviderFields);
            updateProviderFields(); // Initialize
        }
        
        console.log('BookForge initialized successfully!');
        
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Initialization error. Please refresh the page.');
    }
});

// ============================================================================
// GLOBAL EXPORTS FOR HTML ONCLICK HANDLERS
// ============================================================================

// Export all functions to global scope for HTML onclick handlers
window.BookForge = {
    // Navigation
    showStep,
    changeTheme,
    
    // Setup
    updateSetupFields,
    generateRandomIdea,
    
    // Research
    generateResearch,
    updateResearchContent,
    
    // Chapters
    generateChapterOutline,
    updateChaptersContent,
    
    // Writing
    setupWritingInterface,
    toggleChapterCollapse,
    toggleAllChapters,
    updateChapterContent,
    updateGenerateSelectedButton,
    generateAllChapters,
    generateSelectedChapters,
    generateSingleChapter,
    generateBookTitle,
    showEditChapterModal,
    
    // Export
    downloadBook,
    copyToClipboard,
    updateExportSummary,
    
    // Project Management
    newProject,
    saveProject,
    switchProject,
    showProjectManager,
    
    // Settings & Modals
    showSettings,
    closeSettings,
    saveSettings,
    showEditModal,
    closeEditModal,
    runImprovement,
    updateProviderFields,
    
    // Utilities
    showHelp,
    cancelGeneration,
    estimateCost,
    showAlert,
    
    // Internal functions for debugging
    _internal: {
        CONFIG,
        bookData,
        aiSettings,
        validateSetup,
        callAI,
        formatPrompt,
        countWords
    }
};

// Make functions available globally for onclick handlers
Object.assign(window, window.BookForge);

console.log('BookForge JavaScript loaded successfully!');